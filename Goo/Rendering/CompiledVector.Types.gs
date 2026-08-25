package Goo

import System

internal enum CompiledVectorSectionKind {
  Nodes; Contours; Curves; Paints; PaintStops; Strokes; DashValues; Clips; Tracks;
  Keyframes; MorphCurves
}

internal enum CompiledVectorPaintKind {
  Solid; LinearGradient;
  RadialGradient
}

internal enum CompiledVectorTrackKind {
  Transform; Opacity; Color;
  Stroke; Morph
}

internal enum CompiledVectorValueKind {
  Scalar; Color; Transform;
  Stroke; Morph
}

internal enum CompiledVectorEasingKind {
  Linear; Step;
  Cubic
}

internal data struct CompiledVectorSection {
  internal let Offset int32
  internal let Length int32
  internal let Count int32
  internal let Stride int32
}

internal sealed class CompiledVectorReader {
  private let bytes []uint8

  internal init(bytes []uint8) {
    this.bytes = bytes
  }

  internal prop Length int32 { get { return bytes.Length } }

  internal func ReadU16(offset int32) uint16 {
    return uint16(uint32(bytes[offset]) | (uint32(bytes[offset + 1]) << 8))
  }

  internal func ReadU32(offset int32) uint32 {
    return uint32(bytes[offset])
      | (uint32(bytes[offset + 1]) << 8)
      | (uint32(bytes[offset + 2]) << 16)
      | (uint32(bytes[offset + 3]) << 24)
  }

  internal func ReadF32(offset int32) float32 {
    return BitConverter.Int32BitsToSingle(int32(ReadU32(offset)))
  }

  internal func ReadColor(offset int32) Color {
    let packed = ReadU32(offset)
    return Color.Rgba(
      int32((packed >> 24) & 255u),
      int32((packed >> 16) & 255u),
      int32((packed >> 8) & 255u),
      int32(packed & 255u))
  }

  internal func IsFinite(value float32) bool {
    return !Single.IsNaN(value) && !Single.IsInfinity(value)
  }
}

internal struct CompiledVectorNodeView {
  private let reader CompiledVectorReader
  private let offset int32

  internal init(reader CompiledVectorReader, offset int32) {
    this.reader = reader
    this.offset = offset
  }

  internal prop ParentIndex uint32 { get { return reader.ReadU32(offset) } }
  internal prop FirstChildIndex uint32 { get { return reader.ReadU32(offset + 4) } }
  internal prop ChildCount uint32 { get { return reader.ReadU32(offset + 8) } }
  internal prop Flags uint32 { get { return reader.ReadU32(offset + 12) } }
  internal prop ContourStart uint32 { get { return reader.ReadU32(offset + 16) } }
  internal prop ContourCount uint32 { get { return reader.ReadU32(offset + 20) } }
  internal prop PaintIndex uint32 { get { return reader.ReadU32(offset + 24) } }
  internal prop StrokeIndex uint32 { get { return reader.ReadU32(offset + 28) } }
  internal prop ClipIndex uint32 { get { return reader.ReadU32(offset + 32) } }
  internal prop TransformTrackIndex uint32 { get { return reader.ReadU32(offset + 36) } }
  internal prop OpacityTrackIndex uint32 { get { return reader.ReadU32(offset + 40) } }
  internal prop MorphTrackIndex uint32 {
    get { return reader.ReadU32(offset + 44) }
  }
  internal prop M11 float32 { get { return reader.ReadF32(offset + 48) } }
  internal prop M12 float32 { get { return reader.ReadF32(offset + 52) } }
  internal prop M21 float32 { get { return reader.ReadF32(offset + 56) } }
  internal prop M22 float32 { get { return reader.ReadF32(offset + 60) } }
  internal prop TranslateX float32 { get { return reader.ReadF32(offset + 64) } }
  internal prop TranslateY float32 { get { return reader.ReadF32(offset + 68) } }
  internal prop Opacity float32 { get { return reader.ReadF32(offset + 72) } }
  internal prop TransformReserved uint32 { get { return reader.ReadU32(offset + 76) } }

