package Goo.VulkanProof

import System
import System.IO
import System.Runtime.InteropServices
import Goo.Vulkan.Generated

internal unsafe struct PrimitiveTransform {
  var A float32
  var B float32
  var C float32
  var D float32
  var TX float32
  var TY float32
}

internal struct PrimitiveClip {
  var Left int32
  var Top int32
  var Right int32
  var Bottom int32
}

internal struct PackedPrimitiveColor {
  var Rgb uint32
  var Alpha uint32
}

internal unsafe class VulkanPrimitiveRenderer : IDisposable {
  private const DefaultClipDepth int32 = 64
  private const MaxGradientStops int32 = 4
  private const PrimitiveClipDrawOrdinalWord int32 = 7
  private const PrimitiveRecordSize VkDeviceSize = 128uL
  private const PrimitiveRecordCapacity uint32 = 1024u
  private const PrimitiveBufferSize VkDeviceSize = 131072uL
  private const TextFrameConstantSize uint32 = 32u

  private let device VkDevice
  private let dispatch VkDeviceDispatch
  private let targetFormat VkFormat
  private let allocator VulkanMemoryAllocator
  private let imageResources VulkanImageResources?
  private let textAtlas VulkanTextAtlas?
  private let clipChain VulkanClipChainState?
  private let resourceGeneration uint64
  private let clipStack []PrimitiveClip
  private let linearChannels []float32
  private var pipelineLayout VkPipelineLayout
  private var primitiveDescriptorSetLayout VkDescriptorSetLayout
  private var primitiveDescriptorPool VkDescriptorPool
  private var primitiveDescriptorSet VkDescriptorSet
  private var primitiveBuffer VkBuffer
  private var primitiveAllocation VulkanMemoryAllocation?
  private var currentDrawOrdinal uint32
  private var primitiveRecordOrdinal uint32
  private var solidPipeline VkPipeline
  private var shadowPipeline VkPipeline
  private var borderPipeline VkPipeline
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

  internal prop ClipCapacity int32{ get -> clipStack.Length }
  internal prop LiveObjectCount uint32{
    get {
      var count uint32 = 4u
      if primitiveDescriptorSetLayout != 0uL { count++ }
      if primitiveDescriptorPool != 0uL { count++ }
      if primitiveDescriptorSet != 0uL { count++ }
      if primitiveBuffer != 0uL { count++ }
      if shadowPipeline != 0uL { count++ }
      if borderPipeline != 0uL { count++ }
      if sampledPipeline != 0uL { count++ }
      if textPipeline != 0uL { count = count + 2u }
      if textPaintPipeline != 0uL { count++ }
      return count
    }
  }

  internal convenience init(
    nativeDevice VkDevice,
    nativeDispatch VkDeviceDispatch,
    nativeAllocator VulkanMemoryAllocator,
    colorFormat VkFormat,
    maxClipDepth int32,
    nativeImageResources VulkanImageResources?,
    expectedGeneration uint64) {
      init(nativeDevice, nativeDispatch, nativeAllocator, colorFormat, maxClipDepth,
        nativeImageResources, expectedGeneration, nil, nil)
    }

  internal convenience init(
    nativeDevice VkDevice,
    nativeDispatch VkDeviceDispatch,
    nativeAllocator VulkanMemoryAllocator,
    colorFormat VkFormat,
    maxClipDepth int32,
    nativeImageResources VulkanImageResources?,
    expectedGeneration uint64,
    nativeTextAtlas VulkanTextAtlas?) {
      init(nativeDevice, nativeDispatch, nativeAllocator, colorFormat, maxClipDepth,
        nativeImageResources, expectedGeneration, nativeTextAtlas,
        nil)
    }

