package Goo

import System
import System.Diagnostics
import System.Threading

internal data struct VulkanImageUploadPredicateTestSnapshot {
  internal var Generation uint64
  internal var Capacity int32
  internal var RecordedUnsubmittedCount int32
  internal var Actual bool
  internal var Oracle bool
  internal var DeviceLost bool
}

internal data struct VulkanImageUploadPredicateMeasurement {
  internal var Iterations int32
  internal var WarmupIterations int32
  internal var ElapsedTicks int64
  internal var StopwatchFrequency int64
  internal var AllocatedBytes int64
  internal var TrueCount int32
  internal var Capacity int32
}

internal unsafe partial class VulkanImageResources {
  internal func ImageUploadPredicateTestSnapshot() VulkanImageUploadPredicateTestSnapshot {
    var recordedUnsubmittedCount int32 = 0
    var index int32 = 0
    while index < entries.Length {
      let entry = entries[index]
      if entry.State == VulkanImageResourceState.UploadPending
          && entry.Upload.Succeeded && entry.UploadRecorded
          && !entry.UploadSubmitted {
        recordedUnsubmittedCount = recordedUnsubmittedCount + 1
      }
      index = index + 1
    }
    return VulkanImageUploadPredicateTestSnapshot{
      Generation: generation,
      Capacity: entries.Length,
      RecordedUnsubmittedCount: recordedUnsubmittedCount,
      Actual: HasUnsubmittedRecordedUpload,
      Oracle: recordedUnsubmittedCount != 0,
      DeviceLost: false,
    }
  }

  internal func MeasureImageUploadPredicateForTest(iterations int32, warmupIterations int32)
      VulkanImageUploadPredicateMeasurement {
    if iterations <= 0 {
      throw ArgumentOutOfRangeException("iterations")
    }
    if warmupIterations < 0 {
      throw ArgumentOutOfRangeException("warmupIterations")
    }
    var warmup int32 = 0
    var sink int32 = 0
    while warmup < warmupIterations {
      if HasUnsubmittedRecordedUpload {
        sink = sink + 1
      }
      warmup = warmup + 1
    }
    let allocatedBefore = GC.GetAllocatedBytesForCurrentThread()
    let started = Stopwatch.GetTimestamp()
    var index int32 = 0
    var trueCount int32 = 0
    while index < iterations {
      if HasUnsubmittedRecordedUpload {
        trueCount = trueCount + 1
      }
      index = index + 1
    }
    let elapsedTicks = Stopwatch.GetTimestamp() - started
    let allocatedBytes = GC.GetAllocatedBytesForCurrentThread() - allocatedBefore
    GC.KeepAlive(sink)
    return VulkanImageUploadPredicateMeasurement{
      Iterations: iterations,
      WarmupIterations: warmupIterations,
      ElapsedTicks: elapsedTicks,
      StopwatchFrequency: Stopwatch.Frequency,
      AllocatedBytes: allocatedBytes,
      TrueCount: trueCount,
      Capacity: entries.Length,
    }
  }
}

internal partial class VulkanWindowTarget {
  internal func ImageUploadPredicateTestSnapshot() VulkanImageUploadPredicateTestSnapshot {
    guard let current = runtime else {
      return VulkanImageUploadPredicateTestSnapshot{}
    }
    var snapshot = current.ImageResources.ImageUploadPredicateTestSnapshot()
    snapshot.DeviceLost = current.DeviceLost
    return snapshot
  }

  internal func MeasureImageUploadPredicateForTest(iterations int32, warmupIterations int32)
      VulkanImageUploadPredicateMeasurement {
    guard let current = runtime else {
      throw InvalidOperationException("Vulkan shared runtime is unavailable")
    }
    return current.ImageResources.MeasureImageUploadPredicateForTest(iterations, warmupIterations)
  }

  internal func ImageUploadSetForceFullRedrawForTest(value bool) {
    forceFullRedraw = value
  }
}

