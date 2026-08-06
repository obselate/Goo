# Input API

Generated from `Goo.xml`. Source declarations supply type ownership and XML-emitter omissions.

Source: [`Goo/Input`](../../Goo/Input)

## Receive generic text and IME input

A focusable `Blob` can opt into `OnTextInput`, `OnTextComposition`, `OnTextCompositionCancel`, and `OnTextCandidates`. Committed text and composition offsets use UTF-16. Invalid or surrogate-splitting composition selections are delivered as the empty range. Candidate snapshots are read-only and use `SelectedCandidate = -1` when native selection is invalid.

Callbacks run only for the currently focused, enabled, visible client. Queued text is bound to the focus generation that received it, so it is discarded after a focus transfer, including a transfer back to the original element. `TextEntry` and `TextEditor` retain their existing default behavior before these observers run. Goo provides no candidate UI; applications own candidate presentation.

## Receive pointer lifecycle and pressure input

`OnPointerEnter` and `OnPointerLeave` are sparse, non-bubbling lifecycle callbacks. They run only for mouse hover-route changes. Goo sends leaves from the old route leaf to root, then enters from the new route root to leaf. Shared route ancestors receive neither callback. Removal, disable, hidden state, focus loss, and transformed hit routes use the same order.

`PointerEvent.IsPrimary` is true for the mouse and the first active touch or pen contact in a device-type sequence. The primary contact stays primary through its up callback. Goo does not promote another held contact during that sequence.

`PointerEvent.Pressure` is normalized to the inclusive range from 0 to 1. Mouse pressure is 1 only while the primary button is held and 0 otherwise. Touch samples every SDL down, move, and up event. Pen samples its latest pressure-axis value on the next down, move, up, or pen-button event. A pressure-axis event alone emits no `PointerMove`. A pen proximity-out clears that pen's sampled pressure. Goo does not coalesce movement or expose tilt, twist, contact geometry, raw history, or gesture recognition.

## `FocusEvent`

Source:

- [`KeyboardEvent.gs`](../../Goo/Input/KeyboardEvent.gs)

Describes a non-cancelable focus lifecycle callback.

### `StopPropagation`

Stops further callback propagation for this event.

## `Key`

Source:

- [`Key.gs`](../../Goo/Input/Key.gs)

Identifies a physical keyboard key.

### Values

- `Unknown`
- `Space`
- `Apostrophe`
- `Comma`
- `Minus`
- `Period`
- `Slash`
- `Number0`
- `D0`
- `Number1`
- `Number2`
- `Number3`
- `Number4`
- `Number5`
- `Number6`
- `Number7`
- `Number8`
- `Number9`
- `Semicolon`
- `Equal`
- `A`
- `B`
- `C`
- `D`
- `E`
- `F`
- `G`
- `H`
- `I`
- `J`
- `K`
- `L`
- `M`
- `N`
- `O`
- `P`
- `Q`
- `R`
- `S`
- `T`
- `U`
- `V`
- `W`
- `X`
- `Y`
- `Z`
- `LeftBracket`
- `BackSlash`
- `RightBracket`
- `GraveAccent`
- `World1`
- `World2`
- `Escape`
- `Enter`
- `Tab`
- `Backspace`
- `Insert`
- `Delete`
- `Right`
- `Left`
- `Down`
- `Up`
- `PageUp`
- `PageDown`
- `Home`
- `End`
- `CapsLock`
- `ScrollLock`
- `NumLock`
- `PrintScreen`
- `Pause`
- `F1`
- `F2`
- `F3`
- `F4`
- `F5`
- `F6`
- `F7`
- `F8`
- `F9`
- `F10`
- `F11`
- `F12`
- `F13`
- `F14`
- `F15`
- `F16`
- `F17`
- `F18`
- `F19`
- `F20`
- `F21`
- `F22`
- `F23`
- `F24`
- `F25`
- `Keypad0`
- `Keypad1`
- `Keypad2`
- `Keypad3`
- `Keypad4`
- `Keypad5`
- `Keypad6`
- `Keypad7`
- `Keypad8`
- `Keypad9`
- `KeypadDecimal`
- `KeypadDivide`
- `KeypadMultiply`
- `KeypadSubtract`
- `KeypadAdd`
- `KeypadEnter`
- `KeypadEqual`
- `ShiftLeft`
- `ControlLeft`
- `AltLeft`
- `SuperLeft`
- `ShiftRight`
- `ControlRight`
- `AltRight`
- `SuperRight`
- `Menu`

