package GooWorkbench.Views

import System
import System.Collections.Generic
import Goo

class WorkbenchFocus : IDisposable {
  internal let Search ElementHandle = ElementHandle{}
  internal let List ElementHandle = ElementHandle{}
  internal let Back ElementHandle = ElementHandle{}
  private let rows Dictionary[int32, ElementHandle] = Dictionary[int32, ElementHandle]()
  private let backChanged Action[ElementMetrics]
  private let rowChanged Action[ElementMetrics]
  private var pendingBack bool
  private var pendingRow int32

  internal init() {
    backChanged = (metrics ElementMetrics) -> {
      if pendingBack && metrics.IsMounted && metrics.BorderBox.Width > 0.0 {
        if Back.Focus() { pendingBack = false }
      }
    }
    rowChanged = (metrics ElementMetrics) -> {
      if pendingRow != 0 && metrics.IsMounted && metrics.BorderBox.Width > 0.0 {
        let handle = Row(pendingRow)
        if handle.Focus() {
          pendingRow = 0
          handle.ScrollIntoView()
        }
      }
    }
    Back.MetricsChanged += backChanged
  }

  internal func Row(id int32) ElementHandle {
    if rows.TryGetValue(id, out var handle) { return handle }
    let created = ElementHandle{}
    created.MetricsChanged += rowChanged
    rows.Add(id, created)
    return created
  }

  internal func OpenDetails(narrow bool) {
    pendingRow = 0
    pendingBack = narrow
  }

  internal func RestoreRow(id int32) {
    pendingBack = false
    pendingRow = id
  }

  public func Dispose() {
    Back.MetricsChanged -= backChanged
    for pair in rows { pair.Value.MetricsChanged -= rowChanged }
  }
}