  internal init(
    nativeDevice VkDevice,
    nativeDispatch VkDeviceDispatch,
    nativeAllocator VulkanMemoryAllocator,
    colorFormat VkFormat,
    maxClipDepth int32,
    nativeImageResources VulkanImageResources?,
    expectedGeneration uint64,
    nativeTextAtlas VulkanTextAtlas?,
    nativeClipChain VulkanClipChainState?) {
      if nativeDevice == nint(0) {
        throw ArgumentException("Vulkan device is null", "nativeDevice")
      }
      if nativeAllocator == nil {
        throw ArgumentNullException("nativeAllocator")
      }
      if colorFormat != VkConstants.VK_FORMAT_R8G8B8A8_SRGB
        && colorFormat != VkConstants.VK_FORMAT_B8G8R8A8_SRGB{
          throw ArgumentException("Vulkan primitive renderer requires an sRGB RGBA target", "colorFormat")
        }
      if maxClipDepth <= 0 || maxClipDepth > Int32.MaxValue {
        throw ArgumentOutOfRangeException("maxClipDepth")
      }
      this.device = nativeDevice
      this.dispatch = nativeDispatch
      this.allocator = nativeAllocator
      this.targetFormat = colorFormat
      this.imageResources = nativeImageResources
      this.textAtlas = nativeTextAtlas
      this.clipChain = nativeClipChain
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
      if textPipelineLayout != 0uL {
        var framePush = HbGpuTextFrameConstants{}
        framePush.viewport_x = float32(extent.width)
        framePush.viewport_y = float32(extent.height)
        framePush.viewport_z = 1.0F
        framePush.viewport_w = 1.0F
        framePush.origin_x = 0.0F
        framePush.origin_y = 0.0F
        framePush.origin_z = 0.0F
        framePush.origin_w = 0.0F
        let pushConstants = dispatch.vkCmdPushConstants
        pushConstants(commandBuffer, textPipelineLayout,
          uint32(VkConstants.VK_SHADER_STAGE_VERTEX_BIT),
          0u, TextFrameConstantSize, *void(&framePush))
      }

      clipDepth = 0
      activePipeline = 0uL
      currentDrawOrdinal = 0u
      primitiveRecordOrdinal = 0u
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
        currentDrawOrdinal = uint32(drawIndex)
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
            EmitText(commandBuffer, value, frame)
          }
          case SceneDrawKind.PrebuiltPathMesh {
            throw NotSupportedException("Vulkan primitive renderer does not support path meshes")
          }
          case SceneDrawKind.Shadow {
            RequireRecordIndex(reference.Index, frame.ShadowCount, "shadow index")
            let value = frame.Shadows[reference.Index]
            EmitShadow(commandBuffer, extent, value, frame)
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

  internal func RecordPrimitiveBufferBarrier(commandBuffer VkCommandBuffer) {
    var barrier = VkBufferMemoryBarrier2{}
    barrier.sType = VkConstants.VK_STRUCTURE_TYPE_BUFFER_MEMORY_BARRIER_2
    barrier.srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_HOST_BIT
    barrier.srcAccessMask = VkConstants.VK_ACCESS_2_HOST_WRITE_BIT
    barrier.dstStageMask = VkConstants.VK_PIPELINE_STAGE_2_VERTEX_SHADER_BIT
    | VkConstants.VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT
    barrier.dstAccessMask = VkConstants.VK_ACCESS_2_SHADER_STORAGE_READ_BIT
    barrier.srcQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
    barrier.dstQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
    barrier.buffer = primitiveBuffer
    barrier.offset = 0uL
    barrier.size = PrimitiveBufferSize
    var dependency = VkDependencyInfo{}
    dependency.sType = VkConstants.VK_STRUCTURE_TYPE_DEPENDENCY_INFO
    dependency.bufferMemoryBarrierCount = 1u
    dependency.pBufferMemoryBarriers = &barrier
    let pipelineBarrier = dispatch.vkCmdPipelineBarrier2
    pipelineBarrier(commandBuffer, &dependency)
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
    if shadowPipeline != 0uL {
      let destroyPipeline = dispatch.vkDestroyPipeline
      destroyPipeline(device, shadowPipeline, nil)
      shadowPipeline = 0uL
    }
    if radialPipeline != 0uL {
      let destroyPipeline = dispatch.vkDestroyPipeline
      destroyPipeline(device, radialPipeline, nil)
      radialPipeline = 0uL
    }
    if borderPipeline != 0uL {
      let destroyPipeline = dispatch.vkDestroyPipeline
      destroyPipeline(device, borderPipeline, nil)
      borderPipeline = 0uL
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
    DestroyPrimitiveBuffer()
  }

  deinit{
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

  private func Create() {
    var vertexModule VkShaderModule = 0uL
    var solidModule VkShaderModule = 0uL
    var shadowModule VkShaderModule = 0uL
    var borderModule VkShaderModule = 0uL
    var linearModule VkShaderModule = 0uL
    var radialModule VkShaderModule = 0uL
    var sampledModule VkShaderModule = 0uL
    var textVertexModule VkShaderModule = 0uL
    var textFragmentModule VkShaderModule = 0uL
    var textPaintFragmentModule VkShaderModule = 0uL
    var createdLayout VkPipelineLayout = 0uL
    var createdTextLayout VkPipelineLayout = 0uL
    var createdSolid VkPipeline = 0uL
    var createdShadow VkPipeline = 0uL
    var createdBorder VkPipeline = 0uL
    var createdLinear VkPipeline = 0uL
    var createdRadial VkPipeline = 0uL
    var createdSampled VkPipeline = 0uL
    var createdText VkPipeline = 0uL
    var createdTextPaint VkPipeline = 0uL
    var entryPointStorage nint = nint(0)
    try {
      vertexModule = CreateShaderModule("analytic.vert.spv")
      solidModule = CreateShaderModule("analytic_solid.frag.spv")
      shadowModule = CreateShaderModule("analytic_shadow.frag.spv")
      borderModule = CreateShaderModule("analytic_border.frag.spv")
      linearModule = CreateShaderModule("analytic_linear4.frag.spv")
      radialModule = CreateShaderModule("analytic_radial4.frag.spv")
      if imageResources != nil {
        sampledModule = CreateShaderModule("analytic_sampled_image.frag.spv")
      }
      if textAtlas != nil {
        textVertexModule = CreateShaderModule("hb_gpu.vert.spv")
        textFragmentModule = CreateShaderModule("hb_gpu_draw.frag.spv")
        textPaintFragmentModule = CreateShaderModule("hb_gpu_paint.frag.spv")
      }
      CreatePrimitiveBuffer()
      createdLayout = CreatePipelineLayout()
      entryPointStorage = Marshal.StringToCoTaskMemUTF8("main")
      createdSolid = CreatePipeline(vertexModule, solidModule, createdLayout, entryPointStorage, true)
      createdShadow = CreatePipeline(vertexModule, shadowModule, createdLayout, entryPointStorage, true)
      createdBorder = CreatePipeline(vertexModule, borderModule, createdLayout, entryPointStorage, true)
      createdLinear = CreatePipeline(vertexModule, linearModule, createdLayout, entryPointStorage, true)
      createdRadial = CreatePipeline(vertexModule, radialModule, createdLayout, entryPointStorage, true)
      if imageResources != nil {
        createdSampled = CreatePipeline(vertexModule, sampledModule, createdLayout, entryPointStorage, true)
      }
      if textAtlas != nil {
        createdTextLayout = CreateTextPipelineLayout()
        createdText = CreatePipeline(textVertexModule, textFragmentModule,
          createdTextLayout, entryPointStorage, false)
        createdTextPaint = CreatePipeline(textVertexModule, textPaintFragmentModule,
          createdTextLayout, entryPointStorage, false)
      }
      let destroyShaderModule = dispatch.vkDestroyShaderModule
      destroyShaderModule(device, vertexModule, nil)
      vertexModule = 0uL
      destroyShaderModule(device, solidModule, nil)
      solidModule = 0uL
      destroyShaderModule(device, shadowModule, nil)
      shadowModule = 0uL
      destroyShaderModule(device, borderModule, nil)
      borderModule = 0uL
      destroyShaderModule(device, linearModule, nil)
      linearModule = 0uL
      destroyShaderModule(device, radialModule, nil)
      radialModule = 0uL
      if sampledModule != 0uL {
        destroyShaderModule(device, sampledModule, nil)
        sampledModule = 0uL
      }
      if textVertexModule != 0uL {
        destroyShaderModule(device, textVertexModule, nil)
        textVertexModule = 0uL
      }
      if textFragmentModule != 0uL {
        destroyShaderModule(device, textFragmentModule, nil)
        textFragmentModule = 0uL
      }
      if textPaintFragmentModule != 0uL {
        destroyShaderModule(device, textPaintFragmentModule, nil)
        textPaintFragmentModule = 0uL
      }
      pipelineLayout = createdLayout
      createdLayout = 0uL
      solidPipeline = createdSolid
      createdSolid = 0uL
      shadowPipeline = createdShadow
      createdShadow = 0uL
      borderPipeline = createdBorder
      createdBorder = 0uL
      linearPipeline = createdLinear
      createdLinear = 0uL
      radialPipeline = createdRadial
      createdRadial = 0uL
      sampledPipeline = createdSampled
      createdSampled = 0uL
      textPipelineLayout = createdTextLayout
      createdTextLayout = 0uL
      textPipeline = createdText
      createdText = 0uL
      textPaintPipeline = createdTextPaint
      createdTextPaint = 0uL
    } catch (error Exception) {
      let destroyPipeline = dispatch.vkDestroyPipeline
      if createdText != 0uL {
        destroyPipeline(device, createdText, nil)
      }
      if createdTextPaint != 0uL {
        destroyPipeline(device, createdTextPaint, nil)
      }
      if createdRadial != 0uL {
        destroyPipeline(device, createdRadial, nil)
      }
      if createdSampled != 0uL {
        destroyPipeline(device, createdSampled, nil)
      }
      if createdLinear != 0uL {
        destroyPipeline(device, createdLinear, nil)
      }
      if createdSolid != 0uL {
        destroyPipeline(device, createdSolid, nil)
      }
      if createdShadow != 0uL {
        destroyPipeline(device, createdShadow, nil)
      }
      if createdBorder != 0uL {
        destroyPipeline(device, createdBorder, nil)
      }
      if createdLayout != 0uL {
        let destroyPipelineLayout = dispatch.vkDestroyPipelineLayout
        destroyPipelineLayout(device, createdLayout, nil)
      }
      if createdTextLayout != 0uL {
        let destroyPipelineLayout = dispatch.vkDestroyPipelineLayout
        destroyPipelineLayout(device, createdTextLayout, nil)
      }
      let destroyShaderModule = dispatch.vkDestroyShaderModule
      if textFragmentModule != 0uL {
        destroyShaderModule(device, textFragmentModule, nil)
      }
      if textVertexModule != 0uL {
        destroyShaderModule(device, textVertexModule, nil)
      }
      if textPaintFragmentModule != 0uL {
        destroyShaderModule(device, textPaintFragmentModule, nil)
      }
      if radialModule != 0uL {
        destroyShaderModule(device, radialModule, nil)
      }
      if sampledModule != 0uL {
        destroyShaderModule(device, sampledModule, nil)
      }
      if linearModule != 0uL {
        destroyShaderModule(device, linearModule, nil)
      }
      if solidModule != 0uL {
        destroyShaderModule(device, solidModule, nil)
      }
      if shadowModule != 0uL {
        destroyShaderModule(device, shadowModule, nil)
      }
      if borderModule != 0uL {
        destroyShaderModule(device, borderModule, nil)
      }
      if vertexModule != 0uL {
        destroyShaderModule(device, vertexModule, nil)
      }
      throw error
    } finally {
      if entryPointStorage != nint(0) {
        Marshal.FreeCoTaskMem(entryPointStorage)
      }
    }
  }

  private func CreateShaderModule(fileName string) VkShaderModule {
    let path = Path.Combine(AppContext.BaseDirectory, "Generated", "Shaders", fileName)
    let code = File.ReadAllBytes(path)
    if code.Length == 0 || (code.Length & 3) != 0 {
      throw InvalidDataException("Invalid SPIR-V artifact: " + path)
    }
    let pin = GCHandle.Alloc(code, GCHandleType.Pinned)
    try {
      var createInfo = VkShaderModuleCreateInfo{}
      createInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SHADER_MODULE_CREATE_INFO
      createInfo.codeSize = nuint(code.Length)
      createInfo.pCode = *uint32(pin.AddrOfPinnedObject())
      var result VkShaderModule = 0uL
      let createShaderModule = dispatch.vkCreateShaderModule
      if createShaderModule(device, &createInfo, nil, &result) != VkConstants.VK_SUCCESS || result == 0uL {
        throw InvalidOperationException("vkCreateShaderModule failed: " + fileName)
      }
      return result
    } finally {
      pin.Free()
    }
  }

  private func CreatePrimitiveBuffer() {
    try {
      var layoutBinding = VkDescriptorSetLayoutBinding{}
      layoutBinding.binding = 0u
      layoutBinding.descriptorType = VkConstants.VK_DESCRIPTOR_TYPE_STORAGE_BUFFER
      layoutBinding.descriptorCount = 1u
      layoutBinding.stageFlags = uint32(VkConstants.VK_SHADER_STAGE_VERTEX_BIT)
      | uint32(VkConstants.VK_SHADER_STAGE_FRAGMENT_BIT)
      var layoutInfo = VkDescriptorSetLayoutCreateInfo{}
      layoutInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO
      layoutInfo.bindingCount = 1u
      layoutInfo.pBindings = &layoutBinding
      let createLayout = dispatch.vkCreateDescriptorSetLayout
      if createLayout(device, &layoutInfo, nil, &primitiveDescriptorSetLayout)
      != VkConstants.VK_SUCCESS || primitiveDescriptorSetLayout == 0uL {
        throw InvalidOperationException("vkCreateDescriptorSetLayout failed for Vulkan primitive buffer")
      }

      var bufferInfo = VkBufferCreateInfo{}
      bufferInfo.sType = VkConstants.VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO
      bufferInfo.size = PrimitiveBufferSize
      bufferInfo.usage = uint32(VkConstants.VK_BUFFER_USAGE_STORAGE_BUFFER_BIT)
      bufferInfo.sharingMode = VkConstants.VK_SHARING_MODE_EXCLUSIVE
      let createBuffer = dispatch.vkCreateBuffer
      if createBuffer(device, &bufferInfo, nil, &primitiveBuffer) != VkConstants.VK_SUCCESS
        || primitiveBuffer == 0uL {
          throw InvalidOperationException("vkCreateBuffer failed for Vulkan primitive buffer")
        }
      primitiveAllocation = allocator.AllocateBuffer(primitiveBuffer,
        uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT),
        uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_COHERENT_BIT)
        | uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_CACHED_BIT))
      if allocator.Map(primitiveAllocation!!) != VkConstants.VK_SUCCESS {
        throw InvalidOperationException("vkMapMemory failed for Vulkan primitive buffer")
      }
      let words = *uint32(nint(primitiveAllocation!!.mapped))
      var wordIndex int32 = 0
      while wordIndex < 32 {
        words[wordIndex] = 0u
        wordIndex = wordIndex + 1
      }

      var poolSize = VkDescriptorPoolSize{}
      poolSize._type = VkConstants.VK_DESCRIPTOR_TYPE_STORAGE_BUFFER
      poolSize.descriptorCount = 1u
      var poolInfo = VkDescriptorPoolCreateInfo{}
      poolInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DESCRIPTOR_POOL_CREATE_INFO
      poolInfo.maxSets = 1u
      poolInfo.poolSizeCount = 1u
      poolInfo.pPoolSizes = &poolSize
      let createPool = dispatch.vkCreateDescriptorPool
      if createPool(device, &poolInfo, nil, &primitiveDescriptorPool)
      != VkConstants.VK_SUCCESS || primitiveDescriptorPool == 0uL {
        throw InvalidOperationException("vkCreateDescriptorPool failed for Vulkan primitive buffer")
      }

      var allocateInfo = VkDescriptorSetAllocateInfo{}
      allocateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DESCRIPTOR_SET_ALLOCATE_INFO
      allocateInfo.descriptorPool = primitiveDescriptorPool
      allocateInfo.descriptorSetCount = 1u
      allocateInfo.pSetLayouts = &primitiveDescriptorSetLayout
      let allocateSets = dispatch.vkAllocateDescriptorSets
      if allocateSets(device, &allocateInfo, &primitiveDescriptorSet)
      != VkConstants.VK_SUCCESS || primitiveDescriptorSet == 0uL {
        throw InvalidOperationException("vkAllocateDescriptorSets failed for Vulkan primitive buffer")
      }

      var descriptorBuffer = VkDescriptorBufferInfo{}
      descriptorBuffer.buffer = primitiveBuffer
      descriptorBuffer.offset = 0uL
      descriptorBuffer._range = PrimitiveBufferSize
      var write = VkWriteDescriptorSet{}
      write.sType = VkConstants.VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET
      write.dstSet = primitiveDescriptorSet
      write.dstBinding = 0u
      write.descriptorCount = 1u
      write.descriptorType = VkConstants.VK_DESCRIPTOR_TYPE_STORAGE_BUFFER
      write.pBufferInfo = &descriptorBuffer
      let updateDescriptors = dispatch.vkUpdateDescriptorSets
      updateDescriptors(device, 1u, &write, 0u, nil)
    } catch (error Exception) {
      DestroyPrimitiveBuffer()
      throw error
    }
  }

