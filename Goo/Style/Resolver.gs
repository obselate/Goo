package Goo

import System
import System.Collections.Generic
import System.Threading

internal enum FieldKind { KLength; KColor; KScalar; KEnum; KString; KGradient; KBoxShadows; KPath; KImageSource; KShaderEffect }

internal data struct Transition {
  internal var Field StyleField
  internal var FromA float32
  internal var FromB float32
  internal var FromC float32
  internal var FromD float32
  internal var ToA float32
  internal var ToB float32
  internal var ToC float32
  internal var ToD float32
  internal var FromShadows BoxShadowStack?
  internal var ToShadows BoxShadowStack?
  internal var TargetShadows BoxShadowStack?
  internal var WorkingShadows BoxShadowStack?
  internal var Easing Easing
  internal var Elapsed float64
  internal var Duration float64
}

internal class Resolver {
  shared {
    private var nextStylePass int64

    private func newStylePass() int64 {
      return Interlocked.Increment(&nextStylePass)
    }

    internal let inheritableFields []StyleField = []StyleField{
      StyleField.Direction, StyleField.Color, StyleField.FontFamily, StyleField.FontSize,
      StyleField.FontStyle, StyleField.FontWeight, StyleField.LetterSpacing, StyleField.LineHeight,
      StyleField.TextAlign, StyleField.TextWrap, StyleField.TextDecoration, StyleField.TextTransform,
      StyleField.TextShadows, StyleField.TextStrokeWidth, StyleField.TextStrokeColor, StyleField.Cursor }

    private let marginEdges []StyleField = []StyleField{
      StyleField.MarginLeft, StyleField.MarginTop, StyleField.MarginRight, StyleField.MarginBottom }
    private let paddingEdges []StyleField = []StyleField{
      StyleField.PaddingLeft, StyleField.PaddingTop, StyleField.PaddingRight, StyleField.PaddingBottom }
  }

  internal prop Animating List[Node] { get; init; }
  internal prop PaintResourceInvalidated Action? { get; set; }
  internal prop ShaderEffectInvalidated Action? { get; set; }
  private let pending List[Node]
  private let inheritedScratch []StyleEntry
  private var pendingCursor int32
  private var stylePass int64
  internal var VisualDirty bool
  private var pendingEffects ReconcileEffects
  internal init() {
    Animating = List[Node]()
    pending = List[Node]()
    inheritedScratch = [inheritableFields.Length]StyleEntry
  }

  internal func Invalidate(n Node, initial bool) {
    queue(n)
    n.StylePendingSelf = true
    if initial {
      n.StylePendingInitial = true
    }
  }

  internal func Flush() int64 {
    var visits int64 = 0
    try {
      while pendingCursor < pending.Count {
        visits = visits + resolvePending(pending[pendingCursor])
        pendingCursor++
      }
    } finally {
      pending.Clear()
      pendingCursor = 0
    }
    return visits
  }

  internal func FlushEffects() ReconcileEffects {
    let result = pendingEffects
    pendingEffects = ReconcileEffects.None
    return result
  }

  internal func DiscardPending() {
    pending.Clear()
    pendingCursor = 0
    pendingEffects = ReconcileEffects.None
  }

  private func queue(n Node) {
    if pending.Count == 0 {
      stylePass = newStylePass()
    }
    if n.StyleQueuedPass == stylePass {
      return
    }
    n.StyleQueuedPass = stylePass
    n.StylePendingSelf = false
    n.StylePendingInitial = false
    n.StylePendingInheritedMask = StyleMask{}
    pending.Add(n)
  }

  private func invalidateInherited(n Node, fields StyleMask) {
    if styleMaskEmpty(fields) {
      return
    }
    queue(n)
    n.StylePendingInheritedMask = styleMaskUnion(n.StylePendingInheritedMask, fields)
  }

  private func resolvePending(n Node) int64 {
    if n.StyleResolvedPass == stylePass {
      return 0
    }
    if n.Retired {
      n.StyleResolvedPass = stylePass
      return 0
    }
    var visits int64 = 0
    if let parent = n.Parent {
      if parent.StyleQueuedPass == stylePass && parent.StyleResolvedPass != stylePass {
        visits = visits + resolvePending(parent)
      }
    }
    let self = n.StylePendingSelf
    let initial = n.StylePendingInitial
    let inherited = n.StylePendingInheritedMask
    n.StylePendingSelf = false
    n.StylePendingInitial = false
    n.StylePendingInheritedMask = StyleMask{}
    if !self && styleMaskEmpty(styleMaskExcept(inherited, n.LocalMask)) {
      n.StyleResolvedPass = stylePass
      return visits
    }
    var changed = StyleMask{}
    if n.Children.Count == 0 {
      resolveNode(n, initial)
    } else {
      changed = resolveNodeChanged(n, initial)
    }
    n.StyleResolvedPass = stylePass
    if !styleMaskEmpty(changed) {
      for i in 0 ... n.Children.Count {
        invalidateInherited(n.Children[i], changed)
      }
    }
    return visits + 1
  }

  private func resolveNodeChanged(n Node, initial bool) StyleMask {
    for i in 0 ... inheritableFields.Length {
      inheritedScratch[i] = readField(n, inheritableFields[i])
    }
    resolveNode(n, initial)
    var changed = StyleMask{}
    for i in 0 ... inheritableFields.Length {
      changed = changedField(changed, inheritedScratch[i], n, inheritableFields[i])
    }
    return changed
  }

  private func changedField(mask StyleMask, before StyleEntry, n Node, field StyleField) StyleMask {
    if sameEntry(before, readField(n, field)) {
      return mask
    }
    return styleMaskWith(mask, field)
  }

  private func resolveNode(n Node, initial bool) {
    writeField(n, StyleEntry{ Field: StyleField.Direction,
      A: float32(int32(effectiveDirection(n))) }, initial)
    var localMask = StyleMask{}
    // Higher active layers shadow lower entries before transition retargeting.
    let hoverMask = !n.Disabled && n.Hovered ? fieldsMask(n, n.HoverStyle) : StyleMask{}
    let focusMask = !n.Disabled && n.Focused ? fieldsMask(n, n.FocusStyle) : StyleMask{}
    let pressMask = !n.Disabled && n.Pressed ? fieldsMask(n, n.ActiveStyle) : StyleMask{}
    let disabledMask = n.Disabled ? fieldsMask(n, n.DisabledStyle) : StyleMask{}
    let allStateMasks = styleMaskUnion(styleMaskUnion(hoverMask, focusMask),
      styleMaskUnion(pressMask, disabledMask))
    localMask = applyList(n, n.BaseStyle, localMask, initial, allStateMasks)
    if !n.Disabled && n.Hovered {
      localMask = applyList(n, n.HoverStyle, localMask, initial, styleMaskUnion(focusMask, pressMask))
    }
    if !n.Disabled && n.Focused {
      localMask = applyList(n, n.FocusStyle, localMask, initial, pressMask)
    }
    if !n.Disabled && n.Pressed {
      localMask = applyList(n, n.ActiveStyle, localMask, initial, StyleMask{})
    }
    if n.Disabled {
      localMask = applyList(n, n.DisabledStyle, localMask, initial, StyleMask{})
    }
    n.LocalMask = localMask
    let inheritedMask = applyInherited(n, localMask, initial)
    let mask = styleMaskUnion(localMask, inheritedMask)
    let gone = styleMaskExcept(n.AppliedMask, mask)
    if !styleMaskEmpty(gone) {
      for i in 0 ... int32(StyleField.ShaderEffect) + 1 {
        let f = StyleField(int32(i))
        if styleMaskHas(gone, f) {
          writeField(n, defaultStyleEntry(f), initial)
        }
      }
    }
    n.AppliedMask = mask
  }

  internal func applyInherited(n Node, localMask StyleMask, initial bool) StyleMask {
    guard let parent = n.Parent else { return StyleMask{} }
    var mask = StyleMask{}
    for f in inheritableFields {
      mask = inherit(n, parent, localMask, mask, f, initial)
    }
    return mask
  }

  internal func inherit(n Node, parent Node, localMask StyleMask, inheritedMask StyleMask, f StyleField, initial bool) StyleMask {
    if styleMaskHas(localMask, f) {
      return inheritedMask
    }
    writeField(n, readField(parent, f), initial)
    return styleMaskWith(inheritedMask, f)
  }

