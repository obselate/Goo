package GooAsyncReadbackSmoke

import System
import Goo

data struct S15StocksGridStop {
  internal var Name string
  internal var X float64
  internal var Y float64
}

func S15StocksGridRequirePixelsEqual(first VulkanReadbackResult,
  second VulkanReadbackResult, stop string) {
    let firstPixels = first.Pixels
    let secondPixels = second.Pixels
    S14Require(first.Width == second.Width && first.Height == second.Height
        && firstPixels.Length == secondPixels.Length,
      "S15 StocksGrid readback extent differs at " + stop)
    var index int32 = 0
    while index < firstPixels.Length {
      if firstPixels[index] != secondPixels[index] {
        throw InvalidOperationException("S15 StocksGrid pixels differ at " + stop
          +" byte=" + index.ToString())
      }
      index = index + 1
    }
  }
func S15StocksGridRequirePixelsDiffer(first VulkanReadbackResult,
  second VulkanReadbackResult, stop string) {
    let firstPixels = first.Pixels
    let secondPixels = second.Pixels
    S14Require(first.Width == second.Width && first.Height == second.Height
        && firstPixels.Length == secondPixels.Length,
      "S15 StocksGrid readback extent differs at " + stop)
    var index int32 = 0
    while index < firstPixels.Length {
      if firstPixels[index] != secondPixels[index] {
        return
      }
      index = index + 1
    }
    throw InvalidOperationException("S15 StocksGrid legacy and explicit pixels unexpectedly match at "
      +stop)
  }

func S15StocksGridCompareStop(complete Window, virtualized Window,
  completeRoot S15StocksGridRootCell, virtualRoot S15StocksGridRootCell,
  stop S15StocksGridStop) {
    completeRoot.ScrollTo(stop.X, stop.Y)
    virtualRoot.ScrollTo(stop.X, stop.Y)
    WindowReadbackTestFixture.ForceRender(complete, 0.0)
    WindowReadbackTestFixture.ForceRender(virtualized, 0.0)
    virtualRoot.AssertVirtualState()
    let completeResult = S09RReadback(complete,
      WindowReadbackTestFixture.Metrics(complete))
    let virtualResult = S09RReadback(virtualized,
      WindowReadbackTestFixture.Metrics(virtualized))
    S15StocksGridRequirePixelsEqual(completeResult, virtualResult, stop.Name)
  }

func S15StocksGridOpen(cullEnabled bool, root S15StocksGridRootCell,
  title string) Window{
    let opened = Window{
      Title: title,
      Width: 1280,
      Height: 720,
      Background: Color.Rgb(13, 17, 23),
      Root: root,
      VSync: false,
    }
    opened.Open()
    WindowReadbackTestFixture.SetExactTextClipCull(opened, cullEnabled)
    WindowReadbackTestFixture.SetForceFullRedraw(opened, false)
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    return opened
  }

func S15StocksGridClose(window Window?) {
  if let active = window {
    if active.IsOpen {
      active.RequestClose()
      WindowReadbackTestFixture.ForceRender(active, 0.0)
    }
  }
}
func S15StocksGridRunExplicitClipProof() {
  let legacySource = S15StockDataSource(S15StockDataSource.DefaultTotalItems)
  let explicitSource = S15StockDataSource(S15StockDataSource.DefaultTotalItems)
  let legacyRoot = S15StocksGridRootCell(legacySource.Items,
    legacySource.Columns, legacySource.Rows, "complete", 1280.0, 720.0, 1, false)
  let explicitRoot = S15StocksGridRootCell(explicitSource.Items,
    explicitSource.Columns, explicitSource.Rows, "complete", 1280.0, 720.0, 1, true)
  var legacyWindow Window? = nil
  var explicitWindow Window? = nil
  try {
    let openedLegacy = S15StocksGridOpen(false, legacyRoot,
      "Goo S15 StocksGrid legacy clip")
    legacyWindow = openedLegacy
    let openedExplicit = S15StocksGridOpen(false, explicitRoot,
      "Goo S15 StocksGrid explicit clip")
    explicitWindow = openedExplicit
    let legacyResult = S09RReadback(openedLegacy,
      WindowReadbackTestFixture.Metrics(openedLegacy))
    let explicitResult = S09RReadback(openedExplicit,
      WindowReadbackTestFixture.Metrics(openedExplicit))
    S15StocksGridRequirePixelsDiffer(legacyResult, explicitResult,
      "explicit-clip-top-left")
  } finally {
    S15StocksGridClose(legacyWindow)
    S15StocksGridClose(explicitWindow)
  }
}

