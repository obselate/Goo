package Goo

import System
import System.IO
import System.Runtime.InteropServices

internal unsafe partial class VulkanPrimitiveRenderer : IDisposable {
    private const DefaultClipDepth int32 = 64
    private const PushConstantSize uint32 = 112u
    private const TextPushConstantSize uint32 = 128u

    private let device VkDevice
    private let dispatch VkDeviceDispatch
    private let targetFormat VkFormat
    private let imageResources VulkanImageResources?
    private let textAtlas VulkanTextAtlas?
    private let resourceGeneration uint64
    private let clipStack []PrimitiveClip
    private let linearChannels []float32
    private var pipelineLayout VkPipelineLayout
    private var solidPipeline VkPipeline
    private var linearPipeline VkPipeline
    private var radialPipeline VkPipeline
    private var sampledPipeline VkPipeline
    private var textPipelineLayout VkPipelineLayout
    private var textPipeline VkPipeline
    private var textPaintPipeline VkPipeline
    private var activePipeline VkPipeline
    private var clipDepth int32
    private var activeExtent VkExtent2D
    private var disposed bool

    internal prop ClipCapacity int32 { get { return clipStack.Length } }
    internal prop LiveObjectCount uint32 {
        get {
            var count uint32 = 4u
            if sampledPipeline != 0uL { count++ }
            if textPipeline != 0uL { count = count + 2u }
            if textPaintPipeline != 0uL { count++ }
            return count
        }
    }

    internal convenience init(
        nativeDevice VkDevice,
        nativeDispatch VkDeviceDispatch,
        colorFormat VkFormat,
        maxClipDepth int32,
        nativeImageResources VulkanImageResources?,
        expectedGeneration uint64) {
        init(nativeDevice, nativeDispatch, colorFormat, maxClipDepth,
            nativeImageResources, expectedGeneration, nil)
    }

    internal init(
        nativeDevice VkDevice,
        nativeDispatch VkDeviceDispatch,
        colorFormat VkFormat,
        maxClipDepth int32,
        nativeImageResources VulkanImageResources?,
        expectedGeneration uint64,
        nativeTextAtlas VulkanTextAtlas?) {
        if nativeDevice == nint(0) {
            throw ArgumentException("Vulkan device is null", "nativeDevice")
        }
        if colorFormat != VkConstants.VK_FORMAT_R8G8B8A8_SRGB
            && colorFormat != VkConstants.VK_FORMAT_B8G8R8A8_SRGB {
            throw ArgumentException("Vulkan primitive renderer requires an sRGB RGBA target", "colorFormat")
        }
        if maxClipDepth <= 0 || maxClipDepth > Int32.MaxValue {
            throw ArgumentOutOfRangeException("maxClipDepth")
        }
        this.device = nativeDevice
        this.dispatch = nativeDispatch
        this.targetFormat = colorFormat
        this.imageResources = nativeImageResources
        this.textAtlas = nativeTextAtlas
        this.resourceGeneration = expectedGeneration
        if nativeImageResources != nil && expectedGeneration == 0uL {
            throw ArgumentOutOfRangeException("expectedGeneration")
        }
        this.clipStack = [maxClipDepth]PrimitiveClip
        this.linearChannels = [256]float32
        BuildLinearChannelTable()
        Create()
    }

