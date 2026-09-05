package GooWorkbench.Components

import System
import Goo

data struct SearchInput {
  var Theme Theme
  var Query string
  var Handle ElementHandle
  var OnChange Action[string]
}

open class SearchCell : Cell[SearchInput] {
  protected override func Build(input SearchInput) Blob {
    ComponentBuilds.Record("SearchCell")
    return Container{
      Gap: 8,
      Children: {
        input.Theme.Meta("Search projects", input.Theme.Ink),
        TextEntry{
          Handle: input.Handle,
          Value: input.Query,
          OnChange: input.OnChange,
          MinHeight: 36,
          Padding: 8,
          PaddingLeft: 12,
          FontSize: 14,
          Color: input.Theme.Ink,
          BackgroundColor: input.Theme.Surface,
          BorderWidth: 1,
          BorderColor: input.Theme.ControlLine,
          BorderRadius: 0,
          Focus: input.Theme.FocusRing,
          Accessibility: Accessibility{ Name: "Search projects" },
        },
      },
    }
  }
}