  private func DestroyPrimitiveBuffer() {
    if primitiveDescriptorPool != 0uL {
      let destroyPool = dispatch.vkDestroyDescriptorPool
      destroyPool(device, primitiveDescriptorPool, nil)
      primitiveDescriptorPool = 0uL
      primitiveDescriptorSet = 0uL
    }
    if primitiveDescriptorSetLayout != 0uL {
      let destroyLayout = dispatch.vkDestroyDescriptorSetLayout
      destroyLayout(device, primitiveDescriptorSetLayout, nil)
      primitiveDescriptorSetLayout = 0uL
    }
    if primitiveBuffer != 0uL {
      let destroyBuffer = dispatch.vkDestroyBuffer
      destroyBuffer(device, primitiveBuffer, nil)
      primitiveBuffer = 0uL
    }
    if primitiveAllocation != nil {
      allocator.Release(primitiveAllocation!!)
      primitiveAllocation = nil
    }
  }

  private func CreatePipelineLayout() VkPipelineLayout {
    if clipChain == nil || clipChain!!.DescriptorSetLayout == 0uL
      || clipChain!!.EmptySetLayout == 0uL
      || primitiveDescriptorSetLayout == 0uL {
        throw InvalidOperationException("Vulkan clip chain descriptor layouts are unavailable")
      }
    var createInfo = VkPipelineLayoutCreateInfo{}
    createInfo.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO
    let descriptorLayouts * VkDescriptorSetLayout = stackalloc[3]VkDescriptorSetLayout
    descriptorLayouts[0] = clipChain!!.EmptySetLayout
    if imageResources != nil {
      descriptorLayouts[0] = imageResources!!.DescriptorSetLayout
      if descriptorLayouts[0] == 0uL {
        throw InvalidOperationException("Vulkan sampled image descriptor layout is unavailable")
      }
    }
    descriptorLayouts[1] = clipChain!!.DescriptorSetLayout
    descriptorLayouts[2] = primitiveDescriptorSetLayout
    createInfo.setLayoutCount = 3u
    createInfo.pSetLayouts = descriptorLayouts
    createInfo.pushConstantRangeCount = 0u
    createInfo.pPushConstantRanges = nil
    var result VkPipelineLayout = 0uL
    let createPipelineLayout = dispatch.vkCreatePipelineLayout
    if createPipelineLayout(device, &createInfo, nil, &result) != VkConstants.VK_SUCCESS || result == 0uL {
      throw InvalidOperationException("vkCreatePipelineLayout failed")
    }
    return result
  }

  private func CreateTextPipelineLayout() VkPipelineLayout {
    if textAtlas == nil || textAtlas!!.DescriptorSetLayout == 0uL
      || clipChain == nil || clipChain!!.DescriptorSetLayout == 0uL
      || primitiveDescriptorSetLayout == 0uL {
        throw InvalidOperationException("Vulkan text descriptor layouts are unavailable")
      }
    let descriptorLayouts * VkDescriptorSetLayout = stackalloc[3]VkDescriptorSetLayout
    descriptorLayouts[0] = textAtlas!!.DescriptorSetLayout
    descriptorLayouts[1] = clipChain!!.DescriptorSetLayout
    descriptorLayouts[2] = primitiveDescriptorSetLayout
    var pushRange = VkPushConstantRange{}
    pushRange.stageFlags = uint32(VkConstants.VK_SHADER_STAGE_VERTEX_BIT)
    pushRange.offset = 0u
    pushRange.size = TextFrameConstantSize
    var createInfo = VkPipelineLayoutCreateInfo{}
    createInfo.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_LAYOUT_CREATE_INFO
    createInfo.setLayoutCount = 3u
    createInfo.pSetLayouts = descriptorLayouts
    createInfo.pushConstantRangeCount = 1u
    createInfo.pPushConstantRanges = &pushRange
    var result VkPipelineLayout = 0uL
    let createPipelineLayout = dispatch.vkCreatePipelineLayout
    if createPipelineLayout(device, &createInfo, nil, &result) != VkConstants.VK_SUCCESS || result == 0uL {
      throw InvalidOperationException("vkCreatePipelineLayout failed for Vulkan text")
    }
    return result
  }

