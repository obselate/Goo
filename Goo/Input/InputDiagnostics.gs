package Goo

import System.Runtime.CompilerServices

internal class PointerDiagnosticsState {
  internal var Hook((Node?, PointerEventKind, float32, float32, PointerButton) -> bool)?
}

internal class KeyboardDiagnosticsState {
  internal var Hook((Key, KeyModifiers) -> bool)?
}

internal class InputDiagnostics {
  shared {
    private let pointer ConditionalWeakTable[PointerInput, PointerDiagnosticsState] =
    ConditionalWeakTable[PointerInput, PointerDiagnosticsState]()
    private let keyboard ConditionalWeakTable[KeyboardInput, KeyboardDiagnosticsState] =
    ConditionalWeakTable[KeyboardInput, KeyboardDiagnosticsState]()

    internal func SetPointer(input PointerInput,
      hook((Node?, PointerEventKind, float32, float32, PointerButton) -> bool)?) {
        if let value = hook {
          pointer.GetOrCreateValue(input).Hook = value
        } else {
          pointer.Remove(input)
        }
      }

    internal func PointerHook(input PointerInput)
    ((Node?, PointerEventKind, float32, float32, PointerButton) -> bool) ? ->
    pointer.TryGetValue(input, out var state) ? state.Hook : nil

    internal func SetKeyboard(input KeyboardInput, hook((Key, KeyModifiers) -> bool)?) {
      if let value = hook {
        keyboard.GetOrCreateValue(input).Hook = value
      } else {
        keyboard.Remove(input)
      }
    }

    internal func KeyboardHook(input KeyboardInput)((Key, KeyModifiers) -> bool) ? ->
    keyboard.TryGetValue(input, out var state) ? state.Hook : nil
  }
}