func S15StocksGridRunMatrix(cullEnabled bool, stops []S15StocksGridStop) {
  let completeSource = S15StockDataSource(S15StockDataSource.DefaultTotalItems)
  let virtualSource = S15StockDataSource(S15StockDataSource.DefaultTotalItems)
  let completeRoot = S15StocksGridRootCell(completeSource.Items,
    completeSource.Columns, completeSource.Rows, "complete", 1280.0, 720.0, 1, true)
  let virtualRoot = S15StocksGridRootCell(virtualSource.Items,
    virtualSource.Columns, virtualSource.Rows, "virtualized", 1280.0, 720.0, 1, true)
  var completeWindow Window? = nil
  var virtualWindow Window? = nil
  try {
    let openedComplete = S15StocksGridOpen(cullEnabled, completeRoot,
      "Goo S15 StocksGrid complete")
    completeWindow = openedComplete
    let openedVirtual = S15StocksGridOpen(cullEnabled, virtualRoot,
      "Goo S15 StocksGrid virtualized")
    virtualWindow = openedVirtual
    let complete = openedComplete
    let virtualized = openedVirtual
    S14Require(completeRoot.MountedCellCount == completeSource.TotalItems,
      "S15 complete StocksGrid did not mount all logical Cells")
    S14Require(virtualRoot.PoolRows == 43 && virtualRoot.PoolColumns == 23
        && virtualRoot.PoolCapacity == 989,
      "S15 virtual StocksGrid initial pool does not match the 1280x720 formula")
    S14Require(virtualRoot.MountedCellCount == virtualRoot.PoolCapacity
        && virtualRoot.PeakMountedCellCount == virtualRoot.PoolCapacity,
      "S15 virtual StocksGrid did not mount its fixed physical pool")
    virtualRoot.AssertVirtualState()
    var stopIndex int32 = 0
    while stopIndex < stops.Length {
      S15StocksGridCompareStop(complete, virtualized, completeRoot, virtualRoot,
        stops[stopIndex])
      stopIndex = stopIndex + 1
    }
    completeRoot.ScrollTo(0.0, 0.0)
    virtualRoot.ScrollTo(0.0, 0.0)
    WindowReadbackTestFixture.ForceRender(complete, 0.0)
    WindowReadbackTestFixture.ForceRender(virtualized, 0.0)
    let staleSlot = virtualRoot.SlotForLogical(0)
    virtualRoot.ScrollTo(1600.0, 270.0)
    completeRoot.ScrollTo(1600.0, 270.0)
    WindowReadbackTestFixture.ForceRender(complete, 0.0)
    WindowReadbackTestFixture.ForceRender(virtualized, 0.0)
    let staleBefore = virtualRoot.StaleSlotRejectionCount
    let staleAccepted = virtualRoot.TryApplySlot(staleSlot, 0,
      virtualSource.Items[0])
    S14Require(!staleAccepted
        && virtualRoot.StaleSlotRejectionCount > staleBefore,
      "S15 virtual StocksGrid accepted a stale slot update")
    let buildBefore = virtualRoot.CellBuildCount
    let suppressedBefore = virtualRoot.OffscreenMutationSuppressionCount
    completeSource.MutateAt(completeRoot, 0)
    virtualSource.MutateAt(virtualRoot, 0)
    S14Require(virtualRoot.CellBuildCount == buildBefore
        && virtualRoot.OffscreenMutationSuppressionCount > suppressedBefore,
      "S15 virtual StocksGrid rebuilt an offscreen mutation")
    WindowReadbackTestFixture.ForceRender(complete, 0.0)
    WindowReadbackTestFixture.ForceRender(virtualized, 0.0)
    S14Require(virtualRoot.CellBuildCount == buildBefore,
      "S15 virtual StocksGrid built an offscreen mutation during render")
    let reveal = S15StocksGridStop{Name: "mutated-reveal", X: 0.0, Y: 0.0}
    S15StocksGridCompareStop(complete, virtualized, completeRoot, virtualRoot, reveal)
    let visibleBuildBefore = virtualRoot.CellBuildCount
    completeSource.MutateAt(completeRoot, 1)
    virtualSource.MutateAt(virtualRoot, 1)
    WindowReadbackTestFixture.ForceRender(complete, 0.0)
    WindowReadbackTestFixture.ForceRender(virtualized, 0.0)
    S14Require(virtualRoot.CellBuildCount == visibleBuildBefore + 1L
        && virtualRoot.VisibleMutationCount > 0L,
      "S15 virtual StocksGrid did not rebuild one mapped visible Cell")
    let visibleMutation = S15StocksGridStop{
      Name: "visible-mutation", X: 0.0, Y: 0.0
    }
    S15StocksGridCompareStop(complete, virtualized, completeRoot, virtualRoot,
      visibleMutation)
  } finally {
    S15StocksGridClose(completeWindow)
    S15StocksGridClose(virtualWindow)
  }
}