  private func CreatePipeline(
    vertexModule VkShaderModule,
    fragmentModule VkShaderModule,
    layout VkPipelineLayout,
    entryPointStorage nint,
    triangleStrip bool) VkPipeline{
      let entryPoint = *int8(entryPointStorage)
      let stages * VkPipelineShaderStageCreateInfo = stackalloc[2]VkPipelineShaderStageCreateInfo
      stages[0] = VkPipelineShaderStageCreateInfo{}
      stages[0].sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO
      stages[0].stage = VkConstants.VK_SHADER_STAGE_VERTEX_BIT
      stages[0].module = vertexModule
      stages[0].pName = entryPoint
      stages[1] = VkPipelineShaderStageCreateInfo{}
      stages[1].sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_SHADER_STAGE_CREATE_INFO
      stages[1].stage = VkConstants.VK_SHADER_STAGE_FRAGMENT_BIT
      stages[1].module = fragmentModule
      stages[1].pName = entryPoint

      var vertexInput = VkPipelineVertexInputStateCreateInfo{}
      vertexInput.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_VERTEX_INPUT_STATE_CREATE_INFO

      var inputAssembly = VkPipelineInputAssemblyStateCreateInfo{}
      inputAssembly.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_INPUT_ASSEMBLY_STATE_CREATE_INFO
      inputAssembly.topology = if triangleStrip {
        VkConstants.VK_PRIMITIVE_TOPOLOGY_TRIANGLE_STRIP
      } else {
        VkConstants.VK_PRIMITIVE_TOPOLOGY_TRIANGLE_LIST
      }

      var viewportState = VkPipelineViewportStateCreateInfo{}
      viewportState.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_VIEWPORT_STATE_CREATE_INFO
      viewportState.viewportCount = 1u
      viewportState.scissorCount = 1u

      var rasterization = VkPipelineRasterizationStateCreateInfo{}
      rasterization.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_RASTERIZATION_STATE_CREATE_INFO
      rasterization.polygonMode = VkConstants.VK_POLYGON_MODE_FILL
      rasterization.cullMode = uint32(VkConstants.VK_CULL_MODE_NONE)
      rasterization.frontFace = VkConstants.VK_FRONT_FACE_COUNTER_CLOCKWISE
      rasterization.lineWidth = 1.0F

      var multisample = VkPipelineMultisampleStateCreateInfo{}
      multisample.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_MULTISAMPLE_STATE_CREATE_INFO
      multisample.rasterizationSamples = VkConstants.VK_SAMPLE_COUNT_1_BIT

      var colorBlendAttachment = VkPipelineColorBlendAttachmentState{}
      colorBlendAttachment.blendEnable = VkConstants.VK_TRUE
      colorBlendAttachment.srcColorBlendFactor = VkConstants.VK_BLEND_FACTOR_ONE
      colorBlendAttachment.dstColorBlendFactor = VkConstants.VK_BLEND_FACTOR_ONE_MINUS_SRC_ALPHA
      colorBlendAttachment.colorBlendOp = VkConstants.VK_BLEND_OP_ADD
      colorBlendAttachment.srcAlphaBlendFactor = VkConstants.VK_BLEND_FACTOR_ONE
      colorBlendAttachment.dstAlphaBlendFactor = VkConstants.VK_BLEND_FACTOR_ONE_MINUS_SRC_ALPHA
      colorBlendAttachment.alphaBlendOp = VkConstants.VK_BLEND_OP_ADD
      colorBlendAttachment.colorWriteMask = uint32(VkConstants.VK_COLOR_COMPONENT_R_BIT)
      | uint32(VkConstants.VK_COLOR_COMPONENT_G_BIT)
      | uint32(VkConstants.VK_COLOR_COMPONENT_B_BIT)
      | uint32(VkConstants.VK_COLOR_COMPONENT_A_BIT)

      var colorBlend = VkPipelineColorBlendStateCreateInfo{}
      colorBlend.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_COLOR_BLEND_STATE_CREATE_INFO
      colorBlend.logicOpEnable = VkConstants.VK_FALSE
      colorBlend.logicOp = VkConstants.VK_LOGIC_OP_COPY
      colorBlend.attachmentCount = 1u
      colorBlend.pAttachments = &colorBlendAttachment

      let dynamicStates * VkDynamicState = stackalloc[2]VkDynamicState
      dynamicStates[0] = VkConstants.VK_DYNAMIC_STATE_VIEWPORT
      dynamicStates[1] = VkConstants.VK_DYNAMIC_STATE_SCISSOR
      var dynamicState = VkPipelineDynamicStateCreateInfo{}
      dynamicState.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_DYNAMIC_STATE_CREATE_INFO
      dynamicState.dynamicStateCount = 2u
      dynamicState.pDynamicStates = dynamicStates

      var pipelineColorFormat = targetFormat
      var pipelineRendering = VkPipelineRenderingCreateInfo{}
      pipelineRendering.sType = VkConstants.VK_STRUCTURE_TYPE_PIPELINE_RENDERING_CREATE_INFO
      pipelineRendering.colorAttachmentCount = 1u
      pipelineRendering.pColorAttachmentFormats = &pipelineColorFormat
      pipelineRendering.depthAttachmentFormat = VkFormat(0)
      pipelineRendering.stencilAttachmentFormat = VkFormat(0)

      var createInfo = VkGraphicsPipelineCreateInfo{}
      createInfo.sType = VkConstants.VK_STRUCTURE_TYPE_GRAPHICS_PIPELINE_CREATE_INFO
      createInfo.pNext = *void(&pipelineRendering)
      createInfo.stageCount = 2u
      createInfo.pStages = stages
      createInfo.pVertexInputState = &vertexInput
      createInfo.pInputAssemblyState = &inputAssembly
      createInfo.pViewportState = &viewportState
      createInfo.pRasterizationState = &rasterization
      createInfo.pMultisampleState = &multisample
      createInfo.pColorBlendState = &colorBlend
      createInfo.pDynamicState = &dynamicState
      createInfo.layout = layout
      createInfo.renderPass = 0uL
      var result VkPipeline = 0uL
      let createGraphicsPipelines = dispatch.vkCreateGraphicsPipelines
      if createGraphicsPipelines(device, 0uL, 1u, &createInfo, nil, &result) != VkConstants.VK_SUCCESS || result == 0uL {
        throw InvalidOperationException("vkCreateGraphicsPipelines failed")
      }
      return result
    }

  private func ValidateChunk(frame SceneFrame, value SceneChunk) {
    if value.FirstDraw < 0 || value.DrawCount < 0
      || value.FirstDraw > frame.DrawRefCount
      || value.DrawCount > frame.DrawRefCount - value.FirstDraw{
        throw ArgumentOutOfRangeException("scene chunk draw range")
      }
    if value.FirstResource < 0 || value.ResourceCount < 0
      || value.FirstResource > frame.ResourceRefCount
      || value.ResourceCount > frame.ResourceRefCount - value.FirstResource{
        throw ArgumentOutOfRangeException("scene chunk resource range")
      }
    ValidateBounds(value.Bounds)
  }

  private func ValidateRectClip(frame SceneFrame, value RectClipRecord, extent VkExtent2D) {
    ResolveRectClip(frame, value, extent)
  }

  private func ResolveRectClip(frame SceneFrame, value RectClipRecord, extent VkExtent2D) PrimitiveClip {
    ValidateBounds(value.Bounds)
    ValidateTransformIndex(frame, value.TransformIndex)
    if value.ParentIndex < -1 || value.ParentIndex >= frame.RectClipCount {
      throw ArgumentOutOfRangeException("clip parent index")
    }
    let transform = ResolveTransform(frame, value.TransformIndex)
    if transform.B != 0.0F || transform.C != 0.0F {
      throw NotSupportedException("Vulkan primitive renderer requires axis-aligned rectangular clips")
    }
    return ResolveClip(value.Bounds, transform, extent)
  }

  private func ValidateGradientStops(frame SceneFrame, start int32, count int32) {
    if count < 2 || count > MaxGradientStops || start < 0
      || start > frame.GradientStopCount - count{
        throw NotSupportedException("Vulkan primitive renderer requires two to four gradient stops")
      }
    let first = frame.GradientStops[start]
    let second = frame.GradientStops[start + 1]
    ValidateFinite(first.Offset, "gradient stop offset")
    ValidateFinite(second.Offset, "gradient stop offset")
    if first.Offset < 0.0F || first.Offset > 1.0F
      || second.Offset < 0.0F || second.Offset > 1.0F
      || first.Offset > second.Offset{
        throw ArgumentOutOfRangeException("gradient stop range")
      }
    if count >= 3 {
      let third = frame.GradientStops[start + 2]
      ValidateFinite(third.Offset, "gradient stop offset")
      if third.Offset < 0.0F || third.Offset > 1.0F || second.Offset > third.Offset {
        throw ArgumentOutOfRangeException("gradient stop range")
      }
    }
    if count >= 4 {
      let fourth = frame.GradientStops[start + 3]
      ValidateFinite(fourth.Offset, "gradient stop offset")
      if fourth.Offset < 0.0F || fourth.Offset > 1.0F {
        throw ArgumentOutOfRangeException("gradient stop range")
      }
      if count >= 3 {
        let third = frame.GradientStops[start + 2]
        if third.Offset > fourth.Offset {
          throw ArgumentOutOfRangeException("gradient stop range")
        }
      }
    }
  }

  private func ValidateTransformRecord(value TransformRecord, count int32) {
    ValidateFinite(value.A, "transform a")
    ValidateFinite(value.B, "transform b")
    ValidateFinite(value.C, "transform c")
    ValidateFinite(value.D, "transform d")
    ValidateFinite(value.TX, "transform tx")
    ValidateFinite(value.TY, "transform ty")
    if value.ParentIndex < -1 || value.ParentIndex >= count {
      throw ArgumentOutOfRangeException("transform parent index")
    }
  }

  private func ValidateTransformIndex(frame SceneFrame, index int32) {
    if index < -1 || index >= frame.TransformCount {
      throw ArgumentOutOfRangeException("transform index")
    }
  }

  private func ValidateBounds(value ConservativeBounds) {
    ValidateFinite(value.X, "bounds x")
    ValidateFinite(value.Y, "bounds y")
    ValidateFinite(value.Width, "bounds width")
    ValidateFinite(value.Height, "bounds height")
    ValidateFinite(value.Right, "bounds right")
    ValidateFinite(value.Bottom, "bounds bottom")
    if value.Width < 0.0F || value.Height < 0.0F {
      throw ArgumentOutOfRangeException("bounds size")
    }
  }

  private func ValidateOpacity(value float32) {
    ValidateFinite(value, "opacity")
    if value < 0.0F || value > 1.0F {
      throw ArgumentOutOfRangeException("opacity")
    }
  }

  private func ValidateRadius(value float32) {
    ValidateFinite(value, "radius")
    if value < 0.0F {
      throw ArgumentOutOfRangeException("radius")
    }
  }

  private func ValidateFinite(value float32, name string) {
    if Single.IsNaN(value) || Single.IsInfinity(value) {
      throw ArgumentException("Vulkan primitive renderer requires finite values", name)
    }
  }

  private func RequireRecordIndex(index int32, count int32, name string) {
    if index < 0 || index >= count {
      throw ArgumentOutOfRangeException(name)
    }
  }

  private func EmitSolid(
    commandBuffer VkCommandBuffer,
    extent VkExtent2D,
    bounds ConservativeBounds,
    radiusTopLeft float32,
    radiusTopRight float32,
    radiusBottomRight float32,
    radiusBottomLeft float32,
    color uint32,
    opacity float32,
    transformIndex int32,
    frame SceneFrame) {
      ValidateBounds(bounds)
      ValidateRadius(radiusTopLeft)
      ValidateRadius(radiusTopRight)
      ValidateRadius(radiusBottomRight)
      ValidateRadius(radiusBottomLeft)
      ValidateOpacity(opacity)
      ValidateTransformIndex(frame, transformIndex)
      let transform = ResolveTransform(frame, transformIndex)
      if bounds.IsEmpty {
        return
      }
      EmitSolidResolved(commandBuffer, extent, bounds, radiusTopLeft, radiusTopRight,
        radiusBottomRight, radiusBottomLeft, color, opacity, transform)
    }

