package GooDevTools

import System
import System.Collections.Generic
import System.Threading
import Goo

class DevToolsCell : Cell {
  private let session DiagnosticSession
  private var wakePending int32
  private var showCaptures bool

  public init() {
    session = DiagnosticSession{}
    wakePending = 0
    showCaptures = false
  }

  public init(sessionValue DiagnosticSession) {
    session = sessionValue
    wakePending = 0
    showCaptures = false
  }

  internal func AttachWindow(window Window) {
    session.BindWake(() -> {
      if Interlocked.Exchange(&wakePending, 1) != 0 {
        return
      }
      try {
        window.Post(() -> {
          Interlocked.Exchange(&wakePending, 0)
          if session.Pump() {
            Rebuild()
          }
        })
      } catch (_ Exception) {
        Interlocked.Exchange(&wakePending, 0)
      }
    })
  }

  override func Build() Blob {
    session.Pump()
    return BuildRoot()
  }

  private func BuildRoot() Container {
    let children = List[Blob](2)
    children.Add(BuildTopbar())
    children.Add(BuildBody())
    return Container{
      Key: "devtools-root",
      Width: Length.Percent(100),
      Height: Length.Percent(100),
      FlexDirection: FlexDirection.Column,
      BackgroundColor: DevToolsTheme.Background,
      Children: children,
    }
  }

  private func BuildTopbar() Container {
    let children = List[Blob](8)
    children.Add(Container{
      Key: "brand",
      Width: 170,
      Height: Length.Percent(100),
      FlexDirection: FlexDirection.Column,
      JustifyContent: JustifyContent.Center,
      Children: {
        Text{
          Key: "brand-title",
          Content: "GOO DEVTOOLS",
          FontSize: 14,
          FontWeight: 800,
          LetterSpacing: 1.2,
          Color: DevToolsTheme.Ink,
        },
        Text{
          Key: "brand-subtitle",
          Content: "retained UI inspection",
          FontSize: 10,
          LetterSpacing: 0.5,
          Color: DevToolsTheme.InkSubtle,
        },
      },
    })
    children.Add(Container{
      Key: "endpoint",
      Width: 248,
      MinWidth: 180,
      Height: 30,
      PaddingLeft: 10,
      PaddingRight: 10,
      FlexDirection: FlexDirection.Row,
      AlignItems: AlignItems.Center,
      Gap: 8,
      BackgroundColor: DevToolsTheme.SurfaceStrong,
      BorderRadius: 5,
      BorderWidth: 1,
      BorderColor: DevToolsTheme.Border,
      Children: {
        Container{
          Key: "endpoint-state",
          Width: 7,
          Height: 7,
          BorderRadius: 4,
          BackgroundColor: ConnectionColor(session.State),
        },
        Text{
          Key: "endpoint-name",
          Content: session.Endpoint.ProcessName,
          FontSize: 11,
          FontWeight: 600,
          Color: DevToolsTheme.Ink,
          TextTrimming: TextTrimming.Ellipsis,
          FlexGrow: 1.0,
        },
        Text{
          Key: "endpoint-pipe",
          Content: session.Endpoint.PipeName,
          FontSize: 9,
          Color: DevToolsTheme.InkSubtle,
          TextTrimming: TextTrimming.Ellipsis,
        },
      },
    })
    if session.Windows.Count > 1 {
      children.Add(BuildWindowPicker())
    }
    children.Add(Container{ Key: "topbar-spacer", FlexGrow: 1.0 })
    children.Add(StatusPill())
    children.Add(ActionButton(
      "inspect-toggle",
      if session.Inspecting { "Stop inspect" } else { "Inspect" },
      if session.Inspecting { DevToolsTheme.CyanDim } else { DevToolsTheme.SurfaceRaised },
      DevToolsTheme.Ink,
      () -> {
        session.ToggleInspect()
        Rebuild()
      }))
    children.Add(ActionButton(
      "capture-top",
      "Capture frame",
      DevToolsTheme.SurfaceRaised,
      DevToolsTheme.Ink,
      () -> {
        session.CaptureScreenshot()
        Rebuild()
      }))
    children.Add(ActionButton(
      "connection-toggle",
      if session.State == DiagnosticConnectionState.Connected {
        "Disconnect"
      } else if session.IsSample {
        "Connect sample"
      } else {
        "Connect"
      },
      if session.State == DiagnosticConnectionState.Connected { DevToolsTheme.SurfaceRaised } else { DevToolsTheme.CyanDim },
      DevToolsTheme.Ink,
      () -> {
        session.ToggleConnection()
        Rebuild()
      }))
    return Container{
      Key: "topbar",
      Height: 52,
      MinHeight: 52,
      Width: Length.Percent(100),
      PaddingLeft: 18,
      PaddingRight: 18,
      FlexDirection: FlexDirection.Row,
      AlignItems: AlignItems.Center,
      Gap: 10,
      BackgroundColor: DevToolsTheme.Surface,
      BorderBottomWidth: 1,
      BorderBottomColor: DevToolsTheme.Border,
      Children: children,
    }
  }

  private func StatusPill() Container {
    let label = if session.State == DiagnosticConnectionState.Connected {
      "CONNECTED"
    } else if session.State == DiagnosticConnectionState.Connecting {
      "CONNECTING"
    } else if session.State == DiagnosticConnectionState.Faulted {
      "NO TARGET"
    } else {
      "DISCONNECTED"
    }
    return Container{
      Key: "status-pill",
      Height: 30,
      PaddingLeft: 10,
      PaddingRight: 10,
      FlexDirection: FlexDirection.Row,
      AlignItems: AlignItems.Center,
      Gap: 6,
      BackgroundColor: DevToolsTheme.Background,
      BorderRadius: 5,
      BorderWidth: 1,
      BorderColor: DevToolsTheme.Border,
      Children: {
        Text{
          Key: "status-label",
          Content: label,
          FontSize: 10,
          FontWeight: 700,
          LetterSpacing: 0.8,
          Color: ConnectionColor(session.State),
        },
      },
    }
  }

