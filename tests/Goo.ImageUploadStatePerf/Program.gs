package GooImageUploadStatePerf

import System
import System.Diagnostics
import System.Threading
import Goo

class ImageUploadStatePerfCell : Cell {
  private var source ImageSourceProvider

  init(initialSource ImageSourceProvider) {
    source = initialSource
  }

  internal func SetSource(next ImageSourceProvider) {
    source = next
    Rebuild()
  }

  override func Build() Blob -> Container {
    Width: Length.Percent(100),
    Height: Length.Percent(100),
    BackgroundColor: Color.Rgb(12, 20, 32),
    Children: {
      Image{
        Position: PositionType.Absolute,
        Left: 8,
        Top: 8,
        Width: 64,
        Height: 64,
        Source: source,
        Fit: ImageFit.Fill,
      },
    },
  }
}

func Require(condition bool, message string) {
  if !condition {
    throw InvalidOperationException(message)
  }
}

func CreateSource(seed uint8) ImageSource -> ImageSource(2, 2, []uint8 {
  seed, 32, 64, 255,
  64, seed, 96, 255,
  96, 64, seed, 255,
  seed, seed, seed, 255,
})

func RequireEquivalent(snapshot VulkanImageUploadPredicateTestSnapshot, phase string) {
  Require(snapshot.Actual == snapshot.Oracle,
    phase + " predicate differs from the independent scan oracle")
}

func WaitForHeldSubmit(window Window, timeoutMs int32) {
  let deadline = Stopwatch.GetTimestamp()
  +int64(float64(Stopwatch.Frequency) * float64(timeoutMs) / 1000.0)
  while Stopwatch.GetTimestamp() < deadline {
    if ImageUploadStatePerfFixture.WaitForHeldSubmit(10) {
      return
    }
    ImageUploadStatePerfFixture.Pump(window, 0.0)
    Thread.Yield()
  }
  throw InvalidOperationException("Vulkan image upload submit did not reach the queue worker")
}

func WaitForDeviceLoss(window Window, timeoutMs int32)
VulkanImageUploadPredicateTestSnapshot{
  let deadline = Stopwatch.GetTimestamp()
  +int64(float64(Stopwatch.Frequency) * float64(timeoutMs) / 1000.0)
  var snapshot = ImageUploadStatePerfFixture.Snapshot(window)
  while Stopwatch.GetTimestamp() < deadline {
    ImageUploadStatePerfFixture.PollQueue(window)
    snapshot = ImageUploadStatePerfFixture.Snapshot(window)
    if snapshot.DeviceLost {
      return snapshot
    }
    Thread.Yield()
  }
  throw InvalidOperationException("Vulkan image upload device loss did not settle")
}

func ForceRenderAndDrain(window Window, timeoutMs int32) {
  ImageUploadStatePerfFixture.ForceRenderNonblocking(window, 0.0)
  let deadline = Stopwatch.GetTimestamp()
  +int64(float64(Stopwatch.Frequency) * float64(timeoutMs) / 1000.0)
  while Stopwatch.GetTimestamp() < deadline {
    ImageUploadStatePerfFixture.PollQueue(window)
    if !ImageUploadStatePerfFixture.QueuePending(window) {
      return
    }
    Thread.Yield()
  }
  throw InvalidOperationException("Vulkan image upload frame did not drain")
}

