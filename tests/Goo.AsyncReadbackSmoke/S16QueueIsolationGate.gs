package GooAsyncReadbackSmoke

import System
import System.Diagnostics
import System.IO
import System.Threading
import Goo

class S16QueueIsolationCell : Cell {
  internal let Root ElementHandle = ElementHandle{}

  private var service int32
  internal var BuildCount int32
  internal var PostedCount int32

  init() {
    service = 0
  }

  internal func RecordService() {
    PostedCount = PostedCount + 1
    service = service + 1
    Rebuild()
  }

  override func Build() Blob {
    BuildCount = BuildCount + 1
    return Container{
      Width: Length.Percent(100),
      Height: Length.Percent(100),
      Handle: Root,
      Position: PositionType.Relative,
      BackgroundColor: Color.Rgb(12, 20, 32),
      Children: {
        Container{
          Position: PositionType.Absolute,
          Left: 8,
          Top: 8,
          Width: 64,
          Height: 32,
          BackgroundColor: Color.Rgb(42, 112, 188),
        },
        Text{
          Position: PositionType.Absolute,
          Left: 8,
          Top: 48,
          Content: service.ToString(),
          Color: Color.Rgb(240, 244, 248),
        },
      },
    }
  }
}

func S16QueueIsolationRequire(condition bool, message string) {
  if !condition {
    throw InvalidOperationException(message)
  }
}

func S16QueueIsolationPump(first Window, second Window, third Window, dt float64) {
  WindowReadbackTestFixture.Pump(first, dt)
  WindowReadbackTestFixture.Pump(second, dt)
  WindowReadbackTestFixture.Pump(third, dt)
}

func S16QueueIsolationDrain(first Window, second Window, third Window, timeoutMs int32) {
  let deadline = Stopwatch.GetTimestamp()
  +int64(float64(Stopwatch.Frequency) * float64(timeoutMs) / 1000.0)
  while Stopwatch.GetTimestamp() < deadline {
    S16QueueIsolationPump(first, second, third, 0.0)
    if !WindowReadbackTestFixture.S16QueueWorkPending(first)
      && !WindowReadbackTestFixture.S16QueueWorkPending(second)
      && !WindowReadbackTestFixture.S16QueueWorkPending(third) {
        return
      }
    Thread.Yield()
  }
  throw InvalidOperationException("S16 queue work did not drain within the timeout")
}

func S16QueueIsolationPost(window Window, cell S16QueueIsolationCell) {
  window.Post(func() { cell.RecordService() })
}

func S16QueueIsolationSerialCount(snapshot VulkanFrameSubmissionTestSnapshot) uint64 -> snapshot.Slot0Serial + snapshot.Slot1Serial

func S16QueueIsolationClose(window Window) {
  if window.IsOpen {
    window.RequestClose()
  }
}