    internal func RecordInsideRendering(
        commandBuffer VkCommandBuffer,
        frame SceneFrame,
        extent VkExtent2D) {
        if disposed {
            throw ObjectDisposedException("VulkanPrimitiveRenderer")
        }
        if commandBuffer == nint(0) {
            throw ArgumentException("Command buffer is null", "commandBuffer")
        }
        if extent.width == 0u || extent.height == 0u {
            throw ArgumentOutOfRangeException("extent")
        }
        if uint64(extent.width) > uint64(Int32.MaxValue)
            || uint64(extent.height) > uint64(Int32.MaxValue) {
            throw ArgumentOutOfRangeException("extent")
        }
        if frame == nil {
            throw ArgumentNullException("frame")
        }
        if frame.ActiveChunk >= 0 {
            throw InvalidOperationException("Vulkan primitive renderer requires a closed scene frame")
        }

        clipDepth = 0
        activePipeline = 0uL
        var viewport = VkViewport{}
        viewport.x = 0.0F
        viewport.y = 0.0F
        viewport.width = float32(extent.width)
        viewport.height = float32(extent.height)
        viewport.minDepth = 0.0F
        viewport.maxDepth = 1.0F
        let setViewport = dispatch.vkCmdSetViewport
        setViewport(commandBuffer, 0u, 1u, &viewport)
        let baseClip = PrimitiveClip{
            Left: 0,
            Top: 0,
            Right: int32(extent.width),
            Bottom: int32(extent.height),
        }
        activeExtent = extent
        SetScissor(commandBuffer, baseClip)

        var drawIndex int32 = 0
        var chunkIndex int32 = 0
        while drawIndex < frame.DrawRefCount {
            while chunkIndex < frame.ChunkCount && frame.Chunks[chunkIndex].FirstDraw <= drawIndex {
                ValidateChunk(frame, frame.Chunks[chunkIndex])
                chunkIndex = chunkIndex + 1
            }
            let reference = frame.DrawRefs[drawIndex]
            switch reference.Kind {
                case SceneDrawKind.SolidBox {
                    RequireRecordIndex(reference.Index, frame.SolidBoxCount, "solid box index")
                    let value = frame.SolidBoxes[reference.Index]
                    EmitSolid(commandBuffer, extent, value.Bounds, 0.0F, 0.0F, 0.0F, 0.0F,
                        value.Color, value.Opacity, value.TransformIndex, frame)
                }
                case SceneDrawKind.RoundedBox {
                    RequireRecordIndex(reference.Index, frame.RoundedBoxCount, "rounded box index")
                    let value = frame.RoundedBoxes[reference.Index]
                    EmitSolid(commandBuffer, extent, value.Bounds, value.RadiusTopLeft,
                        value.RadiusTopRight, value.RadiusBottomRight, value.RadiusBottomLeft,
                        value.Color, value.Opacity, value.TransformIndex, frame)
                }
                case SceneDrawKind.PerEdgeBorder {
                    RequireRecordIndex(reference.Index, frame.PerEdgeBorderCount, "border index")
                    let value = frame.PerEdgeBorders[reference.Index]
                    EmitBorder(commandBuffer, extent, value, frame)
                }
                case SceneDrawKind.LinearGradient {
                    RequireRecordIndex(reference.Index, frame.LinearGradientCount, "linear gradient index")
                    let value = frame.LinearGradients[reference.Index]
                    EmitLinear(commandBuffer, extent, value, frame)
                }
                case SceneDrawKind.RadialGradient {
                    RequireRecordIndex(reference.Index, frame.RadialGradientCount, "radial gradient index")
                    let value = frame.RadialGradients[reference.Index]
                    EmitRadial(commandBuffer, extent, value, frame)
                }
                case SceneDrawKind.RectClipBegin {
                    RequireRecordIndex(reference.Index, frame.RectClipCount, "clip index")
                    let clip = ResolveRectClip(frame, frame.RectClips[reference.Index], extent)
                    PushClip(commandBuffer, clip)
                }
                case SceneDrawKind.RectClipEnd {
                    RequireRecordIndex(reference.Index, frame.RectClipCount, "clip index")
                    ValidateRectClip(frame, frame.RectClips[reference.Index], extent)
                    PopClip(commandBuffer)
                }
                case SceneDrawKind.Underline {
                    RequireRecordIndex(reference.Index, frame.UnderlineCount, "underline index")
                    let value = frame.Underlines[reference.Index]
                    ValidateRadius(value.Thickness)
                    EmitSolid(commandBuffer, extent, value.Bounds, 0.0F, 0.0F, 0.0F, 0.0F,
                        value.Color, 1.0F, value.TransformIndex, frame)
                }
                case SceneDrawKind.LayerBegin {
                    throw NotSupportedException("Vulkan primitive renderer does not support layer composition")
                }
                case SceneDrawKind.LayerEnd {
                    throw NotSupportedException("Vulkan primitive renderer does not support layer composition")
                }
                case SceneDrawKind.Transform {
                    RequireRecordIndex(reference.Index, frame.TransformCount, "transform index")
                    ResolveTransform(frame, reference.Index)
                }
                case SceneDrawKind.CachedImage {
                    RequireRecordIndex(reference.Index, frame.CachedImageCount, "cached image index")
                    let value = frame.CachedImages[reference.Index]
                    EmitImage(commandBuffer, extent, value, frame)
                }
                case SceneDrawKind.CachedGlyphRun {
                    RequireRecordIndex(reference.Index, frame.CachedGlyphRunCount, "cached glyph run index")
                    let value = frame.CachedGlyphRuns[reference.Index]
                    EmitText(commandBuffer, extent, value, frame)
                }
                case SceneDrawKind.PrebuiltPathMesh {
                    throw NotSupportedException("Vulkan primitive renderer does not support path meshes")
                }
                case SceneDrawKind.Shadow {
                    throw NotSupportedException("Vulkan primitive renderer does not support shadows")
                }
                case SceneDrawKind.CustomMesh {
                    throw NotSupportedException("Vulkan primitive renderer does not support custom meshes")
                }
                default {
                    throw NotSupportedException("Vulkan primitive renderer received an unknown draw kind")
                }
            }
            drawIndex = drawIndex + 1
        }

        while chunkIndex < frame.ChunkCount {
            ValidateChunk(frame, frame.Chunks[chunkIndex])
            chunkIndex = chunkIndex + 1
        }

        if clipDepth != 0 {
            throw InvalidOperationException("Vulkan primitive clip stack is not balanced")
        }
    }

