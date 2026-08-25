package FindingAsyncLambdaFixture

import System.Threading.Tasks

public class AsyncFixture {
  shared {
    public async func Run() int32 {
      let twice async (int32) -> int32 = async (x int32) -> await Task.FromResult(x * 2)
      return await twice(21)
    }
  }
}
