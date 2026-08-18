package Goo

import System
import System.Runtime.CompilerServices

internal partial class VulkanSceneCompiler {
    private const BackgroundOwnerId uint64 = 1uL
    private const FirstNodeOwnerId uint64 = 2uL

    private let frame SceneFrame
    private let owners ConditionalWeakTable[Node, VulkanSceneOwnerId]
    private var textScene VulkanTextScene?
    private var nextOwnerId uint64
    private var frameVersion uint64
    private var visibleNodeCount int32
    private var emittedNodeCount int32
    private var unsupportedNodeCount int32
    private var unsupportedPrimitiveCount int32
    private var skippedNodeCount int32
    private var scrollNodeCount int32
    private var unsupportedMask uint32
    private var clipCount int32
    private var transformCount int32
    private var backgroundDrawn bool
    private var lastResult VulkanSceneCompileResult

    internal convenience init() {
        init(32)
    }

    internal init(capacity int32) {
        if capacity <= 0 {
            throw ArgumentOutOfRangeException("capacity")
        }
        frame = SceneFrame(capacity)
        owners = ConditionalWeakTable[Node, VulkanSceneOwnerId]()
        nextOwnerId = FirstNodeOwnerId
    }

    internal prop Frame SceneFrame {
        get { return frame }
    }

    internal prop LastResult VulkanSceneCompileResult {
        get { return lastResult }
    }

    internal func SetTextScene(value VulkanTextScene?) {
        textScene = value
    }

    internal func Compile(
        root Node?,
        background Color,
        viewportWidth float32,
        viewportHeight float32) VulkanSceneCompileResult {
        ValidateViewport(viewportWidth, viewportHeight)
        frameVersion = NextVersion(frameVersion)
        frame.ResetForReuse()
        visibleNodeCount = 0
        emittedNodeCount = 0
        unsupportedNodeCount = 0
        unsupportedPrimitiveCount = 0
        skippedNodeCount = 0
        scrollNodeCount = 0
        unsupportedMask = 0u
        clipCount = 0
        transformCount = 0
        backgroundDrawn = false

        let viewport = ConservativeBounds{
            X: 0.0F,
            Y: 0.0F,
            Width: viewportWidth,
            Height: viewportHeight,
        }
        frame.BeginChunk(BackgroundOwnerId, frameVersion, viewport, true)
        if background.A > 0.0F {
            frame.AddSolidBox(SolidBoxRecord{
                Bounds: viewport,
                Color: background.ToPackedRgba(),
                Opacity: 1.0F,
                TransformIndex: -1,
            })
            backgroundDrawn = true
        }
        frame.EndChunk()

        var rootOwnerId uint64 = 0uL
        if let node = root {
            rootOwnerId = OwnerId(node)
            CompileNode(node, -1, -1, 1.0F, true)
        }

        lastResult = VulkanSceneCompileResult{
            FrameVersion: frameVersion,
            RootOwnerId: rootOwnerId,
            ChunkCount: frame.ChunkCount,
            DrawCount: frame.DrawRefCount,
            VisibleNodeCount: visibleNodeCount,
            EmittedNodeCount: emittedNodeCount,
            UnsupportedNodeCount: unsupportedNodeCount,
            UnsupportedPrimitiveCount: unsupportedPrimitiveCount,
            SkippedNodeCount: skippedNodeCount,
            ScrollNodeCount: scrollNodeCount,
            ClipCount: clipCount,
            TransformCount: transformCount,
            UnsupportedMask: unsupportedMask,
            BackgroundDrawn: backgroundDrawn,
        }
        return lastResult
    }

