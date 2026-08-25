package FindingAsyncTryFinallyAwait

import System
import System.Threading.Tasks

async func RunAsync() int32 {
  var entered = 0
  try {
    await Task.Yield()
    entered = 1
    return entered
  } finally {
    Console.WriteLine("cleanup")
  }
}

func Main() int32 {
  return RunAsync().GetAwaiter().GetResult() == 1 ? 0 : 1
}
