package Goo

import System
import System.Collections.Generic

internal data struct TextHit(Index int32, Affinity int32) { }

internal data struct TextHitPosition(Index int32, Affinity int32, X float32) {
  internal func Hit() TextHit -> TextHit(Index, Affinity)
}

internal data struct TextGlyphBox(LogicalStart int32, LogicalEnd int32, X0 float32, X1 float32) { }

internal data struct TextVisualCluster(LogicalStart int32, X0 float32, X1 float32) { }

internal class TextGeometry {
  private let upstream []float32
  private let downstream []float32
  private let stops []TextHitPosition
  private let boxes []TextGlyphBox
  private var selectionStart int32 = -1
  private var selectionEnd int32 = -1
  private var selectionRects []float32 = []float32{}

  private init(upstream []float32, downstream []float32, stops []TextHitPosition,
    boxes []TextGlyphBox) {
      this.upstream = upstream
      this.downstream = downstream
      this.stops = stops
      this.boxes = boxes
    }

  shared {
    internal func Build(text string, runs List[ShapedRun], width float32,
      rightToLeft bool) TextGeometry{
        let upstream = [text.Length + 1]float32
        let downstream = [text.Length + 1]float32
        for i in 0 ... upstream.Length {
          upstream[i] = Single.NaN
          downstream[i] = Single.NaN
        }
        let boxes = List[TextGlyphBox]()
        for run in runs {
          AddRun(run, upstream, downstream, boxes)
        }

        let fallback = rightToLeft ? width : 0.0F
        if Single.IsNaN(downstream[0]) { downstream[0] = fallback }
        if Single.IsNaN(upstream[text.Length]) {
          upstream[text.Length] = rightToLeft ? 0.0F : width
        }

        let boundaries = List[int32]()
        let parsed = UnicodeGraphemes.Starts(text)
        for boundary in parsed { boundaries.Add(boundary) }
        if boundaries.Count == 0 || boundaries[0] != 0 { boundaries.Insert(0, 0) }
        if boundaries[boundaries.Count - 1] != text.Length { boundaries.Add(text.Length) }

        let positions = List[TextHitPosition](boundaries.Count * 2)
        for boundary in boundaries {
          let up = upstream[boundary]
          let down = downstream[boundary]
          if !Single.IsNaN(up) { positions.Add(TextHitPosition(boundary, 0, up)) }
          if !Single.IsNaN(down) && (Single.IsNaN(up) || MathF.Abs(down - up) > 0.01F) {
            positions.Add(TextHitPosition(boundary, 1, down))
          }
        }
        sortPositions(positions)

        return TextGeometry(upstream, downstream, positions.ToArray(), boxes.ToArray())
      }

  }

  internal func CaretX(index int32, affinity int32) float32 {
    let position = Math.Clamp(index, 0, upstream.Length - 1)
    let preferred = if affinity == 0 { upstream[position] } else { downstream[position] }
    if !Single.IsNaN(preferred) { return preferred }
    let alternate = if affinity == 0 { downstream[position] } else { upstream[position] }
    if !Single.IsNaN(alternate) { return alternate }

    var distance int32 = 1
    while distance < upstream.Length {
      let left = position - distance
      if left >= 0 {
        let x = if !Single.IsNaN(downstream[left]) { downstream[left] } else { upstream[left] }
        if !Single.IsNaN(x) { return x }
      }
      let right = position + distance
      if right < upstream.Length {
        let x = if !Single.IsNaN(upstream[right]) { upstream[right] } else { downstream[right] }
        if !Single.IsNaN(x) { return x }
      }
      distance++
    }
    return 0.0F
  }

  internal func HitTest(x float32) TextHit {
    if stops.Length == 0 { return TextHit(0, 1) }
    if Single.IsNaN(x) || Single.IsInfinity(x) { return stops[0].Hit() }
    let upper = lowerBoundTextStops(stops, x)
    if upper == 0 { return stops[0].Hit() }
    if upper == stops.Length { return stops[lowerBoundTextStops(stops, stops[upper - 1].X)].Hit() }
    let leftX = stops[upper - 1].X
    let left = lowerBoundTextStops(stops, leftX)
    let leftDistance = MathF.Abs(leftX - x)
    let rightDistance = MathF.Abs(stops[upper].X - x)
    return if rightDistance < leftDistance { stops[upper].Hit() } else { stops[left].Hit() }
  }

