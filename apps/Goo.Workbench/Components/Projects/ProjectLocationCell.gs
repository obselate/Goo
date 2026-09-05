package GooWorkbench.Components

import Goo

data struct ProjectLocationInput {
  var Theme Theme
  var Location string
}

open class ProjectLocationCell : Cell[ProjectLocationInput] {
  protected override func Build(input ProjectLocationInput) Blob {
    ComponentBuilds.Record("ProjectLocationCell")
    return Container{
      Gap: 8,
      Children: { input.Theme.Meta("Location"), Text{ Content: input.Location, FontFamily: "IBM Plex Mono", FontSize: 12, LineHeight: 1.5, Color: input.Theme.Ink, FlexShrink: 1, MinWidth: 0 } },
    }
  }
}