  internal prop HasParent bool { get { return ParentIndex != CompiledVectorLimits.MissingIndex } }
  internal prop HasChildren bool { get { return ChildCount != 0u } }
  internal prop HasPaint bool { get { return PaintIndex != CompiledVectorLimits.MissingIndex } }
  internal prop HasStroke bool { get { return StrokeIndex != CompiledVectorLimits.MissingIndex } }
  internal prop HasClip bool { get { return ClipIndex != CompiledVectorLimits.MissingIndex } }
  internal prop HasTransformTrack bool {
    get { return TransformTrackIndex != CompiledVectorLimits.MissingIndex }
  }
  internal prop HasOpacityTrack bool {
    get { return OpacityTrackIndex != CompiledVectorLimits.MissingIndex }
  }
  internal prop HasMorphTrack bool {
    get { return MorphTrackIndex != CompiledVectorLimits.MissingIndex }
  }
}

internal struct CompiledVectorContourView {
  private let reader CompiledVectorReader
  private let offset int32

  internal init(reader CompiledVectorReader, offset int32) {
    this.reader = reader
    this.offset = offset
  }

  internal prop CurveStart uint32 { get { return reader.ReadU32(offset) } }
  internal prop CurveCount uint32 { get { return reader.ReadU32(offset + 4) } }
  internal prop Flags uint32 { get { return reader.ReadU32(offset + 8) } }
  internal prop Reserved uint32 { get { return reader.ReadU32(offset + 12) } }
  internal prop Closed bool { get { return (Flags & CompiledVectorLimits.ContourClosed) != 0u } }
}

internal struct CompiledVectorCurveView {
  private let reader CompiledVectorReader
  private let offset int32

  internal init(reader CompiledVectorReader, offset int32) {
    this.reader = reader
    this.offset = offset
  }

  internal prop X0 float32 { get { return reader.ReadF32(offset) } }
  internal prop Y0 float32 { get { return reader.ReadF32(offset + 4) } }
  internal prop CX float32 { get { return reader.ReadF32(offset + 8) } }
  internal prop CY float32 { get { return reader.ReadF32(offset + 12) } }
  internal prop X1 float32 { get { return reader.ReadF32(offset + 16) } }
  internal prop Y1 float32 { get { return reader.ReadF32(offset + 20) } }
}

internal struct CompiledVectorMorphCurveView {
  private let reader CompiledVectorReader
  private let offset int32

  internal init(reader CompiledVectorReader, offset int32) {
    this.reader = reader
    this.offset = offset
  }

  internal prop X0 float32 { get { return reader.ReadF32(offset) } }
  internal prop Y0 float32 { get { return reader.ReadF32(offset + 4) } }
  internal prop CX float32 { get { return reader.ReadF32(offset + 8) } }
  internal prop CY float32 { get { return reader.ReadF32(offset + 12) } }
  internal prop X1 float32 { get { return reader.ReadF32(offset + 16) } }
  internal prop Y1 float32 { get { return reader.ReadF32(offset + 20) } }
}

internal struct CompiledVectorPaintView {
  private let reader CompiledVectorReader
  private let offset int32

  internal init(reader CompiledVectorReader, offset int32) {
    this.reader = reader
    this.offset = offset
  }

