package GooWorkbench

import System
import System.Threading
import System.Diagnostics
import Goo
import GooWorkbench.Components

class SmokeTree : AccessibilityAdapter {
  private var root AccessibilityNode?

  public func Update(tree AccessibilityTree) { root = tree.Root }

  private func FindIn(node AccessibilityNode, name string, role AccessibilityRole) AccessibilityNode? {
    if (node.Name == name || node.Value == name) && (role == AccessibilityRole.Auto || node.Role == role) { return node }
    for child in node.Children {
      if let found = FindIn(child, name, role) { return found }
    }
    return nil
  }

  internal func Find(name string, role AccessibilityRole = AccessibilityRole.Auto) AccessibilityNode {
    if let node = root {
      if let found = FindIn(node, name, role) { return found }
    }
    throw InvalidOperationException("Missing visible node: " + name)
  }

  internal func Act(window Window, name string, role AccessibilityRole = AccessibilityRole.Button) {
    let node = Find(name, role)
    if !window.PerformAccessibilityAction(node.Id, AccessibilityActionRequest(AccessibilityAction.Activate)) {
      throw InvalidOperationException("Activation failed: " + name)
    }
    Settle(window)
  }

  internal func FocusProject(window Window, name string) {
    let target = Find(name, AccessibilityRole.Button)
    let list = Find("Project list", AccessibilityRole.List)
    let bottom = target.Bounds.Y + target.Bounds.Height
    let viewportBottom = list.Bounds.Y + list.Bounds.Height
    if bottom > viewportBottom {
      Require(window.PerformAccessibilityAction(list.Id, AccessibilityActionRequest.Scroll(0.0, bottom - viewportBottom + 4.0)), "List scroll failed")
      Settle(window)
    }
    Require(window.PerformAccessibilityAction(target.Id, AccessibilityActionRequest(AccessibilityAction.Focus)), "Project focus failed")
    Settle(window)
    Require(Find(name, AccessibilityRole.Button).Focused, "Project focus was not retained")
  }

  internal func Search(window Window, query string) {
    let node = Find("Search projects", AccessibilityRole.TextInput)
    if !window.PerformAccessibilityAction(node.Id, AccessibilityActionRequest.SetValue(query)) {
      throw InvalidOperationException("Search input failed")
    }
    Settle(window)
  }
}

func Settle(window Window) {
  for frame in 0 ... 24 {
    if !window.IsOpen { return }
    window.Post(() -> {})
    window.Pump(1.0 / 60.0)
    Thread.Sleep(5)
  }
}

func Require(value bool, message string) {
  if !value { throw InvalidOperationException(message) }
}

func RunSmoke(window Window) {
  let tree = SmokeTree{}
  window.AccessibilityAdapter = tree
  window.Open()
  Settle(window)
  if Environment.GetEnvironmentVariable("WORKBENCH_VERIFY_CELLS") == "1" {
    ComponentBuilds.Enabled = true
    VerifyCellBoundaries(window, tree)
    ComponentBuilds.Enabled = false
    window.RequestClose()
    Settle(window)
    return
  }
  if let focusProject = Environment.GetEnvironmentVariable("WORKBENCH_FOCUS_PROJECT") {
    tree.FocusProject(window, focusProject)
    Console.WriteLine("PASS: project focus " + focusProject)
    if Environment.GetEnvironmentVariable("WORKBENCH_SMOKE_KEEP") == "1" { window.Run() }
    window.RequestClose()
    Settle(window)
    return
  }
  if Environment.GetEnvironmentVariable("WORKBENCH_BENCH") == "1" {
    MeasureInteractions(window, tree, "selection", []string{ "Asset browser", "Design system" })
    MeasureInteractions(window, tree, "filter", []string{ "In progress", "All projects" })
    MeasureInteractions(window, tree, "theme", []string{ "Instrument theme", "Registry theme", "Division theme" })
    window.RequestClose()
    Settle(window)
    return
  }
  tree.Find("6 projects")
  tree.Search(window, "ASSET")
  tree.Find("1 project")
  tree.Act(window, "Asset browser")
  Require(tree.Find("Asset browser", AccessibilityRole.Button).Selected == true, "Selection did not change")
  tree.Search(window, "no-such-project")
  tree.Find("No matching projects")
  tree.Act(window, "Clear filters")
  tree.Find("6 projects")
  tree.Act(window, "Complete")
  tree.Find("2 projects")
  tree.Act(window, "All projects")
  tree.Act(window, "Design system")
  tree.Act(window, "Check narrow layouts", AccessibilityRole.Checkbox)
  Require(tree.Find("Check narrow layouts", AccessibilityRole.Checkbox).Checked == AccessibilityChecked.True, "Task did not toggle")
  tree.Find("3 of 4")
  let themes = []string{ "Instrument", "Registry", "Division" }
  for name in themes {
    tree.Act(window, name + " theme")
    Require(tree.Find(name + " theme", AccessibilityRole.Button).Selected == true, "Theme did not change")
    Require(tree.Find("Check narrow layouts", AccessibilityRole.Checkbox).Checked == AccessibilityChecked.True, "Theme switch lost task state")
    Require(tree.Find("Design system", AccessibilityRole.Button).Selected == true, "Theme switch lost selection")
  }
  let comfortableHeight = tree.Find("Design system", AccessibilityRole.Button).Bounds.Height
  tree.Act(window, "Compact rows")
  Require(tree.Find("Design system", AccessibilityRole.Button).Bounds.Height < comfortableHeight, "Compact row did not shrink")
  window.Width = 900
  Settle(window)
  tree.Find("Project details")
  window.Width = 480
  window.Height = 640
  Settle(window)
  tree.Act(window, "Back to projects")
  Require(tree.Find("Design system", AccessibilityRole.Button).Focused, "Back did not restore row focus")
  tree.Act(window, "Asset browser")
  Require(tree.Find("Back to projects", AccessibilityRole.Button).Focused, "Narrow detail did not receive focus")
  tree.Act(window, "Back to projects")
  tree.Act(window, "Add sample project")
  tree.Find("New project 7")
  tree.Act(window, "Back to projects")
  tree.Find("7 projects")
  tree.Act(window, "Design system")
  Require(tree.Find("Check narrow layouts", AccessibilityRole.Checkbox).Checked == AccessibilityChecked.True, "Task state lost across navigation")
  Require(window.LastAccessibilityError == nil, "Accessibility delivery failed")
  Console.WriteLine("PASS: theme switching retains task state and selection, native semantic input, case-insensitive search, empty recovery, filters, selection, task state, density, 1280/900/480 resize, focus restoration, sample creation")
  if Environment.GetEnvironmentVariable("WORKBENCH_SMOKE_KEEP") == "1" { window.Run() }
  window.RequestClose()
  Settle(window)
}

func MeasureInteractions(window Window, tree SmokeTree, label string, names []string) {
  for index in 0 ... 320 {
    let node = tree.Find(names[index % names.Length], AccessibilityRole.Button)
    let allocated = GC.GetAllocatedBytesForCurrentThread()
    let start = Stopwatch.GetTimestamp()
    Require(window.PerformAccessibilityAction(node.Id, AccessibilityActionRequest(AccessibilityAction.Activate)), "Benchmark activation failed")
    window.Post(() -> {})
    window.Pump(1.0 / 60.0)
    let elapsed = Stopwatch.GetElapsedTime(start).TotalMilliseconds
    let bytes = GC.GetAllocatedBytesForCurrentThread() - allocated
    Console.WriteLine("BENCH," + label + "," + index.ToString() + "," + elapsed.ToString("F3") + "," + bytes.ToString())
  }
}
