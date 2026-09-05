package GooWorkbench.Components

import System
import System.Collections.Generic
import Goo

data struct ProjectRowsInput {
  var Theme Theme
  var Rows List[RowInput]
  var Handle ElementHandle
  var OnClear Action
}

open class ProjectRowsCell : Cell[ProjectRowsInput] {
  protected override func Build(input ProjectRowsInput) Blob {
    ComponentBuilds.Record("ProjectRowsCell")
    let rows = List[Blob]()
    for row in input.Rows { rows.Add(Cell.Mount[RowInput, ProjectRowCell]("row-" + row.Project.Id.ToString(), row)) }
    if rows.Count == 0 {
      rows.Add(Container{ Padding: 24, Gap: 16, AlignItems: AlignItems.FlexStart, Children: {
        input.Theme.Label("No matching projects", 20, input.Theme.Ink, 600),
        input.Theme.Label("Try another name or clear the filters.", 14, input.Theme.Muted),
        input.Theme.Action("Clear filters", input.OnClear),
      } })
    }
    return Container{ Handle: input.Handle, Accessibility: Accessibility{ Role: AccessibilityRole.List, Name: "Project list" }, FlexGrow: 1, FlexShrink: 1, MinHeight: 0, OverflowY: Overflow.Scroll, Children: { Container{ FlexShrink: 0, Padding: 4, Gap: if input.Theme.Kind == 1 { 8 } else { 4 }, Children: rows } } }
  }
}