  private func BuildBody() Container {
    let children = List[Blob](2)
    children.Add(BuildCenter())
    children.Add(BuildInspector())
    return Container{
      Key: "body",
      Width: Length.Percent(100),
      Height: Length.Percent(100),
      FlexGrow: 1.0,
      FlexShrink: 1.0,
      MinHeight: 0,
      FlexDirection: FlexDirection.Row,
      BackgroundColor: DevToolsTheme.Background,
      Children: children,
    }
  }

  private func BuildWindowPicker() Container {
    let buttons = List[Blob]()
    var windowIndex int32
    for window in session.Windows {
      buttons.Add(BuildWindowButton(window, windowIndex))
      windowIndex = windowIndex + 1
    }
    return Container{
      Key: "window-picker",
      Width: 252,
      MinWidth: 150,
      MaxWidth: 320,
      Height: 32,
      FlexDirection: FlexDirection.Row,
      AlignItems: AlignItems.Center,
      Gap: 5,
      OverflowX: Overflow.Scroll,
      BackgroundColor: DevToolsTheme.Background,
      BorderRadius: 5,
      BorderWidth: 1,
      BorderColor: DevToolsTheme.Border,
      Children: buttons,
    }
  }

  private func BuildWindowButton(window DiagnosticWindow, ordinal int32) Button {
    let selected = window.Id == session.SelectedWindowId
    return Button{
      Key: "window-" + ordinal.ToString() + "-" + window.Id,
      Width: 240,
      MinWidth: 180,
      Height: 28,
      MinHeight: 28,
      PaddingLeft: 8,
      PaddingRight: 8,
      FlexDirection: FlexDirection.Row,
      AlignItems: AlignItems.Center,
      Gap: 5,
      BackgroundColor: if selected { DevToolsTheme.SurfaceStrong } else { DevToolsTheme.Surface },
      BorderRadius: 5,
      BorderWidth: 1,
      BorderColor: if selected { DevToolsTheme.BorderStrong } else { DevToolsTheme.Border },
      Hover: Style{ BackgroundColor: DevToolsTheme.SurfaceStrong },
      Active: Style{ BackgroundColor: DevToolsTheme.Border },
      Focus: Style{ BackgroundColor: DevToolsTheme.SurfaceStrong },
      Cursor: Cursor.Pointer,
      OnClick: () -> {
        session.SelectWindow(window.Id)
        Rebuild()
      },
      Children: {
        Text{
          Key: "window-title",
          Content: window.Title,
          FontSize: 10,
          FontWeight: 700,
          Color: if selected { DevToolsTheme.Ink } else { DevToolsTheme.InkMuted },
          TextTrimming: TextTrimming.Ellipsis,
          FlexGrow: 1.0,
        },
        Text{
          Key: "window-metrics",
          Content: window.Dimensions + " · " + window.Scale,
          FontSize: 9,
          Color: DevToolsTheme.InkSubtle,
          TextTrimming: TextTrimming.Ellipsis,
        },
      },
    }
  }

  private func BuildCenter() Container {
    let children = List[Blob](4)
    if session.Inspecting {
      children.Add(BuildInspectBanner())
    }
    if session.IsSample {
      children.Add(BuildTargetPreview())
    }
    children.Add(BuildTreeSection())
    children.Add(BuildBottomPanel())
    return Container{
      Key: "tree-pane",
      Width: 0,
      Height: Length.Percent(100),
      FlexGrow: 1.0,
      FlexShrink: 1.0,
      MinWidth: 0,
      MinHeight: 0,
      PaddingLeft: 12,
      PaddingTop: 10,
      PaddingRight: 10,
      PaddingBottom: 10,
      Gap: 8,
      FlexDirection: FlexDirection.Column,
      BackgroundColor: DevToolsTheme.Background,
      BorderRightWidth: 1,
      BorderRightColor: DevToolsTheme.Border,
      Children: children,
    }
  }

  private func BuildInspectBanner() Container -> Container {
    Key: "inspect-banner",
    Width: Length.Percent(100),
    Height: 38,
    MinHeight: 38,
    PaddingLeft: 12,
    PaddingRight: 8,
    FlexDirection: FlexDirection.Row,
    AlignItems: AlignItems.Center,
    Gap: 8,
    BackgroundColor: DevToolsTheme.CyanDim,
    BorderRadius: 5,
    BorderWidth: 1,
    BorderColor: DevToolsTheme.Cyan,
    Children: {
      Text{
        Key: "inspect-banner-title",
        Content: "INSPECT MODE",
        FontSize: 10,
        FontWeight: 800,
        LetterSpacing: 0.8,
        Color: DevToolsTheme.Cyan,
      },
      Text{
        Key: "inspect-banner-help",
        Content: "Choose a region in the rendered target to lock its visual tree node",
        FontSize: 11,
        Color: DevToolsTheme.Ink,
        FlexGrow: 1.0,
      },
      ActionButton(
        "inspect-cancel",
        "Cancel",
        DevToolsTheme.Surface,
        DevToolsTheme.Ink,
        () -> {
          session.ToggleInspect()
          Rebuild()
        }),
    },
  }