  internal func fieldsMask(n Node, entries StyleEntries?) StyleMask {
    guard let list = entries else { return StyleMask{} }
    var m = StyleMask{}
    for i in 0 ... list.Count {
      let field = list.At(i).Field
      if !styleFieldApplies(n, field) { continue }
      if field == StyleField.Margin {
        m = styleMaskWithBoxEdges(m, marginEdges)
      } else if field == StyleField.Padding {
        m = styleMaskWithBoxEdges(m, paddingEdges)
      } else {
        m = styleMaskWith(m, styleFieldForNode(n, field))
      }
    }
    return m
  }

  private func styleMaskWithBoxEdges(mask StyleMask, edges []StyleField) StyleMask {
    var m = mask
    for f in edges {
      m = styleMaskWith(m, f)
    }
    return m
  }

  internal func applyList(n Node, entries StyleEntries?, mask StyleMask, initial bool, shadow StyleMask) StyleMask {
    guard let list = entries else { return mask }
    var m = mask
    for i in 0 ... list.Count {
      var e = list.At(i)
      let logical = isLogicalStyleField(e.Field)
      if !styleFieldApplies(n, e.Field) {
        continue
      }
      if e.Field == StyleField.Direction {
        m = styleMaskWith(m, StyleField.Direction)
        continue
      }
      if e.Field == StyleField.Margin {
        m = applyCanonicalBoxEdges(n, e, m, initial, shadow, marginEdges)
        continue
      }
      if e.Field == StyleField.Padding {
        m = applyCanonicalBoxEdges(n, e, m, initial, shadow, paddingEdges)
        continue
      }
      e.Field = styleFieldForNode(n, e.Field)
      m = styleMaskWith(m, e.Field)
      if !styleMaskHas(shadow, e.Field) {
        if logical {
          writeSnapField(n, e)
        } else {
          writeField(n, e, initial)
        }
      }
    }
    return m
  }

  private func applyCanonicalBoxEdges(n Node, source StyleEntry, mask StyleMask,
    initial bool, shadow StyleMask, edges []StyleField) StyleMask {
    var m = mask
    for f in edges {
      m = applyCanonicalBoxEdge(n, source, m, initial, shadow, f)
    }
    return m
  }

  private func applyCanonicalBoxEdge(n Node, source StyleEntry, mask StyleMask,
    initial bool, shadow StyleMask, field StyleField) StyleMask {
    var e = source
    e.Field = field
    let m = styleMaskWith(mask, field)
    if !styleMaskHas(shadow, field) {
      writeField(n, e, initial)
    }
    return m
  }

  internal func styleFieldForNode(n Node, f StyleField) StyleField {
    if isLogicalStyleField(f) {
      let rtl = n.Direction == Direction.RightToLeft
      return switch f {
        case StyleField.MarginStart: rtl ? StyleField.MarginRight : StyleField.MarginLeft
        case StyleField.MarginEnd: rtl ? StyleField.MarginLeft : StyleField.MarginRight
        case StyleField.PaddingStart: rtl ? StyleField.PaddingRight : StyleField.PaddingLeft
        case StyleField.PaddingEnd: rtl ? StyleField.PaddingLeft : StyleField.PaddingRight
        case StyleField.Start: rtl ? StyleField.Right : StyleField.Left
        case StyleField.End: rtl ? StyleField.Left : StyleField.Right
        case StyleField.BorderStartWidth: rtl ? StyleField.BorderRightWidth : StyleField.BorderLeftWidth
        case StyleField.BorderEndWidth: rtl ? StyleField.BorderLeftWidth : StyleField.BorderRightWidth
        case StyleField.BorderStartColor: rtl ? StyleField.BorderRightColor : StyleField.BorderLeftColor
        case StyleField.BorderEndColor: rtl ? StyleField.BorderLeftColor : StyleField.BorderRightColor
        case _: throw NotSupportedException("styleFieldForNode: unhandled logical StyleField")
      }
    }
    if n.Kind != NodeKind.Shape {
      if f == StyleField.ShapeStrokeWidth { return StyleField.BorderLeftWidth }
      if f == StyleField.ShapeStrokeColor { return StyleField.BorderLeftColor }
    }
    return f
  }

  private func effectiveDirection(n Node) Direction {
    var result = if let parent = n.Parent { parent.Direction } else { Direction.Auto }
    result = declaredDirection(n.BaseStyle, result)
    if !n.Disabled && n.Hovered { result = declaredDirection(n.HoverStyle, result) }
    if !n.Disabled && n.Focused { result = declaredDirection(n.FocusStyle, result) }
    if !n.Disabled && n.Pressed { result = declaredDirection(n.ActiveStyle, result) }
    if n.Disabled { result = declaredDirection(n.DisabledStyle, result) }
    return result
  }

  private func declaredDirection(entries StyleEntries?, fallback Direction) Direction {
    guard let list = entries else { return fallback }
    var result = fallback
    for i in 0 ... list.Count {
      let entry = list.At(i)
      if entry.Field == StyleField.Direction {
        result = Direction(int32(entry.A))
      }
    }
    return result
  }

  // Direct write on initial resolve, non-animatable fields, or when transitions
  // are off; otherwise starts (or retargets) a lerp from the displayed value.
  internal func writeField(n Node, e StyleEntry, initial bool) {
    if !styleFieldApplies(n, e.Field) {
      finishTransition(n, e.Field)
      return
    }
    if e.Field == StyleField.BoxShadows {
      writeBoxShadows(n, e, initial)
      return
    }
    if initial || n.TransitionMs <= 0.0 || !lerpable(e.Field)
      || !transitionSelected(n.TransitionSelection, e.Field) {
      if sameEntry(readField(n, e.Field), e) {
        finishTransition(n, e.Field)
        return
      }
      finishTransition(n, e.Field)
      if writeDirectWithInvalidation(n, e, invalidationFor(e.Field)) {
        recordResolvedChange(e.Field)
      }
      return
    }
    let cur = readField(n, e.Field)
    if cur.A == e.A && cur.B == e.B && cur.C == e.C && cur.D == e.D {
      finishTransition(n, e.Field)
      return
    }
    if fieldKind(e.Field) == FieldKind.KLength && cur.B != e.B {
      finishTransition(n, e.Field)
      if writeDirectWithInvalidation(n, e, invalidationFor(e.Field)) {
        recordResolvedChange(e.Field)
      }
      return
    }
    startOrRetarget(n, e, cur)
  }

  internal func writeSnapField(n Node, e StyleEntry) {
    if sameEntry(readField(n, e.Field), e) {
      finishTransition(n, e.Field)
      return
    }
    finishTransition(n, e.Field)
    if writeDirectWithInvalidation(n, e, invalidationFor(e.Field)) {
      recordResolvedChange(e.Field)
    }
  }

  internal func writeBoxShadows(n Node, e StyleEntry, initial bool) {
    let cur = readField(n, StyleField.BoxShadows)
    if sameEntry(cur, e) {
      finishTransition(n, StyleField.BoxShadows)
      return
    }
    if initial || n.TransitionMs <= 0.0
      || !transitionSelected(n.TransitionSelection, StyleField.BoxShadows)
      || !boxShadowListsCompatible(entryShadows(cur), entryShadows(e)) {
      finishTransition(n, StyleField.BoxShadows)
      if writeDirectWithInvalidation(n, e, PaintResourceInvalidated) {
        if n.Kind == NodeKind.Shape { ShapeGeometry.ClearShadowArtifacts(n) }
        recordResolvedChange(StyleField.BoxShadows)
      }
      return
    }
    startOrRetargetBoxShadows(n, e, cur)
  }

  internal func startOrRetarget(n Node, e StyleEntry, cur StyleEntry) {
    if n.Transitions == nil {
      n.Transitions = List[Transition]()
    }
    guard let unwrapped = n.Transitions else {
      return
    }
    let list = unwrapped
    for i in 0 ... list.Count {
      if list[i].Field == e.Field {
        if list[i].ToA == e.A && list[i].ToB == e.B && list[i].ToC == e.C && list[i].ToD == e.D {
          return
        }
        list[i] = Transition{ Field: e.Field,
          FromA: cur.A, FromB: cur.B, FromC: cur.C, FromD: cur.D,
          ToA: e.A, ToB: e.B, ToC: e.C, ToD: e.D,
          Easing: n.TransitionEasing,
          Elapsed: -n.TransitionDelayMs / 1000.0, Duration: n.TransitionMs / 1000.0 }
        return
      }
    }
    list.Add(Transition{ Field: e.Field,
      FromA: cur.A, FromB: cur.B, FromC: cur.C, FromD: cur.D,
      ToA: e.A, ToB: e.B, ToC: e.C, ToD: e.D,
      Easing: n.TransitionEasing,
      Elapsed: -n.TransitionDelayMs / 1000.0, Duration: n.TransitionMs / 1000.0 })
    if !containsAnimating(n) { Animating.Add(n) }
  }

