package GooWorkbench.Views

import System
import System.Collections.Generic
import Goo
import GooWorkbench.Models
import GooWorkbench.Services
import GooWorkbench.Components

class WorkbenchView : Cell, IDisposable {
  private let service WorkspaceService
  private let focus WorkbenchFocus = WorkbenchFocus{}
  private let rootHandle ElementHandle = ElementHandle{}
  private let rootChanged Action[ElementMetrics]
  private let changed Action
  private let onSearch Action[string]
  private let onFilter Action[int32]
  private let onSelect Action[int32]
  private let onToggleTask Action[int32, int32]
  private let onClear Action
  private let onAdd Action
  private let onBack Action
  private let onDensity Action
  private let onTheme Action[int32]
  private var theme Theme = Theme(0)
  private var mode int32 = 2
  private var details bool
  private var compact bool

  internal init(service WorkspaceService, width int32) {
    this.service = service
    changed = () -> Rebuild()
    onSearch = service.Search
    onFilter = service.SetFilter
    onSelect = Select
    onToggleTask = service.ToggleTask
    onClear = Clear
    onAdd = AddSample
    onBack = Back
    onDensity = ToggleDensity
    onTheme = SetTheme
    service.Changed += changed
    let initialTheme = Environment.GetEnvironmentVariable("WORKBENCH_THEME")
    theme = Theme(if initialTheme == "Instrument" { 1 } else if initialTheme == "Registry" { 2 } else { 0 })
    mode = Mode(float64(width))
    rootChanged = (metrics ElementMetrics) -> {
      if metrics.IsMounted && metrics.BorderBox.Width > 0.0 {
        let next = Mode(metrics.BorderBox.Width)
        if next != mode {
          mode = next
          Rebuild()
        }
      }
    }
    rootHandle.MetricsChanged += rootChanged
  }

  private func Mode(width float64) int32 {
    if width >= 1120.0 { return 2 }
    if width >= 760.0 { return 1 }
    return 0
  }

  private func Select(id int32) {
    details = true
    focus.OpenDetails(mode == 0)
    service.Select(id)
    Rebuild()
  }

  private func Back() {
    details = false
    focus.RestoreRow(if service.Matches(service.Current()) { service.State.SelectedId } else { 0 })
    Rebuild()
  }

  private func Clear() {
    details = false
    focus.Search.Blur()
    service.ClearFilters()
  }

  private func AddSample() {
    let project = service.AddSample()
    focus.Search.Blur()
    Select(project.Id)
  }

  private func SetTheme(value int32) {
    if theme.Kind == value { return }
    theme = Theme(value)
    Rebuild()
  }

  private func ToggleDensity() {
    compact = !compact
    Rebuild()
  }

  private func Rows() List[RowInput] {
    let rows = List[RowInput]()
    for project in service.Projects {
      if service.Matches(project) {
        rows.Add(RowInput{ Theme: theme, Project: project, Handle: focus.Row(project.Id), Selected: project.Id == service.State.SelectedId, Compact: compact, Completed: project.Completed(), OnSelect: onSelect })
      }
    }
    return rows
  }

  override func Build() Blob -> Container {
    Handle: rootHandle,
    Width: Length.Percent(100),
    Height: Length.Percent(100),
    FontFamily: "IBM Plex Sans",
    Color: theme.Ink,
    BackgroundColor: theme.Canvas,
    FlexDirection: FlexDirection.Row,
    OnKeyDown: (e KeyEvent) -> {
      if e.Key == Key.Escape && mode == 0 && details {
        e.PreventDefault()
        Back()
      }
    },
    Children: {
      Cell.Mount[ChromeInput, NavigationCell]("navigation", ChromeInput{ Theme: theme, Mode: mode, Compact: compact, Filter: service.State.Filter, OnFilter: onFilter, OnDensity: onDensity, OnAdd: onAdd }),
      Container{
        Key: "workspace",
        FlexGrow: 1,
        FlexShrink: 1,
        MinWidth: 0,
        MinHeight: 0,
        BackgroundColor: theme.Surface,
        Children: {
          Cell.Mount[ThemeInput, ThemeSelectorCell]("themes", ThemeInput{ Theme: theme, OnTheme: onTheme }),
          Cell.Mount[ChromeInput, HeaderCell]("header", ChromeInput{ Theme: theme, Mode: mode, Compact: compact, Filter: if mode == 2 { 0 } else { service.State.Filter }, OnFilter: onFilter, OnDensity: onDensity, OnAdd: onAdd }),
          Container{ Key: "body", FlexGrow: 1, FlexShrink: 1, MinHeight: 0, FlexDirection: FlexDirection.Row, Children: { Cell.Mount[ListInput, ProjectListCell]("list", ListInput{ Theme: theme, Mode: mode, Query: service.State.Query, Rows: Rows(), Details: mode == 0 && details, SearchHandle: focus.Search, ListHandle: focus.List, OnSearch: onSearch, OnClear: onClear }), Cell.Mount[InspectorInput, InspectorCell]("inspector", InspectorInput{ Theme: theme, Project: service.Current(), Mode: mode, Details: mode == 0 && details, Revision: service.Current().Revision, BackHandle: focus.Back, OnBack: onBack, OnToggleTask: onToggleTask }) } },
          Cell.Mount[Theme, FooterCell]("footer", theme),
        },
      },
    },
  }

  public func Dispose() {
    rootHandle.MetricsChanged -= rootChanged
    service.Changed -= changed
    focus.Dispose()
  }
}