  private func BuildTargetPreview() Container {
    if !session.IsSample {
      return BuildLiveTargetPreview()
    }
    let stageChildren = List[Blob](5)
    stageChildren.Add(BuildPreviewTile(
      "rail", "Navigation", 12.0, 12.0, 132.0, 96.0, DevToolsTheme.SurfaceRaised))
    stageChildren.Add(BuildPreviewTile(
      "content", "Content", 154.0, 12.0, 380.0, 96.0, DevToolsTheme.SurfaceRaised))
    stageChildren.Add(BuildPreviewTile(
      "card", "ResultCard", 174.0, 32.0, 158.0, 55.0, DevToolsTheme.SurfaceStrong))
    stageChildren.Add(BuildPreviewTile(
      "action", "Continue", 344.0, 62.0, 86.0, 22.0, DevToolsTheme.CyanDim))
    stageChildren.Add(BuildPreviewTile(
      "footer", "StatusBar", 154.0, 112.0, 380.0, 1.0, DevToolsTheme.Border))
    return Container{
      Key: "target-preview",
      Width: Length.Percent(100),
      Height: 174,
      MinHeight: 174,
      Padding: 12,
      FlexDirection: FlexDirection.Column,
      Gap: 8,
      BackgroundColor: DevToolsTheme.Surface,
      BorderRadius: 6,
      BorderWidth: 1,
      BorderColor: DevToolsTheme.Border,
      Children: {
        Container{
          Key: "preview-header",
          Width: Length.Percent(100),
          Height: 20,
          FlexDirection: FlexDirection.Row,
          AlignItems: AlignItems.Center,
          Children: {
            Text{
              Key: "preview-title",
              Content: "RENDERED TARGET",
              FontSize: 10,
              FontWeight: 700,
              LetterSpacing: 0.9,
              Color: DevToolsTheme.InkSubtle,
            },
            Text{
              Key: "preview-selection",
              Content: session.SelectedNode().DisplayName + " · " + session.SelectedNode().Bounds,
              FontSize: 10,
              Color: DevToolsTheme.Cyan,
              FlexGrow: 1.0,
              TextAlign: TextAlign.Right,
              TextTrimming: TextTrimming.Ellipsis,
            },
          },
        },
        Container{
          Key: "preview-stage",
          Width: Length.Percent(100),
          Height: 124,
          Position: PositionType.Relative,
          BackgroundColor: DevToolsTheme.Background,
          BorderRadius: 4,
          BorderWidth: 1,
          BorderColor: DevToolsTheme.Border,
          Children: stageChildren,
        },
      },
    }
  }

  private func BuildLiveTargetPreview() Container {
    let window = session.SelectedWindow()
    let state = if session.State == DiagnosticConnectionState.Connected {
      "Tree data is live. Target rendering is not streamed."
    } else {
      "Waiting for a live goo.devtools/1 connection."
    }
    return Container{
      Key: "target-preview",
      Width: Length.Percent(100),
      Height: 174,
      MinHeight: 174,
      Padding: 12,
      FlexDirection: FlexDirection.Column,
      Gap: 8,
      BackgroundColor: DevToolsTheme.Surface,
      BorderRadius: 6,
      BorderWidth: 1,
      BorderColor: DevToolsTheme.Border,
      Children: {
        Container{
          Key: "preview-header",
          Width: Length.Percent(100),
          Height: 20,
          FlexDirection: FlexDirection.Row,
          AlignItems: AlignItems.Center,
          Children: {
            Text{
              Key: "preview-title",
              Content: "RENDERED TARGET",
              FontSize: 10,
              FontWeight: 700,
              LetterSpacing: 0.9,
              Color: DevToolsTheme.InkSubtle,
            },
            Text{
              Key: "preview-selection",
              Content: window.Title + " · " + window.Dimensions,
              FontSize: 10,
              Color: DevToolsTheme.Cyan,
              FlexGrow: 1.0,
              TextAlign: TextAlign.Right,
              TextTrimming: TextTrimming.Ellipsis,
            },
          },
        },
        Container{
          Key: "preview-stage",
          Width: Length.Percent(100),
          Height: 124,
          FlexDirection: FlexDirection.Column,
          JustifyContent: JustifyContent.Center,
          AlignItems: AlignItems.Center,
          BackgroundColor: DevToolsTheme.Background,
          BorderRadius: 4,
          BorderWidth: 1,
          BorderColor: DevToolsTheme.Border,
          Children: {
            Text{
              Key: "preview-unavailable",
              Content: "Live preview unavailable",
              FontSize: 13,
              FontWeight: 700,
              Color: DevToolsTheme.Ink,
            },
            Text{
              Key: "preview-state",
              Content: state,
              FontSize: 10,
              Color: DevToolsTheme.InkMuted,
              TextAlign: TextAlign.Center,
            },
          },
        },
      },
    }
  }

  private func BuildPreviewTile(id string, label string, left float64, top float64,
    width float64, height float64, background Color) Container{
      let selected = id == session.SelectedNodeId
      let remotelyHovered = id == session.HoveredNodeId
      return Container{
        Key: "preview-" + id,
        Position: PositionType.Absolute,
        Left: left,
        Top: top,
        Width: width,
        Height: height,
        PaddingLeft: 7,
        PaddingRight: 7,
        FlexDirection: FlexDirection.Row,
        AlignItems: AlignItems.Center,
        BackgroundColor: if selected { DevToolsTheme.CyanDim } else if remotelyHovered { DevToolsTheme.SurfaceRaised } else { background },
        BorderRadius: 4,
        BorderWidth: if selected { 2 } else { 1 },
        BorderColor: if selected { DevToolsTheme.Cyan } else { DevToolsTheme.BorderStrong },
        Hover: Style{ BackgroundColor: DevToolsTheme.CyanDim },
        Cursor: Cursor.Pointer,
        OnClick: () -> {
          session.SelectNode(id)
          Rebuild()
        },
        Children: {
          Text{
            Key: "preview-label",
            Content: label,
            FontSize: 10,
            FontWeight: if selected { 700 } else { 500 },
            Color: if selected { DevToolsTheme.Ink } else { DevToolsTheme.InkMuted },
            TextTrimming: TextTrimming.Ellipsis,
          },
        },
      }
    }

