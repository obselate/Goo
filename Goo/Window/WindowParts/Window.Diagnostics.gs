package Goo

import System
import System.Runtime.CompilerServices

internal class WindowDiagnosticsState {
  internal var Session DevToolsSession?
}

internal class WindowDiagnostics {
  shared {
    private var values ConditionalWeakTable[Window, WindowDiagnosticsState]?

    internal func AttachIfEnabled(window Window) {
      if Environment.GetEnvironmentVariable("GOO_DEVTOOLS") == "1" {
        window.AttachDiagnostics()
      }
    }

    internal func Session(window Window) DevToolsSession? {
      if let existing = values {
        if existing.TryGetValue(window, out var state) {
          return state.Session
        }
      }
      return nil
    }

    internal func Set(window Window, session DevToolsSession) {
      if values == nil {
        values = ConditionalWeakTable[Window, WindowDiagnosticsState]()
      }
      guard let existing = values else { return }
      existing.GetOrCreateValue(window).Session = session
    }

    internal func Clear(window Window, session DevToolsSession) bool {
      if let existing = values {
        if !existing.TryGetValue(window, out var state) || state.Session != session {
          return false
        }
        existing.Remove(window)
      }
      return true
    }
  }
}