func Main() {
  let iterationsText = Environment.GetEnvironmentVariable("GOO_IMAGE_UPLOAD_PREDICATE_ITERATIONS")
  let iterations = if iterationsText == nil || iterationsText!! == "" {
    1000000
  } else {
    Int32.Parse(iterationsText!!)
  }
  let warmupIterations = Math.Max(10000, iterations / 10)
  let sourceA = CreateSource(uint8(32))
  let sourceB = CreateSource(uint8(96))
  let sourceC = CreateSource(uint8(160))
  let root = ImageUploadStatePerfCell(sourceA)
  var window Window? = nil
  var closed = false
  try {
    let opened = Window{
      Title: "Goo image upload predicate performance",
      Width: 96,
      Height: 96,
      VSync: false,
      Root: root,
    }
    window = opened
    opened.Open()

    let initial = ImageUploadStatePerfFixture.Snapshot(opened)
    RequireEquivalent(initial, "initial")
    Require(!initial.Actual, "initial image upload predicate is true")

    ImageUploadStatePerfFixture.HoldNextSubmit(opened)
    ImageUploadStatePerfFixture.ForceRenderNonblocking(opened, 0.0)
    WaitForHeldSubmit(opened, 2000)
    let recorded = ImageUploadStatePerfFixture.Snapshot(opened)
    RequireEquivalent(recorded, "recorded")
    Require(recorded.Actual && recorded.RecordedUnsubmittedCount > 0,
      "recorded image upload predicate is false")
    ImageUploadStatePerfFixture.ReleaseHeldSubmit()
    ImageUploadStatePerfFixture.DrainQueue(opened, 2000)

    let submitted = ImageUploadStatePerfFixture.Snapshot(opened)
    RequireEquivalent(submitted, "submitted")
    Require(!submitted.Actual, "submitted image upload predicate is true")

    let beforeDeferral = ImageUploadStatePerfFixture.EnqueueDeferralCount()
    root.SetSource(sourceB)
    ImageUploadStatePerfFixture.DeferNextEnqueue()
    ImageUploadStatePerfFixture.SetForceFullRedraw(opened, true)
    ImageUploadStatePerfFixture.ForceRenderNonblocking(opened, 0.0)
    let aborted = ImageUploadStatePerfFixture.Snapshot(opened)
    RequireEquivalent(aborted, "aborted")
    Require(!aborted.Actual, "aborted image upload predicate is true")
    Require(ImageUploadStatePerfFixture.EnqueueDeferralCount() == beforeDeferral + 1L,
      "image upload abort did not consume the queue deferral")

    ForceRenderAndDrain(opened, 2000)
    let steady = ImageUploadStatePerfFixture.Snapshot(opened)
    RequireEquivalent(steady, "steady")
    Require(!steady.Actual, "steady image upload predicate is true")
    let measurement = ImageUploadStatePerfFixture.Measure(
      opened, iterations, warmupIterations)
    Require(measurement.TrueCount == 0,
      "steady image upload predicate measurement observed true")
    Require(measurement.AllocatedBytes == 0L,
      "steady image upload predicate measurement allocated managed memory")

    root.SetSource(sourceC)
    ImageUploadStatePerfFixture.FailNextSubmit()
    ImageUploadStatePerfFixture.SetForceFullRedraw(opened, true)
    ImageUploadStatePerfFixture.ForceRenderNonblocking(opened, 0.0)
    let lost = WaitForDeviceLoss(opened, 2000)
    RequireEquivalent(lost, "device-lost")
    Require(lost.Actual && lost.RecordedUnsubmittedCount > 0,
      "device loss did not retain the recorded upload on the abandoned runtime")

    ForceRenderAndDrain(opened, 2000)
    let recovered = ImageUploadStatePerfFixture.Snapshot(opened)
    RequireEquivalent(recovered, "recovered")
    Require(!recovered.DeviceLost && !recovered.Actual,
      "recovered image upload predicate did not reset")
    Require(recovered.Generation > lost.Generation,
      "image upload recovery did not advance the runtime generation")

    opened.RequestClose()
    ForceRenderAndDrain(opened, 2000)
    closed = !opened.IsOpen
    Require(closed, "image upload predicate performance window did not close")

    let nanosecondsPerCheck = float64(measurement.ElapsedTicks) * 1000000000.0
    / float64(measurement.StopwatchFrequency) / float64(measurement.Iterations)
    Console.WriteLine("image-upload-predicate: iterations="
      +measurement.Iterations.ToString()
      +" warmup=" + measurement.WarmupIterations.ToString()
      +" capacity=" + measurement.Capacity.ToString()
      +" elapsed_ticks=" + measurement.ElapsedTicks.ToString()
      +" frequency=" + measurement.StopwatchFrequency.ToString()
      +" ns_per_check=" + nanosecondsPerCheck.ToString("F3")
      +" allocated_B=" + measurement.AllocatedBytes.ToString()
      +" record=1 submit=1 abort=1 recovery=1 oracle=1 close=1")
  } finally {
    ImageUploadStatePerfFixture.ReleaseHeldSubmit()
    if let active = window {
      if active.IsOpen {
        active.RequestClose()
        try { ForceRenderAndDrain(active, 2000) } catch (error Exception) { }
      }
    }
    sourceA.Dispose()
    sourceB.Dispose()
    sourceC.Dispose()
  }
}
