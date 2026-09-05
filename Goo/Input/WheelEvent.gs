package Goo

/// Describes a pointer wheel callback.
public struct WheelEvent {
  /// Gets the wheel position in the current handler coordinates.
  public prop Position Point{ get; init; }
  /// Gets the wheel position in logical window coordinates.
  public prop WindowPosition Point{ get; init; }
  /// Gets the raw platform wheel movement.
  public prop Delta Point{ get; init; }
  /// Gets the modifier keys held for the event.
  public prop Modifiers KeyModifiers{ get; init; }
  internal prop Control InputDispatchControl? { get; init; }
  internal prop Generation int64{ get; init; }

  /// Stops further callback propagation for this event.
  public func StopPropagation() {
    if let control = Control { control.Stop(Generation) }
  }

  /// Prevents the default behavior for this event.
  public func PreventDefault() {
    if let control = Control { control.Prevent(Generation) }
  }
}