  private func EmitSolidResolved(
    commandBuffer VkCommandBuffer,
    extent VkExtent2D,
    bounds ConservativeBounds,
    radiusTopLeft float32,
    radiusTopRight float32,
    radiusBottomRight float32,
    radiusBottomLeft float32,
    color uint32,
    opacity float32,
    transform PrimitiveTransform) {
      var push = AnalyticSolidPushConstants{}
      FillTransform(&push, bounds, transform, extent)
      push.radii_x = radiusTopLeft
      push.radii_y = radiusTopRight
      push.radii_z = radiusBottomRight
      push.radii_w = radiusBottomLeft
      let packed = PackColor(color, opacity)
      push.packedColors_x = packed.Rgb
      push.packedColors_w = packed.Alpha
      BindAndDraw(commandBuffer, solidPipeline, *void(&push))
    }

  private func EmitShadow(
    commandBuffer VkCommandBuffer,
    extent VkExtent2D,
    value ShadowRecord,
    frame SceneFrame) {
      ValidateBounds(value.Bounds)
      ValidateRadius(value.RadiusTopLeft)
      ValidateRadius(value.RadiusTopRight)
      ValidateRadius(value.RadiusBottomRight)
      ValidateRadius(value.RadiusBottomLeft)
      ValidateFinite(value.OffsetX, "shadow offset x")
      ValidateFinite(value.OffsetY, "shadow offset y")
      ValidateFinite(value.Spread, "shadow spread")
      ValidateFinite(value.Blur, "shadow blur")
      if value.Blur < 0.0F {
        throw ArgumentOutOfRangeException("shadow blur")
      }
      if value.Inset {
        throw NotSupportedException("Vulkan primitive renderer does not support inset shadows")
      }
      if value.MaskId.IsValid {
        throw NotSupportedException("Vulkan primitive renderer does not support masked shadows")
      }
      ValidateTransformIndex(frame, value.TransformIndex)
      let transform = ResolveTransform(frame, value.TransformIndex)
      if transform.B != 0.0F || transform.C != 0.0F {
        throw NotSupportedException("Vulkan primitive renderer requires axis-aligned shadow transforms")
      }
      if value.Bounds.IsEmpty {
        return
      }
      if value.Bounds.Width + value.Spread + value.Spread <= 0.0F
        || value.Bounds.Height + value.Spread + value.Spread <= 0.0F {
          return
        }
      let expansion = value.Blur + Max(value.Spread, 0.0F)
      let shadowBounds = ConservativeBounds{
        X: value.Bounds.X + value.OffsetX - expansion,
        Y: value.Bounds.Y + value.OffsetY - expansion,
        Width: value.Bounds.Width + expansion + expansion,
        Height: value.Bounds.Height + expansion + expansion,
      }
      if shadowBounds.IsEmpty {
        return
      }
      var push = AnalyticSolidPushConstants{}
      FillTransform(&push, shadowBounds, transform, extent)
      push.radii_x = value.RadiusTopLeft
      push.radii_y = value.RadiusTopRight
      push.radii_z = value.RadiusBottomRight
      push.radii_w = value.RadiusBottomLeft
      push.params_x = value.Spread
      push.params_y = value.Blur
      push.params_z = value.OffsetX
      push.params_w = value.OffsetY
      let packed = PackColor(value.Color, 1.0F)
      push.packedColors_x = packed.Rgb
      push.packedColors_w = packed.Alpha
      BindAndDraw(commandBuffer, shadowPipeline, *void(&push))
    }

  private func EmitBorder(
    commandBuffer VkCommandBuffer,
    extent VkExtent2D,
    value PerEdgeBorderRecord,
    frame SceneFrame) {
      let bounds = value.Bounds
      ValidateBounds(bounds)
      ValidateRadius(value.TopWidth)
      ValidateRadius(value.RightWidth)
      ValidateRadius(value.BottomWidth)
      ValidateRadius(value.LeftWidth)
      ValidateRadius(value.RadiusTopLeft)
      ValidateRadius(value.RadiusTopRight)
      ValidateRadius(value.RadiusBottomRight)
      ValidateRadius(value.RadiusBottomLeft)
      ValidateTransformIndex(frame, value.TransformIndex)
      let transform = ResolveTransform(frame, value.TransformIndex)
      if bounds.IsEmpty {
        return
      }
      let topWidth = ClampLength(value.TopWidth, bounds.Height)
      let bottomWidth = ClampLength(value.BottomWidth, Max(bounds.Height - topWidth, 0.0F))
      let rightWidth = ClampLength(value.RightWidth, bounds.Width)
      let leftWidth = ClampLength(value.LeftWidth, Max(bounds.Width - rightWidth, 0.0F))
      if value.Style != 0u && value.Style != 1u && value.Style != 2u {
        throw NotSupportedException("Vulkan primitive renderer received an unknown border style")
      }
      let rounded = value.RadiusTopLeft > 0.0F || value.RadiusTopRight > 0.0F
        || value.RadiusBottomRight > 0.0F || value.RadiusBottomLeft > 0.0F
      if value.Style != 0u || rounded {
        var push = AnalyticBorderPushConstants{}
        FillTransform(&push, bounds, transform, extent)
        push.widths_x = topWidth
        push.widths_y = rightWidth
        push.widths_z = bottomWidth
        push.widths_w = leftWidth
        push.radii_x = value.RadiusTopLeft
        push.radii_y = value.RadiusTopRight
        push.radii_z = value.RadiusBottomRight
        push.radii_w = value.RadiusBottomLeft
        push.params_x = 0.0F
        push.params_y = bounds.Width
        push.params_z = bounds.Width + bounds.Height
        push.params_w = bounds.Width + bounds.Height + bounds.Width
        let top = PackColor(value.TopColor, 1.0F)
        let right = PackColor(value.RightColor, 1.0F)
        let bottom = PackColor(value.BottomColor, 1.0F)
        let left = PackColor(value.LeftColor, 1.0F)
        push.packedColors_x = top.Rgb
        push.packedColors_y = right.Rgb
        push.packedColors_z = bottom.Rgb
        push.packedColors_w = PackAlphaTriplet(top.Alpha, right.Alpha, bottom.Alpha)
        push.packedColorsExtra_x = left.Rgb
        push.packedColorsExtra_y = left.Alpha
        push.packedColorsExtra_z = 0u
        push.packedColorsExtra_w = value.Style
        BindAndDraw(commandBuffer, borderPipeline, *void(&push))
        return
      }
      let interiorHeight = Max(bounds.Height - topWidth - bottomWidth, 0.0F)
      if topWidth > 0.0F {
        EmitSolidResolved(commandBuffer, extent, ConservativeBounds{
          X: bounds.X,
          Y: bounds.Y,
          Width: bounds.Width,
          Height: topWidth,
        }, 0.0F, 0.0F, 0.0F, 0.0F, value.TopColor, 1.0F, transform)
      }
      if rightWidth > 0.0F && interiorHeight > 0.0F {
        EmitSolidResolved(commandBuffer, extent, ConservativeBounds{
          X: bounds.X + bounds.Width - rightWidth,
          Y: bounds.Y + topWidth,
          Width: rightWidth,
          Height: interiorHeight,
        }, 0.0F, 0.0F, 0.0F, 0.0F, value.RightColor, 1.0F, transform)
      }
      if bottomWidth > 0.0F {
        EmitSolidResolved(commandBuffer, extent, ConservativeBounds{
          X: bounds.X,
          Y: bounds.Y + bounds.Height - bottomWidth,
          Width: bounds.Width,
          Height: bottomWidth,
        }, 0.0F, 0.0F, 0.0F, 0.0F, value.BottomColor, 1.0F, transform)
      }
      if leftWidth > 0.0F && interiorHeight > 0.0F {
        EmitSolidResolved(commandBuffer, extent, ConservativeBounds{
          X: bounds.X,
          Y: bounds.Y + topWidth,
          Width: leftWidth,
          Height: interiorHeight,
        }, 0.0F, 0.0F, 0.0F, 0.0F, value.LeftColor, 1.0F, transform)
      }
    }

  private func EmitLinear(
    commandBuffer VkCommandBuffer,
    extent VkExtent2D,
    value LinearGradientRecord,
    frame SceneFrame) {
      ValidateBounds(value.Bounds)
      ValidateFinite(value.StartX, "linear gradient start x")
      ValidateFinite(value.StartY, "linear gradient start y")
      ValidateFinite(value.EndX, "linear gradient end x")
      ValidateFinite(value.EndY, "linear gradient end y")
      ValidateRadius(value.RadiusTopLeft)
      ValidateRadius(value.RadiusTopRight)
      ValidateRadius(value.RadiusBottomRight)
      ValidateRadius(value.RadiusBottomLeft)
      ValidateOpacity(value.Opacity)
      ValidateTransformIndex(frame, value.TransformIndex)
      ValidateGradientStops(frame, value.StopStart, value.StopCount)
      let transform = ResolveTransform(frame, value.TransformIndex)
      if value.Bounds.IsEmpty {
        return
      }
      var push = AnalyticLinear4PushConstants{}
      FillTransform(&push, value.Bounds, transform, extent)
      push.radii_x = value.RadiusTopLeft
      push.radii_y = value.RadiusTopRight
      push.radii_z = value.RadiusBottomRight
      push.radii_w = value.RadiusBottomLeft
      let width = Max(value.Bounds.Width, 0.0001F)
      let height = Max(value.Bounds.Height, 0.0001F)
      push.params_x = (value.StartX - value.Bounds.X) / width
      push.params_y = (value.StartY - value.Bounds.Y) / height
      push.params_z = (value.EndX - value.Bounds.X) / width
      push.params_w = (value.EndY - value.Bounds.Y) / height
      FillLinearStops(&push, frame, value.StopStart, value.StopCount, value.Opacity)
      BindAndDraw(commandBuffer, linearPipeline, *void(&push))
    }

