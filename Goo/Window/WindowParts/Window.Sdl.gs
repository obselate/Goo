package Goo

import System

/// Hosts a Goo tree in an SDL window.
public partial class Window {
  private func toSdlState(value WindowState) SdlHostState -> switch value {
    case WindowState.Normal: SdlHostState.Normal
    case WindowState.Minimized: SdlHostState.Minimized
    case WindowState.Maximized: SdlHostState.Maximized
    case WindowState.Fullscreen: SdlHostState.Fullscreen
    case _: throw NotSupportedException("Window.toSdlState: unhandled state " + value.ToString())
  }

  private func fromSdlState(value SdlHostState) WindowState -> switch value {
    case SdlHostState.Normal: WindowState.Normal
    case SdlHostState.Minimized: WindowState.Minimized
    case SdlHostState.Maximized: WindowState.Maximized
    case SdlHostState.Fullscreen: WindowState.Fullscreen
    case _: throw NotSupportedException("Window.fromSdlState: unhandled state " + value.ToString())
  }

  private func toSdlCursor(value Cursor) SdlHostCursor -> switch value {
    case Cursor.Default: SdlHostCursor.Default
    case Cursor.Pointer: SdlHostCursor.Pointer
    case Cursor.Text: SdlHostCursor.Text
    case Cursor.Crosshair: SdlHostCursor.Crosshair
    case Cursor.Move: SdlHostCursor.Move
    case Cursor.NotAllowed: SdlHostCursor.NotAllowed
    case Cursor.Wait: SdlHostCursor.Wait
    case Cursor.Progress: SdlHostCursor.Progress
    case Cursor.ResizeHorizontal: SdlHostCursor.ResizeHorizontal
    case Cursor.ResizeVertical: SdlHostCursor.ResizeVertical
    case Cursor.ResizeNorthwestSoutheast: SdlHostCursor.ResizeNorthwestSoutheast
    case Cursor.ResizeNortheastSouthwest: SdlHostCursor.ResizeNortheastSouthwest
    case Cursor.ResizeNorthwest: SdlHostCursor.ResizeNorthwest
    case Cursor.ResizeNorth: SdlHostCursor.ResizeNorth
    case Cursor.ResizeNortheast: SdlHostCursor.ResizeNortheast
    case Cursor.ResizeEast: SdlHostCursor.ResizeEast
    case Cursor.ResizeSoutheast: SdlHostCursor.ResizeSoutheast
    case Cursor.ResizeSouth: SdlHostCursor.ResizeSouth
    case Cursor.ResizeSouthwest: SdlHostCursor.ResizeSouthwest
    case Cursor.ResizeWest: SdlHostCursor.ResizeWest
    case _: throw NotSupportedException("Window.toSdlCursor: unhandled cursor " + value.ToString())
  }

  internal func NativeResizable() bool -> if let native = host { native.NativeResizable } else { false }

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
  internal func hitTest(x int32, y int32) SdlHitResult {
    if decorated {
      return SdlHitResult.Normal
    }

    guard let n = node else {
      return SdlHitResult.Normal
    }
    let px = float32(x)
    let py = float32(y)
    let info = input.HitInfo(n, px, py)
    if info.HasContent {
      return SdlHitResult.Normal
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
        return SdlHitResult.TopLeft
      }
      if top && right {
        return SdlHitResult.TopRight
      }
      if bottom && left {
        return SdlHitResult.BottomLeft
      }
      if bottom && right {
        return SdlHitResult.BottomRight
      }
      if top {
        return SdlHitResult.Top
      }
      if bottom {
        return SdlHitResult.Bottom
      }
      if left {
        return SdlHitResult.Left
      }
      if right {
        return SdlHitResult.Right
      }
    }
    return info.DragsWindow
    ? SdlHitResult.Draggable : SdlHitResult.Normal
  }
}
