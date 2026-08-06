package Goo

import System.Collections.Generic

// Members stay in field-table order. Each ordinal is a StyleMask bit.
internal enum StyleField {
  Width; Height; MinWidth; MinHeight; MaxWidth; MaxHeight; AspectRatio;
  Padding; PaddingLeft; PaddingTop; PaddingRight; PaddingBottom;
  Margin; MarginLeft; MarginTop; MarginRight; MarginBottom;
  Gap; RowGap; ColumnGap;
  FlexDirection; FlexWrap; JustifyContent; AlignItems; AlignSelf; AlignContent;
  FlexGrow; FlexShrink; FlexBasis;
  Position; Left; Top; Right; Bottom;
  Display; OverflowX; OverflowY;
  BackgroundColor; BorderRadius; BorderTopLeftRadius; BorderTopRightRadius;
  BorderBottomLeftRadius; BorderBottomRightRadius;
  BorderLeftWidth; BorderTopWidth; BorderRightWidth; BorderBottomWidth;
  BorderLeftColor; BorderTopColor; BorderRightColor; BorderBottomColor;
  Opacity;
  BoxShadows;
  Color; FontFamily; FontSize; FontStyle; FontWeight; LetterSpacing; LineHeight; TextAlign;
  BackgroundGradient;
  Cursor;
  ZIndex;
  TextWrap; TextTrimming; TextTransform;
  OutlineWidth; OutlineColor; OutlineOffset;
  Visibility;
  TextDecoration;
  TransformTranslateX; TransformTranslateY; TransformRotate; TransformScale;
  TransformOriginX; TransformOriginY;
  TextShadows;
  ShapeStrokeWidth; ShapeStrokeColor;
  TextMaxLines;
  TextStrokeWidth; TextStrokeColor;
  Direction;
  MarginStart; MarginEnd;
  PaddingStart; PaddingEnd;
  Start; End;
  BorderStartWidth; BorderEndWidth;
  BorderStartColor; BorderEndColor;
  BackgroundImage; BackgroundImageFit;
  ClipPath; ClipPathFit;
  BorderStyle; BlendMode;
  TransformScaleX; TransformScaleY; TransformSkewX; TransformSkewY;
  BackgroundImageSource
}

internal data struct StyleMask {
  internal var Low uint64
  internal var High uint64
}

private func styleMaskOrdinal(field StyleField) int32 {
  let ordinal = int32(field)
  let styleMaskCapacity int32 = 128
  if ordinal < 0 || ordinal >= styleMaskCapacity {
    throw ArgumentOutOfRangeException("field")
  }
  return ordinal
}

internal func styleMaskWith(mask StyleMask, field StyleField) StyleMask {
  let ordinal = styleMaskOrdinal(field)
  if ordinal < 64 {
    return StyleMask{ Low: mask.Low | (uint64(1) << ordinal), High: mask.High }
  }
  return StyleMask{ Low: mask.Low, High: mask.High | (uint64(1) << (ordinal - 64)) }
}

internal func styleMaskWithout(mask StyleMask, field StyleField) StyleMask {
  let ordinal = styleMaskOrdinal(field)
  if ordinal < 64 {
    return StyleMask{ Low: mask.Low & ^(uint64(1) << ordinal), High: mask.High }
  }
  return StyleMask{ Low: mask.Low, High: mask.High & ^(uint64(1) << (ordinal - 64)) }
}

internal func styleMaskHas(mask StyleMask, field StyleField) bool {
  let ordinal = styleMaskOrdinal(field)
  if ordinal < 64 {
    return (mask.Low & (uint64(1) << ordinal)) != uint64(0)
  }
  return (mask.High & (uint64(1) << (ordinal - 64))) != uint64(0)
}

internal func styleMaskUnion(left StyleMask, right StyleMask) StyleMask {
  return StyleMask{ Low: left.Low | right.Low, High: left.High | right.High }
}

internal func styleMaskExcept(left StyleMask, right StyleMask) StyleMask {
  return StyleMask{ Low: left.Low & ^right.Low, High: left.High & ^right.High }
}

internal func styleMaskEmpty(mask StyleMask) bool {
  return mask.Low == uint64(0) && mask.High == uint64(0)
}

internal data struct StyleEntry {
  internal var Field StyleField
  internal var A float32
  internal var B float32
  internal var C float32
  internal var D float32
  internal var Payload object?
}

internal class StyleEntries {
  private var first StyleEntry
  private var second StyleEntry
  private var third StyleEntry
  private var fourth StyleEntry
  private var spill List[StyleEntry]?
  private var count int32

  internal prop Count int32 { get { return count } }

  internal func Add(value StyleEntry) {
    switch count {
      case 0 { first = value }
      case 1 { second = value }
      case 2 { third = value }
      case 3 { fourth = value }
      default {
        if spill == nil { spill = List[StyleEntry](4) }
        spill?.Add(value)
      }
    }
    count++
  }

  internal func At(index int32) StyleEntry {
    if index < 0 || index >= count { throw ArgumentOutOfRangeException("index") }
    switch index {
      case 0 { return first }
      case 1 { return second }
      case 2 { return third }
      case 3 { return fourth }
      default {
        guard let values = spill else { throw InvalidOperationException("missing style spill") }
        return values[index - 4]
      }
    }
  }
}

internal func entryText(entry StyleEntry) string? {
  return entry.Payload as string?
}

internal func entryGradient(entry StyleEntry) Gradient? {
  return switch entry.Payload {
    case value is Gradient: value
    case _: nil
  }
}

internal func entryShadows(entry StyleEntry) BoxShadowStack? {
  return switch entry.Payload {
    case value is BoxShadowStack: value
    case _: nil
  }
}

internal func entryPath(entry StyleEntry) VectorPath {
  return switch entry.Payload {
    case value is VectorPathData: VectorPath{ payload: value }
    case _: VectorPath.Empty
  }
}

internal func entryImageSource(entry StyleEntry) ImageSourceProvider? {
  return entry.Payload as ImageSourceProvider?
}

internal func samePath(left VectorPath, right VectorPath) bool {
  if left.payload == right.payload { return true }
  guard let data = left.payload else { return false }
  return data.Equals(right.payload)
}
