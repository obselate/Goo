package GooWorkbench.Components

import System
import Goo
import GooWorkbench.Models

data struct InspectorInput {
  var Theme Theme
  var Project ProjectItem
  var Mode int32
  var Details bool
  var Revision int32
  var BackHandle ElementHandle
  var OnBack Action
  var OnToggleTask Action[int32, int32]
}

open class InspectorCell : Cell[InspectorInput] {
  protected override func Build(input InspectorInput) Blob {
    ComponentBuilds.Record("InspectorCell")
    let project = input.Project
    let inspectorWidth Length = 288
    return Container{
      Key: "inspector",
      Width: if input.Mode == 0 { Length.Percent(100) } else { inspectorWidth },
      FlexGrow: if input.Mode == 0 { 1.0 } else { 0.0 },
      FlexShrink: 0,
      MinHeight: 0,
      OverflowY: Overflow.Scroll,
      Padding: 24,
      Gap: 24,
      BorderLeftWidth: if input.Mode == 0 { 0 } else { 1 },
      BorderLeftColor: input.Theme.ControlLine,
      BackgroundColor: input.Theme.Canvas,
      Display: if input.Mode == 0 && !input.Details { Display.None } else { Display.Flex },
      Children: {
        Cell.Mount[BackInput, BackCell]("back", BackInput{ Theme: input.Theme, Visible: input.Mode == 0, Handle: input.BackHandle, OnBack: input.OnBack }),
        Cell.Mount[ProjectInfoInput, ProjectInfoCell]("info", ProjectInfoInput{ Theme: input.Theme, Name: project.Name, Description: project.Description }),
        Cell.Mount[ProjectStatusInput, ProjectStatusCell]("status", ProjectStatusInput{ Theme: input.Theme, Status: project.Status() }),
        Cell.Mount[ProjectLocationInput, ProjectLocationCell]("location", ProjectLocationInput{ Theme: input.Theme, Location: project.Path }),
        Cell.Mount[TaskPanelInput, TaskPanelCell]("tasks", TaskPanelInput{ Theme: input.Theme, Project: project, Revision: input.Revision, OnToggle: input.OnToggleTask }),
      },
    }
  }
}
