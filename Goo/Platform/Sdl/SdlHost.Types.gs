package Goo

import System
import System.Runtime.InteropServices
import Hexa.NET.SDL3

internal enum SdlHostState {
  Normal;
  Minimized;
  Maximized;
  Fullscreen;
}

internal enum SdlHitResult {
  Normal;
  Draggable;
  TopLeft;
  Top;
  TopRight;
  Right;
  BottomRight;
  Bottom;
  BottomLeft;
  Left;
}

internal enum SdlHostKey {
  Unknown;
  Space;
  Apostrophe;
  Comma;
  Minus;
  Period;
  Slash;
  Number0;
  Number1;
  Number2;
  Number3;
  Number4;
  Number5;
  Number6;
  Number7;
  Number8;
  Number9;
  Semicolon;
  Equal;
  A;
  B;
  C;
  D;
  E;
  F;
  G;
  H;
  I;
  J;
  K;
  L;
  M;
  N;
  O;
  P;
  Q;
  R;
  S;
  T;
  U;
  V;
  W;
  X;
  Y;
  Z;
  LeftBracket;
  BackSlash;
  RightBracket;
  GraveAccent;
  World1;
  World2;
  Escape;
  Enter;
  Tab;
  Backspace;
  Insert;
  Delete;
  Right;
  Left;
  Down;
  Up;
  PageUp;
  PageDown;
  Home;
  End;
  CapsLock;
  ScrollLock;
  NumLock;
  PrintScreen;
  Pause;
  F1;
  F2;
  F3;
  F4;
  F5;
  F6;
  F7;
  F8;
  F9;
  F10;
  F11;
  F12;
  F13;
  F14;
  F15;
  F16;
  F17;
  F18;
  F19;
  F20;
  F21;
  F22;
  F23;
  F24;
  Keypad0;
  Keypad1;
  Keypad2;
  Keypad3;
  Keypad4;
  Keypad5;
  Keypad6;
  Keypad7;
  Keypad8;
  Keypad9;
  KeypadDecimal;
  KeypadDivide;
  KeypadMultiply;
  KeypadSubtract;
  KeypadAdd;
  KeypadEnter;
  KeypadEqual;
  ShiftLeft;
  ControlLeft;
  AltLeft;
  SuperLeft;
  ShiftRight;
  ControlRight;
  AltRight;
  SuperRight;
  Menu;
}

internal data struct SdlHostModifiers(Alt bool, Shift bool, Ctrl bool, Super bool) { }

internal data struct SdlHostPoint(X int32, Y int32) { }

@DllImport("SDL3", EntryPoint: "SDL_SetWindowHitTest", CallingConvention: CallingConvention.Cdecl)
internal func SDL_SetWindowHitTestRaw(window nint, callback nint, userData nint) uint8;

@DllImport("SDL3", EntryPoint: "SDL_GetWindowFromID", CallingConvention: CallingConvention.Cdecl)
internal func SDL_GetWindowFromIdRaw(windowId uint32) nint;

@DllImport("SDL3", EntryPoint: "SDL_Vulkan_GetVkGetInstanceProcAddr", CallingConvention: CallingConvention.Cdecl)
internal func SDL_Vulkan_GetVkGetInstanceProcAddrRaw() nint;

@UnmanagedFunctionPointer(CallingConvention.Cdecl)
internal type SdlHostRawHitTest = delegate func(nativeWindow nint, point nint, userData nint) SDLHitTestResult

internal enum SdlHostPointerButton {
  None;
  Primary;
  Secondary;
  Middle;
  Back;
  Forward;
}

internal enum SdlHostPointerDevice {
  Mouse;
  Touch;
  Pen;
}

internal enum SdlHostCursor {
  Default;
  Pointer;
  Text;
  Crosshair;
  Move;
  NotAllowed;
  Wait;
  Progress;
  ResizeHorizontal;
  ResizeVertical;
  ResizeNorthwestSoutheast;
  ResizeNortheastSouthwest;
  ResizeNorthwest;
  ResizeNorth;
  ResizeNortheast;
  ResizeEast;
  ResizeSoutheast;
  ResizeSouth;
  ResizeSouthwest;
  ResizeWest;
}

@Flags
internal enum SdlHostPointerButtons {
  None = 0;
  Primary = 1;
  Secondary = 2;
  Middle = 4;
  Back = 8;
  Forward = 16;
}