  internal func Move(index int32, affinity int32, delta int32) TextHit {
    if stops.Length == 0 || delta == 0 { return TextHit(index, affinity) }
    let current = findStop(index, affinity)
    let next = Math.Clamp(current + Math.Sign(delta), 0, stops.Length - 1)
    return stops[next].Hit()
  }

  internal func LineEdge(end bool) TextHit -> if end { TextHit(upstream.Length - 1, 0) } else { TextHit(0, 1) }

  internal func Collapse(index int32, affinity int32, anchorIndex int32, anchorAffinity int32,
    delta int32) TextHit{
      let segments = SelectionRects(index, anchorIndex)
      if segments.Length != 0 {
        return HitTest(if delta < 0 { segments[0] } else { segments[segments.Length - 1] })
      }
      let caretX = CaretX(index, affinity)
      let anchorX = CaretX(anchorIndex, anchorAffinity)
      if delta < 0 {
        return if caretX <= anchorX { TextHit(index, affinity) }
        else { TextHit(anchorIndex, anchorAffinity) }
      }
      return if caretX >= anchorX { TextHit(index, affinity) }
      else { TextHit(anchorIndex, anchorAffinity) }
    }

  internal func SelectionRects(start int32, end int32) []float32 {
    var from = start
    var to = end
    normalizeSelection(ref from, ref to)
    if from == to { return []float32{} }
    lock (this) {
      if from == selectionStart && to == selectionEnd { return selectionRects }
      let result = List[float32]()
      var hasSegment = false
      var x0 = 0.0F
      var x1 = 0.0F
      for box in boxes {
        if box.LogicalStart >= to || box.LogicalEnd <= from || box.X1 <= box.X0 { continue }
        if !hasSegment {
          x0 = box.X0
          x1 = box.X1
          hasSegment = true
        } else if box.X0 <= x1 + 0.01F {
          x1 = MathF.Max(x1, box.X1)
        } else {
          result.Add(x0)
          result.Add(x1)
          x0 = box.X0
          x1 = box.X1
        }
      }
      if hasSegment {
        result.Add(x0)
        result.Add(x1)
      }
      selectionStart = from
      selectionEnd = to
      selectionRects = result.ToArray()
      return selectionRects
    }
  }

  internal func SelectionRectCount(start int32, end int32) int32 {
    var from = start
    var to = end
    normalizeSelection(ref from, ref to)
    if from == to { return 0 }
    var count int32 = 0
    var hasSegment = false
    var x1 = 0.0F
    for box in boxes {
      if box.LogicalStart >= to || box.LogicalEnd <= from || box.X1 <= box.X0 { continue }
      if !hasSegment {
        x1 = box.X1
        hasSegment = true
      } else if box.X0 <= x1 + 0.01F {
        x1 = MathF.Max(x1, box.X1)
      } else {
        count++
        x1 = box.X1
      }
    }
    return if hasSegment { count + 1 } else { count }
  }

  internal func CopySelectionRects(start int32, end int32, rectOffset int32,
    destination Span[float32]) int32{
      var from = start
      var to = end
      normalizeSelection(ref from, ref to)
      if from == to || destination.Length < 2 { return 0 }
      var rectIndex int32 = 0
      var written int32 = 0
      var hasSegment = false
      var x0 = 0.0F
      var x1 = 0.0F
      for box in boxes {
        if box.LogicalStart >= to || box.LogicalEnd <= from || box.X1 <= box.X0 { continue }
        if !hasSegment {
          x0 = box.X0
          x1 = box.X1
          hasSegment = true
        } else if box.X0 <= x1 + 0.01F {
          x1 = MathF.Max(x1, box.X1)
        } else {
          if rectIndex >= rectOffset && written + 1 < destination.Length {
            destination[written] = x0
            destination[written + 1] = x1
            written = written + 2
          }
          rectIndex++
          x0 = box.X0
          x1 = box.X1
        }
      }
      if hasSegment && rectIndex >= rectOffset && written + 1 < destination.Length {
        destination[written] = x0
        destination[written + 1] = x1
        written = written + 2
      }
      return written
    }

  private func normalizeSelection(ref start int32, ref end int32) {
    start = Math.Clamp(start, 0, upstream.Length - 1)
    end = Math.Clamp(end, 0, upstream.Length - 1)
    if end < start {
      let value = start
      start = end
      end = value
    }
  }

