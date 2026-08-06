package Goo

import System
import System.Runtime.CompilerServices

/// Specifies one immutable text shadow.
public data struct TextShadow {
  private var offsetX Length
  private var offsetY Length
  private var blur Length
  private var color Color

  /// Gets the horizontal offset in pixels.
  public prop OffsetX Length {
    get { return normalizedDefault(offsetX) }
    init { offsetX = validateTextShadowGeometry(value, "OffsetX") }
  }

  /// Gets the vertical offset in pixels.
  public prop OffsetY Length {
    get { return normalizedDefault(offsetY) }
    init { offsetY = validateTextShadowGeometry(value, "OffsetY") }
  }

  /// Gets the non-negative blur radius in pixels.
  public prop Blur Length {
    get { return normalizedDefault(blur) }
    init { blur = normalizeTextShadowBlur(value) }
  }

  /// Gets the shadow color.
  public prop Color Color {
    get { return color }
    init { color = value }
  }
}

internal class TextShadowing {
  shared {
    private var values ConditionalWeakTable[Node, BoxShadowStack]?

    internal func Get(n Node) BoxShadowStack? {
      if !n.HasTextShadowState { return nil }
      if let existing = values {
        if existing.TryGetValue(n, out var value) { return value }
      }
      n.HasTextShadowState = false
      return nil
    }

    internal func Set(n Node, value BoxShadowStack?) {
      if textShadowCount(value) == 0 {
        values?.Remove(n)
        n.HasTextShadowState = false
        return
      }
      let current = Get(n)
      if sameTextShadows(current, value) {
        return
      }
      if current != nil { values?.Remove(n) }
      if values == nil { values = ConditionalWeakTable[Node, BoxShadowStack]() }
      guard let stack = value else {
        return
      }
      values?.Add(n, stack)
      n.HasTextShadowState = true
    }
  }
}

internal func copyTextShadows(values []TextShadow) BoxShadowStack {
  var visible int32 = 0
  for i in 0 ... values.Length {
    if !transparentTextShadow(values[i]) { visible++ }
  }
  let items = [visible]BoxShadow
  var target int32 = 0
  for i in 0 ... values.Length {
    let normalized = normalizeTextShadow(values[i])
    if normalized.Color.A == 0.0F { continue }
    items[target] = textShadowPayload(normalized)
    target++
  }
  return BoxShadowStack(items)
}

internal func singleTextShadow(value TextShadow) BoxShadowStack {
  let normalized = normalizeTextShadow(value)
  if normalized.Color.A == 0.0F {
    return BoxShadowStack([0]BoxShadow)
  }
  let items = [1]BoxShadow
  items[0] = textShadowPayload(normalized)
  return BoxShadowStack(items)
}

internal func normalizeTextShadow(value TextShadow) TextShadow {
  return TextShadow{
    OffsetX: value.OffsetX,
    OffsetY: value.OffsetY,
    Blur: value.Blur,
    Color: value.Color,
  }
}

internal func textShadowCount(value BoxShadowStack?) int32 {
  return boxShadowCount(value)
}

internal func textShadowAt(value BoxShadowStack?, index int32) TextShadow {
  let shadow = boxShadowAt(value, index)
  return TextShadow{
    OffsetX: shadow.OffsetX,
    OffsetY: shadow.OffsetY,
    Blur: shadow.Blur,
    Color: shadow.Color,
  }
}

internal func sameTextShadows(left BoxShadowStack?, right BoxShadowStack?) bool {
  let leftCount = textShadowCount(left)
  let rightCount = textShadowCount(right)
  if leftCount != rightCount { return false }
  for i in 0 ... leftCount {
    if textShadowAt(left, i) != textShadowAt(right, i) { return false }
  }
  return true
}

private func textShadowPayload(value TextShadow) BoxShadow {
  return BoxShadow{
    OffsetX: value.OffsetX,
    OffsetY: value.OffsetY,
    Blur: value.Blur,
    Color: value.Color,
  }
}

private func transparentTextShadow(value TextShadow) bool {
  return normalizeTextShadow(value).Color.A == 0.0F
}

private func validateTextShadowGeometry(value Length, name string) Length {
  if value.Unit == LengthUnit.Unset { return 0 }
  if value.Unit == LengthUnit.Auto || value.Unit == LengthUnit.Percent {
    throw ArgumentException("TextShadow." + name + " must use pixel units", name)
  }
  if Double.IsNaN(float64(value.Value)) || Double.IsInfinity(float64(value.Value)) {
    throw ArgumentOutOfRangeException(name)
  }
  return value
}

private func normalizeTextShadowBlur(value Length) Length {
  let geometry = validateTextShadowGeometry(value, "Blur")
  if geometry.Value < 0.0F { return 0 }
  return geometry
}