  private func BuildTreeSection() Container {
    let rowChildren = List[Blob](2)
    rowChildren.Add(Text{
      Key: "tree-title",
      Content: "VISUAL TREE",
      FontSize: 10,
      FontWeight: 700,
      LetterSpacing: 0.9,
      Color: DevToolsTheme.InkSubtle,
    })
    rowChildren.Add(Text{
      Key: "tree-count",
      Content: session.VisibleRows().Count.ToString() + " nodes",
      FontSize: 10,
      Color: DevToolsTheme.InkSubtle,
      FlexGrow: 1.0,
      TextAlign: TextAlign.Right,
    })
    let rows = List[Blob]()
    let visible = session.VisibleRows()
    var rowIndex int32
    for row in visible {
      rows.Add(BuildTreeRow(row, rowIndex))
      rowIndex = rowIndex + 1
    }
    if rows.Count == 0 {
      rows.Add(Container{
        Key: "tree-empty",
        Width: Length.Percent(100),
        Height: 56,
        Padding: 14,
        Children: {
          Text{
            Key: "tree-empty-text",
            Content: "No retained nodes match this filter",
            FontSize: 12,
            Color: DevToolsTheme.InkMuted,
          },
        },
      })
    }
    let viewport = Container{
      Key: "tree-viewport",
      Width: Length.Percent(100),
      Height: Length.Percent(100),
      FlexGrow: 1.0,
      FlexShrink: 1.0,
      MinHeight: 0,
      OverflowY: Overflow.Scroll,
      OverflowX: Overflow.Hidden,
      ScrollbarVisibility: ScrollbarVisibility.Auto,
      FlexDirection: FlexDirection.Column,
      Children: rows,
    }
    return Container{
      Key: "tree-section",
      Width: Length.Percent(100),
      Height: 0,
      FlexGrow: 1.0,
      FlexShrink: 1.0,
      MinHeight: 190,
      FlexDirection: FlexDirection.Column,
      Gap: 8,
      Children: {
        Container{
          Key: "tree-toolbar",
          Width: Length.Percent(100),
          Height: 34,
          MinHeight: 34,
          FlexDirection: FlexDirection.Row,
          AlignItems: AlignItems.Center,
          Gap: 10,
          Children: {
            Container{
              Key: "tree-heading",
              Width: 132,
              FlexDirection: FlexDirection.Row,
              AlignItems: AlignItems.Center,
              Children: rowChildren,
            },
            TextEntry{
              Key: "tree-search",
              Width: 260,
              Height: 30,
              PaddingLeft: 9,
              PaddingRight: 9,
              Value: session.Query,
              Placeholder: "Filter by type, Cell, or key",
              Color: DevToolsTheme.Ink,
              FontSize: 11,
              BackgroundColor: DevToolsTheme.Surface,
              BorderRadius: 4,
              BorderWidth: 1,
              BorderColor: DevToolsTheme.Border,
              SelectionColor: DevToolsTheme.CyanDim,
              OnChange: (value string) -> {
                session.SetQuery(value)
                Rebuild()
              },
            },
            Text{
              Key: "tree-help",
              Content: "Enter filters the retained snapshot",
              FontSize: 10,
              Color: DevToolsTheme.InkSubtle,
              FlexGrow: 1.0,
              TextAlign: TextAlign.Right,
            },
          },
        },
        viewport,
      },
    }
  }

  private func BuildTreeRow(row DiagnosticTreeRow, ordinal int32) Button {
    let node = row.Node
    let selected = node.Id == session.SelectedNodeId
    let remotelyHovered = node.Id == session.HoveredNodeId
    let indent = 8.0 + float64(row.Depth) * 16.0
    let disclosure = if node.Children.Count > 0 { "▾" } else { "·" }
    return Button{
      Key: "tree-row-" + ordinal.ToString() + "-" + node.Id,
      Width: Length.Percent(100),
      Height: 31,
      MinHeight: 31,
      PaddingLeft: indent,
      PaddingRight: 8,
      FlexDirection: FlexDirection.Row,
      AlignItems: AlignItems.Center,
      Gap: 6,
      BackgroundColor: if selected { DevToolsTheme.SurfaceStrong } else if remotelyHovered { DevToolsTheme.SurfaceRaised } else { DevToolsTheme.Background },
      BorderRadius: 3,
      Hover: Style{ BackgroundColor: DevToolsTheme.SurfaceRaised },
      Active: Style{ BackgroundColor: DevToolsTheme.Border },
      Focus: Style{ BackgroundColor: DevToolsTheme.SurfaceStrong },
      Cursor: Cursor.Pointer,
      OnClick: () -> {
        session.SelectNode(node.Id)
        Rebuild()
      },
      Children: {
        Text{
          Key: "tree-disclosure",
          Content: disclosure,
          Width: 14,
          FontSize: 12,
          Color: if selected { DevToolsTheme.Cyan } else { DevToolsTheme.InkSubtle },
          TextAlign: TextAlign.Center,
        },
        Text{
          Key: "tree-name",
          Content: node.DisplayName,
          Width: 148,
          FontSize: 11,
          FontWeight: if selected { 700 } else { 500 },
          Color: if selected { DevToolsTheme.Ink } else { DevToolsTheme.InkMuted },
          TextWrap: TextWrap.NoWrap,
          TextTrimming: TextTrimming.Ellipsis,
        },
        Text{
          Key: "tree-type",
          Content: if node.TypeName == node.DisplayName { "" } else { node.TypeName },
          Width: 92,
          FontSize: 10,
          Color: DevToolsTheme.Purple,
          TextWrap: TextWrap.NoWrap,
          TextTrimming: TextTrimming.Ellipsis,
        },
        Text{
          Key: "tree-bounds",
          Content: node.Bounds,
          FlexGrow: 1.0,
          FontSize: 10,
          Color: DevToolsTheme.InkSubtle,
          TextWrap: TextWrap.NoWrap,
          TextTrimming: TextTrimming.Ellipsis,
          TextAlign: TextAlign.Right,
        },
      },
    }
  }

