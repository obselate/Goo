package GooWorkbench.Components

import Goo

class FilterBar {
  shared {
    private func FilterButton(input ChromeInput, name string, index int32, inverted bool) Button -> Button {
      Key: "filter-" + index.ToString(),
      BasedOn: input.Theme.Control,
      MinHeight: if input.Compact { 32 } else { 36 },
      JustifyContent: JustifyContent.FlexStart,
      BackgroundColor: if input.Filter == index { if inverted { input.Theme.Surface } else { input.Theme.Selection } } else { Color.Transparent },
      BorderTopWidth: if input.Theme.Kind == 2 { 1 } else { 0 },
      BorderRightWidth: if input.Theme.Kind == 2 { 1 } else { 0 },
      BorderTopColor: input.Theme.Line,
      BorderRightColor: input.Theme.Line,
      BorderLeftWidth: 3,
      BorderLeftColor: if input.Filter == index { input.Theme.Accent } else { Color.Transparent },
      Hover: Style{ BackgroundColor: if inverted { if input.Filter == index { input.Theme.Surface } else { input.Theme.Accent } } else { input.Theme.Subtle } },
      Active: Style{ BackgroundColor: if inverted { if input.Filter == index { input.Theme.Surface } else { input.Theme.AccentHover } } else { input.Theme.Selection } },
      Focus: Style{ OutlineWidth: 2, OutlineOffset: 2, OutlineColor: if inverted { input.Theme.Surface } else { input.Theme.Accent } },
      Accessibility: Accessibility{ Name: name, Selected: input.Filter == index },
      OnClick: () -> input.OnFilter(index),
      Children: { input.Theme.Label(name, 14, if input.Filter == index { input.Theme.Accent } else { if inverted { input.Theme.Surface } else { input.Theme.Muted } }, if input.Filter == index { 600 } else { 400 }) },
    }
    func Build(input ChromeInput, vertical bool) Container -> Container {
      FlexDirection: if vertical { FlexDirection.Column } else { FlexDirection.Row },
      Gap: 8,
      Padding: 4,
      FlexShrink: 0,
      Children: { FilterButton(input, "All projects", 0, vertical && input.Theme.Kind == 0), FilterButton(input, "In progress", 1, vertical && input.Theme.Kind == 0), FilterButton(input, "Complete", 2, vertical && input.Theme.Kind == 0) },
    }
  }
}
