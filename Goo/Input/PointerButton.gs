package Goo

import System

/// Identifies the pointer button that changed for an input event.
public enum PointerButton {
  None = 0;
  Primary = 1;
  Secondary = 2;
  Middle = 3;
  Back = 4;
  Forward = 5;
}

/// Identifies the pointer buttons held during an input event.
@Flags
public enum PointerButtons {
  None = 0;
  Primary = 1;
  Secondary = 2;
  Middle = 4;
  Back = 8;
  Forward = 16;
}

internal func pointerButtonMask(button PointerButton) PointerButtons -> switch button {
  case PointerButton.Primary: PointerButtons.Primary
  case PointerButton.Secondary: PointerButtons.Secondary
  case PointerButton.Middle: PointerButtons.Middle
  case PointerButton.Back: PointerButtons.Back
  case PointerButton.Forward: PointerButtons.Forward
  case _: PointerButtons.None
}

internal func addPointerButton(buttons PointerButtons, button PointerButton) PointerButtons -> PointerButtons(int32(buttons) | int32(pointerButtonMask(button)))

internal func removePointerButton(buttons PointerButtons, button PointerButton) PointerButtons -> PointerButtons(int32(buttons) & (int32(-1) ^ int32(pointerButtonMask(button))))
