package GooWorkbench.Components

import Goo

data struct ProjectInfoInput {
  var Theme Theme
  var Name string
  var Description string
}

open class ProjectInfoCell : Cell[ProjectInfoInput] {
  protected override func Build(input ProjectInfoInput) Blob {
    ComponentBuilds.Record("ProjectInfoCell")
    return Container{
      Gap: 8,
      Padding: if input.Theme.Kind == 1 { 12 } else { 0 },
      BorderWidth: if input.Theme.Kind == 1 { 1 } else { 0 },
      BorderColor: input.Theme.ControlLine,
      BackgroundColor: if input.Theme.Kind == 1 { input.Theme.Surface } else { Color.Transparent },
      Children: { input.Theme.Meta("Project details"), input.Theme.Label(input.Name, 20, input.Theme.Ink, 600), input.Theme.Label(input.Description, 14, input.Theme.Muted) },
    }
  }
}
