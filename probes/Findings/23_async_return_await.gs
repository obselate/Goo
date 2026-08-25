package FindingAsyncReturnAwait

import System.Threading.Tasks

async func GetValueAsync() int32 {
  return await Task.FromResult(42)
}

func Main() int32 {
  return GetValueAsync().GetAwaiter().GetResult() == 42 ? 0 : 1
}
