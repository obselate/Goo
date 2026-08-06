package Goo

import System
import System.Collections.Generic

/// Holds mutable cell state and rebuilds its owner when the value changes.
/// @typeparam T state value type
public class State[T] {
  internal var raw T
  internal var invalidate Action

  /// Creates standalone state with no rebuild owner.
  public init() {
    invalidate = () -> { }
  }

  /// Gets or sets the current value.
  public prop Value T {
    get { return raw }
    set(v) {
      if EqualityComparer[T].Default.Equals(raw, v) {
        return
      }
      raw = v
      invalidate()
    }
  }
}