    public func Dispose() {
        if disposed {
            return
        }
        disposed = true
        if textPipeline != 0uL {
            let destroyPipeline = dispatch.vkDestroyPipeline
            destroyPipeline(device, textPipeline, nil)
            textPipeline = 0uL
        }
        if textPaintPipeline != 0uL {
            let destroyPipeline = dispatch.vkDestroyPipeline
            destroyPipeline(device, textPaintPipeline, nil)
            textPaintPipeline = 0uL
        }
        if textPipelineLayout != 0uL {
            let destroyPipelineLayout = dispatch.vkDestroyPipelineLayout
            destroyPipelineLayout(device, textPipelineLayout, nil)
            textPipelineLayout = 0uL
        }
        if radialPipeline != 0uL {
            let destroyPipeline = dispatch.vkDestroyPipeline
            destroyPipeline(device, radialPipeline, nil)
            radialPipeline = 0uL
        }
        if sampledPipeline != 0uL {
            let destroyPipeline = dispatch.vkDestroyPipeline
            destroyPipeline(device, sampledPipeline, nil)
            sampledPipeline = 0uL
        }
        if linearPipeline != 0uL {
            let destroyPipeline = dispatch.vkDestroyPipeline
            destroyPipeline(device, linearPipeline, nil)
            linearPipeline = 0uL
        }
        if solidPipeline != 0uL {
            let destroyPipeline = dispatch.vkDestroyPipeline
            destroyPipeline(device, solidPipeline, nil)
            solidPipeline = 0uL
        }
        if pipelineLayout != 0uL {
            let destroyPipelineLayout = dispatch.vkDestroyPipelineLayout
            destroyPipelineLayout(device, pipelineLayout, nil)
            pipelineLayout = 0uL
        }
    }

    deinit {
        Dispose()
    }

    private func BuildLinearChannelTable() {
        var index int32 = 0
        while index < 256 {
            let encoded = float32(index) / 255.0F
            if encoded <= 0.04045F {
                linearChannels[index] = encoded / 12.92F
            } else {
                linearChannels[index] = MathF.Pow((encoded + 0.055F) / 1.055F, 2.4F)
            }
            index = index + 1
        }
    }

}
