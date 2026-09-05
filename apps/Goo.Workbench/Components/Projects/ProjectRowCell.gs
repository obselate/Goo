package GooWorkbench.Components

import System
import Goo
import GooWorkbench.Models

data struct RowInput {
  var Theme Theme
  var Project ProjectItem
  var Handle ElementHandle
  var Selected bool
  var Compact bool
  var Completed int32
  var OnSelect Action[int32]
}

open class ProjectRowCell : Cell[RowInput] {
  protected override func Build(input RowInput) Blob {
    ComponentBuilds.Record("ProjectRowCell", input.Project.Id)
    let project = input.Project
    return Button{
      Key: "project-" + project.Id.ToString(),
      Handle: input.Handle,
      MinHeight: if input.Compact { 48 } else { if input.Theme.Kind == 0 { 72 } else { 64 } },
      Padding: 12,
      PaddingTop: if input.Compact { 4 } else { 12 },
      PaddingBottom: if input.Compact { 4 } else { 12 },
      BorderRadius: 0,
      BorderWidth: if input.Theme.Kind == 1 { 1 } else { 0 },
      BorderColor: input.Theme.ControlLine,
      BorderBottomWidth: 1,
      BorderBottomColor: if input.Theme.Kind == 1 { input.Theme.ControlLine } else { input.Theme.Line },
      BorderLeftWidth: 3,
      BorderLeftColor: if input.Selected { input.Theme.Accent } else { if input.Theme.Kind == 1 { input.Theme.ControlLine } else { Color.Transparent } },
      BackgroundColor: if input.Selected { input.Theme.Selection } else { input.Theme.Surface },
      Hover: Style{ BackgroundColor: if input.Selected { input.Theme.Selection } else { input.Theme.Subtle } },
      Active: Style{ BackgroundColor: input.Theme.Selection },
      Focus: input.Theme.RowFocusRing,
      FlexDirection: FlexDirection.Row,
      AlignItems: AlignItems.Center,
      FlexShrink: 0,
      Gap: 16,
      Accessibility: Accessibility{ Name: project.Name, Selected: input.Selected, Description: if input.Completed == project.Tasks.Length { "Complete" } else { "In progress" } },
      OnClick: () -> input.OnSelect(project.Id),
      Children: {
        Container{ Width: 28, FlexShrink: 0, Children: { input.Theme.Meta(project.Id.ToString("D2"), if input.Selected { input.Theme.Accent } else { input.Theme.Muted }) } },
        Container{ FlexGrow: 1, FlexShrink: 1, MinWidth: 0, Gap: 4, Children: { input.Theme.Label(project.Name, 16, input.Theme.Ink, 600), input.Theme.Meta(project.Category) } },
        Container{ AlignItems: AlignItems.FlexEnd, Gap: 4, FlexShrink: 0, Children: {
          input.Theme.Label(if input.Completed == project.Tasks.Length { "Complete" } else { "In progress" }, 12, if input.Completed == project.Tasks.Length { input.Theme.Success } else { input.Theme.Muted }),
          input.Theme.Label(input.Completed.ToString() + " / " + project.Tasks.Length.ToString() + " tasks", 12, input.Theme.Muted),
        } },
      },
    }
  }
}