  private func BuildBottomPanel() Container {
    let logRows = List[Blob]()
    var logIndex int32
    for entry in session.Logs {
      logRows.Add(BuildLogRow(entry, logIndex))
      logIndex = logIndex + 1
    }
    let captureCards = List[Blob]()
    var captureIndex int32
    for screenshot in session.Screenshots {
      captureCards.Add(BuildCaptureCard(screenshot, captureIndex))
      captureIndex = captureIndex + 1
    }
    if captureCards.Count == 0 {
      captureCards.Add(Container{
        Key: "captures-empty",
        Width: Length.Percent(100),
        Height: 44,
        Padding: 10,
        Children: {
          Text{
            Key: "captures-empty-label",
            Content: "No captured frames",
            FontSize: 10,
            Color: DevToolsTheme.InkSubtle,
          },
        },
      })
    }
    let panelRows = if showCaptures { captureCards } else { logRows }
    return Container{
      Key: "bottom-panel",
      Width: Length.Percent(100),
      Height: 148,
      MinHeight: 148,
      FlexDirection: FlexDirection.Column,
      BackgroundColor: DevToolsTheme.Surface,
      BorderWidth: 1,
      BorderColor: DevToolsTheme.Border,
      Children: {
        Container{
          Key: "bottom-header",
          Width: Length.Percent(100),
          Height: 38,
          MinHeight: 38,
          PaddingLeft: 6,
          PaddingRight: 8,
          FlexDirection: FlexDirection.Row,
          AlignItems: AlignItems.Center,
          Gap: 5,
          BorderBottomWidth: 1,
          BorderBottomColor: DevToolsTheme.Border,
          Children: {
            ActionButton(
              "drawer-console",
              "Console " + session.Logs.Count.ToString(),
              if !showCaptures { DevToolsTheme.SurfaceStrong } else { DevToolsTheme.Surface },
              if !showCaptures { DevToolsTheme.Ink } else { DevToolsTheme.InkMuted },
              () -> {
                showCaptures = false
                Rebuild()
              }),
            ActionButton(
              "drawer-captures",
              "Captures " + session.Screenshots.Count.ToString(),
              if showCaptures { DevToolsTheme.SurfaceStrong } else { DevToolsTheme.Surface },
              if showCaptures { DevToolsTheme.Ink } else { DevToolsTheme.InkMuted },
              () -> {
                showCaptures = true
                Rebuild()
              }),
            Container{ Key: "logs-spacer", FlexGrow: 1.0 },
            ActionButton(
              "clear-logs",
              "Clear",
              DevToolsTheme.SurfaceRaised,
              DevToolsTheme.InkMuted,
              () -> {
                session.ClearLogs()
                Rebuild()
              }),
            ActionButton(
              "capture-bottom",
              "Capture",
              DevToolsTheme.CyanDim,
              DevToolsTheme.Ink,
              () -> {
                session.CaptureScreenshot()
                Rebuild()
              }),
          },
        },
        Container{
          Key: "bottom-content",
          Width: Length.Percent(100),
          Height: Length.Percent(100),
          FlexGrow: 1.0,
          MinHeight: 0,
          Padding: 6,
          FlexDirection: FlexDirection.Column,
          OverflowY: Overflow.Scroll,
          OverflowX: Overflow.Hidden,
          ScrollbarVisibility: ScrollbarVisibility.Auto,
          Children: panelRows,
        },
      },
    }
  }

  private func BuildLogRow(entry DiagnosticLogEntry, ordinal int32) Container {
    let levelColor = if entry.Level == "error" {
      DevToolsTheme.Red
    } else if entry.Level == "info" {
      DevToolsTheme.Cyan
    } else {
      DevToolsTheme.InkSubtle
    }
    return Container{
      Key: "log-" + ordinal.ToString() + "-" + entry.Timestamp + "-" + entry.Source + "-" + entry.Message,
      Width: Length.Percent(100),
      Height: 23,
      MinHeight: 23,
      PaddingLeft: 6,
      PaddingRight: 6,
      FlexDirection: FlexDirection.Row,
      AlignItems: AlignItems.Center,
      Gap: 8,
      BackgroundColor: DevToolsTheme.Surface,
      Children: {
        Text{
          Key: "log-time",
          Content: entry.Timestamp,
          Width: 68,
          FontSize: 10,
          Color: DevToolsTheme.InkSubtle,
        },
        Text{
          Key: "log-level",
          Content: entry.Level,
          Width: 48,
          FontSize: 10,
          FontWeight: 700,
          Color: levelColor,
          TextTransform: TextTransform.Uppercase,
        },
        Text{
          Key: "log-source",
          Content: entry.Source,
          Width: 76,
          FontSize: 10,
          Color: DevToolsTheme.Purple,
          TextTrimming: TextTrimming.Ellipsis,
        },
        Text{
          Key: "log-message",
          Content: entry.Message,
          FlexGrow: 1.0,
          FontSize: 10,
          Color: DevToolsTheme.InkMuted,
          TextTrimming: TextTrimming.Ellipsis,
        },
      },
    }
  }