    private func CompileNode(
        node Node,
        parentTransformIndex int32,
        parentClipIndex int32,
        parentOpacity float32,
        parentAxisAligned bool) {
        let ownerId = OwnerId(node)
        if node.Retired || node.Display == Display.None || node.Visibility == Visibility.Hidden {
            skippedNodeCount = skippedNodeCount + 1
            return
        }

        let opacity = EffectiveOpacity(parentOpacity, node.Opacity)
        if opacity <= 0.0F {
            skippedNodeCount = skippedNodeCount + 1
            return
        }
        visibleNodeCount = visibleNodeCount + 1
        if node.ScrollX != 0.0F || node.ScrollY != 0.0F {
            scrollNodeCount = scrollNodeCount + 1
        }
        MarkUnsupportedNode(node)
        if node.Children.Count != 0 && (parentOpacity < 1.0F || opacity < 1.0F) {
            MarkUnsupported(VulkanSceneUnsupportedKind.GroupOpacity)
        }

        let bounds = NodeBounds(node)
        frame.BeginChunk(ownerId, frameVersion, bounds, true)
        let transform = AddNodeTransform(node, parentTransformIndex)
        transformCount = frame.TransformCount
        let axisAligned = parentAxisAligned && transform.AxisAligned
        var clipIndex int32 = -1
        if HasOverflowClip(node) {
            if axisAligned {
                let clip = RectClipRecord{
                    Bounds: bounds,
                    TransformIndex: transform.Index,
                    ParentIndex: parentClipIndex,
                }
                clipIndex = frame.AddRectClipBegin(clip)
                clipCount = clipCount + 1
            } else {
                MarkUnsupported(VulkanSceneUnsupportedKind.Clip)
            }
        }
        PaintNode(node, bounds, opacity, transform.Index)
        let childTransform = AddScrollTransform(node, transform.Index)
        transformCount = frame.TransformCount
        frame.EndChunk()
        emittedNodeCount = emittedNodeCount + 1

        let childClipIndex = clipIndex >= 0 ? clipIndex : parentClipIndex
        let children = Stacking.Children(node)
        var index int32 = 0
        while index < children.Count {
            CompileNode(children[index], childTransform, childClipIndex, opacity, axisAligned)
            index = index + 1
        }

        if clipIndex >= 0 {
            frame.BeginChunk(ownerId, frameVersion, bounds, false)
            frame.AddRectClipEnd(RectClipRecord{
                Bounds: bounds,
                TransformIndex: transform.Index,
                ParentIndex: parentClipIndex,
            })
            frame.EndChunk()
        }
    }

    private func OwnerId(node Node) uint64 {
        if owners.TryGetValue(node, out var existing) {
            return existing.Value
        }
        if nextOwnerId == uint64.MaxValue {
            throw OverflowException("Vulkan scene owner id overflow")
        }
        let value = VulkanSceneOwnerId(nextOwnerId)
        owners.Add(node, value)
        nextOwnerId = nextOwnerId + 1uL
        return value.Value
    }

    private func NextVersion(value uint64) uint64 {
        if value == uint64.MaxValue {
            return 1uL
        }
        return value + 1uL
    }

    private func MarkUnsupportedNode(node Node) {
        switch node.Kind {
            case NodeKind.Text {
                if textScene == nil {
                    MarkUnsupported(VulkanSceneUnsupportedKind.Text)
                    unsupportedNodeCount = unsupportedNodeCount + 1
                }
            }
            case NodeKind.Image {
                MarkUnsupported(VulkanSceneUnsupportedKind.Image)
                unsupportedNodeCount = unsupportedNodeCount + 1
            }
            case NodeKind.Shape {
                MarkUnsupported(VulkanSceneUnsupportedKind.Shape)
                unsupportedNodeCount = unsupportedNodeCount + 1
            }
            case NodeKind.Entry {
                MarkUnsupported(VulkanSceneUnsupportedKind.Entry)
                unsupportedNodeCount = unsupportedNodeCount + 1
            }
            case NodeKind.Editor {
                MarkUnsupported(VulkanSceneUnsupportedKind.Editor)
                unsupportedNodeCount = unsupportedNodeCount + 1
            }
            case _ { }
        }
    }

    private func MarkUnsupported(kind VulkanSceneUnsupportedKind) {
        unsupportedMask = unsupportedMask | uint32(kind)
        unsupportedPrimitiveCount = unsupportedPrimitiveCount + 1
    }
}