## `KeyEvent`

Source:

- [`KeyboardEvent.gs`](../../Goo/Input/KeyboardEvent.gs)

Describes a keyboard callback.

### `PreventDefault`

Prevents the default keyboard behavior for this event.

### `StopPropagation`

Stops further callback propagation for this event.

### `Key`

Gets the physical key.

### `Modifiers`

Gets the modifier keys held for this event.

### `Repeat`

Reports whether this key down came from Goo key repeat.

## `KeyModifiers`

Source:

- [`KeyModifiers.gs`](../../Goo/Input/KeyModifiers.gs)

Describes the modifier keys for one key press.

### `Alt`

Reports whether Alt is pressed.

### `Ctrl`

Reports whether Ctrl is pressed.

### `Shift`

Reports whether Shift is pressed.

### `Super`

Reports whether Super is pressed.

## `PointerButton`

Source:

- [`PointerButton.gs`](../../Goo/Input/PointerButton.gs)

Identifies the pointer button that changed for an input event.

### Values

- `None`
- `Primary`
- `Secondary`
- `Middle`
- `Back`
- `Forward`

## `PointerButtons`

Source:

- [`PointerButton.gs`](../../Goo/Input/PointerButton.gs)

Identifies the pointer buttons held during an input event.

### Values

- `None`
- `Primary`
- `Secondary`
- `Middle`
- `Back`
- `Forward`

## `PointerDevice`

Source:

- [`PointerDevice.gs`](../../Goo/Input/PointerDevice.gs)

Identifies the pointer device type that produced a pointer event.

### Values

- `Mouse`
- `Touch`
- `Pen`

## `PointerEvent`

Source:

- [`PointerEvent.gs`](../../Goo/Input/PointerEvent.gs)

Describes a pointer input callback.

### `Capture`

Requests pointer capture for the current callback target.

### `PreventDefault`

Prevents the default behavior for this event.

### `ReleaseCapture`

Releases pointer capture held by the current callback target.

### `StopPropagation`

Stops further callback propagation for this event.

### `Button`

Gets the pointer button that changed, or None for movement.

### `Buttons`

Gets the pointer buttons held after the event transition.

### `Delta`

Gets movement since the preceding pointer position in the current handler coordinates.

### `Device`

Gets the pointer device type that produced this event.

### `IsPrimary`

Reports whether this contact is primary for its active device-type sequence.

### `Modifiers`

Gets the modifier keys held for the event.

### `PointerId`

Gets the stable identifier for this pointer while it is connected.

### `Position`

Gets the pointer position in the current handler coordinates.

### `Pressure`

Gets normalized pressure in the inclusive range from 0 to 1.

### `WindowPosition`

Gets the pointer position in logical window coordinates.

## `TextCandidateEvent`

Source:

- [`TextInputEvent.gs`](../../Goo/Input/TextInputEvent.gs)

Describes one native IME candidate-list update with Candidates, SelectedCandidate, and Horizontal layout.

## `TextCompositionEvent`

Source:

- [`TextInputEvent.gs`](../../Goo/Input/TextInputEvent.gs)

Describes transient IME composition Text and its selected UTF-16 SelectionStart and SelectionLength.

## `WheelEvent`

Source:

- [`WheelEvent.gs`](../../Goo/Input/WheelEvent.gs)

Describes a pointer wheel callback.

### `PreventDefault`

Prevents the default behavior for this event.

### `StopPropagation`

Stops further callback propagation for this event.

### `Delta`

Gets the raw platform wheel movement.

### `Modifiers`

Gets the modifier keys held for the event.

### `Position`

Gets the wheel position in the current handler coordinates.

### `WindowPosition`

Gets the wheel position in logical window coordinates.
