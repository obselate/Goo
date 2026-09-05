package GooWorkbench.Components

import System
import Goo

data struct ChromeInput {
  var Theme Theme
  var Mode int32
  var Compact bool
  var Filter int32
  var OnFilter Action[int32]
  var OnDensity Action
  var OnAdd Action
}
