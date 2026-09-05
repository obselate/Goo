package GooWorkbench.Components

import Goo

data struct ProjectStatusInput {
  var Theme Theme
  var Status string
}

open class ProjectStatusCell : Cell[ProjectStatusInput] {
  protected override func Build(input ProjectStatusInput) Blob {
    ComponentBuilds.Record("ProjectStatusCell")
    return Container{
      Gap: 8,
      Children: { input.Theme.Meta("Status"), input.Theme.Label(input.Status, 14, if input.Status == "Complete" { input.Theme.Success } else { input.Theme.Accent }, 600) },
    }
  }
}