  private func EmitRadial(
    commandBuffer VkCommandBuffer,
    extent VkExtent2D,
    value RadialGradientRecord,
    frame SceneFrame) {
      ValidateBounds(value.Bounds)
      ValidateFinite(value.CenterX, "radial gradient center x")
      ValidateFinite(value.CenterY, "radial gradient center y")
      ValidateRadius(value.RadiusX)
      ValidateRadius(value.RadiusY)
      ValidateRadius(value.RadiusTopLeft)
      ValidateRadius(value.RadiusTopRight)
      ValidateRadius(value.RadiusBottomRight)
      ValidateRadius(value.RadiusBottomLeft)
      ValidateOpacity(value.Opacity)
      ValidateTransformIndex(frame, value.TransformIndex)
      ValidateGradientStops(frame, value.StopStart, value.StopCount)
      let transform = ResolveTransform(frame, value.TransformIndex)
      if value.Bounds.IsEmpty {
        return
      }
      var push = AnalyticRadial4PushConstants{}
      FillTransform(&push, value.Bounds, transform, extent)
      push.radii_x = value.RadiusTopLeft
      push.radii_y = value.RadiusTopRight
      push.radii_z = value.RadiusBottomRight
      push.radii_w = value.RadiusBottomLeft
      let width = Max(value.Bounds.Width, 0.0001F)
      let height = Max(value.Bounds.Height, 0.0001F)
      push.params_x = (value.CenterX - value.Bounds.X) / width
      push.params_y = (value.CenterY - value.Bounds.Y) / height
      push.params_z = Max(value.RadiusX / width, 0.0001F)
      push.params_w = Max(value.RadiusY / height, 0.0001F)
      FillRadialStops(&push, frame, value.StopStart, value.StopCount, value.Opacity)
      BindAndDraw(commandBuffer, radialPipeline, *void(&push))
    }

  private func EmitImage(
    commandBuffer VkCommandBuffer,
    extent VkExtent2D,
    value CachedImageRefRecord,
    frame SceneFrame) {
      if imageResources == nil {
        throw NotSupportedException("Vulkan primitive renderer has no image resources")
      }
      ValidateBounds(value.Bounds)
      ValidateOpacity(value.Opacity)
      ValidateTransformIndex(frame, value.TransformIndex)
      if !value.ImageId.IsValid || value.ImageId.Kind != SceneResourceKind.Image {
        throw ArgumentException("cached image id is not an image")
      }
      if !value.SamplerId.IsValid || value.SamplerId.Kind != SceneResourceKind.Sampler {
        throw ArgumentException("cached image sampler id is not a sampler")
      }
      if value.Sampling != 0u && value.Sampling != 1u {
        throw ArgumentOutOfRangeException("sampling")
      }
      let samplerMode = if value.Sampling == 0u {
        VulkanImageSamplerMode.Nearest
      } else {
        VulkanImageSamplerMode.Linear
      }
      ValidateFinite(value.SourceX, "cached image source x")
      ValidateFinite(value.SourceY, "cached image source y")
      ValidateFinite(value.SourceWidth, "cached image source width")
      ValidateFinite(value.SourceHeight, "cached image source height")
      if value.SourceX < 0.0F || value.SourceY < 0.0F
        || value.SourceWidth <= 0.0F || value.SourceHeight <= 0.0F
        || value.SourceX + value.SourceWidth > 1.0F
        || value.SourceY + value.SourceHeight > 1.0F {
          throw ArgumentOutOfRangeException("cached image source rectangle")
        }
      let lookup = imageResources!!.Lookup(value.ImageId, value.SamplerId, samplerMode,
        resourceGeneration)
      if !lookup.Found || !lookup.Renderable {
        throw InvalidOperationException("Vulkan cached image is not renderable")
      }
      if value.Bounds.IsEmpty {
        return
      }
      let transform = ResolveTransform(frame, value.TransformIndex)
      var push = SampledImagePushConstants{}
      FillTransform(&push, value.Bounds, transform, extent)
      push.radii_x = value.Opacity
      push.params_x = value.SourceX
      push.params_y = value.SourceY
      push.params_z = value.SourceWidth
      push.params_w = value.SourceHeight
      imageResources!!.BindDescriptor(commandBuffer, pipelineLayout, value.ImageId,
        value.SamplerId, samplerMode, resourceGeneration)
      clipChain!!.BindDescriptor(commandBuffer, pipelineLayout)
      let primitiveWords = *uint32(nint(&push))
      primitiveWords[PrimitiveClipDrawOrdinalWord] = currentDrawOrdinal
      let recordIndex = UploadPrimitiveRecord(*void(&push))
      BindPrimitiveDescriptor(commandBuffer, pipelineLayout)
      if activePipeline != sampledPipeline {
        let bindPipeline = dispatch.vkCmdBindPipeline
        bindPipeline(commandBuffer, VkConstants.VK_PIPELINE_BIND_POINT_GRAPHICS, sampledPipeline)
        activePipeline = sampledPipeline
      }
      let draw = dispatch.vkCmdDraw
      if uint64(recordIndex) > uint64(uint32.MaxValue) / 4uL {
        throw ArgumentOutOfRangeException("recordIndex")
      }
      draw(commandBuffer, 4u, 1u, recordIndex * 4u, 0u)
    }

  private func EmitText(
    commandBuffer VkCommandBuffer,
    value CachedGlyphRunRefRecord,
    frame SceneFrame) {
      if textAtlas == nil || textPipelineLayout == 0uL {
        throw NotSupportedException("Vulkan primitive renderer has no text atlas pipeline")
      }
      ValidateBounds(value.Bounds)
      ValidateTransformIndex(frame, value.TransformIndex)
      if !value.GlyphRunId.IsValid || value.GlyphRunId.Kind != SceneResourceKind.GlyphRun {
        throw ArgumentException("cached glyph run id is not a glyph run")
      }
      if !value.AtlasId.IsValid || value.AtlasId.Kind != SceneResourceKind.Atlas {
        throw ArgumentException("cached glyph atlas id is not an atlas")
      }
      var selectedPipeline VkPipeline = 0uL
      if value.RenderMode == 2u {
        selectedPipeline = textPipeline
      } else if value.RenderMode == 3u {
        selectedPipeline = textPaintPipeline
      } else {
        throw NotSupportedException("Vulkan text proof supports only monochrome and COLR paint glyphs")
      }
      if selectedPipeline == 0uL {
        throw NotSupportedException("Vulkan primitive renderer has no selected text pipeline")
      }
      if value.Bounds.IsEmpty {
        return
      }
      let atlasTexelOffset = uint64(value.AtlasTexelOffset)
      let atlasTexelCount = uint64(value.AtlasTexelCount)
      let atlasTexelTotal = uint64(textAtlas!!.TexelCount)
      if atlasTexelCount == 0uL || atlasTexelOffset >= atlasTexelTotal {
        throw ArgumentOutOfRangeException("cached glyph atlas range")
      }
      let atlasTexelAvailable = atlasTexelTotal - atlasTexelOffset
      if atlasTexelCount > atlasTexelAvailable {
        throw ArgumentOutOfRangeException("cached glyph atlas range")
      }
      ValidateFinite(value.GlyphMinX, "cached glyph min x")
      ValidateFinite(value.GlyphMinY, "cached glyph min y")
      ValidateFinite(value.GlyphMaxX, "cached glyph max x")
      ValidateFinite(value.GlyphMaxY, "cached glyph max y")
      ValidateFinite(value.EffectRadius, "cached glyph effect radius")
      if value.EffectMode > 2u {
        throw NotSupportedException("Vulkan text renderer supports only fill, shadow, and stroke effects")
      }
      if value.EffectRadius < 0.0F {
        throw ArgumentOutOfRangeException("cached glyph effect radius")
      }
      if value.RenderMode == 3u && value.EffectMode != 0u {
        throw NotSupportedException("Vulkan text effects are unsupported for COLR paint glyphs")
      }
      if value.GlyphMinX >= value.GlyphMaxX || value.GlyphMinY >= value.GlyphMaxY {
        throw ArgumentOutOfRangeException("cached glyph extents")
      }
      let transform = ResolveTransform(frame, value.TransformIndex)
      let rgba = int32(value.Color)
      let red = (rgba >> int32(24)) & int32(255)
      let green = (rgba >> int32(16)) & int32(255)
      let blue = (rgba >> int32(8)) & int32(255)
      let alpha = float32(rgba & int32(255)) / 255.0F
      var record = HbGpuTextInstanceRecord{
        transform_m00: transform.A,
        transform_m01: transform.B,
        transform_m02: 0.0F,
        transform_m03: 0.0F,
        transform_m10: transform.C,
        transform_m11: transform.D,
        transform_m12: 0.0F,
        transform_m13: 0.0F,
        transform_m20: 0.0F,
        transform_m21: 0.0F,
        transform_m22: 1.0F,
        transform_m23: 0.0F,
        transform_m30: transform.TX,
        transform_m31: transform.TY,
        transform_m32: 0.0F,
        transform_m33: 1.0F,
        glyphBounds_x: value.GlyphMinX,
        glyphBounds_y: value.GlyphMinY,
        glyphBounds_z: value.GlyphMaxX,
        glyphBounds_w: value.GlyphMaxY,
        glyphInput_x: value.AtlasTexelOffset,
        glyphInput_y: value.EffectMode,
        glyphInput_z: 0u,
        glyphInput_w: 0u,
        foreground_x: if value.RenderMode == 2u {
          linearChannels[red] * alpha
        } else {
          linearChannels[red]
        },
        foreground_y: if value.RenderMode == 2u {
          linearChannels[green] * alpha
        } else {
          linearChannels[green]
        },
        foreground_z: if value.RenderMode == 2u {
          linearChannels[blue] * alpha
        } else {
          linearChannels[blue]
        },
        foreground_w: alpha,
        effectParams_x: if value.EffectMode == 2u {
          value.EffectRadius
        } else {
          0.0F
        },
        effectParams_y: 0.0F,
        effectParams_z: 0.0F,
        effectParams_w: 0.0F,
      }
      textAtlas!!.BindDescriptor(commandBuffer, textPipelineLayout)
      clipChain!!.BindDescriptor(commandBuffer, textPipelineLayout)
      let recordIndex = UploadPrimitiveRecord(*void(&record))
      BindPrimitiveDescriptor(commandBuffer, textPipelineLayout)
      let bindPipeline = dispatch.vkCmdBindPipeline
      bindPipeline(commandBuffer, VkConstants.VK_PIPELINE_BIND_POINT_GRAPHICS, selectedPipeline)
      activePipeline = selectedPipeline
      let draw = dispatch.vkCmdDraw
      draw(commandBuffer, 6u, 1u, 0u, recordIndex)
    }

