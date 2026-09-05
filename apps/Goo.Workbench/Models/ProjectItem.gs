package GooWorkbench.Models

class ProjectItem {
  internal let Id int32
  internal let Name string
  internal let Category string
  internal let Description string
  internal let Path string
  internal let Tasks []ProjectTask
  internal prop Revision int32{ get; private set; }

  internal init(id int32, name string, category string, description string, path string, tasks []ProjectTask) {
    Id = id
    Name = name
    Category = category
    Description = description
    Path = path
    Tasks = tasks
  }

  internal func Completed() int32 {
    var count = 0
    for task in Tasks { if task.Done { count++ } }
    return count
  }

  internal func Status() string -> if Completed() == Tasks.Length { "Complete" } else { "In progress" }

  internal func ToggleTask(index int32) {
    Tasks[index].Toggle()
    Revision++
  }
}