  private func findStop(index int32, affinity int32) int32 {
    var fallback int32 = -1
    var i int32 = 0
    while i < stops.Length {
      if stops[i].Index == index {
        if stops[i].Affinity == affinity { return i }
        if fallback == -1 { fallback = i }
      }
      i++
    }
    if fallback != -1 { return fallback }
    let x = CaretX(index, affinity)
    var nearest int32 = 0
    var distance = MathF.Abs(stops[0].X - x)
    i = 1
    while i < stops.Length {
      let next = MathF.Abs(stops[i].X - x)
      if next < distance {
        nearest = i
        distance = next
      }
      i++
    }
    return nearest
  }

}

internal func sortPositions(values List[TextHitPosition]) {
  var i int32 = 1
  while i < values.Count {
    let value = values[i]
    var j = i
    while j > 0 && comparePositions(values[j - 1], value) > 0 {
      values[j] = values[j - 1]
      j--
    }
    values[j] = value
    i++
  }
}

internal func comparePositions(left TextHitPosition, right TextHitPosition) int32 {
  let x = left.X.CompareTo(right.X)
  if x != 0 { return x }
  let index = left.Index.CompareTo(right.Index)
  return if index != 0 { index } else { left.Affinity.CompareTo(right.Affinity) }
}

internal func lowerBoundTextStops(values []TextHitPosition, x float32) int32 {
  var low int32 = 0
  var high = values.Length
  while low < high {
    let middle = low + (high - low) / 2
    if values[middle].X < x {
      low = middle + 1
    } else {
      high = middle
    }
  }
  return low
}

internal func AddRun(run ShapedRun, upstream []float32, downstream []float32,
  boxes List[TextGlyphBox]) {
    if run.Text.Length == 0 { return }
    let visualClusters = List[TextVisualCluster]()
    var glyph int32 = 0
    while glyph < run.Clusters.Length {
      let cluster = int32(run.Clusters[glyph])
      var next = glyph + 1
      while next < run.Clusters.Length && run.Clusters[next] == run.Clusters[glyph] { next++ }
      let x0 = if glyph == 0 { run.VisualStart } else { run.Points[glyph].X }
      let x1 = if next < run.Clusters.Length { run.Points[next].X } else { run.VisualEnd }
      visualClusters.Add(TextVisualCluster(cluster, MathF.Min(x0, x1), MathF.Max(x0, x1)))
      glyph = next
    }

    let logicalClusters = List[int32]()
    for cluster in visualClusters {
      var exists = false
      for value in logicalClusters {
        if value == cluster.LogicalStart {
          exists = true
          break
        }
      }
      if !exists { logicalClusters.Add(cluster.LogicalStart) }
    }
    var order int32 = 1
    while order < logicalClusters.Count {
      let value = logicalClusters[order]
      var index = order
      while index > 0 && logicalClusters[index - 1] > value {
        logicalClusters[index] = logicalClusters[index - 1]
        index--
      }
      logicalClusters[index] = value
      order++
    }

    for cluster in visualClusters {
      var logical int32 = 0
      while logical < logicalClusters.Count && logicalClusters[logical] != cluster.LogicalStart { logical++ }
      let localEnd = if logical + 1 < logicalClusters.Count
      { logicalClusters[logical + 1] } else { run.Text.Length }
      let localText = run.Text.Substring(cluster.LogicalStart, localEnd - cluster.LogicalStart)
      let localBoundaries = UnicodeGraphemes.Starts(localText)
      let segmentCount = Math.Max(localBoundaries.Length, 1)
      var i int32 = 0
      while i <= segmentCount {
        let local = if i == segmentCount { localEnd }
        else { cluster.LogicalStart + localBoundaries[i] }
        let ratio = float32(i) / float32(segmentCount)
        let x = if run.RightToLeft
        { cluster.X1 - (cluster.X1 - cluster.X0) * ratio }
        else { cluster.X0 + (cluster.X1 - cluster.X0) * ratio }
        let absolute = run.LogicalStart + local
        if i == 0 { setIfNaN(ref downstream[absolute], x) }
        else if i == segmentCount { setIfNaN(ref upstream[absolute], x) }
        else {
          setIfNaN(ref upstream[absolute], x)
          setIfNaN(ref downstream[absolute], x)
        }
        i++
      }
      boxes.Add(TextGlyphBox(run.LogicalStart + cluster.LogicalStart,
        run.LogicalStart + localEnd, cluster.X0, cluster.X1))
    }
  }

internal func setIfNaN(ref target float32, value float32) {
  if Single.IsNaN(target) { target = value }
}
