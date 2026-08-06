package Goo

import System

// Platform policy for editing shortcuts and wheel scrolling.
internal class InputPolicy {
  shared {
    // Test knob; defaults to the running OS.
    internal var Mac bool = OperatingSystem.IsMacOS()

    // Primary shortcut modifier: Command on macOS, Ctrl elsewhere.
    internal func Primary(m KeyModifiers) bool {
      return Mac ? m.Super : m.Ctrl
    }

    // Word navigation and word deletes: Option on macOS, Ctrl elsewhere.
    internal func Word(m KeyModifiers) bool {
      return Mac ? m.Alt : m.Ctrl
    }

    // Logical pixels per SDL wheel unit. SDL prescales macOS precise
    // trackpad deltas by 0.1, so 10 restores 1:1; verify on macOS pass.
    internal func WheelUnit() float32 {
      return Mac ? 10.0F : 48.0F
    }
  }
}