func S15StocksGridRunZeroOverscan(stops []S15StocksGridStop) {
  let completeSource = S15StockDataSource(S15StockDataSource.DefaultTotalItems)
  let virtualSource = S15StockDataSource(S15StockDataSource.DefaultTotalItems)
  let completeRoot = S15StocksGridRootCell(completeSource.Items,
    completeSource.Columns, completeSource.Rows, "complete", 1280.0, 720.0, 0, true)
  let virtualRoot = S15StocksGridRootCell(virtualSource.Items,
    virtualSource.Columns, virtualSource.Rows, "virtualized", 1280.0, 720.0, 0, true)
  var completeWindow Window? = nil
  var virtualWindow Window? = nil
  try {
    let openedComplete = S15StocksGridOpen(true, completeRoot,
      "Goo S15 StocksGrid zero complete")
    completeWindow = openedComplete
    let openedVirtual = S15StocksGridOpen(true, virtualRoot,
      "Goo S15 StocksGrid zero virtualized")
    virtualWindow = openedVirtual
    let complete = openedComplete
    let virtualized = openedVirtual
    S14Require(virtualRoot.PoolRows == 41 && virtualRoot.PoolColumns == 21
        && virtualRoot.PoolCapacity == 861,
      "S15 zero-overscan pool does not match the capacity formula")
    var stopIndex int32 = 0
    while stopIndex < stops.Length {
      S15StocksGridCompareStop(complete, virtualized, completeRoot, virtualRoot,
        stops[stopIndex])
      stopIndex = stopIndex + 1
    }
  } finally {
    S15StocksGridClose(completeWindow)
    S15StocksGridClose(virtualWindow)
  }
}

func S15StocksGridRunChurnCheck() {
  let sourceZero = S15StockDataSource(S15StockDataSource.DefaultTotalItems)
  let sourceOne = S15StockDataSource(S15StockDataSource.DefaultTotalItems)
  let zero = S15StocksGridRootCell(sourceZero.Items, sourceZero.Columns,
    sourceZero.Rows, "virtualized", 1280.0, 720.0, 0, true)
  let one = S15StocksGridRootCell(sourceOne.Items, sourceOne.Columns,
    sourceOne.Rows, "virtualized", 1280.0, 720.0, 1, true)
  let trace = [8]S15StocksGridStop
  trace[0] = S15StocksGridStop{Name: "a", X: 0.5, Y: 0.5}
  trace[1] = S15StocksGridStop{Name: "b", X: 64.5, Y: 0.5}
  trace[2] = S15StocksGridStop{Name: "c", X: 128.5, Y: 0.5}
  trace[3] = S15StocksGridStop{Name: "d", X: 192.5, Y: 0.5}
  trace[4] = S15StocksGridStop{Name: "e", X: 256.5, Y: 18.5}
  trace[5] = S15StocksGridStop{Name: "f", X: 320.5, Y: 36.5}
  trace[6] = S15StocksGridStop{Name: "g", X: 384.5, Y: 54.5}
  trace[7] = S15StocksGridStop{Name: "h", X: 448.5, Y: 72.5}
  var index int32 = 0
  while index < trace.Length {
    zero.ScrollTo(trace[index].X, trace[index].Y)
    one.ScrollTo(trace[index].X, trace[index].Y)
    zero.AssertVirtualState()
    one.AssertVirtualState()
    index = index + 1
  }
  S14Require(one.SlotReassignmentCount < zero.SlotReassignmentCount,
    "S15 one-cell overscan did not reduce adjacent slot churn")
}