  private func BuildCaptureCard(screenshot DiagnosticScreenshot, ordinal int32) Container -> Container {
    Key: "capture-" + ordinal.ToString() + "-" + screenshot.Id,
    Width: Length.Percent(100),
    MinHeight: 62,
    Padding: 8,
    FlexDirection: FlexDirection.Column,
    Gap: 3,
    BackgroundColor: DevToolsTheme.SurfaceRaised,
    BorderRadius: 4,
    BorderWidth: 1,
    BorderColor: DevToolsTheme.Border,
    Children: {
      Container{
        Key: "capture-title-row",
        Width: Length.Percent(100),
        FlexDirection: FlexDirection.Row,
        Children: {
          Text{
            Key: "capture-window",
            Content: screenshot.WindowName,
            FontSize: 10,
            FontWeight: 700,
            Color: DevToolsTheme.Ink,
            FlexGrow: 1.0,
          },
          Text{
            Key: "capture-id",
            Content: screenshot.Id,
            FontSize: 9,
            Color: DevToolsTheme.InkSubtle,
          },
        },
      },
      Text{
        Key: "capture-dimensions",
        Content: screenshot.Dimensions,
        FontSize: 10,
        Color: DevToolsTheme.Cyan,
      },
      Text{
        Key: "capture-time",
        Content: screenshot.CapturedAt + " · " + screenshot.Bytes,
        FontSize: 9,
        Color: DevToolsTheme.InkSubtle,
      },
    },
  }

  private func BuildInspector() Container {
    let tabButtons = List[Blob]()
    tabButtons.Add(BuildTabButton(DiagnosticDetailsTab.Configuration, "Config"))
    tabButtons.Add(BuildTabButton(DiagnosticDetailsTab.Computed, "Computed"))
    tabButtons.Add(BuildTabButton(DiagnosticDetailsTab.Layout, "Layout"))
    tabButtons.Add(BuildTabButton(DiagnosticDetailsTab.State, "State"))
    tabButtons.Add(BuildTabButton(DiagnosticDetailsTab.Events, "Events"))
    tabButtons.Add(BuildTabButton(DiagnosticDetailsTab.Accessibility, "A11y"))
    tabButtons.Add(BuildTabButton(DiagnosticDetailsTab.Changes, "Changes"))
    let node = session.SelectedNode()
    let details = List[Blob]()
    details.Add(BuildDetails(node))
    if session.ActiveTab == DiagnosticDetailsTab.Configuration || session.ActiveTab == DiagnosticDetailsTab.Computed {
      details.Add(BuildOverridePanel())
    }
    return Container{
      Key: "inspector",
      Width: Length.Percent(44),
      MinWidth: 400,
      MaxWidth: 560,
      Height: Length.Percent(100),
      FlexShrink: 0.0,
      FlexDirection: FlexDirection.Column,
      BackgroundColor: DevToolsTheme.Surface,
      BorderLeftWidth: 1,
      BorderLeftColor: DevToolsTheme.Border,
      Children: {
        Container{
          Key: "inspector-header",
          Width: Length.Percent(100),
          Height: 58,
          MinHeight: 58,
          PaddingLeft: 12,
          PaddingRight: 12,
          PaddingTop: 8,
          PaddingBottom: 8,
          FlexDirection: FlexDirection.Column,
          Gap: 4,
          BorderBottomWidth: 1,
          BorderBottomColor: DevToolsTheme.Border,
          Children: {
            Text{
              Key: "inspector-label",
              Content: "INSPECTED ELEMENT",
              FontSize: 10,
              FontWeight: 700,
              LetterSpacing: 0.9,
              Color: DevToolsTheme.InkSubtle,
            },
            Container{
              Key: "inspector-node-row",
              Width: Length.Percent(100),
              FlexDirection: FlexDirection.Row,
              AlignItems: AlignItems.Center,
              Gap: 8,
              Children: {
                Text{
                  Key: "inspector-node-name",
                  Content: node.DisplayName,
                  FontSize: 16,
                  FontWeight: 800,
                  Color: DevToolsTheme.Ink,
                  FlexGrow: 1.0,
                  TextTrimming: TextTrimming.Ellipsis,
                },
                Text{
                  Key: "inspector-node-type",
                  Content: node.TypeName,
                  FontSize: 10,
                  Color: DevToolsTheme.Purple,
                },
              },
            },
          },
        },
        Container{
          Key: "inspector-tabs",
          Width: Length.Percent(100),
          Height: 38,
          MinHeight: 38,
          Padding: 5,
          Gap: 4,
          FlexDirection: FlexDirection.Row,
          FlexWrap: FlexWrap.NoWrap,
          OverflowX: Overflow.Scroll,
          OverflowY: Overflow.Hidden,
          Children: tabButtons,
        },
        Container{
          Key: "details-viewport",
          Width: Length.Percent(100),
          Height: Length.Percent(100),
          FlexGrow: 1.0,
          FlexShrink: 1.0,
          MinHeight: 0,
          PaddingLeft: 10,
          PaddingRight: 10,
          FlexDirection: FlexDirection.Column,
          OverflowY: Overflow.Scroll,
          OverflowX: Overflow.Hidden,
          ScrollbarVisibility: ScrollbarVisibility.Auto,
          Children: details,
        },
      },
    }
  }

  private func BuildTabButton(tab DiagnosticDetailsTab, label string) Button {
    let selected = session.ActiveTab == tab
    return Button{
      Key: "tab-" + label,
      Width: if label == "Computed" { 72 } else if label == "Changes" { 66 } else { 58 },
      MinWidth: if label == "Computed" { 72 } else if label == "Changes" { 66 } else { 58 },
      Height: 28,
      PaddingLeft: 8,
      PaddingRight: 8,
      BackgroundColor: if selected { DevToolsTheme.SurfaceStrong } else { DevToolsTheme.Surface },
      BorderRadius: 4,
      BorderWidth: 1,
      BorderColor: if selected { DevToolsTheme.BorderStrong } else { DevToolsTheme.Border },
      Hover: Style{ BackgroundColor: DevToolsTheme.SurfaceRaised },
      Active: Style{ BackgroundColor: DevToolsTheme.Border },
      Focus: Style{ OutlineWidth: 1, OutlineColor: DevToolsTheme.Cyan, OutlineOffset: 1 },
      Cursor: Cursor.Pointer,
      OnClick: () -> {
        session.SetTab(tab)
        Rebuild()
      },
      Children: {
        Text{
          Key: "tab-label",
          Content: label,
          Width: Length.Percent(100),
          FontSize: 10,
          FontWeight: if selected { 700 } else { 500 },
          Color: if selected { DevToolsTheme.Ink } else { DevToolsTheme.InkMuted },
          TextAlign: TextAlign.Center,
        },
      },
    }
  }

