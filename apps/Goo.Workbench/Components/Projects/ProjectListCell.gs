package GooWorkbench.Components

import System
import System.Collections.Generic
import Goo

data struct ListInput {
  var Theme Theme
  var Mode int32
  var Query string
  var Rows List[RowInput]
  var Details bool
  var SearchHandle ElementHandle
  var ListHandle ElementHandle
  var OnSearch Action[string]
  var OnClear Action
}

open class ProjectListCell : Cell[ListInput] {
  protected override func Build(input ListInput) Blob {
    ComponentBuilds.Record("ProjectListCell")
    return Container{
      Key: "list",
      FlexGrow: 1,
      FlexShrink: 1,
      MinWidth: 0,
      MinHeight: 0,
      Gap: 16,
      Padding: if input.Mode == 0 { 16 } else { 24 },
      Display: if input.Mode == 0 && input.Details { Display.None } else { Display.Flex },
      Children: {
        Cell.Mount[SearchInput, SearchCell]("search", SearchInput{ Theme: input.Theme, Query: input.Query, Handle: input.SearchHandle, OnChange: input.OnSearch }),
        Cell.Mount[ResultCountInput, ResultCountCell]("count", ResultCountInput{ Theme: input.Theme, Count: input.Rows.Count }),
        Cell.Mount[ProjectRowsInput, ProjectRowsCell]("rows", ProjectRowsInput{ Theme: input.Theme, Rows: input.Rows, Handle: input.ListHandle, OnClear: input.OnClear }),
      },
    }
  }
}
