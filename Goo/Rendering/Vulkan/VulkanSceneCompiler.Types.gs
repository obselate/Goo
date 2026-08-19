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

internal enum VulkanSceneUnsupportedBlobKind {
    None = 0;
    Container = 1;
    Button = 2;
    Text = 3;
    TextEntry = 4;
    TextEditor = 5;
    Shape = 6;
    Image = 7;
}

internal enum VulkanSceneUnsupportedField {
    None = 0;
    BackgroundGradient = 1;
    BackgroundImage = 2;
    BackgroundImageSource = 3;
    BackgroundImageFit = 4;
    ClipPath = 5;
    ClipPathFit = 6;
    BorderStyle = 7;
    BlendMode = 8;
    Opacity = 9;
    BoxShadows = 10;
    OutlineWidth = 11;
    OutlineColor = 12;
    OutlineOffset = 13;
    TextShadows = 14;
    TextStrokeWidth = 15;
    TextStrokeColor = 16;
    TextDecoration = 17;
    ShapePath = 18;
    ShapeFit = 19;
    ShapeFillRule = 20;
    ShapeStrokeWidth = 21;
    ShapeStrokeColor = 22;
    ShapeStrokeCap = 23;
    ShapeStrokeJoin = 24;
    ShapeMiterLimit = 25;
    ShapeCornerRadius = 26;
    ShapeDashes = 27;
    OverflowX = 28;
    OverflowY = 29;
    Content = 30;
    ImagePath = 31;
    ImageSource = 32;
    ImageFit = 33;
    TextStyleRanges = 34;
    EntryValue = 35;
    EntryPlaceholder = 36;
    EntrySelectionColor = 37;
    EditorDocument = 38;
    EditorController = 39;
    EditorLayers = 40;
    EditorReadOnly = 41;
    EditorPlaceholder = 42;
    EditorSelectionColor = 43;
    EditorCaretColor = 44;
    EditorCurrentLineColor = 45;
    EditorOverscanLines = 46;
    BorderRadius = 47;
    ClipDepth = 48;
    EditorSlots = 49;
    EditorComposition = 50;
}

internal enum VulkanSceneUnsupportedPrimitive {
    None = 0;
    Text = 1;
    Image = 2;
    Shape = 3;
    TextEntry = 4;
    TextEditor = 5;
    Gradient = 6;
    LinearGradient = 7;
    RadialGradient = 8;
    RoundedGradient = 9;
    Border = 10;
    RectClip = 11;
    GroupOpacity = 12;
    BackgroundImage = 13;
    ClipPath = 14;
    Blend = 15;
    BoxShadow = 16;
    Outline = 17;
    TextShadow = 18;
    TextStroke = 19;
    ShapePath = 20;
    ShapeStroke = 21;
    RectClipMixedAxis = 22;
    RectClipRounded = 23;
    RectClipNonAxisAligned = 24;
    RectClipDepth = 25;
}

internal data struct VulkanSceneUnsupportedDetail {
    internal var OwnerId uint64
    internal var NodeKind NodeKind
    internal var Blob VulkanSceneUnsupportedBlobKind
    internal var Field VulkanSceneUnsupportedField
    internal var Primitive VulkanSceneUnsupportedPrimitive
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
    internal var UnsupportedDetails []VulkanSceneUnsupportedDetail
    internal var UnsupportedDetailCount int32
    internal var UnsupportedDetailDropped int32
    internal var BackgroundDrawn bool

    internal prop HasUnsupported bool {
        get {
            return UnsupportedMask != 0u || UnsupportedNodeCount != 0
                || UnsupportedPrimitiveCount != 0 || UnsupportedDetailCount != 0
                || UnsupportedDetailDropped != 0
        }
    }
}

internal class VulkanSceneOwnerId {
    internal var Value uint64

    internal init(value uint64) {
        Value = value
    }
}