  internal prop Kind CompiledVectorPaintKind {
    get { return CompiledVectorPaintKind(reader.ReadU16(offset)) }
  }
  internal prop Flags uint32 { get { return uint32(reader.ReadU16(offset + 2)) } }
  internal prop Color Color { get { return reader.ReadColor(offset + 4) } }
  internal prop Opacity float32 { get { return reader.ReadF32(offset + 8) } }
  internal prop X0 float32 { get { return reader.ReadF32(offset + 12) } }
  internal prop Y0 float32 { get { return reader.ReadF32(offset + 16) } }
  internal prop X1 float32 { get { return reader.ReadF32(offset + 20) } }
  internal prop Y1 float32 { get { return reader.ReadF32(offset + 24) } }
  internal prop TrackIndex uint32 { get { return reader.ReadU32(offset + 28) } }
  internal prop StopStart uint32 { get { return reader.ReadU32(offset + 32) } }
  internal prop StopCount uint32 { get { return reader.ReadU32(offset + 36) } }
  internal prop HasTrack bool { get { return TrackIndex != CompiledVectorLimits.MissingIndex } }
  internal prop HasStops bool { get { return StopCount != 0u } }
}

internal struct CompiledVectorPaintStopView {
  private let reader CompiledVectorReader
  private let offset int32

  internal init(reader CompiledVectorReader, offset int32) {
    this.reader = reader
    this.offset = offset
  }

  internal prop Offset float32 { get { return reader.ReadF32(offset) } }
  internal prop Color Color { get { return reader.ReadColor(offset + 4) } }
  internal prop Reserved uint32 { get { return reader.ReadU32(offset + 8) } }
}

internal struct CompiledVectorStrokeView {
  private let reader CompiledVectorReader
  private let offset int32

  internal init(reader CompiledVectorReader, offset int32) {
    this.reader = reader
    this.offset = offset
  }

  internal prop Width float32 { get { return reader.ReadF32(offset) } }
  internal prop MiterLimit float32 { get { return reader.ReadF32(offset + 4) } }
  internal prop Cap uint32 { get { return reader.ReadU32(offset + 8) } }
  internal prop Join uint32 { get { return reader.ReadU32(offset + 12) } }
  internal prop DashOffset float32 { get { return reader.ReadF32(offset + 16) } }
  internal prop PaintIndex uint32 { get { return reader.ReadU32(offset + 20) } }
  internal prop TrackIndex uint32 { get { return reader.ReadU32(offset + 24) } }
  internal prop DashStart uint32 { get { return reader.ReadU32(offset + 28) } }
  internal prop DashCount uint32 { get { return reader.ReadU32(offset + 32) } }
  internal prop HasTrack bool { get { return TrackIndex != CompiledVectorLimits.MissingIndex } }
  internal prop HasPaint bool { get { return PaintIndex != CompiledVectorLimits.MissingIndex } }
  internal prop HasDashes bool { get { return DashCount != 0u } }
}

internal struct CompiledVectorClipView {
  private let reader CompiledVectorReader
  private let offset int32

  internal init(reader CompiledVectorReader, offset int32) {
    this.reader = reader
    this.offset = offset
  }

  internal prop ContourStart uint32 { get { return reader.ReadU32(offset) } }
  internal prop ContourCount uint32 { get { return reader.ReadU32(offset + 4) } }
  internal prop FillRule uint32 { get { return reader.ReadU32(offset + 8) } }
  internal prop ParentClipIndex uint32 { get { return reader.ReadU32(offset + 12) } }
  internal prop HasParentClip bool {
    get { return ParentClipIndex != CompiledVectorLimits.MissingIndex }
  }
}

internal struct CompiledVectorTrackView {
  private let reader CompiledVectorReader
  private let offset int32

  internal init(reader CompiledVectorReader, offset int32) {
    this.reader = reader
    this.offset = offset
  }

  internal prop Kind CompiledVectorTrackKind {
    get { return CompiledVectorTrackKind(reader.ReadU16(offset)) }
  }
  internal prop ValueKind CompiledVectorValueKind {
    get { return CompiledVectorValueKind(reader.ReadU16(offset + 2)) }
  }
  internal prop KeyframeStart uint32 { get { return reader.ReadU32(offset + 4) } }
  internal prop KeyframeCount uint32 { get { return reader.ReadU32(offset + 8) } }
  internal prop Duration float32 { get { return reader.ReadF32(offset + 12) } }
  internal prop Flags uint32 { get { return reader.ReadU32(offset + 16) } }
  internal prop Reserved uint32 { get { return reader.ReadU32(offset + 20) } }
}

