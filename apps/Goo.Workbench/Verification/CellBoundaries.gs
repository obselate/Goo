package GooWorkbench

import System
import Goo
import GooWorkbench.Components

func ExpectBuilds(name string, expected int32, project int32 = 0, task int32 = -1) {
  let actual = ComponentBuilds.Count(name, project, task)
  Require(actual == expected, name + " builds: expected " + expected.ToString() + ", actual " + actual.ToString())
}

func ExpectStableChrome() {
  ExpectBuilds("NavigationCell", 0)
  ExpectBuilds("HeaderCell", 0)
  ExpectBuilds("ThemeSelectorCell", 0)
  ExpectBuilds("SearchCell", 0)
  ExpectBuilds("ResultCountCell", 0)
  ExpectBuilds("FooterCell", 0)
}

func VerifyCellBoundaries(window Window, tree SmokeTree) {
  ComponentBuilds.Reset()
  tree.Act(window, "Asset browser")
  ExpectStableChrome()
  ExpectBuilds("ProjectRowCell", 2)
  ExpectBuilds("ProjectRowCell", 1, 1)
  ExpectBuilds("ProjectRowCell", 1, 2)
  ExpectBuilds("ProjectRowCell", 0, 3)
  ExpectBuilds("ProjectInfoCell", 1)
  ExpectBuilds("ProjectLocationCell", 1)
  ExpectBuilds("ProjectStatusCell", 0)
  Console.WriteLine("PASS: selection rebuilds only the two affected rows and changed inspector content")

  ComponentBuilds.Reset()
  tree.Act(window, "Build the detail view", AccessibilityRole.Checkbox)
  ExpectStableChrome()
  ExpectBuilds("ProjectRowCell", 1)
  ExpectBuilds("ProjectRowCell", 1, 2)
  ExpectBuilds("TaskCell", 1)
  ExpectBuilds("TaskCell", 1, 2, 1)
  ExpectBuilds("TaskCell", 0, 2, 0)
  ExpectBuilds("ProjectInfoCell", 0)
  ExpectBuilds("ProjectLocationCell", 0)
  ExpectBuilds("ProjectStatusCell", 0)
  ExpectBuilds("TaskPanelCell", 1)
  Console.WriteLine("PASS: task toggle retains unrelated tasks, project details, search, counts, and chrome")

  ComponentBuilds.Reset()
  tree.Search(window, "ASSET")
  tree.Find("1 project")
  ExpectBuilds("ProjectRowCell", 0)
  ExpectBuilds("InspectorCell", 0)
  ExpectBuilds("NavigationCell", 0)
  ExpectBuilds("HeaderCell", 0)
  ExpectBuilds("ResultCountCell", 1)
  Console.WriteLine("PASS: search retains unchanged visible rows and the inspector")

  tree.Act(window, "In progress")
  ComponentBuilds.Reset()
  tree.Act(window, "Review keyboard navigation", AccessibilityRole.Checkbox)
  tree.Find("No matching projects")
  ExpectBuilds("ProjectStatusCell", 1)
  tree.Act(window, "Review keyboard navigation", AccessibilityRole.Checkbox)
  tree.Find("1 project")
  Require(tree.Find("Asset browser", AccessibilityRole.Button).Selected == true, "Filtered task update lost selection")
  Console.WriteLine("PASS: task completion updates filter membership and restores the selected row")
}
