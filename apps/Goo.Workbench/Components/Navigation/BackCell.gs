package GooWorkbench.Components

import System
import Goo

data struct BackInput {
  var Theme Theme
  var Visible bool
  var Handle ElementHandle
  var OnBack Action
}

open class BackCell : Cell[BackInput] {
  protected override func Build(input BackInput) Blob {
    ComponentBuilds.Record("BackCell")
    return Button{
      Handle: input.Handle,
      BasedOn: input.Theme.Control,
      Display: if input.Visible { Display.Flex } else { Display.None },
      BackgroundColor: input.Theme.Subtle,
      Focus: input.Theme.FocusRing,
      Hover: Style{ BackgroundColor: input.Theme.Selection },
      OnClick: input.OnBack,
      Children: { input.Theme.Label("Back to projects", 14, input.Theme.Accent, 600) },
    }
  }
}
