package Goo

import System

internal enum SceneResourceKind {
    None;
    Image;
    Sampler;
    GlyphRun;
    Atlas;
    PathMesh;
    Mesh;
    Brush;
    Mask;
    Pipeline;
    OffscreenTarget;
}

internal struct ResourceId {
    internal var Kind SceneResourceKind
    internal var LogicalId uint64
    internal var Version uint64

    internal prop IsValid bool {
        get { return Kind != SceneResourceKind.None && LogicalId != 0uL && Version != 0uL }
    }
}

internal struct ConservativeBounds {
    internal var X float32
    internal var Y float32
    internal var Width float32
    internal var Height float32

    internal prop Right float32 {
        get { return X + Width }
    }

    internal prop Bottom float32 {
        get { return Y + Height }
    }

    internal prop IsEmpty bool {
        get { return Width <= 0.0F || Height <= 0.0F }
    }

    internal func Inflate(amount float32) ConservativeBounds {
        return ConservativeBounds{
            X: X - amount,
            Y: Y - amount,
            Width: Width + amount + amount,
            Height: Height + amount + amount,
        }
    }
}

internal enum SceneDrawKind {
    SolidBox;
    RoundedBox;
    PerEdgeBorder;
    LinearGradient;
    RadialGradient;
    CachedImage;
    CachedGlyphRun;
    PrebuiltPathMesh;
    Transform;
    RectClipBegin;
    RectClipEnd;
    Shadow;
    Underline;
    CustomMesh;
    LayerBegin;
    LayerEnd;
}

internal struct DrawRef {
    internal var Kind SceneDrawKind
    internal var Index int32
    internal var Flags uint32
}

internal struct SceneChunk {
    internal var OwnerId uint64
    internal var Version uint64
    internal var Bounds ConservativeBounds
    internal var FirstDraw int32
    internal var DrawCount int32
    internal var FirstResource int32
    internal var ResourceCount int32
    internal var Dirty bool
}

internal struct SolidBoxRecord {
    internal var Bounds ConservativeBounds
    internal var Color uint32
    internal var Opacity float32
    internal var TransformIndex int32
}

internal struct RoundedBoxRecord {
    internal var Bounds ConservativeBounds
    internal var RadiusTopLeft float32
    internal var RadiusTopRight float32
    internal var RadiusBottomRight float32
    internal var RadiusBottomLeft float32
    internal var Color uint32
    internal var Opacity float32
    internal var TransformIndex int32
}

internal struct PerEdgeBorderRecord {
    internal var Bounds ConservativeBounds
    internal var TopWidth float32
    internal var RightWidth float32
    internal var BottomWidth float32
    internal var LeftWidth float32
    internal var TopColor uint32
    internal var RightColor uint32
    internal var BottomColor uint32
    internal var LeftColor uint32
    internal var Style uint32
    internal var TransformIndex int32
}

internal struct GradientStopRecord {
    internal var Offset float32
    internal var Color uint32
}

internal struct LinearGradientRecord {
    internal var Bounds ConservativeBounds
    internal var StartX float32
    internal var StartY float32
    internal var EndX float32
    internal var EndY float32
    internal var StopStart int32
    internal var StopCount int32
    internal var Opacity float32
    internal var TransformIndex int32
}

internal struct RadialGradientRecord {
    internal var Bounds ConservativeBounds
    internal var CenterX float32
    internal var CenterY float32
    internal var RadiusX float32
    internal var RadiusY float32
    internal var StopStart int32
    internal var StopCount int32
    internal var Opacity float32
    internal var TransformIndex int32
}

internal struct CachedImageRefRecord {
    internal var Bounds ConservativeBounds
    internal var ImageId ResourceId
    internal var SamplerId ResourceId
    internal var SourceX float32
    internal var SourceY float32
    internal var SourceWidth float32
    internal var SourceHeight float32
    internal var Opacity float32
    internal var Sampling uint32
    internal var TransformIndex int32
}

internal struct CachedGlyphRunRefRecord {
    internal var Bounds ConservativeBounds
    internal var GlyphRunId ResourceId
    internal var AtlasId ResourceId
    internal var GlyphId uint32
    internal var AtlasTexelOffset uint32
    internal var AtlasTexelCount uint32
    internal var GlyphMinX float32
    internal var GlyphMinY float32
    internal var GlyphMaxX float32
    internal var GlyphMaxY float32
    internal var Color uint32
    internal var RenderMode uint32
    internal var TransformIndex int32
}

internal struct PrebuiltPathMeshRefRecord {
    internal var Bounds ConservativeBounds
    internal var MeshId ResourceId
    internal var FillBrushId ResourceId
    internal var StrokeBrushId ResourceId
    internal var FillRule uint32
    internal var StrokeWidth float32
    internal var StrokeColor uint32
    internal var TransformIndex int32
}

internal struct TransformRecord {
    internal var A float32
    internal var B float32
    internal var C float32
    internal var D float32
    internal var TX float32
    internal var TY float32
    internal var ParentIndex int32
}

internal struct RectClipRecord {
    internal var Bounds ConservativeBounds
    internal var TransformIndex int32
    internal var ParentIndex int32
}

internal struct ShadowRecord {
    internal var Bounds ConservativeBounds
    internal var RadiusTopLeft float32
    internal var RadiusTopRight float32
    internal var RadiusBottomRight float32
    internal var RadiusBottomLeft float32
    internal var OffsetX float32
    internal var OffsetY float32
    internal var Spread float32
    internal var Blur float32
    internal var Color uint32
    internal var MaskId ResourceId
    internal var Inset bool
    internal var TransformIndex int32
}

internal struct UnderlineRecord {
    internal var Bounds ConservativeBounds
    internal var Thickness float32
    internal var Color uint32
    internal var Mode uint32
    internal var TransformIndex int32
}

internal struct CustomMeshRecord {
    internal var Bounds ConservativeBounds
    internal var MeshId ResourceId
    internal var PipelineId ResourceId
    internal var VertexCount uint32
    internal var IndexCount uint32
    internal var Topology uint32
    internal var Opacity float32
    internal var TransformIndex int32
}

internal struct LayerRecord {
    internal var Bounds ConservativeBounds
    internal var Opacity float32
    internal var BlendMode uint32
    internal var OffscreenTargetId ResourceId
    internal var Flags uint32
    internal var TransformIndex int32
}

internal struct ScenePlanCounters {
    internal var GrowthOperations uint64
    internal var RecordOperations uint64
    internal var DrawReferenceOperations uint64
    internal var ResourceReferenceOperations uint64
    internal var ChunkOperations uint64
    internal var ResetOperations uint64
}