internal struct CompiledVectorKeyframeView {
  private let reader CompiledVectorReader
  private let offset int32

  internal init(reader CompiledVectorReader, offset int32) {
    this.reader = reader
    this.offset = offset
  }

  internal prop Time float32 { get { return reader.ReadF32(offset) } }
  internal prop A float32 { get { return reader.ReadF32(offset + 4) } }
  internal prop B float32 { get { return reader.ReadF32(offset + 8) } }
  internal prop C float32 { get { return reader.ReadF32(offset + 12) } }
  internal prop D float32 { get { return reader.ReadF32(offset + 16) } }
  internal prop E float32 { get { return reader.ReadF32(offset + 20) } }
  internal prop F float32 { get { return reader.ReadF32(offset + 24) } }
  internal prop Easing uint32 { get { return reader.ReadU32(offset + 28) } }
  internal prop ControlA float32 { get { return reader.ReadF32(offset + 32) } }
  internal prop ControlB float32 { get { return reader.ReadF32(offset + 36) } }
  internal prop ControlC float32 { get { return reader.ReadF32(offset + 40) } }
  internal prop ControlD float32 { get { return reader.ReadF32(offset + 44) } }
}

internal struct CompiledVectorMorphKeyframeView {
  private let reader CompiledVectorReader
  private let offset int32

  internal init(reader CompiledVectorReader, offset int32) {
    this.reader = reader
    this.offset = offset
  }

  internal prop Time float32 { get { return reader.ReadF32(offset) } }
  internal prop TargetCurveStart uint32 { get { return reader.ReadU32(offset + 4) } }
  internal prop TargetCurveCount uint32 { get { return reader.ReadU32(offset + 8) } }
  internal prop Easing uint32 { get { return reader.ReadU32(offset + 28) } }
  internal prop ControlA float32 { get { return reader.ReadF32(offset + 32) } }
  internal prop ControlB float32 { get { return reader.ReadF32(offset + 36) } }
  internal prop ControlC float32 { get { return reader.ReadF32(offset + 40) } }
  internal prop ControlD float32 { get { return reader.ReadF32(offset + 44) } }
}

internal class CompiledVectorLimits {
  shared {
    internal const Magic uint32 = 0x31564347u
    internal const Version uint16 = uint16(1)
    internal const HeaderByteCount int32 = 172
    internal const SectionCount int32 = 11
    internal const NodeStride int32 = 80
    internal const ContourStride int32 = 16
    internal const CurveStride int32 = 24
    internal const MorphCurveStride int32 = 24
    internal const PaintStride int32 = 40
    internal const PaintStopStride int32 = 12
    internal const StrokeStride int32 = 40
    internal const DashValueStride int32 = 4
    internal const ClipStride int32 = 16
    internal const TrackStride int32 = 24
    internal const KeyframeStride int32 = 48
    internal const MaxAssetBytes int32 = 67108864
    internal const MaxNodes int32 = 65536
    internal const MaxContours int32 = 65536
    internal const MaxCurves int32 = 262144
    internal const MaxMorphCurves int32 = 262144
    internal const MaxPaints int32 = 65536
    internal const MaxPaintStops int32 = 262144
    internal const MaxStrokes int32 = 65536
    internal const MaxDashValues int32 = 262144
    internal const MaxClips int32 = 65536
    internal const MaxTracks int32 = 65536
    internal const MaxKeyframes int32 = 262144
    internal const MaxRenderDepth int32 = 1024
    internal const MissingIndex uint32 = 0xffffffffu
    internal const NodeEvenOdd uint32 = 1u
    internal const ContourClosed uint32 = 1u
    internal const TrackLoop uint32 = 1u
    internal const TrackPingPong uint32 = 2u
  }
}
