package GooWorkbench.Components

import Goo

open class NavigationCell : Cell[ChromeInput] {
  protected override func Build(input ChromeInput) Blob {
    ComponentBuilds.Record("NavigationCell")
    return Container{
      Key: "navigation",
      Width: 208,
      FlexShrink: 0,
      Padding: 16,
      PaddingTop: 32,
      Gap: 32,
      BackgroundColor: input.Theme.Rail,
      BorderRightWidth: if input.Theme.Kind == 1 { 1 } else { 0 },
      BorderRightColor: input.Theme.ControlLine,
      Display: if input.Mode == 2 { Display.Flex } else { Display.None },
      Children: {
        Container{ PaddingLeft: 12, Gap: 16, Children: { input.Theme.MarkSymbol(), Container{ Gap: 4, Children: { input.Theme.Label(input.Theme.Name, if input.Theme.Kind == 0 { 28 } else { 20 }, input.Theme.RailInk, 600), input.Theme.Meta("Workbench", input.Theme.RailInk) } } } },
        FilterBar.Build(input, true),
        Container{ FlexGrow: 1 },
      },
    }
  }
}
