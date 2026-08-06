package Goo

import System
import System.Runtime.CompilerServices
import SkiaSharp

internal class ShapePathEffects {
  shared {
    private let values ConditionalWeakTable[Node, ShapePathEffectsValue] =
      ConditionalWeakTable[Node, ShapePathEffectsValue]()

    internal func For(n Node) ShapePathEffectsValue? {
      let radius = float32(n.ShapeCornerRadius)
      if radius <= 0.0F && (n.Dashes == nil || n.Dashes?.Intervals.Count == 0) {
        Dispose(n)
        return nil
      }
      let retained = values.GetOrCreateValue(n)
      retained.Ensure(radius, n.Dashes)
      return retained
    }

    internal func Dispose(n Node) {
      if values.TryGetValue(n, out var value) {
        values.Remove(n)
        value.Dispose()
      }
    }
  }
}

internal class ShapePathEffectsValue {
  internal var Corner SKPathEffect?
  internal var Dash SKPathEffect?
  internal var Composed SKPathEffect?

  private var hasKey bool
  private var cornerRadius float32
  private var dashPattern DashPattern?

  internal func Ensure(radius float32, dashes DashPattern?) {
    let effectiveDashes = effectiveDash(dashes)
    if hasKey && cornerRadius == radius
      && Object.ReferenceEquals(dashPattern, effectiveDashes) {
      return
    }

    var nextCorner SKPathEffect?
    var nextDash SKPathEffect?
    var nextComposed SKPathEffect?
    try {
      if radius > 0.0F {
        guard let createdCorner = SKPathEffect.CreateCorner(radius) else {
          throw NotSupportedException("ShapePathEffectsValue.Ensure: CreateCorner failed")
        }
        nextCorner = createdCorner
      }
      if let pattern = effectiveDashes {
        let intervals = [pattern.Intervals.Count]float32
        for i in 0 ... pattern.Intervals.Count {
          intervals[i] = float32(pattern.Intervals[i])
        }
        guard let createdDash = SKPathEffect.CreateDash(intervals, float32(pattern.Offset)) else {
          throw NotSupportedException("ShapePathEffectsValue.Ensure: CreateDash failed")
        }
        nextDash = createdDash
      }
      if let dash = nextDash {
        if let corner = nextCorner {
          guard let composed = SKPathEffect.CreateCompose(dash, corner) else {
            throw NotSupportedException("ShapePathEffectsValue.Ensure: CreateCompose failed")
          }
          nextComposed = composed
        }
      }
    } catch (error Exception) {
      nextComposed?.Dispose()
      nextDash?.Dispose()
      nextCorner?.Dispose()
      throw error
    }

    let priorCorner = Corner
    let priorDash = Dash
    let priorComposed = Composed
    Corner = nextCorner
    Dash = nextDash
    Composed = nextComposed
    cornerRadius = radius
    dashPattern = effectiveDashes
    hasKey = true
    priorComposed?.Dispose()
    priorDash?.Dispose()
    priorCorner?.Dispose()
  }

  internal func Dispose() {
    let composed = Composed
    let dash = Dash
    let corner = Corner
    Composed = nil
    Dash = nil
    Corner = nil
    dashPattern = nil
    hasKey = false
    composed?.Dispose()
    dash?.Dispose()
    corner?.Dispose()
  }

  private func effectiveDash(dashes DashPattern?) DashPattern? {
    guard let pattern = dashes else {
      return nil
    }
    return pattern.Intervals.Count == 0 ? nil : pattern
  }

  deinit {
    Dispose()
  }
}
