package GooWorkbench.Services

import System
import System.Collections.Generic
import GooWorkbench.Models

class WorkspaceService {
  private let projects List[ProjectItem] = List[ProjectItem]()
  internal let State WorkspaceState = WorkspaceState{}
  internal prop Projects IReadOnlyList[ProjectItem]{ get -> projects }
  internal event Changed Action

  internal init() {
    projects.Add(ProjectItem(1, "Design system", "Interface", "A small, consistent language for everyday desktop tools.", "~/Projects/design-system", []ProjectTask{ ProjectTask("Define the core tokens", true), ProjectTask("Review component states", true), ProjectTask("Check narrow layouts", false), ProjectTask("Document the handoff", false) }))
    projects.Add(ProjectItem(2, "Asset browser", "Desktop app", "Find source files and inspect assets without leaving your workspace.", "~/Projects/asset-browser", []ProjectTask{ ProjectTask("Index the sample library", true), ProjectTask("Build the detail view", false), ProjectTask("Review keyboard navigation", false) }))
    projects.Add(ProjectItem(3, "Release checklist", "Operations", "Keep release checks visible and make the next action clear.", "~/Projects/release-checklist", []ProjectTask{ ProjectTask("Review package contents", true), ProjectTask("Verify the release build", true), ProjectTask("Prepare release notes", false) }))
    projects.Add(ProjectItem(4, "Notes", "Desktop app", "A focused space for project notes and short documents.", "~/Projects/notes", []ProjectTask{ ProjectTask("Set up the editor", true), ProjectTask("Add local search", true), ProjectTask("Review text contrast", true) }))
    projects.Add(ProjectItem(5, "Font specimen", "Interface", "Compare type sizes and weights in real interface layouts.", "~/Projects/font-specimen", []ProjectTask{ ProjectTask("Register font assets", true), ProjectTask("Check line heights", true), ProjectTask("Review missing glyphs", true) }))
    projects.Add(ProjectItem(6, "File transfer", "Utility", "Review a transfer queue and resolve individual file failures.", "~/Projects/file-transfer", []ProjectTask{ ProjectTask("Build the queue", true), ProjectTask("Add cancellation", false), ProjectTask("Review error recovery", false) }))
  }

  internal func Current() ProjectItem -> Find(State.SelectedId)

  internal func Find(id int32) ProjectItem {
    for project in projects { if project.Id == id { return project } }
    throw ArgumentOutOfRangeException("id")
  }

  internal func Matches(project ProjectItem) bool -> (State.Filter == 0 || (State.Filter == 1 && project.Status() != "Complete") || (State.Filter == 2 && project.Status() == "Complete")) && (State.Query == "" || project.Name.Contains(State.Query, StringComparison.OrdinalIgnoreCase) || project.Category.Contains(State.Query, StringComparison.OrdinalIgnoreCase))

  internal func Select(id int32) {
    if State.SelectedId == id { return }
    Find(id)
    State.SelectedId = id
    Changed?.Invoke()
  }

  internal func Search(value string) {
    if State.Query == value { return }
    State.Query = value
    Changed?.Invoke()
  }

  internal func SetFilter(value int32) {
    if value < 0 || value > 2 { throw ArgumentOutOfRangeException("value") }
    if State.Filter == value { return }
    State.Filter = value
    Changed?.Invoke()
  }

  internal func ClearFilters() {
    State.Query = ""
    State.Filter = 0
    Changed?.Invoke()
  }

  internal func AddSample() ProjectItem {
    let id = projects.Count + 1
    let project = ProjectItem(id, "New project " + id.ToString(), "Sample", "An in-memory project. Rename and persistence belong to a real application.", "~/Projects/new-project-" + id.ToString(), []ProjectTask{ ProjectTask("Define the first task", false), ProjectTask("Review the result", false) })
    projects.Add(project)
    State.Query = ""
    State.Filter = 0
    State.SelectedId = id
    Changed?.Invoke()
    return project
  }

  internal func ToggleTask(projectId int32, index int32) {
    Find(projectId).ToggleTask(index)
    Changed?.Invoke()
  }
}
