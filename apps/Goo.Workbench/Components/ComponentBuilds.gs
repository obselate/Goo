package GooWorkbench.Components

import System.Collections.Generic

class ComponentBuilds {
  shared {
    internal var Enabled bool
    private let counts Dictionary[string, int32] = Dictionary[string, int32]()

    internal func Record(name string, project int32 = 0, task int32 = -1) {
      if !Enabled { return }
      Add(name)
      if project != 0 { Add(Key(name, project, task)) }
    }

    private func Add(key string) {
      counts.TryGetValue(key, out var count)
      counts[key] = count + 1
    }

    private func Key(name string, project int32, task int32) string -> if project == 0 { name } else { name + "/" + project.ToString() + "/" + task.ToString() }

    internal func Count(name string, project int32 = 0, task int32 = -1) int32 {
      counts.TryGetValue(Key(name, project, task), out var count)
      return count
    }

    internal func Reset() { counts.Clear() }
  }
}