  internal func startOrRetargetBoxShadows(n Node, e StyleEntry, cur StyleEntry) {
    if n.Transitions == nil {
      n.Transitions = List[Transition]()
    }
    guard let unwrapped = n.Transitions else {
      return
    }
    let list = unwrapped
    for i in 0 ... list.Count {
      if list[i].Field == StyleField.BoxShadows {
        if sameBoxShadows(list[i].TargetShadows, entryShadows(e)) {
          return
        }
        list[i] = makeBoxShadowTransition(entryShadows(cur), entryShadows(e),
          n.TransitionEasing, n.TransitionMs / 1000.0, n.TransitionDelayMs / 1000.0)
        return
      }
    }
    list.Add(makeBoxShadowTransition(entryShadows(cur), entryShadows(e),
      n.TransitionEasing, n.TransitionMs / 1000.0, n.TransitionDelayMs / 1000.0))
    if !containsAnimating(n) { Animating.Add(n) }
  }

  internal func containsAnimating(n Node) bool {
    for i in 0 ... Animating.Count {
      if Animating[i] == n { return true }
    }
    return false
  }

  internal func finishTransition(n Node, f StyleField) bool {
    guard let list = n.Transitions else {
      return false
    }
    for i in 0 ... list.Count {
      if list[i].Field == f {
        list.RemoveAt(i)
        return true
      }
    }
    return false
  }

  internal func Advance(dt float64) {
    for var ni = Animating.Count; ni > 0; ni-- {
      let n = Animating[ni - 1]
      if n.Retired {
        Animating.RemoveAt(ni - 1)
        continue
      }
      guard let unwrapped = n.Transitions else {
        Animating.RemoveAt(ni - 1)
        continue
      }
      let list = unwrapped
      for var ti = list.Count; ti > 0; ti-- {
        var tr = list[ti - 1]
        tr.Elapsed = tr.Elapsed + dt
        if tr.Elapsed <= 0.0 {
          list[ti - 1] = tr
          continue
        }
        let t = tr.Duration <= 0.0 ? 1.0 : Math.Min(1.0, tr.Elapsed / tr.Duration)
        let ft = float32(ease(tr.Easing, t))
        if tr.Field == StyleField.BoxShadows {
          guard let from = tr.FromShadows, let to = tr.ToShadows, let work = tr.WorkingShadows else {
            list.RemoveAt(ti - 1)
            continue
          }
          lerpBoxShadows(from, to, work, ft)
          n.BoxShadows = t >= 1.0 ? tr.TargetShadows : work
          if n.Kind == NodeKind.Shape { ShapeGeometry.ClearShadowArtifacts(n) }
          recordResolvedChange(StyleField.BoxShadows)
        } else {
          if writeDirectWithInvalidation(n, StyleEntry{ Field: tr.Field,
            A: tr.FromA + (tr.ToA - tr.FromA) * ft,
            B: tr.FromB + (tr.ToB - tr.FromB) * ft,
            C: tr.FromC + (tr.ToC - tr.FromC) * ft,
            D: tr.FromD + (tr.ToD - tr.FromD) * ft }, PaintResourceInvalidated) {
            recordResolvedChange(tr.Field)
          }
        }
        if inheritable(tr.Field) {
          propagateInherited(n, tr.Field)
        }
        if t >= 1.0 {
          list.RemoveAt(ti - 1)
        } else {
          list[ti - 1] = tr
        }
      }
      if list.Count == 0 { Animating.RemoveAt(ni - 1) }
    }
  }

  internal func propagateInherited(parent Node, f StyleField) {
    for i in 0 ... parent.Children.Count {
      let child = parent.Children[i]
      if styleMaskHas(child.LocalMask, f) {
        continue
      }
      finishTransition(child, f)
      if writeDirectWithInvalidation(child, readField(parent, f), PaintResourceInvalidated) {
        recordResolvedChange(f)
      }
      propagateInherited(child, f)
    }
  }

  private func recordResolvedChange(f StyleField) {
    pendingEffects = ReconcileEffects(int32(pendingEffects) | int32(styleEffects(f)))
    VisualDirty = true
  }

  private func invalidationFor(f StyleField) Action? {
    return if f == StyleField.ShaderEffect { ShaderEffectInvalidated }
      else { PaintResourceInvalidated }
  }
}

internal func styleFieldApplies(n Node, f StyleField) bool {
  if n.Kind != NodeKind.Shape {
    return true
  }
  return f != StyleField.BorderLeftWidth && f != StyleField.BorderTopWidth
    && f != StyleField.BorderRightWidth && f != StyleField.BorderBottomWidth
    && f != StyleField.BorderLeftColor && f != StyleField.BorderTopColor
    && f != StyleField.BorderRightColor && f != StyleField.BorderBottomColor
    && f != StyleField.BorderStartWidth && f != StyleField.BorderEndWidth
    && f != StyleField.BorderStartColor && f != StyleField.BorderEndColor
}

internal func isLogicalStyleField(f StyleField) bool {
  return f == StyleField.MarginStart || f == StyleField.MarginEnd
    || f == StyleField.PaddingStart || f == StyleField.PaddingEnd
    || f == StyleField.Start || f == StyleField.End
    || f == StyleField.BorderStartWidth || f == StyleField.BorderEndWidth
    || f == StyleField.BorderStartColor || f == StyleField.BorderEndColor
}

internal func makeBoxShadowTransition(from BoxShadowStack?, target BoxShadowStack?,
  easing Easing, duration float64, delay float64) Transition {
  let count = Math.Max(boxShadowCount(from), boxShadowCount(target))
  return Transition{
    Field: StyleField.BoxShadows,
    FromShadows: paddedBoxShadows(from, target, count),
    ToShadows: paddedBoxShadows(target, from, count),
    TargetShadows: target,
    WorkingShadows: newBoxShadowWork(count),
    Easing: easing,
    Elapsed: -delay,
    Duration: duration,
  }
}

internal func sameEntry(cur StyleEntry, e StyleEntry) bool {
  return cur.A == e.A && cur.B == e.B && cur.C == e.C && cur.D == e.D
    && entryText(cur) == entryText(e) && sameGradient(entryGradient(cur), entryGradient(e))
    && sameBoxShadows(entryShadows(cur), entryShadows(e))
    && samePath(entryPath(cur), entryPath(e))
    && entryImageSource(cur) == entryImageSource(e)
    && entryShaderEffect(cur) == entryShaderEffect(e)
}

// Quadratic curves: raw progress in, shaped progress out.
internal func ease(e Easing, t float64) float64 {
  if e == Easing.EaseIn { return t * t }
  if e == Easing.EaseOut { return 1.0 - (1.0 - t) * (1.0 - t) }
  if e == Easing.EaseInOut {
    return t < 0.5 ? 2.0 * t * t : 1.0 - (1.0 - t) * (1.0 - t) * 2.0
  }
  return t
}

// Paint effects without public transition selectors stay discrete.
internal func lerpable(f StyleField) bool {
  if f == StyleField.OutlineWidth || f == StyleField.OutlineColor || f == StyleField.OutlineOffset
    || f == StyleField.TextShadows || f == StyleField.TextStrokeWidth
    || f == StyleField.TextStrokeColor {
    return false
  }
  let kind = fieldKind(f)
  return kind != FieldKind.KEnum && kind != FieldKind.KString
    && kind != FieldKind.KGradient && kind != FieldKind.KPath && kind != FieldKind.KImageSource
    && kind != FieldKind.KShaderEffect
}

internal func inheritable(f StyleField) bool {
  return Array.IndexOf(Resolver.inheritableFields, f) >= 0
}

internal func writeDirect(n Node, e StyleEntry) bool {
  return writeDirectWithInvalidation(n, e, nil)
}

