package GooWorkbench.Components

import System
import Goo

data struct ThemeInput {
  var Theme Theme
  var OnTheme Action[int32]
}

open class ThemeSelectorCell : Cell[ThemeInput] {
  private func ThemeChoice(input ThemeInput, name string, kind int32) Button -> Button {
    Key: "theme-" + name,
    BasedOn: input.Theme.Control,
    FlexGrow: 1,
    BorderBottomWidth: if input.Theme.Kind == kind { 3 } else { 1 },
    BorderBottomColor: if input.Theme.Kind == kind { input.Theme.Accent } else { input.Theme.Line },
    BackgroundColor: if input.Theme.Kind == kind { input.Theme.Selection } else { input.Theme.Surface },
    Hover: Style{ BackgroundColor: input.Theme.Subtle },
    Focus: input.Theme.FocusRing,
    Accessibility: Accessibility{ Name: name + " theme", Selected: input.Theme.Kind == kind },
    OnClick: () -> input.OnTheme(kind),
    Children: { input.Theme.Label(name, 14, input.Theme.Ink, if input.Theme.Kind == kind { 600 } else { 400 }) },
  }
  protected override func Build(input ThemeInput) Blob {
    ComponentBuilds.Record("ThemeSelectorCell")
    return Container{
      FlexDirection: FlexDirection.Row,
      FlexShrink: 0,
      Padding: 8,
      Gap: 8,
      BackgroundColor: input.Theme.Surface,
      Children: { ThemeChoice(input, "Division", 0), ThemeChoice(input, "Instrument", 1), ThemeChoice(input, "Registry", 2) },
    }
  }
}
