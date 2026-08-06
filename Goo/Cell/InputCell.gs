package Goo

import System
import System.Collections.Generic

/// Defines a stateful Goo component with an immutable input snapshot.
/// @typeparam TInput component input type
public open class Cell[TInput any] : Cell {
  private var input TInput = default(TInput)
  private var hasInput bool

  /// Gets the current immutable input snapshot.
  protected prop Input TInput { get { return input } }

  /// Decides whether a later post-mount snapshot needs a rebuild after Input stores next; default uses EqualityComparer[TInput].Default.
  protected open func ShouldRebuild(previous TInput, next TInput) bool {
    return !EqualityComparer[TInput].Default.Equals(previous, next)
  }

  internal func SetInput(value TInput) bool {
    let previous = input
    let hadInput = hasInput
    input = value
    hasInput = true
    try {
      if hadInput && !ShouldRebuild(previous, value) {
        return false
      }
    } catch (error Exception) {
      MarkDirtyFromInput()
      throw error
    }
    MarkDirtyFromInput()
    return true
  }

  internal override func ApplyInput(value object?) bool {
    if value is TInput {
      return SetInput(value)
    }
    return false
  }
}
