package FindingAsyncTryCatchAwait

import System
import System.Threading.Tasks

async func RunAsync() int32 {
  try {
    await Task.Yield()
    return 1
  } catch (error Exception) {
    return -1
  }
}

func Main() int32 {
  return RunAsync().GetAwaiter().GetResult() == 1 ? 0 : 1
}
