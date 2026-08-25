package Goo

import System

internal func fromSdlModifiers(value SdlHostModifiers) KeyModifiers -> KeyModifiers {
  Alt: value.Alt,
  Shift: value.Shift,
  Ctrl: value.Ctrl,
  Super: value.Super,
}

internal func fromSdlKey(key SdlHostKey) Key -> switch key {
  case SdlHostKey.Unknown: Key.Unknown
  case SdlHostKey.Space: Key.Space
  case SdlHostKey.Apostrophe: Key.Apostrophe
  case SdlHostKey.Comma: Key.Comma
  case SdlHostKey.Minus: Key.Minus
  case SdlHostKey.Period: Key.Period
  case SdlHostKey.Slash: Key.Slash
  case SdlHostKey.Number0: Key.Number0
  case SdlHostKey.Number1: Key.Number1
  case SdlHostKey.Number2: Key.Number2
  case SdlHostKey.Number3: Key.Number3
  case SdlHostKey.Number4: Key.Number4
  case SdlHostKey.Number5: Key.Number5
  case SdlHostKey.Number6: Key.Number6
  case SdlHostKey.Number7: Key.Number7
  case SdlHostKey.Number8: Key.Number8
  case SdlHostKey.Number9: Key.Number9
  case SdlHostKey.Semicolon: Key.Semicolon
  case SdlHostKey.Equal: Key.Equal
  case SdlHostKey.A: Key.A
  case SdlHostKey.B: Key.B
  case SdlHostKey.C: Key.C
  case SdlHostKey.D: Key.D
  case SdlHostKey.E: Key.E
  case SdlHostKey.F: Key.F
  case SdlHostKey.G: Key.G
  case SdlHostKey.H: Key.H
  case SdlHostKey.I: Key.I
  case SdlHostKey.J: Key.J
  case SdlHostKey.K: Key.K
  case SdlHostKey.L: Key.L
  case SdlHostKey.M: Key.M
  case SdlHostKey.N: Key.N
  case SdlHostKey.O: Key.O
  case SdlHostKey.P: Key.P
  case SdlHostKey.Q: Key.Q
  case SdlHostKey.R: Key.R
  case SdlHostKey.S: Key.S
  case SdlHostKey.T: Key.T
  case SdlHostKey.U: Key.U
  case SdlHostKey.V: Key.V
  case SdlHostKey.W: Key.W
  case SdlHostKey.X: Key.X
  case SdlHostKey.Y: Key.Y
  case SdlHostKey.Z: Key.Z
  case SdlHostKey.LeftBracket: Key.LeftBracket
  case SdlHostKey.BackSlash: Key.BackSlash
  case SdlHostKey.RightBracket: Key.RightBracket
  case SdlHostKey.GraveAccent: Key.GraveAccent
  case SdlHostKey.World1: Key.World1
  case SdlHostKey.World2: Key.World2
  case SdlHostKey.Escape: Key.Escape
  case SdlHostKey.Enter: Key.Enter
  case SdlHostKey.Tab: Key.Tab
  case SdlHostKey.Backspace: Key.Backspace
  case SdlHostKey.Insert: Key.Insert
  case SdlHostKey.Delete: Key.Delete
  case SdlHostKey.Right: Key.Right
  case SdlHostKey.Left: Key.Left
  case SdlHostKey.Down: Key.Down
  case SdlHostKey.Up: Key.Up
  case SdlHostKey.PageUp: Key.PageUp
  case SdlHostKey.PageDown: Key.PageDown
  case SdlHostKey.Home: Key.Home
  case SdlHostKey.End: Key.End
  case SdlHostKey.CapsLock: Key.CapsLock
  case SdlHostKey.ScrollLock: Key.ScrollLock
  case SdlHostKey.NumLock: Key.NumLock
  case SdlHostKey.PrintScreen: Key.PrintScreen
  case SdlHostKey.Pause: Key.Pause
  case SdlHostKey.F1: Key.F1
  case SdlHostKey.F2: Key.F2
  case SdlHostKey.F3: Key.F3
  case SdlHostKey.F4: Key.F4
  case SdlHostKey.F5: Key.F5
  case SdlHostKey.F6: Key.F6
  case SdlHostKey.F7: Key.F7
  case SdlHostKey.F8: Key.F8
  case SdlHostKey.F9: Key.F9
  case SdlHostKey.F10: Key.F10
  case SdlHostKey.F11: Key.F11
  case SdlHostKey.F12: Key.F12
  case SdlHostKey.F13: Key.F13
  case SdlHostKey.F14: Key.F14
  case SdlHostKey.F15: Key.F15
  case SdlHostKey.F16: Key.F16
  case SdlHostKey.F17: Key.F17
  case SdlHostKey.F18: Key.F18
  case SdlHostKey.F19: Key.F19
  case SdlHostKey.F20: Key.F20
  case SdlHostKey.F21: Key.F21
  case SdlHostKey.F22: Key.F22
  case SdlHostKey.F23: Key.F23
  case SdlHostKey.F24: Key.F24
  case SdlHostKey.Keypad0: Key.Keypad0
  case SdlHostKey.Keypad1: Key.Keypad1
  case SdlHostKey.Keypad2: Key.Keypad2
  case SdlHostKey.Keypad3: Key.Keypad3
  case SdlHostKey.Keypad4: Key.Keypad4
  case SdlHostKey.Keypad5: Key.Keypad5
  case SdlHostKey.Keypad6: Key.Keypad6
  case SdlHostKey.Keypad7: Key.Keypad7
  case SdlHostKey.Keypad8: Key.Keypad8
  case SdlHostKey.Keypad9: Key.Keypad9
  case SdlHostKey.KeypadDecimal: Key.KeypadDecimal
  case SdlHostKey.KeypadDivide: Key.KeypadDivide
  case SdlHostKey.KeypadMultiply: Key.KeypadMultiply
  case SdlHostKey.KeypadSubtract: Key.KeypadSubtract
  case SdlHostKey.KeypadAdd: Key.KeypadAdd
  case SdlHostKey.KeypadEnter: Key.KeypadEnter
  case SdlHostKey.KeypadEqual: Key.KeypadEqual
  case SdlHostKey.ShiftLeft: Key.ShiftLeft
  case SdlHostKey.ControlLeft: Key.ControlLeft
  case SdlHostKey.AltLeft: Key.AltLeft
  case SdlHostKey.SuperLeft: Key.SuperLeft
  case SdlHostKey.ShiftRight: Key.ShiftRight
  case SdlHostKey.ControlRight: Key.ControlRight
  case SdlHostKey.AltRight: Key.AltRight
  case SdlHostKey.SuperRight: Key.SuperRight
  case SdlHostKey.Menu: Key.Menu
  case _: throw NotSupportedException("fromSdlKey: unhandled key " + key.ToString())
}