internal func writeDirectWithInvalidation(n Node, e StyleEntry, invalidated Action?) bool {
  if !styleFieldApplies(n, e.Field) {
    return false
  }
  if sameEntry(readField(n, e.Field), e) {
    return false
  }
  let tracksText = (n.Kind == NodeKind.Text || n.Kind == NodeKind.Editor)
    && TextLayouts.IsShapingField(e.Field)
  switch e.Field {
    case StyleField.Direction { n.Direction = Direction(int32(e.A)) }
    case StyleField.Width { n.Width = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.Height { n.Height = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.MinWidth { n.MinWidth = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.MinHeight { n.MinHeight = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.MaxWidth { n.MaxWidth = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.MaxHeight { n.MaxHeight = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.AspectRatio { n.AspectRatio = float64(e.A) }
    case StyleField.Padding { n.Padding = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.PaddingLeft { n.PaddingLeft = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.PaddingTop { n.PaddingTop = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.PaddingRight { n.PaddingRight = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.PaddingBottom { n.PaddingBottom = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.Margin { n.Margin = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.MarginLeft { n.MarginLeft = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.MarginTop { n.MarginTop = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.MarginRight { n.MarginRight = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.MarginBottom { n.MarginBottom = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.Gap { n.Gap = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.RowGap { n.RowGap = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.ColumnGap { n.ColumnGap = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.FlexDirection { n.FlexDirection = FlexDirection(int32(e.A)) }
    case StyleField.FlexWrap { n.FlexWrap = FlexWrap(int32(e.A)) }
    case StyleField.JustifyContent { n.JustifyContent = JustifyContent(int32(e.A)) }
    case StyleField.AlignItems { n.AlignItems = AlignItems(int32(e.A)) }
    case StyleField.AlignSelf { n.AlignSelf = AlignSelf(int32(e.A)) }
    case StyleField.AlignContent { n.AlignContent = AlignContent(int32(e.A)) }
    case StyleField.FlexGrow { n.FlexGrow = float64(e.A) }
    case StyleField.FlexShrink { n.FlexShrink = float64(e.A) }
    case StyleField.FlexBasis { n.FlexBasis = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.Position { n.Position = PositionType(int32(e.A)) }
    case StyleField.Left { n.Left = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.Top { n.Top = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.Right { n.Right = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.Bottom { n.Bottom = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.Display { n.Display = Display(int32(e.A)) }
    case StyleField.Visibility { n.Visibility = Visibility(int32(e.A)) }
    case StyleField.BorderStyle { n.BorderStyle = BorderStyle(int32(e.A)) }
    case StyleField.BlendMode { n.BlendMode = BlendMode(int32(e.A)) }
    case StyleField.OverflowX {
      let next = Overflow(int32(e.A))
      if next != n.OverflowX {
        n.OverflowX = next
        ScrollTopology.Version = ScrollTopology.Version + 1
      }
    }
    case StyleField.OverflowY {
      let next = Overflow(int32(e.A))
      if next != n.OverflowY {
        n.OverflowY = next
        ScrollTopology.Version = ScrollTopology.Version + 1
      }
    }
    case StyleField.BackgroundColor { n.BackgroundColor = Color.FromNormalized(e.A, e.B, e.C, e.D) }
    case StyleField.BackgroundGradient { n.BackgroundGradient = entryGradient(e) }
    case StyleField.BackgroundImage { BackgroundImageLayouts.SetPath(n, entryText(e) ?? "", invalidated) }
    case StyleField.BackgroundImageSource { BackgroundImageLayouts.SetSource(n, entryImageSource(e), invalidated) }
    case StyleField.ShaderEffect { ShaderEffectStyles.Set(n, entryShaderEffect(e), invalidated) }
    case StyleField.BackgroundImageFit { n.BackgroundImageFit = ImageFit(int32(e.A)) }
    case StyleField.ClipPath { ClipPaths.SetPath(n, entryPath(e)) }
    case StyleField.ClipPathFit { ClipPaths.SetFit(n, ShapeFit(int32(e.A))) }
    case StyleField.ClipPathFillRule { ClipPaths.SetFillRule(n, FillRule(int32(e.A))) }
    case StyleField.BorderRadius { n.BorderRadius = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.BorderTopLeftRadius { n.BorderTopLeftRadius = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.BorderTopRightRadius { n.BorderTopRightRadius = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.BorderBottomLeftRadius { n.BorderBottomLeftRadius = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.BorderBottomRightRadius { n.BorderBottomRightRadius = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.BorderLeftWidth { n.BorderLeftWidth = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.BorderTopWidth { n.BorderTopWidth = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.BorderRightWidth { n.BorderRightWidth = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.BorderBottomWidth { n.BorderBottomWidth = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.BorderLeftColor { n.BorderLeftColor = Color.FromNormalized(e.A, e.B, e.C, e.D) }
    case StyleField.BorderTopColor { n.BorderTopColor = Color.FromNormalized(e.A, e.B, e.C, e.D) }
    case StyleField.BorderRightColor { n.BorderRightColor = Color.FromNormalized(e.A, e.B, e.C, e.D) }
    case StyleField.BorderBottomColor { n.BorderBottomColor = Color.FromNormalized(e.A, e.B, e.C, e.D) }
    case StyleField.ShapeStrokeWidth { n.BorderLeftWidth = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.ShapeStrokeColor { n.BorderLeftColor = Color.FromNormalized(e.A, e.B, e.C, e.D) }
    case StyleField.OutlineWidth { n.OutlineWidth = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.OutlineColor { n.OutlineColor = Color.FromNormalized(e.A, e.B, e.C, e.D) }
    case StyleField.OutlineOffset { n.OutlineOffset = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.Opacity { n.Opacity = float64(e.A) }
    case StyleField.BoxShadows { n.BoxShadows = entryShadows(e) }
    case StyleField.TextShadows { n.TextShadows = entryShadows(e) }
    case StyleField.TextStrokeWidth {
      n.TextStrokeWidth = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A }
    }
    case StyleField.TextStrokeColor {
      n.TextStrokeColor = Color.FromNormalized(e.A, e.B, e.C, e.D)
    }
    case StyleField.FontSize { n.FontSize = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.Color { n.Color = Color.FromNormalized(e.A, e.B, e.C, e.D) }
    case StyleField.FontFamily { n.FontFamily = entryText(e) ?? "" }
    case StyleField.FontWeight { n.FontWeight = float64(e.A) }
    case StyleField.FontStyle { n.FontStyle = FontStyle(int32(e.A)) }
    case StyleField.LetterSpacing { n.LetterSpacing = Length{ Unit: LengthUnit(int32(e.B)), Value: e.A } }
    case StyleField.LineHeight { n.LineHeight = float64(e.A) }
    case StyleField.TextAlign { n.TextAlign = TextAlign(int32(e.A)) }
    case StyleField.TextDecoration { n.TextDecoration = TextDecoration(int32(e.A)) }
    case StyleField.TextWrap { n.TextWrap = TextWrap(int32(e.A)) }
    case StyleField.TextTrimming { n.TextTrimming = TextTrimming(int32(e.A)) }
    case StyleField.TextMaxLines { n.TextMaxLines = (int32(e.A) << 16) | int32(e.B) }
    case StyleField.TextTransform { n.TextTransform = TextTransform(int32(e.A)) }
    case StyleField.Cursor { n.Cursor = Cursor(int32(e.A)) }
    case StyleField.TransformTranslateX {
      Transforming.SetTranslateX(n, Length{ Unit: LengthUnit(int32(e.B)), Value: e.A })
    }
    case StyleField.TransformTranslateY {
      Transforming.SetTranslateY(n, Length{ Unit: LengthUnit(int32(e.B)), Value: e.A })
    }
    case StyleField.TransformRotate { Transforming.SetRotate(n, e.A) }
    case StyleField.TransformScale { Transforming.SetScale(n, e.A) }
    case StyleField.TransformScaleX { Transforming.SetScaleX(n, e.A) }
    case StyleField.TransformScaleY { Transforming.SetScaleY(n, e.A) }
    case StyleField.TransformSkewX { Transforming.SetSkewX(n, e.A) }
    case StyleField.TransformSkewY { Transforming.SetSkewY(n, e.A) }
    case StyleField.TransformOriginX {
      Transforming.SetOriginX(n, Length{ Unit: LengthUnit(int32(e.B)), Value: e.A })
    }
    case StyleField.TransformOriginY {
      Transforming.SetOriginY(n, Length{ Unit: LengthUnit(int32(e.B)), Value: e.A })
    }
    case StyleField.ZIndex {
      n.ZIndex = (int32(e.A) << 16) | int32(e.B)
    }
    default { throw NotSupportedException("writeDirect: unhandled StyleField") }
  }
  if tracksText {
    if n.Kind == NodeKind.Editor {
      TextEditorLayouts.Invalidate(n)
    } else {
      TextLayouts.Invalidate(n)
    }
  }
  n.BumpScenePaintVersion()
  syncYogaField(n, e.Field)
  return true
}

// The reverse of writeDirect: node field -> packed StyleEntry, same slot rules.
internal func readField(n Node, f StyleField) StyleEntry {
  switch f {
    case StyleField.Direction { return StyleEntry{ Field: f, A: float32(int32(n.Direction)) } }
    case StyleField.Width { return StyleEntry{ Field: f, A: n.Width.Value, B: float32(int32(n.Width.Unit)) } }
    case StyleField.Height { return StyleEntry{ Field: f, A: n.Height.Value, B: float32(int32(n.Height.Unit)) } }
    case StyleField.MinWidth { return StyleEntry{ Field: f, A: n.MinWidth.Value, B: float32(int32(n.MinWidth.Unit)) } }
    case StyleField.MinHeight { return StyleEntry{ Field: f, A: n.MinHeight.Value, B: float32(int32(n.MinHeight.Unit)) } }
    case StyleField.MaxWidth { return StyleEntry{ Field: f, A: n.MaxWidth.Value, B: float32(int32(n.MaxWidth.Unit)) } }
    case StyleField.MaxHeight { return StyleEntry{ Field: f, A: n.MaxHeight.Value, B: float32(int32(n.MaxHeight.Unit)) } }
    case StyleField.AspectRatio { return StyleEntry{ Field: f, A: float32(n.AspectRatio) } }
    case StyleField.Padding { return StyleEntry{ Field: f, A: n.Padding.Value, B: float32(int32(n.Padding.Unit)) } }
    case StyleField.PaddingLeft { return StyleEntry{ Field: f, A: n.PaddingLeft.Value, B: float32(int32(n.PaddingLeft.Unit)) } }
    case StyleField.PaddingTop { return StyleEntry{ Field: f, A: n.PaddingTop.Value, B: float32(int32(n.PaddingTop.Unit)) } }
    case StyleField.PaddingRight { return StyleEntry{ Field: f, A: n.PaddingRight.Value, B: float32(int32(n.PaddingRight.Unit)) } }
    case StyleField.PaddingBottom { return StyleEntry{ Field: f, A: n.PaddingBottom.Value, B: float32(int32(n.PaddingBottom.Unit)) } }
    case StyleField.Margin { return StyleEntry{ Field: f, A: n.Margin.Value, B: float32(int32(n.Margin.Unit)) } }
    case StyleField.MarginLeft { return StyleEntry{ Field: f, A: n.MarginLeft.Value, B: float32(int32(n.MarginLeft.Unit)) } }
    case StyleField.MarginTop { return StyleEntry{ Field: f, A: n.MarginTop.Value, B: float32(int32(n.MarginTop.Unit)) } }
    case StyleField.MarginRight { return StyleEntry{ Field: f, A: n.MarginRight.Value, B: float32(int32(n.MarginRight.Unit)) } }
    case StyleField.MarginBottom { return StyleEntry{ Field: f, A: n.MarginBottom.Value, B: float32(int32(n.MarginBottom.Unit)) } }
    case StyleField.Gap { return StyleEntry{ Field: f, A: n.Gap.Value, B: float32(int32(n.Gap.Unit)) } }
    case StyleField.RowGap { return StyleEntry{ Field: f, A: n.RowGap.Value, B: float32(int32(n.RowGap.Unit)) } }
    case StyleField.ColumnGap { return StyleEntry{ Field: f, A: n.ColumnGap.Value, B: float32(int32(n.ColumnGap.Unit)) } }
    case StyleField.FlexDirection { return StyleEntry{ Field: f, A: float32(int32(n.FlexDirection)) } }
    case StyleField.FlexWrap { return StyleEntry{ Field: f, A: float32(int32(n.FlexWrap)) } }
    case StyleField.JustifyContent { return StyleEntry{ Field: f, A: float32(int32(n.JustifyContent)) } }
    case StyleField.AlignItems { return StyleEntry{ Field: f, A: float32(int32(n.AlignItems)) } }
    case StyleField.AlignSelf { return StyleEntry{ Field: f, A: float32(int32(n.AlignSelf)) } }
    case StyleField.AlignContent { return StyleEntry{ Field: f, A: float32(int32(n.AlignContent)) } }
    case StyleField.FlexGrow { return StyleEntry{ Field: f, A: float32(n.FlexGrow) } }
    case StyleField.FlexShrink { return StyleEntry{ Field: f, A: float32(n.FlexShrink) } }
    case StyleField.FlexBasis { return StyleEntry{ Field: f, A: n.FlexBasis.Value, B: float32(int32(n.FlexBasis.Unit)) } }
    case StyleField.Position { return StyleEntry{ Field: f, A: float32(int32(n.Position)) } }
    case StyleField.Left { return StyleEntry{ Field: f, A: n.Left.Value, B: float32(int32(n.Left.Unit)) } }
    case StyleField.Top { return StyleEntry{ Field: f, A: n.Top.Value, B: float32(int32(n.Top.Unit)) } }
    case StyleField.Right { return StyleEntry{ Field: f, A: n.Right.Value, B: float32(int32(n.Right.Unit)) } }
    case StyleField.Bottom { return StyleEntry{ Field: f, A: n.Bottom.Value, B: float32(int32(n.Bottom.Unit)) } }
    case StyleField.Display { return StyleEntry{ Field: f, A: float32(int32(n.Display)) } }
    case StyleField.Visibility { return StyleEntry{ Field: f, A: float32(int32(n.Visibility)) } }
    case StyleField.BorderStyle { return StyleEntry{ Field: f, A: float32(int32(n.BorderStyle)) } }
    case StyleField.BlendMode { return StyleEntry{ Field: f, A: float32(int32(n.BlendMode)) } }
    case StyleField.OverflowX { return StyleEntry{ Field: f, A: float32(int32(n.OverflowX)) } }
    case StyleField.OverflowY { return StyleEntry{ Field: f, A: float32(int32(n.OverflowY)) } }
    case StyleField.BackgroundColor { return StyleEntry{ Field: f, A: n.BackgroundColor.R, B: n.BackgroundColor.G, C: n.BackgroundColor.B, D: n.BackgroundColor.A } }
    case StyleField.BackgroundGradient { return StyleEntry{ Field: f, Payload: n.BackgroundGradient } }
    case StyleField.BackgroundImage { return StyleEntry{ Field: f, Payload: BackgroundImageLayouts.Path(n) } }
    case StyleField.BackgroundImageSource { return StyleEntry{ Field: f, Payload: BackgroundImageLayouts.Source(n) } }
    case StyleField.ShaderEffect { return StyleEntry{ Field: f, Payload: n.ShaderEffect } }
    case StyleField.BackgroundImageFit { return StyleEntry{ Field: f, A: float32(int32(n.BackgroundImageFit)) } }
    case StyleField.ClipPath { return StyleEntry{ Field: f, Payload: ClipPaths.Path(n).payload } }
    case StyleField.ClipPathFit { return StyleEntry{ Field: f, A: float32(int32(ClipPaths.Fit(n))) } }
    case StyleField.ClipPathFillRule { return StyleEntry{ Field: f, A: float32(int32(ClipPaths.FillRule(n))) } }
    case StyleField.BorderRadius { return StyleEntry{ Field: f, A: n.BorderRadius.Value, B: float32(int32(n.BorderRadius.Unit)) } }
    case StyleField.BorderTopLeftRadius { return StyleEntry{ Field: f, A: n.BorderTopLeftRadius.Value, B: float32(int32(n.BorderTopLeftRadius.Unit)) } }
    case StyleField.BorderTopRightRadius { return StyleEntry{ Field: f, A: n.BorderTopRightRadius.Value, B: float32(int32(n.BorderTopRightRadius.Unit)) } }
    case StyleField.BorderBottomLeftRadius { return StyleEntry{ Field: f, A: n.BorderBottomLeftRadius.Value, B: float32(int32(n.BorderBottomLeftRadius.Unit)) } }
    case StyleField.BorderBottomRightRadius { return StyleEntry{ Field: f, A: n.BorderBottomRightRadius.Value, B: float32(int32(n.BorderBottomRightRadius.Unit)) } }
    case StyleField.BorderLeftWidth { return StyleEntry{ Field: f, A: n.BorderLeftWidth.Value, B: float32(int32(n.BorderLeftWidth.Unit)) } }
    case StyleField.BorderTopWidth { return StyleEntry{ Field: f, A: n.BorderTopWidth.Value, B: float32(int32(n.BorderTopWidth.Unit)) } }
    case StyleField.BorderRightWidth { return StyleEntry{ Field: f, A: n.BorderRightWidth.Value, B: float32(int32(n.BorderRightWidth.Unit)) } }
    case StyleField.BorderBottomWidth { return StyleEntry{ Field: f, A: n.BorderBottomWidth.Value, B: float32(int32(n.BorderBottomWidth.Unit)) } }
    case StyleField.BorderLeftColor { return StyleEntry{ Field: f, A: n.BorderLeftColor.R, B: n.BorderLeftColor.G, C: n.BorderLeftColor.B, D: n.BorderLeftColor.A } }
    case StyleField.BorderTopColor { return StyleEntry{ Field: f, A: n.BorderTopColor.R, B: n.BorderTopColor.G, C: n.BorderTopColor.B, D: n.BorderTopColor.A } }
    case StyleField.BorderRightColor { return StyleEntry{ Field: f, A: n.BorderRightColor.R, B: n.BorderRightColor.G, C: n.BorderRightColor.B, D: n.BorderRightColor.A } }
    case StyleField.BorderBottomColor { return StyleEntry{ Field: f, A: n.BorderBottomColor.R, B: n.BorderBottomColor.G, C: n.BorderBottomColor.B, D: n.BorderBottomColor.A } }
    case StyleField.ShapeStrokeWidth { return StyleEntry{ Field: f, A: n.BorderLeftWidth.Value, B: float32(int32(n.BorderLeftWidth.Unit)) } }
    case StyleField.ShapeStrokeColor { return StyleEntry{ Field: f, A: n.BorderLeftColor.R, B: n.BorderLeftColor.G, C: n.BorderLeftColor.B, D: n.BorderLeftColor.A } }
    case StyleField.OutlineWidth { return StyleEntry{ Field: f, A: n.OutlineWidth.Value, B: float32(int32(n.OutlineWidth.Unit)) } }
    case StyleField.OutlineColor { return StyleEntry{ Field: f, A: n.OutlineColor.R, B: n.OutlineColor.G, C: n.OutlineColor.B, D: n.OutlineColor.A } }
    case StyleField.OutlineOffset { return StyleEntry{ Field: f, A: n.OutlineOffset.Value, B: float32(int32(n.OutlineOffset.Unit)) } }
    case StyleField.Opacity { return StyleEntry{ Field: f, A: float32(n.Opacity) } }
    case StyleField.BoxShadows { return StyleEntry{ Field: f, Payload: n.BoxShadows } }
    case StyleField.TextShadows { return StyleEntry{ Field: f, Payload: n.TextShadows } }
    case StyleField.TextStrokeWidth {
      return StyleEntry{ Field: f, A: n.TextStrokeWidth.Value, B: float32(int32(n.TextStrokeWidth.Unit)) }
    }
    case StyleField.TextStrokeColor {
      return StyleEntry{ Field: f, A: n.TextStrokeColor.R, B: n.TextStrokeColor.G,
        C: n.TextStrokeColor.B, D: n.TextStrokeColor.A }
    }
    case StyleField.FontSize { return StyleEntry{ Field: f, A: n.FontSize.Value, B: float32(int32(n.FontSize.Unit)) } }
    case StyleField.Color { return StyleEntry{ Field: f, A: n.Color.R, B: n.Color.G, C: n.Color.B, D: n.Color.A } }
    case StyleField.FontFamily { return StyleEntry{ Field: f, Payload: n.FontFamily } }
    case StyleField.FontWeight { return StyleEntry{ Field: f, A: float32(n.FontWeight) } }
    case StyleField.FontStyle { return StyleEntry{ Field: f, A: float32(int32(n.FontStyle)) } }
    case StyleField.LetterSpacing { return StyleEntry{ Field: f, A: n.LetterSpacing.Value, B: float32(int32(n.LetterSpacing.Unit)) } }
    case StyleField.LineHeight { return StyleEntry{ Field: f, A: float32(n.LineHeight) } }
    case StyleField.TextAlign { return StyleEntry{ Field: f, A: float32(int32(n.TextAlign)) } }
    case StyleField.TextDecoration { return StyleEntry{ Field: f, A: float32(int32(n.TextDecoration)) } }
    case StyleField.TextWrap { return StyleEntry{ Field: f, A: float32(int32(n.TextWrap)) } }
    case StyleField.TextTrimming { return StyleEntry{ Field: f, A: float32(int32(n.TextTrimming)) } }
    case StyleField.TextMaxLines {
      return StyleEntry{ Field: f, A: float32(n.TextMaxLines >> 16), B: float32(n.TextMaxLines & int32(65535)) }
    }
    case StyleField.TextTransform { return StyleEntry{ Field: f, A: float32(int32(n.TextTransform)) } }
    case StyleField.Cursor { return StyleEntry{ Field: f, A: float32(int32(n.Cursor)) } }
    case StyleField.TransformTranslateX {
      let value = Transforming.TranslateX(n)
      return StyleEntry{ Field: f, A: value.Value, B: float32(int32(value.Unit)) }
    }
    case StyleField.TransformTranslateY {
      let value = Transforming.TranslateY(n)
      return StyleEntry{ Field: f, A: value.Value, B: float32(int32(value.Unit)) }
    }
    case StyleField.TransformRotate { return StyleEntry{ Field: f, A: Transforming.Rotate(n) } }
    case StyleField.TransformScale { return StyleEntry{ Field: f, A: Transforming.Scale(n) } }
    case StyleField.TransformScaleX { return StyleEntry{ Field: f, A: Transforming.ScaleX(n) } }
    case StyleField.TransformScaleY { return StyleEntry{ Field: f, A: Transforming.ScaleY(n) } }
    case StyleField.TransformSkewX { return StyleEntry{ Field: f, A: Transforming.SkewX(n) } }
    case StyleField.TransformSkewY { return StyleEntry{ Field: f, A: Transforming.SkewY(n) } }
    case StyleField.TransformOriginX {
      let value = Transforming.OriginX(n)
      return StyleEntry{ Field: f, A: value.Value, B: float32(int32(value.Unit)) }
    }
    case StyleField.TransformOriginY {
      let value = Transforming.OriginY(n)
      return StyleEntry{ Field: f, A: value.Value, B: float32(int32(value.Unit)) }
    }
    case StyleField.ZIndex {
      return StyleEntry{ Field: f, A: float32(n.ZIndex >> 16), B: float32(n.ZIndex & int32(65535)) }
    }
    default { throw NotSupportedException("readField: unhandled StyleField") }
  }
}

// Initializes retained style state. Packed Cursor.Default is already CLR zero.
internal func ApplyAllDefaults(n Node) {
  applyDefault(n, StyleField.Direction)
  applyDefault(n, StyleField.Width)
  applyDefault(n, StyleField.Height)
  applyDefault(n, StyleField.MinWidth)
  applyDefault(n, StyleField.MinHeight)
  applyDefault(n, StyleField.MaxWidth)
  applyDefault(n, StyleField.MaxHeight)
  applyDefault(n, StyleField.AspectRatio)
  applyDefault(n, StyleField.Padding)
  applyDefault(n, StyleField.PaddingLeft)
  applyDefault(n, StyleField.PaddingTop)
  applyDefault(n, StyleField.PaddingRight)
  applyDefault(n, StyleField.PaddingBottom)
  applyDefault(n, StyleField.Margin)
  applyDefault(n, StyleField.MarginLeft)
  applyDefault(n, StyleField.MarginTop)
  applyDefault(n, StyleField.MarginRight)
  applyDefault(n, StyleField.MarginBottom)
  applyDefault(n, StyleField.Gap)
  applyDefault(n, StyleField.RowGap)
  applyDefault(n, StyleField.ColumnGap)
  applyDefault(n, StyleField.FlexDirection)
  applyDefault(n, StyleField.FlexWrap)
  applyDefault(n, StyleField.JustifyContent)
  applyDefault(n, StyleField.AlignItems)
  applyDefault(n, StyleField.AlignSelf)
  applyDefault(n, StyleField.AlignContent)
  applyDefault(n, StyleField.FlexGrow)
  applyDefault(n, StyleField.FlexShrink)
  applyDefault(n, StyleField.FlexBasis)
  applyDefault(n, StyleField.Position)
  applyDefault(n, StyleField.Left)
  applyDefault(n, StyleField.Top)
  applyDefault(n, StyleField.Right)
  applyDefault(n, StyleField.Bottom)
  applyDefault(n, StyleField.Display)
  applyDefault(n, StyleField.OverflowX)
  applyDefault(n, StyleField.OverflowY)
  applyDefault(n, StyleField.BackgroundColor)
  applyDefault(n, StyleField.BackgroundGradient)
  applyDefault(n, StyleField.BorderRadius)
  applyDefault(n, StyleField.BorderTopLeftRadius)
  applyDefault(n, StyleField.BorderTopRightRadius)
  applyDefault(n, StyleField.BorderBottomLeftRadius)
  applyDefault(n, StyleField.BorderBottomRightRadius)
  applyDefault(n, StyleField.BorderStyle)
  applyDefault(n, StyleField.BlendMode)
  applyDefault(n, StyleField.BorderLeftWidth)
  applyDefault(n, StyleField.BorderTopWidth)
  applyDefault(n, StyleField.BorderRightWidth)
  applyDefault(n, StyleField.BorderBottomWidth)
  applyDefault(n, StyleField.BorderLeftColor)
  applyDefault(n, StyleField.BorderTopColor)
  applyDefault(n, StyleField.BorderRightColor)
  applyDefault(n, StyleField.BorderBottomColor)
  applyDefault(n, StyleField.Opacity)
  applyDefault(n, StyleField.BoxShadows)
  applyDefault(n, StyleField.Color)
  applyDefault(n, StyleField.FontFamily)
  applyDefault(n, StyleField.FontSize)
  applyDefault(n, StyleField.FontWeight)
  applyDefault(n, StyleField.FontStyle)
  applyDefault(n, StyleField.LetterSpacing)
  applyDefault(n, StyleField.LineHeight)
  applyDefault(n, StyleField.TextAlign)
  applyDefault(n, StyleField.TextWrap)
  applyDefault(n, StyleField.TextTrimming)
  applyDefault(n, StyleField.TextTransform)
  applyDefault(n, StyleField.Visibility)
  applyDefault(n, StyleField.TextDecoration)
  applyDefault(n, StyleField.ShapeStrokeWidth)
  applyDefault(n, StyleField.ShapeStrokeColor)
  applyDefault(n, StyleField.TextMaxLines)
  applyDefault(n, StyleField.ShaderEffect)
}

// The table's Default column. Zero-filled entries cover the common defaults.
internal func defaultStyleEntry(f StyleField) StyleEntry {
  if isLogicalStyleField(f) {
    throw NotSupportedException("defaultStyleEntry: unhandled StyleField")
  }
  var result = StyleEntry{ Field: f }
  switch f {
    case StyleField.Opacity { result.A = 1.0F }
    case StyleField.Color { result.D = 1.0F }
    case StyleField.FontFamily { result.Payload = "" }
    case StyleField.FontSize {
      result.A = 16.0F
      result.B = float32(int32(LengthUnit.Px))
    }
    case StyleField.FontWeight { result.A = 400.0F }
    case StyleField.LetterSpacing { result.B = float32(int32(LengthUnit.Px)) }
    case StyleField.LineHeight { result.A = 1.2F }
    case StyleField.TextAlign { result.A = float32(int32(TextAlign.Start)) }
    case StyleField.TransformTranslateX {
      result.B = float32(int32(LengthUnit.Px))
    }
    case StyleField.TransformTranslateY {
      result.B = float32(int32(LengthUnit.Px))
    }
    case StyleField.TransformScale { result.A = 1.0F }
    case StyleField.TransformScaleX { result.A = 1.0F }
    case StyleField.TransformScaleY { result.A = 1.0F }
    case StyleField.TransformOriginX {
      result.A = 50.0F
      result.B = float32(int32(LengthUnit.Percent))
    }
    case StyleField.TransformOriginY {
      result.A = 50.0F
      result.B = float32(int32(LengthUnit.Percent))
    }
    case StyleField.BackgroundImage { result.Payload = "" }
    case StyleField.BackgroundImageSource { result.Payload = nil }
    case StyleField.BackgroundImageFit { result.A = float32(int32(ImageFit.Cover)) }
    case StyleField.ClipPathFit { result.A = float32(int32(ShapeFit.Fill)) }
    case StyleField.ClipPathFillRule { result.A = float32(int32(FillRule.NonZero)) }
    default {}
  }
  return result
}

internal func applyDefault(n Node, f StyleField) bool {
  return writeDirect(n, defaultStyleEntry(f))
}

internal func styleEffects(f StyleField) ReconcileEffects {
  switch f {
    case StyleField.Direction { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.Width { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.Height { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.MinWidth { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.MinHeight { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.MaxWidth { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.MaxHeight { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.AspectRatio { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.Padding { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.PaddingLeft { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.PaddingTop { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.PaddingRight { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.PaddingBottom { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.Margin { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.MarginLeft { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.MarginTop { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.MarginRight { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.MarginBottom { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.Gap { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.RowGap { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.ColumnGap { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.FlexDirection { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.FlexWrap { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.JustifyContent { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.AlignItems { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.AlignSelf { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.AlignContent { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.FlexGrow { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.FlexShrink { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.FlexBasis { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.Position { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.Left { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.Top { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.Right { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.Bottom { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.Display { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint) | int32(ReconcileEffects.Input)) }
    case StyleField.Visibility {
      return ReconcileEffects(int32(ReconcileEffects.Paint) | int32(ReconcileEffects.Input))
    }
    case StyleField.OverflowX { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint) | int32(ReconcileEffects.Input)) }
    case StyleField.OverflowY { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint) | int32(ReconcileEffects.Input)) }
    case StyleField.BackgroundColor { return ReconcileEffects.Paint }
    case StyleField.BorderStyle { return ReconcileEffects.Paint }
    case StyleField.BlendMode { return ReconcileEffects.Paint }
    case StyleField.ShaderEffect { return ReconcileEffects.Paint }
    case StyleField.BackgroundGradient { return ReconcileEffects.Paint }
    case StyleField.BackgroundImage { return ReconcileEffects.Paint }
    case StyleField.BackgroundImageSource { return ReconcileEffects.Paint }
    case StyleField.BackgroundImageFit { return ReconcileEffects.Paint }
    case StyleField.ClipPath {
      return ReconcileEffects(int32(ReconcileEffects.Paint) | int32(ReconcileEffects.Input))
    }
    case StyleField.ClipPathFit {
      return ReconcileEffects(int32(ReconcileEffects.Paint) | int32(ReconcileEffects.Input))
    }
    case StyleField.ClipPathFillRule {
      return ReconcileEffects(int32(ReconcileEffects.Paint) | int32(ReconcileEffects.Input))
    }
    case StyleField.BorderRadius { return ReconcileEffects.Paint }
    case StyleField.BorderTopLeftRadius { return ReconcileEffects.Paint }
    case StyleField.BorderTopRightRadius { return ReconcileEffects.Paint }
    case StyleField.BorderBottomLeftRadius { return ReconcileEffects.Paint }
    case StyleField.BorderBottomRightRadius { return ReconcileEffects.Paint }
    case StyleField.BorderLeftWidth { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.BorderTopWidth { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.BorderRightWidth { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.BorderBottomWidth { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.BorderLeftColor { return ReconcileEffects.Paint }
    case StyleField.BorderTopColor { return ReconcileEffects.Paint }
    case StyleField.BorderRightColor { return ReconcileEffects.Paint }
    case StyleField.BorderBottomColor { return ReconcileEffects.Paint }
    case StyleField.ShapeStrokeWidth {
      return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint))
    }
    case StyleField.ShapeStrokeColor { return ReconcileEffects.Paint }
    case StyleField.OutlineWidth { return ReconcileEffects.Paint }
    case StyleField.OutlineColor { return ReconcileEffects.Paint }
    case StyleField.OutlineOffset { return ReconcileEffects.Paint }
    case StyleField.Opacity { return ReconcileEffects.Paint }
    case StyleField.BoxShadows { return ReconcileEffects.Paint }
    case StyleField.TextShadows { return ReconcileEffects.Paint }
    case StyleField.TextStrokeWidth { return ReconcileEffects.Paint }
    case StyleField.TextStrokeColor { return ReconcileEffects.Paint }
    case StyleField.FontSize { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.Color { return ReconcileEffects.Paint }
    case StyleField.FontFamily { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.FontWeight { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.FontStyle { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.LetterSpacing { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.LineHeight { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.TextAlign { return ReconcileEffects.Paint }
    case StyleField.TextDecoration { return ReconcileEffects.Paint }
    case StyleField.TextWrap { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.TextTrimming { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.TextMaxLines {
      return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint))
    }
    case StyleField.TextTransform { return ReconcileEffects(int32(ReconcileEffects.Layout) | int32(ReconcileEffects.Paint)) }
    case StyleField.Cursor { return ReconcileEffects.Input }
    case StyleField.ZIndex {
      return ReconcileEffects(int32(ReconcileEffects.Paint) | int32(ReconcileEffects.Input))
    }
    case StyleField.TransformTranslateX {
      return ReconcileEffects(int32(ReconcileEffects.Paint) | int32(ReconcileEffects.Input))
    }
    case StyleField.TransformTranslateY {
      return ReconcileEffects(int32(ReconcileEffects.Paint) | int32(ReconcileEffects.Input))
    }
    case StyleField.TransformRotate {
      return ReconcileEffects(int32(ReconcileEffects.Paint) | int32(ReconcileEffects.Input))
    }
    case StyleField.TransformScale {
      return ReconcileEffects(int32(ReconcileEffects.Paint) | int32(ReconcileEffects.Input))
    }
    case StyleField.TransformScaleX {
      return ReconcileEffects(int32(ReconcileEffects.Paint) | int32(ReconcileEffects.Input))
    }
    case StyleField.TransformScaleY {
      return ReconcileEffects(int32(ReconcileEffects.Paint) | int32(ReconcileEffects.Input))
    }
    case StyleField.TransformSkewX {
      return ReconcileEffects(int32(ReconcileEffects.Paint) | int32(ReconcileEffects.Input))
    }
    case StyleField.TransformSkewY {
      return ReconcileEffects(int32(ReconcileEffects.Paint) | int32(ReconcileEffects.Input))
    }
    case StyleField.TransformOriginX {
      return ReconcileEffects(int32(ReconcileEffects.Paint) | int32(ReconcileEffects.Input))
    }
    case StyleField.TransformOriginY {
      return ReconcileEffects(int32(ReconcileEffects.Paint) | int32(ReconcileEffects.Input))
    }
    default { throw NotSupportedException("styleEffects: unhandled StyleField") }
  }
}

// The table's Kind column, used by transition resolution.
internal func fieldKind(f StyleField) FieldKind {
  switch f {
    case StyleField.Direction { return FieldKind.KEnum }
    case StyleField.Width { return FieldKind.KLength }
    case StyleField.Height { return FieldKind.KLength }
    case StyleField.MinWidth { return FieldKind.KLength }
    case StyleField.MinHeight { return FieldKind.KLength }
    case StyleField.MaxWidth { return FieldKind.KLength }
    case StyleField.MaxHeight { return FieldKind.KLength }
    case StyleField.AspectRatio { return FieldKind.KScalar }
    case StyleField.Padding { return FieldKind.KLength }
    case StyleField.PaddingLeft { return FieldKind.KLength }
    case StyleField.PaddingTop { return FieldKind.KLength }
    case StyleField.PaddingRight { return FieldKind.KLength }
    case StyleField.PaddingBottom { return FieldKind.KLength }
    case StyleField.Margin { return FieldKind.KLength }
    case StyleField.MarginLeft { return FieldKind.KLength }
    case StyleField.MarginTop { return FieldKind.KLength }
    case StyleField.MarginRight { return FieldKind.KLength }
    case StyleField.MarginBottom { return FieldKind.KLength }
    case StyleField.Gap { return FieldKind.KLength }
    case StyleField.RowGap { return FieldKind.KLength }
    case StyleField.ColumnGap { return FieldKind.KLength }
    case StyleField.FlexDirection { return FieldKind.KEnum }
    case StyleField.FlexWrap { return FieldKind.KEnum }
    case StyleField.JustifyContent { return FieldKind.KEnum }
    case StyleField.AlignItems { return FieldKind.KEnum }
    case StyleField.AlignSelf { return FieldKind.KEnum }
    case StyleField.AlignContent { return FieldKind.KEnum }
    case StyleField.FlexGrow { return FieldKind.KScalar }
    case StyleField.FlexShrink { return FieldKind.KScalar }
    case StyleField.FlexBasis { return FieldKind.KLength }
    case StyleField.Position { return FieldKind.KEnum }
    case StyleField.Left { return FieldKind.KLength }
    case StyleField.Top { return FieldKind.KLength }
    case StyleField.Right { return FieldKind.KLength }
    case StyleField.Bottom { return FieldKind.KLength }
    case StyleField.Display { return FieldKind.KEnum }
    case StyleField.Visibility { return FieldKind.KEnum }
    case StyleField.BorderStyle { return FieldKind.KEnum }
    case StyleField.BlendMode { return FieldKind.KEnum }
    case StyleField.OverflowX { return FieldKind.KEnum }
    case StyleField.OverflowY { return FieldKind.KEnum }
    case StyleField.BackgroundColor { return FieldKind.KColor }
    case StyleField.BackgroundGradient { return FieldKind.KGradient }
    case StyleField.BackgroundImage { return FieldKind.KString }
    case StyleField.BackgroundImageSource { return FieldKind.KImageSource }
    case StyleField.ShaderEffect { return FieldKind.KShaderEffect }
    case StyleField.BackgroundImageFit { return FieldKind.KEnum }
    case StyleField.ClipPath { return FieldKind.KPath }
    case StyleField.ClipPathFit { return FieldKind.KEnum }
    case StyleField.ClipPathFillRule { return FieldKind.KEnum }
    case StyleField.BorderRadius { return FieldKind.KLength }
    case StyleField.BorderTopLeftRadius { return FieldKind.KLength }
    case StyleField.BorderTopRightRadius { return FieldKind.KLength }
    case StyleField.BorderBottomLeftRadius { return FieldKind.KLength }
    case StyleField.BorderBottomRightRadius { return FieldKind.KLength }
    case StyleField.BorderLeftWidth { return FieldKind.KLength }
    case StyleField.BorderTopWidth { return FieldKind.KLength }
    case StyleField.BorderRightWidth { return FieldKind.KLength }
    case StyleField.BorderBottomWidth { return FieldKind.KLength }
    case StyleField.BorderLeftColor { return FieldKind.KColor }
    case StyleField.BorderTopColor { return FieldKind.KColor }
    case StyleField.BorderRightColor { return FieldKind.KColor }
    case StyleField.BorderBottomColor { return FieldKind.KColor }
    case StyleField.ShapeStrokeWidth { return FieldKind.KLength }
    case StyleField.ShapeStrokeColor { return FieldKind.KColor }
    case StyleField.OutlineWidth { return FieldKind.KLength }
    case StyleField.OutlineColor { return FieldKind.KColor }
    case StyleField.OutlineOffset { return FieldKind.KLength }
    case StyleField.Opacity { return FieldKind.KScalar }
    case StyleField.BoxShadows { return FieldKind.KBoxShadows }
    case StyleField.TextShadows { return FieldKind.KBoxShadows }
    case StyleField.TextStrokeWidth { return FieldKind.KLength }
    case StyleField.TextStrokeColor { return FieldKind.KColor }
    case StyleField.Color { return FieldKind.KColor }
    case StyleField.FontFamily { return FieldKind.KString }
    case StyleField.FontSize { return FieldKind.KLength }
    case StyleField.FontWeight { return FieldKind.KScalar }
    case StyleField.FontStyle { return FieldKind.KEnum }
    case StyleField.LetterSpacing { return FieldKind.KLength }
    case StyleField.LineHeight { return FieldKind.KScalar }
    case StyleField.TextAlign { return FieldKind.KEnum }
    case StyleField.TextDecoration { return FieldKind.KEnum }
    case StyleField.TextWrap { return FieldKind.KEnum }
    case StyleField.TextTrimming { return FieldKind.KEnum }
    case StyleField.TextMaxLines { return FieldKind.KEnum }
    case StyleField.TextTransform { return FieldKind.KEnum }
    case StyleField.Cursor { return FieldKind.KEnum }
    case StyleField.ZIndex { return FieldKind.KEnum }
    case StyleField.TransformTranslateX { return FieldKind.KLength }
    case StyleField.TransformTranslateY { return FieldKind.KLength }
    case StyleField.TransformRotate { return FieldKind.KScalar }
    case StyleField.TransformScale { return FieldKind.KScalar }
    case StyleField.TransformScaleX { return FieldKind.KScalar }
    case StyleField.TransformScaleY { return FieldKind.KScalar }
    case StyleField.TransformSkewX { return FieldKind.KScalar }
    case StyleField.TransformSkewY { return FieldKind.KScalar }
    case StyleField.TransformOriginX { return FieldKind.KLength }
    case StyleField.TransformOriginY { return FieldKind.KLength }
    default { throw NotSupportedException("fieldKind: unhandled StyleField") }
  }
}