  private func FillTransform(
    push * AnalyticSolidPushConstants,
    bounds ConservativeBounds,
    transform PrimitiveTransform,
    extent VkExtent2D) {
      push -> rect_x = bounds.X
      push -> rect_y = bounds.Y
      push -> rect_z = bounds.Width
      push -> rect_w = bounds.Height
      let width = float32(extent.width)
      let height = float32(extent.height)
      push -> transform0_x = 2.0F * transform.A / width
      push -> transform0_y = 2.0F * transform.C / width
      push -> transform0_z = 2.0F * transform.TX / width - 1.0F
      push -> transform0_w = 0.0F
      push -> transform1_x = 2.0F * transform.B / height
      push -> transform1_y = 2.0F * transform.D / height
      push -> transform1_z = 2.0F * transform.TY / height - 1.0F
      push -> transform1_w = 0.0F
    }

  private func FillTransform(
    push * AnalyticBorderPushConstants,
    bounds ConservativeBounds,
    transform PrimitiveTransform,
    extent VkExtent2D) {
      push -> rect_x = bounds.X
      push -> rect_y = bounds.Y
      push -> rect_z = bounds.Width
      push -> rect_w = bounds.Height
      let width = float32(extent.width)
      let height = float32(extent.height)
      push -> transform0_x = 2.0F * transform.A / width
      push -> transform0_y = 2.0F * transform.C / width
      push -> transform0_z = 2.0F * transform.TX / width - 1.0F
      push -> transform0_w = 0.0F
      push -> transform1_x = 2.0F * transform.B / height
      push -> transform1_y = 2.0F * transform.D / height
      push -> transform1_z = 2.0F * transform.TY / height - 1.0F
      push -> transform1_w = 0.0F
    }

  private func FillTransform(
    push * AnalyticLinear4PushConstants,
    bounds ConservativeBounds,
    transform PrimitiveTransform,
    extent VkExtent2D) {
      push -> rect_x = bounds.X
      push -> rect_y = bounds.Y
      push -> rect_z = bounds.Width
      push -> rect_w = bounds.Height
      let width = float32(extent.width)
      let height = float32(extent.height)
      push -> transform0_x = 2.0F * transform.A / width
      push -> transform0_y = 2.0F * transform.C / width
      push -> transform0_z = 2.0F * transform.TX / width - 1.0F
      push -> transform0_w = 0.0F
      push -> transform1_x = 2.0F * transform.B / height
      push -> transform1_y = 2.0F * transform.D / height
      push -> transform1_z = 2.0F * transform.TY / height - 1.0F
      push -> transform1_w = 0.0F
    }

  private func FillTransform(
    push * AnalyticRadial4PushConstants,
    bounds ConservativeBounds,
    transform PrimitiveTransform,
    extent VkExtent2D) {
      push -> rect_x = bounds.X
      push -> rect_y = bounds.Y
      push -> rect_z = bounds.Width
      push -> rect_w = bounds.Height
      let width = float32(extent.width)
      let height = float32(extent.height)
      push -> transform0_x = 2.0F * transform.A / width
      push -> transform0_y = 2.0F * transform.C / width
      push -> transform0_z = 2.0F * transform.TX / width - 1.0F
      push -> transform0_w = 0.0F
      push -> transform1_x = 2.0F * transform.B / height
      push -> transform1_y = 2.0F * transform.D / height
      push -> transform1_z = 2.0F * transform.TY / height - 1.0F
      push -> transform1_w = 0.0F
    }

  private func FillTransform(
    push * SampledImagePushConstants,
    bounds ConservativeBounds,
    transform PrimitiveTransform,
    extent VkExtent2D) {
      push -> rect_x = bounds.X
      push -> rect_y = bounds.Y
      push -> rect_z = bounds.Width
      push -> rect_w = bounds.Height
      let width = float32(extent.width)
      let height = float32(extent.height)
      push -> transform0_x = 2.0F * transform.A / width
      push -> transform0_y = 2.0F * transform.C / width
      push -> transform0_z = 2.0F * transform.TX / width - 1.0F
      push -> transform0_w = 0.0F
      push -> transform1_x = 2.0F * transform.B / height
      push -> transform1_y = 2.0F * transform.D / height
      push -> transform1_z = 2.0F * transform.TY / height - 1.0F
      push -> transform1_w = 0.0F
    }

  private func FillLinearStops(
    push * AnalyticLinear4PushConstants,
    frame SceneFrame,
    start int32,
    count int32,
    opacity float32) {
      let first = frame.GradientStops[start]
      let second = frame.GradientStops[start + 1]
      var third = second
      var fourth = second
      if count >= 3 {
        third = frame.GradientStops[start + 2]
      }
      if count >= 4 {
        fourth = frame.GradientStops[start + 3]
      }
      push -> stopPositions_x = first.Offset
      push -> stopPositions_y = second.Offset
      push -> stopPositions_z = third.Offset
      push -> stopPositions_w = fourth.Offset
      let packedFirst = PackColor(first.Color, opacity)
      let packedSecond = PackColor(second.Color, opacity)
      let packedThird = PackColor(third.Color, opacity)
      let packedFourth = PackColor(fourth.Color, opacity)
      push -> packedColors_x = packedFirst.Rgb
      push -> packedColors_y = packedSecond.Rgb
      push -> packedColors_z = packedThird.Rgb
      push -> packedColors_w = PackAlphaTriplet(packedFirst.Alpha, packedSecond.Alpha, packedThird.Alpha)
      push -> packedColorsExtra_x = packedFourth.Rgb
      push -> packedColorsExtra_y = packedFourth.Alpha
      push -> packedColorsExtra_z = uint32(count)
      push -> packedColorsExtra_w = 0u
    }

  private func FillRadialStops(
    push * AnalyticRadial4PushConstants,
    frame SceneFrame,
    start int32,
    count int32,
    opacity float32) {
      let first = frame.GradientStops[start]
      let second = frame.GradientStops[start + 1]
      var third = second
      var fourth = second
      if count >= 3 {
        third = frame.GradientStops[start + 2]
      }
      if count >= 4 {
        fourth = frame.GradientStops[start + 3]
      }
      push -> stopPositions_x = first.Offset
      push -> stopPositions_y = second.Offset
      push -> stopPositions_z = third.Offset
      push -> stopPositions_w = fourth.Offset
      let packedFirst = PackColor(first.Color, opacity)
      let packedSecond = PackColor(second.Color, opacity)
      let packedThird = PackColor(third.Color, opacity)
      let packedFourth = PackColor(fourth.Color, opacity)
      push -> packedColors_x = packedFirst.Rgb
      push -> packedColors_y = packedSecond.Rgb
      push -> packedColors_z = packedThird.Rgb
      push -> packedColors_w = PackAlphaTriplet(packedFirst.Alpha, packedSecond.Alpha, packedThird.Alpha)
      push -> packedColorsExtra_x = packedFourth.Rgb
      push -> packedColorsExtra_y = packedFourth.Alpha
      push -> packedColorsExtra_z = uint32(count)
      push -> packedColorsExtra_w = 0u
    }

  private func UploadPrimitiveRecord(source * void) uint32 {
    if source == nil || primitiveAllocation == nil || primitiveAllocation!!.mapped == nil {
      throw InvalidOperationException("Vulkan primitive buffer is not mapped")
    }
    if primitiveRecordOrdinal >= PrimitiveRecordCapacity {
      throw InvalidOperationException("Vulkan primitive record buffer capacity exceeded")
    }
    let recordIndex = primitiveRecordOrdinal
    let destination = *uint32(nint(primitiveAllocation!!.mapped)
      +nint(uint64(recordIndex) * PrimitiveRecordSize))
    let words = *uint32(nint(source))
    var index int32 = 0
    while index < 32 {
      destination[index] = words[index]
      index = index + 1
    }
    let flushResult = allocator.FlushBeforeSubmit(primitiveAllocation!!, 0uL, PrimitiveRecordSize)
    if flushResult != VkConstants.VK_SUCCESS {
      throw InvalidOperationException("vkFlushMappedMemoryRanges failed for Vulkan primitive buffer")
    }
    primitiveRecordOrdinal = primitiveRecordOrdinal + 1u
    return recordIndex
  }

