package Goo

internal enum VulkanSceneUnsupportedKind {
    None = 0;
    Text = 1;
    Image = 2;
    Shape = 4;
    Entry = 8;
    Editor = 16;
    Gradient = 32;
    BorderStyle = 64;
    Clip = 128;
    GroupOpacity = 256;
}

internal data struct VulkanSceneTransformState {
    internal var Index int32
    internal var AxisAligned bool
}

internal data struct VulkanSceneCompileResult {
    internal var FrameVersion uint64
    internal var RootOwnerId uint64
    internal var ChunkCount int32
    internal var DrawCount int32
    internal var VisibleNodeCount int32
    internal var EmittedNodeCount int32
    internal var UnsupportedNodeCount int32
    internal var UnsupportedPrimitiveCount int32
    internal var SkippedNodeCount int32
    internal var ScrollNodeCount int32
    internal var ClipCount int32
    internal var TransformCount int32
    internal var UnsupportedMask uint32
    internal var BackgroundDrawn bool

    internal prop HasUnsupported bool {
        get { return UnsupportedMask != 0u || UnsupportedNodeCount != 0 || UnsupportedPrimitiveCount != 0 }
    }
}

internal class VulkanSceneOwnerId {
    internal var Value uint64

    internal init(value uint64) {
        Value = value
    }
}
