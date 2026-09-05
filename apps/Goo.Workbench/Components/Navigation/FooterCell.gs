package GooWorkbench.Components

import Goo

open class FooterCell : Cell[Theme] {
  protected override func Build(input Theme) Blob {
    ComponentBuilds.Record("FooterCell")
    return Container{
      PaddingLeft: 24,
      PaddingRight: 24,
      PaddingTop: 8,
      PaddingBottom: 8,
      BorderTopWidth: 1,
      BorderTopColor: input.Line,
      FlexShrink: 0,
      Children: { input.Label("Sample workspace. Changes stay in this session.", 12, input.Muted) },
    }
  }
}
