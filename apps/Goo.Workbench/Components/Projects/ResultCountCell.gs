package GooWorkbench.Components

import Goo

data struct ResultCountInput {
  var Theme Theme
  var Count int32
}

open class ResultCountCell : Cell[ResultCountInput] {
  protected override func Build(input ResultCountInput) Blob {
    ComponentBuilds.Record("ResultCountCell")
    return Container{
      FlexDirection: FlexDirection.Row,
      AlignItems: AlignItems.Center,
      JustifyContent: JustifyContent.SpaceBetween,
      Children: { input.Theme.Label(input.Count.ToString() + if input.Count == 1 { " project" } else { " projects" }, 12, input.Theme.Muted), input.Theme.Meta("Task progress") },
    }
  }
}