func RunS16QueueIsolationGate() {
  S16QueueIsolationRequire(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  let firstRoot = S16QueueIsolationCell{}
  let secondRoot = S16QueueIsolationCell{}
  let thirdRoot = S16QueueIsolationCell{}
  let capturedError = StringWriter()
  let originalError = Console.Error
  var first Window? = nil
  var second Window? = nil
  var third Window? = nil
  var submitHoldVerified = false
  var presentHoldVerified = false
  var siblingServiceVerified = false
  var retryVerified = false
  var convergenceVerified = false
  var drainedBeforeClose = false
  var closed = false
  try {
    let openedFirst = Window{
      Title: "Goo S16 queue isolation A",
      Width: 180,
      Height: 96,
      VSync: false,
      Root: firstRoot,
    }
    let openedSecond = Window{
      Title: "Goo S16 queue isolation B",
      Width: 180,
      Height: 96,
      VSync: false,
      Root: secondRoot,
    }
    let openedThird = Window{
      Title: "Goo S16 queue isolation C",
      Width: 180,
      Height: 96,
      VSync: false,
      Root: thirdRoot,
    }
    first = openedFirst
    second = openedSecond
    third = openedThird
    Console.SetError(capturedError)
    openedFirst.Open()
    openedSecond.Open()
    openedThird.Open()
    WindowReadbackTestFixture.ForceRender(openedFirst, 0.0)
    WindowReadbackTestFixture.ForceRender(openedSecond, 0.0)
    WindowReadbackTestFixture.ForceRender(openedThird, 0.0)
    S16QueueIsolationPump(openedFirst, openedSecond, openedThird, 0.0)
    S16QueueIsolationDrain(openedFirst, openedSecond, openedThird, 2000)
    S16QueueIsolationRequire(openedFirst.IsOpen && openedSecond.IsOpen && openedThird.IsOpen,
      "S16 queue isolation did not open all windows")
    S16QueueIsolationRequire(firstRoot.Root.IsMounted
        && secondRoot.Root.IsMounted && thirdRoot.Root.IsMounted,
      "S16 queue isolation retained root handle is not mounted")

    S16QueueIsolationPost(openedFirst, firstRoot)
    WindowReadbackTestFixture.ForceRender(openedFirst, 0.0)
    S16QueueIsolationDrain(openedFirst, openedSecond, openedThird, 2000)
    let firstBeforeSubmit = WindowReadbackTestFixture.FrameSubmissions(openedFirst)
    let secondBuildBeforeSubmit = secondRoot.BuildCount
    let thirdBuildBeforeSubmit = thirdRoot.BuildCount
    WindowReadbackTestFixture.SetForceFullRedraw(openedFirst, true)
    WindowReadbackTestFixture.S16HoldNextQueueSubmit(openedFirst)
    WindowReadbackTestFixture.ForceRenderNonblocking(openedFirst, 0.0166666666666667)
    var submitHeld = false
    let submitDeadline = Stopwatch.GetTimestamp()
    +int64(float64(Stopwatch.Frequency) * 2.0)
    while Stopwatch.GetTimestamp() < submitDeadline {
      S16QueueIsolationPump(openedFirst, openedSecond, openedThird, 0.0)
      if WindowReadbackTestFixture.S16WaitForHeldQueueCall(openedFirst, 10) {
        submitHeld = true
        break
      }
      Thread.Yield()
    }
    S16QueueIsolationRequire(submitHeld,
      "S16 submit hold did not reach the queue worker: pending="
      +WindowReadbackTestFixture.S16QueueWorkPending(openedFirst).ToString()
      +" submitCount="
      +WindowReadbackTestFixture.DiagnosticCounters(openedFirst).submitCount.ToString())
    let firstHeldSubmit = WindowReadbackTestFixture.FrameSubmissions(openedFirst)
    S16QueueIsolationRequire(
      S16QueueIsolationSerialCount(firstHeldSubmit)
      == S16QueueIsolationSerialCount(firstBeforeSubmit),
      "S16 submit hold changed the target submission serial before release")
    var pump int32 = 0
    while pump < 4 {
      S16QueueIsolationPost(openedSecond, secondRoot)
      S16QueueIsolationPost(openedThird, thirdRoot)
      S16QueueIsolationPump(openedFirst, openedSecond, openedThird, 0.0)
      pump = pump + 1
    }
    S16QueueIsolationRequire(secondRoot.PostedCount > 0 && thirdRoot.PostedCount > 0,
      "S16 submit hold blocked sibling posted UI service progress")
    S16QueueIsolationRequire(secondRoot.BuildCount > secondBuildBeforeSubmit
        && thirdRoot.BuildCount > thirdBuildBeforeSubmit
        && firstRoot.Root.IsMounted && secondRoot.Root.IsMounted
        && thirdRoot.Root.IsMounted,
      "S16 submit hold did not retain sibling trees through posted rebuilds")
    siblingServiceVerified = true
    S16QueueIsolationRequire(
      S16QueueIsolationSerialCount(WindowReadbackTestFixture.FrameSubmissions(openedFirst))
      == S16QueueIsolationSerialCount(firstBeforeSubmit),
      "S16 submit hold produced a duplicate target packet")
    submitHoldVerified = true
    WindowReadbackTestFixture.S16ReleaseHeldQueueCall()
    S16QueueIsolationDrain(openedFirst, openedSecond, openedThird, 2000)
    let firstAfterSubmit = WindowReadbackTestFixture.FrameSubmissions(openedFirst)
    S16QueueIsolationRequire(
      S16QueueIsolationSerialCount(firstAfterSubmit)
      > S16QueueIsolationSerialCount(firstBeforeSubmit),
      "S16 submit hold did not converge after release")
    convergenceVerified = true

    S16QueueIsolationPost(openedFirst, firstRoot)
    WindowReadbackTestFixture.ForceRender(openedFirst, 0.0)
    S16QueueIsolationDrain(openedFirst, openedSecond, openedThird, 2000)
    let firstBeforePresent = WindowReadbackTestFixture.FrameSubmissions(openedFirst)
    let firstBuildBeforePresent = firstRoot.BuildCount
    let secondBuildBeforePresent = secondRoot.BuildCount
    let thirdBuildBeforePresent = thirdRoot.BuildCount
    WindowReadbackTestFixture.SetForceFullRedraw(openedFirst, true)
    WindowReadbackTestFixture.S16HoldNextQueuePresent(openedFirst)
    WindowReadbackTestFixture.ForceRenderNonblocking(openedFirst, 0.0)
    var presentHeld = false
    let presentDeadline = Stopwatch.GetTimestamp()
    +int64(float64(Stopwatch.Frequency) * 2.0)
    while Stopwatch.GetTimestamp() < presentDeadline {
      S16QueueIsolationPump(openedFirst, openedSecond, openedThird, 0.0)
      if WindowReadbackTestFixture.S16WaitForHeldQueueCall(openedFirst, 10) {
        presentHeld = true
        break
      }
      Thread.Yield()
    }
    S16QueueIsolationRequire(presentHeld,
      "S16 present hold did not reach the queue worker")
    let firstHeldPresent = WindowReadbackTestFixture.FrameSubmissions(openedFirst)
    pump = 0
    while pump < 4 {
      S16QueueIsolationPost(openedSecond, secondRoot)
      S16QueueIsolationPost(openedThird, thirdRoot)
      S16QueueIsolationPump(openedFirst, openedSecond, openedThird, 0.0)
      pump = pump + 1
    }
    S16QueueIsolationRequire(secondRoot.PostedCount > 4 && thirdRoot.PostedCount > 4
        && secondRoot.BuildCount > secondBuildBeforePresent
        && thirdRoot.BuildCount > thirdBuildBeforePresent,
      "S16 present hold blocked sibling UI service progress")
    S16QueueIsolationRequire(firstRoot.BuildCount == firstBuildBeforePresent,
      "S16 present hold rebuilt the target without a released packet")
    S16QueueIsolationRequire(
      S16QueueIsolationSerialCount(WindowReadbackTestFixture.FrameSubmissions(openedFirst))
      == S16QueueIsolationSerialCount(firstHeldPresent),
      "S16 present hold produced a duplicate target packet")
    presentHoldVerified = true
    WindowReadbackTestFixture.S16ReleaseHeldQueueCall()
    S16QueueIsolationDrain(openedFirst, openedSecond, openedThird, 2000)
    S16QueueIsolationRequire(
      S16QueueIsolationSerialCount(WindowReadbackTestFixture.FrameSubmissions(openedFirst))
      > S16QueueIsolationSerialCount(firstBeforePresent),
      "S16 present hold did not converge after release")
    convergenceVerified = true

    S16QueueIsolationPost(openedFirst, firstRoot)
    WindowReadbackTestFixture.ForceRender(openedFirst, 0.0)
    S16QueueIsolationDrain(openedFirst, openedSecond, openedThird, 2000)
    let firstBeforeRetry = WindowReadbackTestFixture.FrameSubmissions(openedFirst)
    let deferredBefore = WindowReadbackTestFixture.S16DeferredQueueEnqueueCount()
    WindowReadbackTestFixture.S16DeferNextQueueEnqueue(openedFirst)
    WindowReadbackTestFixture.SetForceFullRedraw(openedFirst, true)
    WindowReadbackTestFixture.ForceRenderNonblocking(openedFirst, 0.0)
    let deferredTarget = deferredBefore + 1L
    let deferredDeadline = Stopwatch.GetTimestamp()
    +int64(float64(Stopwatch.Frequency) * 2.0)
    while Stopwatch.GetTimestamp() < deferredDeadline {
      let deferredCurrent = WindowReadbackTestFixture.S16DeferredQueueEnqueueCount()
      if deferredCurrent >= deferredTarget {
        break
      }
      S16QueueIsolationPump(openedFirst, openedSecond, openedThird, 0.0)
      Thread.Yield()
    }
    let deferredAfter = WindowReadbackTestFixture.S16DeferredQueueEnqueueCount()
    S16QueueIsolationRequire(deferredAfter == deferredBefore + 1L,
      "S16 deferred queue enqueue was not consumed by the initial attempt")
    let retryDeadline = Stopwatch.GetTimestamp()
    +int64(float64(Stopwatch.Frequency) * 2.0)
    while Stopwatch.GetTimestamp() < retryDeadline {
      S16QueueIsolationPump(openedFirst, openedSecond, openedThird, 0.0)
      if !WindowReadbackTestFixture.S16QueueWorkPending(openedFirst)
        && S16QueueIsolationSerialCount(WindowReadbackTestFixture.FrameSubmissions(openedFirst))
      > S16QueueIsolationSerialCount(firstBeforeRetry) {
        retryVerified = true
        break
      }
      Thread.Yield()
    }
    S16QueueIsolationRequire(retryVerified,
      "S16 deferred queue enqueue did not retry and converge")
    S16QueueIsolationDrain(openedFirst, openedSecond, openedThird, 2000)
  } finally {
    WindowReadbackTestFixture.S16ReleaseHeldQueueCall()
    if let activeFirst = first {
      if let activeSecond = second {
        if let activeThird = third {
          try {
            S16QueueIsolationDrain(activeFirst, activeSecond, activeThird, 2000)
            drainedBeforeClose = true
          } catch (error Exception) {
          }
        }
      }
    }
    if let active = first { S16QueueIsolationClose(active) }
    if let active = second { S16QueueIsolationClose(active) }
    if let active = third { S16QueueIsolationClose(active) }
    let closeDeadline = Stopwatch.GetTimestamp()
    +int64(float64(Stopwatch.Frequency) * 2.0)
    while Stopwatch.GetTimestamp() < closeDeadline {
      if let active = first {
        if active.IsOpen { WindowReadbackTestFixture.Pump(active, 0.0) }
      }
      if let active = second {
        if active.IsOpen { WindowReadbackTestFixture.Pump(active, 0.0) }
      }
      if let active = third {
        if active.IsOpen { WindowReadbackTestFixture.Pump(active, 0.0) }
      }
      let firstClosed = if let active = first { !active.IsOpen } else { true }
      let secondClosed = if let active = second { !active.IsOpen } else { true }
      let thirdClosed = if let active = third { !active.IsOpen } else { true }
      if firstClosed && secondClosed && thirdClosed {
        closed = true
        break
      }
      Thread.Yield()
    }
    if let activeFirst = first {
      if let activeSecond = second {
        if let activeThird = third {
          drainedBeforeClose = !WindowReadbackTestFixture.S16QueueWorkPending(activeFirst)
            && !WindowReadbackTestFixture.S16QueueWorkPending(activeSecond)
            && !WindowReadbackTestFixture.S16QueueWorkPending(activeThird)
        }
      }
    }
    Console.SetError(originalError)
  }
  let diagnostics = capturedError.ToString()
  S14ValidateCommonDiagnostics(diagnostics)
  S16QueueIsolationRequire(drainedBeforeClose && closed,
    "S16 queue isolation did not drain queue work and close all windows")
  S16QueueIsolationRequire(submitHoldVerified && presentHoldVerified
      && siblingServiceVerified && retryVerified && convergenceVerified,
    "S16 queue isolation gate did not complete all phases")
  let submitCount = S14Counter(diagnostics, "submitCount")
  let presentCount = S14Counter(diagnostics, "presentCount")
  let resultCount = S14Counter(diagnostics, "resultCount")
  Console.WriteLine("s16-queue-isolation-gate: submit_hold=1 present_hold=1"
    +" sibling_service=1 retry=1 convergence=1 close=1"
    +" submitCount=" + submitCount.ToString()
    +" presentCount=" + presentCount.ToString()
    +" resultCount=" + resultCount.ToString())
}