  private func BuildDetails(node DiagnosticTreeNode) Container {
    let rows = List[Blob]()
    if session.ActiveTab == DiagnosticDetailsTab.Configuration {
      rows.Add(DetailRow("type", "Blob type", node.TypeName))
      rows.Add(DetailRow("owner", "Owning Cell", Reported(node.CellName)))
      rows.Add(DetailRow("key", "Stable key", Reported(node.Key)))
      rows.Add(DetailRow("declared", "Declared properties", ReadableReport(node.Properties)))
      rows.Add(DetailRow("source", "Source", if session.IsSample { "apps/Goo.Gallery/GalleryCell.gs" } else { "not reported by target" }))
      rows.Add(DetailRow("identity", "Identity", "retained node " + node.Id))
    } else if session.ActiveTab == DiagnosticDetailsTab.Computed {
      rows.Add(DetailRow("computed", "Resolved values", ReadableReport(node.Computed)))
      rows.Add(DetailRow("origin", "Value origin", SampleOrReported("", "declared style → state layer")))
      rows.Add(DetailRow("debug-layer", "Debug layer", if session.OverrideActive { session.OverrideText } else { "none" }))
      rows.Add(DetailRow("inheritance", "Inheritance", SampleOrReported("", "Color and font inherited from Shell")))
      rows.Add(DetailRow("paint", "Paint result", SampleOrReported("", "background · border · text")))
    } else if session.ActiveTab == DiagnosticDetailsTab.Layout {
      rows.Add(DetailRow("bounds", "Border box", Reported(node.Bounds)))
      rows.Add(DetailRow("content", "Content box", SampleOrReported("", "content origin follows padding")))
      rows.Add(DetailRow("layout", "Yoga layout", ReadableReport(node.Layout)))
      rows.Add(DetailRow("box-model", "Box model", SampleOrReported("", "margin 0 · border 1 · padding 16")))
      rows.Add(DetailRow("clip", "Clip and scroll", SampleOrReported("", "visible · viewport inherited")))
      rows.Add(DetailRow("scale", "Display scale", Reported(session.SelectedWindow().Scale)))
    } else if session.ActiveTab == DiagnosticDetailsTab.State {
      rows.Add(DetailRow("state", "Pseudo-state", Reported(node.State)))
      rows.Add(DetailRow("selection", "DevTools selection", if node.Id == session.SelectedNodeId { "locked" } else { "not selected" }))
      rows.Add(DetailRow("focus", "Focus route", SampleOrReported("", "document → " + node.DisplayName)))
      rows.Add(DetailRow("input", "Pointer policy", SampleOrReported("", "handlers gate pointer input")))
      rows.Add(DetailRow("reload", "Hot reload", SampleOrReported("", "state retained while stable key survives")))
    } else if session.ActiveTab == DiagnosticDetailsTab.Events {
      rows.Add(DetailRow("route", "Last event route", Reported(node.Events)))
      rows.Add(DetailRow("handlers", "Registered handlers", SampleOrReported("", "pointerdown · click · focus")))
      rows.Add(DetailRow("result", "Dispatch result", SampleOrReported("", "consumed by selected element")))
      rows.Add(DetailRow("timing", "Handler timing", SampleOrReported("", "0.08 ms self · 0.14 ms route")))
      rows.Add(DetailRow("capture", "Pointer capture", SampleOrReported("", "none")))
    } else if session.ActiveTab == DiagnosticDetailsTab.Accessibility {
      rows.Add(DetailRow("semantic", "Semantic node", Reported(node.Accessibility)))
      rows.Add(DetailRow("role", "Role", if session.IsSample { if node.TypeName == "Button" { "button" } else { "group" } } else { "not reported by target" }))
      rows.Add(DetailRow("name", "Accessible name", if session.IsSample { node.DisplayName } else { "not reported by target" }))
      rows.Add(DetailRow("relations", "Relationships", SampleOrReported("", "labelled by · described by")))
      rows.Add(DetailRow("position", "Tree position", SampleOrReported("", "node " + node.Id + " of 12")))
    } else {
      rows.Add(DetailRow("changes", "Last changes", Reported(node.Changes)))
      rows.Add(DetailRow("rebuild", "Rebuild cause", SampleOrReported("", "input state changed")))
      rows.Add(DetailRow("diff", "Tree diff", SampleOrReported("", "0 added · 0 removed · 1 updated")))
      rows.Add(DetailRow("layout", "Layout invalidation", SampleOrReported("", "content width changed")))
      rows.Add(DetailRow("paint", "Paint invalidation", SampleOrReported("", "retained surface updated")))
      rows.Add(DetailRow("reload", "Hot reload journal", SampleOrReported("", "no metadata change")))
    }
    return Container{
      Key: "details-" + session.ActiveTab.ToString(),
      Width: Length.Percent(100),
      FlexDirection: FlexDirection.Column,
      Gap: 5,
      PaddingBottom: 14,
      Children: rows,
    }
  }

  private func Reported(value string) string -> if value == "" { "not reported by target" } else { value }

  private func ReadableReport(value string) string -> Reported(value).Replace("; ", "\n")

  private func SampleOrReported(value string, sample string) string -> if session.IsSample { sample } else { Reported(value) }

