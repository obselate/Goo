package GooWorkbench.Models

class ProjectTask {
  internal let Title string
  internal prop Done bool{ get; private set; }

  internal init(title string, done bool) {
    Title = title
    Done = done
  }

  internal func Toggle() { Done = !Done }
}
