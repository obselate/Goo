package GooWorkbench.Components

import System
import System.Collections.Generic
import Goo
import GooWorkbench.Models

data struct TaskPanelInput {
  var Theme Theme
  var Project ProjectItem
  var Revision int32
  var OnToggle Action[int32, int32]
}

open class TaskPanelCell : Cell[TaskPanelInput] {
  protected override func Build(input TaskPanelInput) Blob {
    ComponentBuilds.Record("TaskPanelCell")
    let project = input.Project
    let tasks = List[Blob]()
    for index in 0 ... project.Tasks.Length {
      tasks.Add(Cell.Mount[TaskInput, TaskCell]("task-" + project.Id.ToString() + "-" + index.ToString(), TaskInput{ Theme: input.Theme, ProjectId: project.Id, Index: index, Title: project.Tasks[index].Title, Done: project.Tasks[index].Done, OnToggle: input.OnToggle }))
    }
    return Container{
      Gap: 12,
      Children: {
        Container{ FlexDirection: FlexDirection.Row, JustifyContent: JustifyContent.SpaceBetween, Children: { input.Theme.Meta("Tasks", input.Theme.Ink), input.Theme.Label(project.Completed().ToString() + " of " + project.Tasks.Length.ToString(), 12, input.Theme.Muted) } },
        Container{ Height: 4, BackgroundColor: input.Theme.Subtle, BorderRadius: 0, Children: { Container{ Height: 4, Width: Length.Percent(float64(project.Completed()) / float64(project.Tasks.Length) * 100.0), BackgroundColor: input.Theme.Accent, BorderRadius: 0 } } },
        Container{ Gap: 8, Padding: 4, Children: tasks },
      },
    }
  }
}