  private func DetailRow(key string, label string, value string) Container -> Container {
    Key: "detail-row-" + key,
    Width: Length.Percent(100),
    MinHeight: 34,
    PaddingLeft: 8,
    PaddingRight: 8,
    PaddingTop: 6,
    PaddingBottom: 6,
    FlexDirection: FlexDirection.Row,
    AlignItems: AlignItems.FlexStart,
    Gap: 10,
    BackgroundColor: DevToolsTheme.Surface,
    BorderBottomWidth: 1,
    BorderBottomColor: DevToolsTheme.Border,
    Children: {
      Text{
        Key: "detail-label",
        Content: label,
        Width: 118,
        FontSize: 10,
        FontWeight: 700,
        Color: DevToolsTheme.InkSubtle,
        TextTrimming: TextTrimming.Ellipsis,
      },
      Text{
        Key: "detail-value",
        Content: value,
        FlexGrow: 1.0,
        FontSize: 10,
        Color: DevToolsTheme.InkMuted,
        TextWrap: TextWrap.Wrap,
      },
    },
  }

  private func BuildOverridePanel() Container -> Container {
    Key: "override-panel",
    Width: Length.Percent(100),
    Padding: 10,
    MarginTop: 4,
    MarginBottom: 12,
    FlexDirection: FlexDirection.Column,
    Gap: 7,
    BackgroundColor: DevToolsTheme.SurfaceRaised,
    BorderRadius: 5,
    BorderWidth: 1,
    BorderColor: if session.OverrideActive { DevToolsTheme.Cyan } else { DevToolsTheme.Border },
    Children: {
      Container{
        Key: "override-heading",
        Width: Length.Percent(100),
        FlexDirection: FlexDirection.Row,
        AlignItems: AlignItems.Center,
        Children: {
          Text{
            Key: "override-title",
            Content: "RUNTIME OVERRIDE",
            FontSize: 10,
            FontWeight: 700,
            LetterSpacing: 0.8,
            Color: if session.OverrideActive { DevToolsTheme.Cyan } else { DevToolsTheme.InkSubtle },
            FlexGrow: 1.0,
          },
          Text{
            Key: "override-status",
            Content: if session.OverrideActive { "active" } else { "temporary" },
            FontSize: 9,
            Color: if session.OverrideActive { DevToolsTheme.Cyan } else { DevToolsTheme.InkSubtle },
          },
        },
      },
      Text{
        Key: "override-help",
        Content: if session.IsSample {
          "Experiment without rewriting source. Hot reload clears this layer."
        } else if session.Capabilities.RuntimeOverrides {
          "Temporary target override. Reset sends the target reset command."
        } else {
          "Target does not advertise runtime overrides."
        },
        FontSize: 10,
        Color: DevToolsTheme.InkMuted,
        TextWrap: TextWrap.Wrap,
      },
      TextEntry{
        Key: "override-entry",
        Width: Length.Percent(100),
        Height: 32,
        PaddingLeft: 8,
        PaddingRight: 8,
        Value: session.OverrideText,
        Color: DevToolsTheme.Ink,
        FontSize: 10,
        BackgroundColor: DevToolsTheme.Background,
        BorderRadius: 4,
        BorderWidth: 1,
        BorderColor: DevToolsTheme.Border,
        SelectionColor: DevToolsTheme.CyanDim,
        OnChange: (value string) -> {
          session.SetOverrideText(value)
          Rebuild()
        },
      },
      Container{
        Key: "override-actions",
        Width: Length.Percent(100),
        FlexDirection: FlexDirection.Row,
        Gap: 6,
        Children: {
          ActionButton(
            "override-apply",
            "Apply",
            DevToolsTheme.CyanDim,
            DevToolsTheme.Ink,
            () -> {
              session.ApplyOverride()
              Rebuild()
            }),
          ActionButton(
            "override-reset",
            "Reset",
            DevToolsTheme.Surface,
            DevToolsTheme.InkMuted,
            () -> {
              session.ResetOverride()
              Rebuild()
            }),
        },
      },
    },
  }

  private func ActionButton(key string, label string, background Color,
    foreground Color, onClick Action) Button -> Button{
      Key: key,
      Height: 30,
      PaddingLeft: 10,
      PaddingRight: 10,
      FlexDirection: FlexDirection.Row,
      AlignItems: AlignItems.Center,
      JustifyContent: JustifyContent.Center,
      BackgroundColor: background,
      BorderRadius: 4,
      BorderWidth: 1,
      BorderColor: DevToolsTheme.Border,
      Hover: Style{ BackgroundColor: DevToolsTheme.SurfaceStrong },
      Active: Style{ BackgroundColor: DevToolsTheme.BorderStrong },
      Focus: Style{ OutlineWidth: 1, OutlineColor: DevToolsTheme.Cyan, OutlineOffset: 1 },
      Cursor: Cursor.Pointer,
      OnClick: onClick,
      Children: {
        Text{
          Key: "button-label",
          Content: label,
          FontSize: 10,
          FontWeight: 700,
          Color: foreground,
        },
      },
    }

  private func ConnectionColor(value DiagnosticConnectionState) Color {
    if value == DiagnosticConnectionState.Connected {
      return DevToolsTheme.Green
    }
    if value == DiagnosticConnectionState.Faulted {
      return DevToolsTheme.Red
    }
    if value == DiagnosticConnectionState.Connecting {
      return DevToolsTheme.Amber
    }
    return DevToolsTheme.InkSubtle
  }

  private func CapabilitySummary() string {
    let capabilities = session.Capabilities
    let values = List[string]()
    if capabilities.TreeSnapshots { values.Add("tree") }
    if capabilities.Layout { values.Add("layout") }
    if capabilities.Events { values.Add("events") }
    if capabilities.Accessibility { values.Add("a11y") }
    if capabilities.Logs { values.Add("logs") }
    if capabilities.Screenshots { values.Add("capture") }
    if capabilities.RuntimeOverrides { values.Add("overrides") }
    if values.Count == 0 { return "not reported by target" }
    return String.Join(" · ", values)
  }
}
