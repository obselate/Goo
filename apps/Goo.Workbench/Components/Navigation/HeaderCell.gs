package GooWorkbench.Components

import System
import Goo

open class HeaderCell : Cell[ChromeInput] {
  protected override func Build(input ChromeInput) Blob {
    ComponentBuilds.Record("HeaderCell")
    return Container{
      BorderTopWidth: if input.Theme.Kind == 0 { 8 } else { 2 },
      BorderTopColor: input.Theme.Mark,
      BackgroundColor: input.Theme.Header,
      Padding: if input.Mode == 0 { 16 } else { 24 },
      Gap: 16,
      BorderBottomWidth: 2,
      BorderBottomColor: if input.Theme.Kind == 0 { input.Theme.Mark } else { input.Theme.ControlLine },
      FlexShrink: 0,
      Children: {
        Container{ FlexDirection: if input.Mode == 0 { FlexDirection.Column } else { FlexDirection.Row }, Gap: 16, AlignItems: if input.Mode == 0 { AlignItems.Stretch } else { AlignItems.Center }, Children: {
          Container{ FlexGrow: 1, FlexDirection: FlexDirection.Row, AlignItems: AlignItems.Center, Gap: 16, Children: { Container{ Display: if input.Mode < 2 { Display.Flex } else { Display.None }, Children: { input.Theme.MarkSymbol() } }, input.Theme.Label("Project register", 28, input.Theme.HeaderInk, 600) } },
          Container{ FlexDirection: FlexDirection.Row, Gap: 8, Children: {
            input.Theme.Action(if input.Compact { "Comfortable rows" } else { "Compact rows" }, input.OnDensity, false, true),
            input.Theme.Action("Add sample project", input.OnAdd, true, true),
          } },
        } },
        Container{ Display: if input.Mode < 2 { Display.Flex } else { Display.None }, BackgroundColor: input.Theme.Surface, Children: { FilterBar.Build(input, false) } },
      },
    }
  }
}
