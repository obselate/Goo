package FindingAsyncLambda

import FindingAsyncLambdaFixture
import System.Threading.Tasks

func Main() int32 {
  let result = AsyncFixture.Run().GetAwaiter().GetResult()
  return result == 42 ? 0 : 1
}
