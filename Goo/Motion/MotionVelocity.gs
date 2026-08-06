package Goo

import System

/// Specifies initial scalar velocities in converter-coordinate units per second.
/// Create values with Uniform or Components because the default value is invalid.
public struct MotionVelocity {
  private let uniform bool
  private let value float64
  private let components []?float64
  private let valid bool

  shared {
    /// Creates a velocity shared by every converter dimension.
    /// @param value finite velocity in converter-coordinate units per second
    /// @returns a uniform velocity command
    public func Uniform(value float64) MotionVelocity {
      if !motionFinite(value) {
        throw ArgumentOutOfRangeException("value")
      }
      return MotionVelocity{ uniform: true, value: value, components: nil, valid: true }
    }

    /// Creates velocities ordered by converter dimension.
    /// @param values one finite velocity per converter dimension
    /// @returns a component velocity command
    public func Components(values ...float64) MotionVelocity {
      if values.Length == 0 {
        throw ArgumentException("components must not be empty", "values")
      }
      let copied = [values.Length]float64
      for var i = 0; i < values.Length; i++ {
        if !motionFinite(values[i]) {
          throw ArgumentOutOfRangeException("values")
        }
        copied[i] = values[i]
      }
      return MotionVelocity{ uniform: false, value: 0.0, components: copied, valid: true }
    }
  }

  /// Adds another velocity in the same converter-coordinate space.
  /// @param other velocity to add
  /// @returns the component-wise sum
  public func Add(other MotionVelocity) MotionVelocity {
    if !valid || !other.valid {
      throw InvalidOperationException("MotionVelocity is not initialized")
    }
    if uniform && other.uniform {
      return MotionVelocity.Uniform(value + other.value)
    }
    if uniform {
      guard let right = other.components else {
        throw InvalidOperationException("MotionVelocity is not initialized")
      }
      let summed = [right.Length]float64
      for var i = 0; i < right.Length; i++ {
        summed[i] = value + right[i]
        if !motionFinite(summed[i]) {
          throw ArgumentOutOfRangeException("other")
        }
      }
      return MotionVelocity{ uniform: false, value: 0.0, components: summed, valid: true }
    }
    guard let left = components else {
      throw InvalidOperationException("MotionVelocity is not initialized")
    }
    if other.uniform {
      let summed = [left.Length]float64
      for var i = 0; i < left.Length; i++ {
        summed[i] = left[i] + other.value
        if !motionFinite(summed[i]) {
          throw ArgumentOutOfRangeException("other")
        }
      }
      return MotionVelocity{ uniform: false, value: 0.0, components: summed, valid: true }
    }
    guard let right = other.components else {
      throw InvalidOperationException("MotionVelocity is not initialized")
    }
    if left.Length != right.Length {
      throw ArgumentException("velocity component counts do not match", "other")
    }
    let summed = [left.Length]float64
    for var i = 0; i < left.Length; i++ {
      summed[i] = left[i] + right[i]
      if !motionFinite(summed[i]) {
        throw ArgumentOutOfRangeException("other")
      }
    }
    return MotionVelocity{ uniform: false, value: 0.0, components: summed, valid: true }
  }

  internal func CopyInto(into []float64) {
    if !valid {
      throw InvalidOperationException("MotionVelocity is not initialized")
    }
    if uniform {
      for var i = 0; i < into.Length; i++ {
        into[i] = value
      }
      return
    }
    guard let values = components else {
      throw InvalidOperationException("MotionVelocity is not initialized")
    }
    if values.Length != into.Length {
      throw ArgumentException("velocity component count does not match converter dimensions", "into")
    }
    for var i = 0; i < into.Length; i++ {
      into[i] = values[i]
    }
  }
}