func S15StocksGridRunResizeCheck() {
  let source = S15StockDataSource(S15StockDataSource.DefaultTotalItems)
  let root = S15StocksGridRootCell(source.Items, source.Columns, source.Rows,
    "virtualized", 1280.0, 720.0, 1, true)
  var window Window? = nil
  try {
    let opened = Window{
      Title: "Goo S15 StocksGrid resize",
      Width: 1280,
      Height: 720,
      Background: Color.Rgb(13, 17, 23),
      Root: root,
      VSync: false,
    }
    window = opened
    opened.Open()
    WindowReadbackTestFixture.SetExactTextClipCull(opened, true)
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    let initialCapacity = root.PoolCapacity
    let initialGrowth = root.PoolCapacityGrowthCount
    root.SetViewport(1400.0, 800.0)
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    let grownCapacity = root.PoolCapacity
    let grownGrowth = root.PoolCapacityGrowthCount
    S14Require(grownCapacity > initialCapacity && grownGrowth > initialGrowth
        && root.MountedCellCount == grownCapacity,
      "S15 viewport growth did not extend the physical pool")
    root.SetViewport(1400.0, 800.0)
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    S14Require(root.PoolCapacity == grownCapacity
        && root.PoolCapacityGrowthCount == grownGrowth
        && root.MountedCellCount == grownCapacity,
      "S15 repeated viewport dimensions grew or remounted the pool")
    root.SetViewport(1280.0, 720.0)
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    S14Require(root.PoolCapacity == grownCapacity
        && root.PoolCapacityGrowthCount == grownGrowth
        && root.MountedCellCount == grownCapacity,
      "S15 smaller viewport discarded the retained physical pool")
  } finally {
    S15StocksGridClose(window)
  }
}

func RunS15StocksGridVirtualizationGate() {
  S14Require(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  let stops = [9]S15StocksGridStop
  stops[0] = S15StocksGridStop{Name: "top-left", X: 0.0, Y: 0.0}
  stops[1] = S15StocksGridStop{Name: "fractional", X: 0.5, Y: 0.5}
  stops[2] = S15StocksGridStop{Name: "one-cell", X: 64.0, Y: 18.0}
  stops[3] = S15StocksGridStop{Name: "diagonal", X: 76.5, Y: 25.25}
  stops[4] = S15StocksGridStop{Name: "boundary-a", X: 128.0, Y: 36.0}
  stops[5] = S15StocksGridStop{Name: "boundary-a-repeat", X: 128.0, Y: 36.0}
  stops[6] = S15StocksGridStop{Name: "middle", X: 1600.0, Y: 270.0}
  stops[7] = S15StocksGridStop{Name: "bottom-right", X: 3200.0, Y: 540.0}
  stops[8] = S15StocksGridStop{Name: "return", X: 0.0, Y: 0.0}
  S15StocksGridRunExplicitClipProof()
  S15StocksGridRunMatrix(false, stops)
  S15StocksGridRunMatrix(true, stops)
  let zeroStops = [3]S15StocksGridStop
  zeroStops[0] = S15StocksGridStop{Name: "zero-middle", X: 1600.0, Y: 270.0}
  zeroStops[1] = S15StocksGridStop{Name: "zero-bottom-right", X: 3200.0, Y: 540.0}
  zeroStops[2] = S15StocksGridStop{Name: "zero-return", X: 0.0, Y: 0.0}
  S15StocksGridRunZeroOverscan(zeroStops)
  S15StocksGridRunChurnCheck()
  S15StocksGridRunResizeCheck()
  Console.WriteLine("s15-stocks-grid-virtualization-gate: cull_modes=2 stops=9"
    +" explicit_clip=1 complete=4900 virtual_pool=989 zero_overscan=1"
    +" mutation=1 stale_slot=1 uniqueness=1 churn=1 resize=1 close=1")
}
