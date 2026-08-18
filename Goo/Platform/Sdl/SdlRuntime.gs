package Goo

import System
import System.Collections.Generic
import System.Linq
import System.Threading
import Hexa.NET.SDL3

internal class SdlEventRouter {
  private let handlers Dictionary[uint32, Action[SDLEvent]] =
    Dictionary[uint32, Action[SDLEvent]]()

  internal func Register(windowId uint32, handler Action[SDLEvent]) {
    handlers[windowId] = handler
  }

  internal func Unregister(windowId uint32) {
    handlers.Remove(windowId)
  }

  internal func Route(windowId uint32, nativeEvent SDLEvent) {
    if handlers.TryGetValue(windowId, out var handler) {
      handler(nativeEvent)
    }
  }

  internal func RouteAll(nativeEvent SDLEvent) {
    let snapshot = handlers.Values.ToArray()
    for handler in snapshot {
      handler(nativeEvent)
    }
  }
}

internal class SdlRuntime {
  shared {
    private let requiredSubsystems uint32 = uint32(SDLInitFlags.Video | SDLInitFlags.Events)
    private let sync object = Object()
    private let events SdlEventRouter = SdlEventRouter()
    private var mainThreadId int32
    private var references int32
    private var wakeEventType uint32
    private let cursors []SDLCursorPtr = [int32(SdlHostCursor.ResizeWest) + 1]SDLCursorPtr
    private var currentCursor SdlHostCursor = SdlHostCursor.Default
    private var applicationConfigured bool
    private var applicationName string?
    private var applicationVersion string?
    private var applicationIdentifier string?

    internal func ConfigureApplication(name string, version string, identifier string) {
      if String.IsNullOrWhiteSpace(name) {
        throw ArgumentException("name")
      }
      if String.IsNullOrWhiteSpace(version) {
        throw ArgumentException("version")
      }
      if String.IsNullOrWhiteSpace(identifier) {
        throw ArgumentException("identifier")
      }

      lock (sync) {
        if applicationConfigured {
          if applicationName == name && applicationVersion == version && applicationIdentifier == identifier {
            return
          }
          throw InvalidOperationException(
            "Goo application metadata is already configured with different values.")
        }
        if mainThreadId != 0 || SDL.WasInit(0u) != 0u {
          throw InvalidOperationException(
            "Goo application metadata must be configured before SDL initialization.")
        }
        if !SDL.SetAppMetadata(name, version, identifier) {
          throw InvalidOperationException("SDL_SetAppMetadata failed: " + SDL.GetErrorS())
        }
        applicationName = name
        applicationVersion = version
        applicationIdentifier = identifier
        applicationConfigured = true
      }
    }

    internal func Register(windowId uint32, handler Action[SDLEvent]) {
      RequireMainThread("SDL event registration")
      events.Register(windowId, handler)
    }

    internal func Unregister(windowId uint32) {
      RequireMainThread("SDL event unregistration")
      events.Unregister(windowId)
    }

    internal func PollEvents() {
      RequireMainThread("SDL event polling")
      var nativeEvent SDLEvent = SDLEvent{}
      while SDL.PollEvent(&nativeEvent) {
        DispatchOne(nativeEvent)
      }
    }

    internal func WaitEvents(timeoutMs int32) {
      RequireMainThread("SDL event waiting")
      var nativeEvent SDLEvent = SDLEvent{}
      if SDL.WaitEventTimeout(&nativeEvent, timeoutMs) {
        DispatchOne(nativeEvent)
        PollEvents()
      }
    }

    internal func Wake() {
      lock (sync) {
        if references == 0 {
          return
        }
        var wakeEvent = SDLEvent{ Type: wakeEventType }
        let added = SDL.PeepEvents(&wakeEvent, 1, SDLEventAction.Addevent, 0u, 0u)
        if added != 1 {
          throw InvalidOperationException(
            "SDL_PeepEvents failed to enqueue wake event: " + SDL.GetErrorS())
        }
      }
    }

    internal func SetCursor(value SdlHostCursor) {
      RequireMainThread("SDL cursor mutation")
      if int32(value) < int32(SdlHostCursor.Default) ||
          int32(value) > int32(SdlHostCursor.ResizeWest) {
        throw ArgumentOutOfRangeException("value")
      }
      if value == currentCursor {
        return
      }

      var cursor SDLCursorPtr
      if value == SdlHostCursor.Default {
        cursor = SDL.GetDefaultCursor()
      } else {
        cursor = cursors[int32(value)]
        if cursor.IsNull {
          cursor = SDL.CreateSystemCursor(MapSystemCursor(value))
          if cursor.IsNull {
            throw InvalidOperationException("SDL_CreateSystemCursor failed: " + SDL.GetErrorS())
          }
          cursors[int32(value)] = cursor
        }
      }
      if !SDL.SetCursor(cursor) {
        throw InvalidOperationException("SDL_SetCursor failed: " + SDL.GetErrorS())
      }
      currentCursor = value
    }

    internal func MapSystemCursor(value SdlHostCursor) SDLSystemCursor {
      return switch value {
        case SdlHostCursor.Default: SDLSystemCursor.Default
        case SdlHostCursor.Pointer: SDLSystemCursor.Pointer
        case SdlHostCursor.Text: SDLSystemCursor.Text
        case SdlHostCursor.Crosshair: SDLSystemCursor.Crosshair
        case SdlHostCursor.Move: SDLSystemCursor.Move
        case SdlHostCursor.NotAllowed: SDLSystemCursor.NotAllowed
        case SdlHostCursor.Wait: SDLSystemCursor.Wait
        case SdlHostCursor.Progress: SDLSystemCursor.Progress
        case SdlHostCursor.ResizeHorizontal: SDLSystemCursor.EwResize
        case SdlHostCursor.ResizeVertical: SDLSystemCursor.NsResize
        case SdlHostCursor.ResizeNorthwestSoutheast: SDLSystemCursor.NwseResize
        case SdlHostCursor.ResizeNortheastSouthwest: SDLSystemCursor.NeswResize
        case SdlHostCursor.ResizeNorthwest: SDLSystemCursor.NwResize
        case SdlHostCursor.ResizeNorth: SDLSystemCursor.NResize
        case SdlHostCursor.ResizeNortheast: SDLSystemCursor.NeResize
        case SdlHostCursor.ResizeEast: SDLSystemCursor.EResize
        case SdlHostCursor.ResizeSoutheast: SDLSystemCursor.SeResize
        case SdlHostCursor.ResizeSouth: SDLSystemCursor.SResize
        case SdlHostCursor.ResizeSouthwest: SDLSystemCursor.SwResize
        case SdlHostCursor.ResizeWest: SDLSystemCursor.WResize
        case _: throw ArgumentOutOfRangeException("value")
      }
    }

    internal func Acquire() {
      lock (sync) {
        RequireMainThreadLocked("Window.Open")
        if references == 0 {
          let requiresWayland = OperatingSystem.IsLinux()
          if requiresWayland && !SDL.SetHintWithPriority(
              SDL.SDL_HINT_VIDEO_DRIVER, "wayland", SDLHintPriority.Override) {
            throw PlatformNotSupportedException(
              "Goo requires native Wayland on Linux, but SDL rejected the Wayland video driver selection.")
          }
          SDL.SetHint(SDL.SDL_HINT_MOUSE_FOCUS_CLICKTHROUGH, "1")
          if !SDL.InitSubSystem(requiredSubsystems) {
            if requiresWayland {
              throw PlatformNotSupportedException(
                "Goo requires native Wayland on Linux. SDL could not initialize the Wayland video driver: " +
                SDL.GetErrorS())
            }
            throw InvalidOperationException("SDL_InitSubSystem failed: " + SDL.GetErrorS())
          }
          RequireMainThreadLocked("Window.Open")
          if mainThreadId == 0 {
            mainThreadId = Environment.CurrentManagedThreadId
          }
          if requiresWayland && !SdlHost.IsWayland() {
            let driver = SDL.GetCurrentVideoDriverS()
            SDL.QuitSubSystem(requiredSubsystems)
            throw PlatformNotSupportedException(
              "Goo requires native Wayland on Linux, but SDL initialized '" + driver + "'.")
          }
          wakeEventType = SDL.RegisterEvents(1)
          if wakeEventType == 0u || wakeEventType == uint32.MaxValue {
            SDL.QuitSubSystem(requiredSubsystems)
            throw InvalidOperationException("SDL_RegisterEvents failed to allocate a wake event type.")
          }
        }
        references++
      }
    }

    internal func Release() {
      lock (sync) {
        RequireMainThreadLocked("SDL subsystem release")
        if references == 0 {
          return
        }
        references--
        if references == 0 {
          SDL.SetCursor(SDL.GetDefaultCursor())
          for cursor in cursors {
            if !cursor.IsNull {
              SDL.DestroyCursor(cursor)
            }
          }
          currentCursor = SdlHostCursor.Default
          SDL.QuitSubSystem(requiredSubsystems)
        }
      }
    }

    internal func RequireMainThread(operation string, prefix string = "") {
      lock (sync) {
        RequireMainThreadLocked(operation, prefix)
      }
    }

    private func RequireMainThreadLocked(operation string, prefix string = "") {
      let currentThreadId = Environment.CurrentManagedThreadId
      if mainThreadId != 0 && currentThreadId != mainThreadId {
        let operationText = prefix.Length == 0 ? operation : String.Concat(prefix, operation)
        throw InvalidOperationException(
          operationText + " must run on Goo's main UI thread " + mainThreadId.ToString() +
          "; the current managed thread is " + currentThreadId.ToString() + ".")
      }
      if !SDL.IsMainThread() {
        let operationText = prefix.Length == 0 ? operation : String.Concat(prefix, operation)
        throw InvalidOperationException(
          operationText + " must run on SDL's main thread; the current managed thread is " +
          currentThreadId.ToString() + ".")
      }
    }

    private func DispatchOne(nativeEvent SDLEvent) {
      let eventType = SDLEventType(nativeEvent.Type)
      if eventType == SDLEventType.Quit || eventType == SDLEventType.Terminating {
        events.RouteAll(nativeEvent)
      } else if eventType == SDLEventType.PenProximityOut && nativeEvent.Pproximity.WindowID == 0u {
        events.RouteAll(nativeEvent)
      } else if TryGetWindowId(nativeEvent, out var windowId) {
        events.Route(windowId, nativeEvent)
      }
    }

    private func TryGetWindowId(nativeEvent SDLEvent, out windowId uint32) bool {
      let eventType = SDLEventType(nativeEvent.Type)
      if eventType >= SDLEventType.WindowFirst && eventType <= SDLEventType.WindowLast {
        windowId = nativeEvent.Window.WindowID
        return windowId != 0u
      }
      if eventType == SDLEventType.MouseMotion {
        windowId = nativeEvent.Motion.WindowID
      } else if eventType == SDLEventType.MouseButtonDown || eventType == SDLEventType.MouseButtonUp {
        windowId = nativeEvent.Button.WindowID
      } else if eventType == SDLEventType.MouseWheel {
        windowId = nativeEvent.Wheel.WindowID
      } else if eventType == SDLEventType.FingerDown || eventType == SDLEventType.FingerMotion ||
          eventType == SDLEventType.FingerUp || eventType == SDLEventType.FingerCanceled {
        windowId = nativeEvent.Tfinger.WindowID
      } else if eventType == SDLEventType.PenDown || eventType == SDLEventType.PenUp {
        windowId = nativeEvent.Ptouch.WindowID
      } else if eventType == SDLEventType.PenMotion {
        windowId = nativeEvent.Pmotion.WindowID
      } else if eventType == SDLEventType.PenAxis {
        windowId = nativeEvent.Paxis.WindowID
      } else if eventType == SDLEventType.PenButtonDown || eventType == SDLEventType.PenButtonUp {
        windowId = nativeEvent.Pbutton.WindowID
      } else if eventType == SDLEventType.PenProximityIn || eventType == SDLEventType.PenProximityOut {
        windowId = nativeEvent.Pproximity.WindowID
      } else if eventType == SDLEventType.KeyDown || eventType == SDLEventType.KeyUp {
        windowId = nativeEvent.Key.WindowID
      } else if eventType == SDLEventType.TextInput {
        windowId = nativeEvent.Text.WindowID
      } else if eventType == SDLEventType.TextEditing {
        windowId = nativeEvent.Edit.WindowID
      } else if eventType == SDLEventType.TextEditingCandidates {
        windowId = nativeEvent.EditCandidates.WindowID
      } else {
        windowId = 0u
      }
      return windowId != 0u
    }
  }
}