public partial class Window {
  internal func ImageUploadPredicateTestSnapshot() VulkanImageUploadPredicateTestSnapshot {
    guard let target = windowTarget else {
      return VulkanImageUploadPredicateTestSnapshot{}
    }
    return target.ImageUploadPredicateTestSnapshot()
  }

  internal func MeasureImageUploadPredicateForTest(iterations int32, warmupIterations int32)
      VulkanImageUploadPredicateMeasurement {
    guard let target = windowTarget else {
      throw InvalidOperationException("Vulkan window target is unavailable")
    }
    return target.MeasureImageUploadPredicateForTest(iterations, warmupIterations)
  }

  internal func ImageUploadForceRenderNonblockingForTest(dt float64) {
    requestRender()
    PumpScheduled(dt)
  }

  internal func ImageUploadPumpForTest(dt float64) {
    PumpScheduled(dt)
  }

  internal func ImageUploadPollQueueForTest() bool {
    let completed = windowTarget?.PollQueueCompletion() == true
    if completed {
      markFrameRendered()
      host?.FramePacing.MarkFrame(float64(Stopwatch.GetTimestamp()))
    }
    return completed
  }

  internal func ImageUploadQueuePendingForTest() bool {
    return windowTarget?.QueueWorkPending ?? false
  }

  internal func ImageUploadHoldNextSubmitForTest() {
    windowTarget?.HoldNextQueueSubmitForTest()
  }

  internal func ImageUploadSetForceFullRedrawForTest(value bool) {
    windowTarget?.ImageUploadSetForceFullRedrawForTest(value)
  }
}

internal class ImageUploadStatePerfFixture {
  shared {
    internal func Snapshot(window Window) VulkanImageUploadPredicateTestSnapshot {
      return window.ImageUploadPredicateTestSnapshot()
    }

    internal func Measure(window Window, iterations int32, warmupIterations int32)
        VulkanImageUploadPredicateMeasurement {
      return window.MeasureImageUploadPredicateForTest(iterations, warmupIterations)
    }

    internal func ForceRenderNonblocking(window Window, dt float64) {
      window.ImageUploadForceRenderNonblockingForTest(dt)
    }

    internal func Pump(window Window, dt float64) {
      window.ImageUploadPumpForTest(dt)
    }

    internal func PollQueue(window Window) bool {
      return window.ImageUploadPollQueueForTest()
    }

    internal func QueuePending(window Window) bool {
      return window.ImageUploadQueuePendingForTest()
    }

    internal func DrainQueue(window Window, timeoutMs int32) {
      let timeoutTicks = int64(float64(Stopwatch.Frequency) * float64(timeoutMs) / 1000.0)
      let started = Stopwatch.GetTimestamp()
      while window.ImageUploadQueuePendingForTest() {
        window.ImageUploadPollQueueForTest()
        if Stopwatch.GetTimestamp() - started >= timeoutTicks {
          throw InvalidOperationException("Vulkan image upload queue did not drain")
        }
        Thread.Yield()
      }
    }

    internal func HoldNextSubmit(window Window) {
      window.ImageUploadHoldNextSubmitForTest()
    }

    internal func WaitForHeldSubmit(timeoutMs int32) bool {
      return VulkanSharedRuntime.WaitForHeldQueueCallForTest(timeoutMs)
    }

    internal func ReleaseHeldSubmit() {
      VulkanSharedRuntime.ReleaseHeldQueueCallForTest()
    }

    internal func DeferNextEnqueue() {
      VulkanSharedRuntime.DeferNextQueueEnqueueForTest()
    }

    internal func EnqueueDeferralCount() int64 {
      return VulkanSharedRuntime.QueueEnqueueDeferralCountForTest
    }

    internal func FailNextSubmit() {
      VulkanSharedRuntime.FailNextGraphicsSubmissionForTest()
    }

    internal func SetForceFullRedraw(window Window, value bool) {
      window.ImageUploadSetForceFullRedrawForTest(value)
    }
  }
}
