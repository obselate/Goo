package Goo

import System
import Goo.InternalTextInterop

/// Hosts a Goo tree in an SDL window.
public partial class Window {
  private func toSdlState(value WindowState) Goo.InternalTextInterop.SdlHostState {
    return switch value {
      case WindowState.Normal: Goo.InternalTextInterop.SdlHostState.Normal
      case WindowState.Minimized: Goo.InternalTextInterop.SdlHostState.Minimized
      case WindowState.Maximized: Goo.InternalTextInterop.SdlHostState.Maximized
      case WindowState.Fullscreen: Goo.InternalTextInterop.SdlHostState.Fullscreen
      case _: throw NotSupportedException("Window.toSdlState: unhandled state " + value.ToString())
    }
  }

  private func fromSdlState(value Goo.InternalTextInterop.SdlHostState) WindowState {
    return switch value {
      case Goo.InternalTextInterop.SdlHostState.Normal: WindowState.Normal
      case Goo.InternalTextInterop.SdlHostState.Minimized: WindowState.Minimized
      case Goo.InternalTextInterop.SdlHostState.Maximized: WindowState.Maximized
      case Goo.InternalTextInterop.SdlHostState.Fullscreen: WindowState.Fullscreen
      case _: throw NotSupportedException("Window.fromSdlState: unhandled state " + value.ToString())
    }
  }

  private func toSdlCursor(value Cursor) Goo.InternalTextInterop.SdlHostCursor {
    return switch value {
      case Cursor.Default: Goo.InternalTextInterop.SdlHostCursor.Default
      case Cursor.Pointer: Goo.InternalTextInterop.SdlHostCursor.Pointer
      case Cursor.Text: Goo.InternalTextInterop.SdlHostCursor.Text
      case Cursor.Crosshair: Goo.InternalTextInterop.SdlHostCursor.Crosshair
      case Cursor.Move: Goo.InternalTextInterop.SdlHostCursor.Move
      case Cursor.NotAllowed: Goo.InternalTextInterop.SdlHostCursor.NotAllowed
      case Cursor.Wait: Goo.InternalTextInterop.SdlHostCursor.Wait
      case Cursor.Progress: Goo.InternalTextInterop.SdlHostCursor.Progress
      case Cursor.ResizeHorizontal: Goo.InternalTextInterop.SdlHostCursor.ResizeHorizontal
      case Cursor.ResizeVertical: Goo.InternalTextInterop.SdlHostCursor.ResizeVertical
      case Cursor.ResizeNorthwestSoutheast: Goo.InternalTextInterop.SdlHostCursor.ResizeNorthwestSoutheast
      case Cursor.ResizeNortheastSouthwest: Goo.InternalTextInterop.SdlHostCursor.ResizeNortheastSouthwest
      case Cursor.ResizeNorthwest: Goo.InternalTextInterop.SdlHostCursor.ResizeNorthwest
      case Cursor.ResizeNorth: Goo.InternalTextInterop.SdlHostCursor.ResizeNorth
      case Cursor.ResizeNortheast: Goo.InternalTextInterop.SdlHostCursor.ResizeNortheast
      case Cursor.ResizeEast: Goo.InternalTextInterop.SdlHostCursor.ResizeEast
      case Cursor.ResizeSoutheast: Goo.InternalTextInterop.SdlHostCursor.ResizeSoutheast
      case Cursor.ResizeSouth: Goo.InternalTextInterop.SdlHostCursor.ResizeSouth
      case Cursor.ResizeSouthwest: Goo.InternalTextInterop.SdlHostCursor.ResizeSouthwest
      case Cursor.ResizeWest: Goo.InternalTextInterop.SdlHostCursor.ResizeWest
      case _: throw NotSupportedException("Window.toSdlCursor: unhandled cursor " + value.ToString())
    }
  }

  internal func NativeResizable() bool {
    return if let native = host { native.NativeResizable } else { false }
  }

  internal func queueNativeMetrics(logicalWidth int32, logicalHeight int32,
    nativeWidth int32, nativeHeight int32) {
    pendingLogicalWidth = logicalWidth
    pendingLogicalHeight = logicalHeight
    pendingFramebufferWidth = nativeWidth
    pendingFramebufferHeight = nativeHeight
    pendingMetrics = true
    MetricSubscriptions.ReportWindowMetrics(this, logicalWidth, logicalHeight, nativeWidth, nativeHeight)
  }

  // Custom chrome hit routing: only undecorated windows own their edges and
  // drag regions; the system chrome handles both otherwise.
  internal func hitTest(x int32, y int32) Goo.InternalTextInterop.SdlHitResult {
    if decorated {
      return Goo.InternalTextInterop.SdlHitResult.Normal
    }

    guard let n = node else {
      return Goo.InternalTextInterop.SdlHitResult.Normal
    }
    let px = float32(x)
    let py = float32(y)
    let info = input.HitInfo(n, px, py)
    if info.HasContent {
      return Goo.InternalTextInterop.SdlHitResult.Normal
    }

    if resizable {
      let band = resizeBand
      let logicalWidth = float32(Width)
      let logicalHeight = float32(Height)
      let left = px < band
      let right = px > logicalWidth - band
      let top = py < band
      let bottom = py > logicalHeight - band

      if top && left {
        return Goo.InternalTextInterop.SdlHitResult.TopLeft
      }
      if top && right {
        return Goo.InternalTextInterop.SdlHitResult.TopRight
      }
      if bottom && left {
        return Goo.InternalTextInterop.SdlHitResult.BottomLeft
      }
      if bottom && right {
        return Goo.InternalTextInterop.SdlHitResult.BottomRight
      }
      if top {
        return Goo.InternalTextInterop.SdlHitResult.Top
      }
      if bottom {
        return Goo.InternalTextInterop.SdlHitResult.Bottom
      }
      if left {
        return Goo.InternalTextInterop.SdlHitResult.Left
      }
      if right {
        return Goo.InternalTextInterop.SdlHitResult.Right
      }
    }
    return info.DragsWindow
      ? Goo.InternalTextInterop.SdlHitResult.Draggable
      : Goo.InternalTextInterop.SdlHitResult.Normal
  }
}
