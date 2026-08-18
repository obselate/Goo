package Goo

import System

internal func fromSdlPointerButton(value SdlHostPointerButton) PointerButton {
  return switch value {
    case SdlHostPointerButton.None: PointerButton.None
    case SdlHostPointerButton.Primary: PointerButton.Primary
    case SdlHostPointerButton.Secondary: PointerButton.Secondary
    case SdlHostPointerButton.Middle: PointerButton.Middle
    case SdlHostPointerButton.Back: PointerButton.Back
    case SdlHostPointerButton.Forward: PointerButton.Forward
    case _: throw NotSupportedException("fromSdlPointerButton: unhandled button " + value.ToString())
  }
}

internal func fromSdlPointerDevice(value SdlHostPointerDevice) PointerDevice {
  return switch value {
    case SdlHostPointerDevice.Mouse: PointerDevice.Mouse
    case SdlHostPointerDevice.Touch: PointerDevice.Touch
    case SdlHostPointerDevice.Pen: PointerDevice.Pen
    case _: throw NotSupportedException("fromSdlPointerDevice: unhandled device " + value.ToString())
  }
}

internal func fromSdlPointerButtons(value SdlHostPointerButtons) PointerButtons {
  var buttons = PointerButtons.None
  if (int32(value) & int32(SdlHostPointerButtons.Primary)) != 0 {
    buttons = addPointerButton(buttons, PointerButton.Primary)
  }
  if (int32(value) & int32(SdlHostPointerButtons.Secondary)) != 0 {
    buttons = addPointerButton(buttons, PointerButton.Secondary)
  }
  if (int32(value) & int32(SdlHostPointerButtons.Middle)) != 0 {
    buttons = addPointerButton(buttons, PointerButton.Middle)
  }
  if (int32(value) & int32(SdlHostPointerButtons.Back)) != 0 {
    buttons = addPointerButton(buttons, PointerButton.Back)
  }
  if (int32(value) & int32(SdlHostPointerButtons.Forward)) != 0 {
    buttons = addPointerButton(buttons, PointerButton.Forward)
  }
  return buttons
}
