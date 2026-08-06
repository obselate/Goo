package Goo

/// Describes the modifier keys for one key press.
public data struct KeyModifiers {
  /// Reports whether Alt is pressed.
  public prop Alt bool { get; init; }
  /// Reports whether Shift is pressed.
  public prop Shift bool { get; init; }
  /// Reports whether Ctrl is pressed.
  public prop Ctrl bool { get; init; }
  /// Reports whether Super is pressed.
  public prop Super bool { get; init; }
}