  private func BindPrimitiveDescriptor(commandBuffer VkCommandBuffer, layout VkPipelineLayout) {
    let bindDescriptorSets = dispatch.vkCmdBindDescriptorSets
    bindDescriptorSets(commandBuffer, VkConstants.VK_PIPELINE_BIND_POINT_GRAPHICS,
      layout, 2u, 1u, &primitiveDescriptorSet, 0u, nil)
  }

  private func BindAndDraw(commandBuffer VkCommandBuffer, pipeline VkPipeline, pushData * void) {
    let primitiveWords = *uint32(nint(pushData))
    primitiveWords[PrimitiveClipDrawOrdinalWord] = currentDrawOrdinal
    let recordIndex = UploadPrimitiveRecord(pushData)
    if activePipeline != pipeline {
      let bindPipeline = dispatch.vkCmdBindPipeline
      bindPipeline(commandBuffer, VkConstants.VK_PIPELINE_BIND_POINT_GRAPHICS, pipeline)
      activePipeline = pipeline
    }
    clipChain!!.BindDescriptor(commandBuffer, pipelineLayout)
    BindPrimitiveDescriptor(commandBuffer, pipelineLayout)
    let draw = dispatch.vkCmdDraw
    if uint64(recordIndex) > uint64(uint32.MaxValue) / 4uL {
      throw ArgumentOutOfRangeException("recordIndex")
    }
    draw(commandBuffer, 4u, 1u, recordIndex * 4u, 0u)
  }

  private func PushClip(commandBuffer VkCommandBuffer, clip PrimitiveClip) {
    if clipDepth >= clipStack.Length {
      throw InvalidOperationException("Vulkan primitive clip stack capacity exceeded")
    }
    var combined = clip
    if clipDepth > 0 {
      let parent = clipStack[clipDepth - 1]
      combined = Intersect(parent, clip)
    }
    clipStack[clipDepth] = combined
    clipDepth = clipDepth + 1
    SetScissor(commandBuffer, combined)
  }

  private func PopClip(commandBuffer VkCommandBuffer) {
    if clipDepth <= 0 {
      throw InvalidOperationException("Vulkan primitive clip stack underflow")
    }
    clipDepth = clipDepth - 1
    if clipDepth > 0 {
      SetScissor(commandBuffer, clipStack[clipDepth - 1])
    } else {
      let full = PrimitiveClip{
        Left: 0,
        Top: 0,
        Right: int32(activeExtent.width),
        Bottom: int32(activeExtent.height),
      }
      SetScissor(commandBuffer, full)
    }
  }

  private func ResolveClip(
    bounds ConservativeBounds,
    transform PrimitiveTransform,
    extent VkExtent2D) PrimitiveClip{
      if bounds.IsEmpty {
        return PrimitiveClip{ Left: 0, Top: 0, Right: 0, Bottom: 0 }
      }
      let x0 = transform.A * bounds.X + transform.C * bounds.Y + transform.TX
      let y0 = transform.B * bounds.X + transform.D * bounds.Y + transform.TY
      let x1 = transform.A * bounds.Right + transform.C * bounds.Bottom + transform.TX
      let y1 = transform.B * bounds.Right + transform.D * bounds.Bottom + transform.TY
      ValidateFinite(x0, "clip x0")
      ValidateFinite(y0, "clip y0")
      ValidateFinite(x1, "clip x1")
      ValidateFinite(y1, "clip y1")
      var leftValue = MathF.Floor(Min(x0, x1))
      var topValue = MathF.Floor(Min(y0, y1))
      var rightValue = MathF.Ceiling(Max(x0, x1))
      var bottomValue = MathF.Ceiling(Max(y0, y1))
      let width = float32(extent.width)
      let height = float32(extent.height)
      if leftValue < 0.0F { leftValue = 0.0F }
      if topValue < 0.0F { topValue = 0.0F }
      if rightValue < 0.0F { rightValue = 0.0F }
      if bottomValue < 0.0F { bottomValue = 0.0F }
      if leftValue > width { leftValue = width }
      if topValue > height { topValue = height }
      if rightValue > width { rightValue = width }
      if bottomValue > height { bottomValue = height }
      if rightValue < leftValue { rightValue = leftValue }
      if bottomValue < topValue { bottomValue = topValue }
      return PrimitiveClip{
        Left: int32(leftValue),
        Top: int32(topValue),
        Right: int32(rightValue),
        Bottom: int32(bottomValue),
      }
    }

  private func Intersect(first PrimitiveClip, second PrimitiveClip) PrimitiveClip {
    var result = PrimitiveClip{}
    result.Left = Max(first.Left, second.Left)
    result.Top = Max(first.Top, second.Top)
    result.Right = Min(first.Right, second.Right)
    result.Bottom = Min(first.Bottom, second.Bottom)
    if result.Right < result.Left { result.Right = result.Left }
    if result.Bottom < result.Top { result.Bottom = result.Top }
    return result
  }

  private func SetScissor(commandBuffer VkCommandBuffer, value PrimitiveClip) {
    var scissor = VkRect2D{}
    scissor.offset = VkOffset2D{}
    scissor.offset.x = value.Left
    scissor.offset.y = value.Top
    var width int32 = value.Right - value.Left
    var height int32 = value.Bottom - value.Top
    if width < 0 { width = 0 }
    if height < 0 { height = 0 }
    scissor.extent.width = uint32(width)
    scissor.extent.height = uint32(height)
    let setScissor = dispatch.vkCmdSetScissor
    setScissor(commandBuffer, 0u, 1u, &scissor)
  }

  private func ResolveTransform(frame SceneFrame, index int32) PrimitiveTransform {
    if index < -1 || index >= frame.TransformCount {
      throw ArgumentOutOfRangeException("transform index")
    }
    var result = PrimitiveTransform{ A: 1.0F, B: 0.0F, C: 0.0F, D: 1.0F, TX: 0.0F, TY: 0.0F }
    var current = index
    var steps int32 = 0
    while current >= 0 {
      if current >= frame.TransformCount || steps >= frame.TransformCount {
        throw InvalidOperationException("Vulkan primitive transform chain is invalid")
      }
      let value = frame.Transforms[current]
      ValidateTransformRecord(value, frame.TransformCount)
      result = Compose(value, result)
      current = value.ParentIndex
      steps = steps + 1
    }
    ValidateFinite(result.A, "resolved transform a")
    ValidateFinite(result.B, "resolved transform b")
    ValidateFinite(result.C, "resolved transform c")
    ValidateFinite(result.D, "resolved transform d")
    ValidateFinite(result.TX, "resolved transform tx")
    ValidateFinite(result.TY, "resolved transform ty")
    return result
  }

  private func Compose(outer TransformRecord, inner PrimitiveTransform) PrimitiveTransform -> PrimitiveTransform {
    A: outer.A * inner.A + outer.C * inner.B,
    B: outer.B * inner.A + outer.D * inner.B,
    C: outer.A * inner.C + outer.C * inner.D,
    D: outer.B * inner.C + outer.D * inner.D,
    TX: outer.A * inner.TX + outer.C * inner.TY + outer.TX,
    TY: outer.B * inner.TX + outer.D * inner.TY + outer.TY,
  }

  private func PackColor(value uint32, opacity float32) PackedPrimitiveColor {
    let rgba = int32(value)
    let red = (rgba >> int32(24)) & int32(255)
    let green = (rgba >> int32(16)) & int32(255)
    let blue = (rgba >> int32(8)) & int32(255)
    let alpha = float32(rgba & int32(255)) / 255.0F
    let effectiveAlpha = Clamp01(alpha * opacity)
    let packedRed = Quantize(linearChannels[red] * effectiveAlpha, 2047u)
    let packedGreen = Quantize(linearChannels[green] * effectiveAlpha, 2047u)
    let packedBlue = Quantize(linearChannels[blue] * effectiveAlpha, 1023u)
    let packedAlpha = Quantize(effectiveAlpha, 1023u)
    let packedRgb = uint32(int32(packedRed)
      | (int32(packedGreen) << int32(11))
      | (int32(packedBlue) << int32(22)))
    return PackedPrimitiveColor{ Rgb: packedRgb, Alpha: packedAlpha }
  }

  private func PackAlphaTriplet(first uint32, second uint32, third uint32) uint32 -> uint32((int32(first) & int32(1023))
    | ((int32(second) & int32(1023)) << int32(10))
    | ((int32(third) & int32(1023)) << int32(20)))

  private func Quantize(value float32, maximum uint32) uint32 {
    let bounded = Clamp01(value)
    return uint32(int32(bounded * float32(maximum) + 0.5F))
  }

  private func Clamp01(value float32) float32 {
    if value <= 0.0F { return 0.0F }
    if value >= 1.0F { return 1.0F }
    return value
  }

  private func ClampLength(value float32, limit float32) float32 {
    if value <= 0.0F { return 0.0F }
    if value >= limit { return limit }
    return value
  }

  private func Min(first float32, second float32) float32 -> MathF.Min(first, second)

  private func Max(first float32, second float32) float32 -> MathF.Max(first, second)

  private func Min(first int32, second int32) int32 -> first < second ? first : second

  private func Max(first int32, second int32) int32 -> first > second ? first : second
}
