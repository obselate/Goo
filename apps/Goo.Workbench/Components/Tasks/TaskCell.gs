package GooWorkbench.Components

import System
import Goo

data struct TaskInput {
  var Theme Theme
  var ProjectId int32
  var Index int32
  var Title string
  var Done bool
  var OnToggle Action[int32, int32]
}

open class TaskCell : Cell[TaskInput] {
  protected override func Build(input TaskInput) Blob {
    ComponentBuilds.Record("TaskCell", input.ProjectId, input.Index)
    let index = input.Index
    return Button{
      Key: "task-" + index.ToString(),
      MinHeight: 44,
      Padding: 8,
      BorderRadius: 0,
      FlexDirection: FlexDirection.Row,
      AlignItems: AlignItems.Center,
      Gap: 12,
      FlexShrink: 0,
      Hover: Style{ BackgroundColor: input.Theme.Subtle },
      Active: Style{ BackgroundColor: input.Theme.Selection },
      Focus: input.Theme.FocusRing,
      Accessibility: Accessibility{ Role: AccessibilityRole.Checkbox, Name: input.Title, Checked: if input.Done { AccessibilityChecked.True } else { AccessibilityChecked.False } },
      OnClick: () -> input.OnToggle(input.ProjectId, index),
      Children: {
        input.Theme.Label(if input.Done { "Done" } else { "To do" }, 12, if input.Done { input.Theme.Success } else { input.Theme.Muted }, 600),
        input.Theme.Label(input.Title, 14),
      },
    }
  }
}
