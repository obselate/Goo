package GooAsyncReadbackSmoke

import System
import System.Diagnostics
import System.IO
import System.Numerics
import Goo

class S20ShaderEffectCell : Cell {
  private let effect ShaderEffect

  shared {
    let Target ElementHandle = ElementHandle{}
  }

  internal var ClickCount int32

  init(value ShaderEffect) {
    effect = value
  }

  override func Build() Blob {
    return Container{
      Width: Length.Percent(100),
      Height: Length.Percent(100),
      Position: PositionType.Relative,
      BackgroundColor: Color.Rgb(12, 20, 32),
      Children: {
        Container{
          Position: PositionType.Absolute,
          Left: 16,
          Top: 24,
          Width: 16,
          Height: 80,
          BackgroundColor: Color.Rgb(238, 188, 34),
        },
        Container{
          Position: PositionType.Absolute,
          Left: 32,
          Top: 24,
          Width: 128,
          Height: 80,
          BackgroundColor: Color.Rgb(28, 118, 224),
        },
        Button{
          Handle: S20ShaderEffectCell.Target,
          Position: PositionType.Absolute,
          Left: 32,
          Top: 24,
          Width: 128,
          Height: 80,
          BorderRadius: 22,
          BackgroundColor: Color.Rgb(232, 72, 48),
          ShaderEffect: effect,
          OnClick: func() { ClickCount++ },
        },
      },
    }
  }
}

func S20Delta(after uint64, before uint64) uint64 {
  return after >= before ? after - before : uint64.MaxValue
}

func S20Sum(values []int64) int64 {
  var total int64
  var index int32
  while index < values.Length {
    total = total + values[index]
    index++
  }
  return total
}

func RunS20ShaderEffectGate() {
  WindowReadbackTestFixture.S20VerifyPresentationRetirement()
  S14Require(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  let shaderPath = Path.Combine(AppContext.BaseDirectory, "control_effect.frag.spv")
  S14Require(File.Exists(shaderPath), "S20 shader effect asset is missing")
  let shaderBytes = File.ReadAllBytes(shaderPath)
  let effect = ShaderEffect(shaderBytes, true, 20.0F)
  S14Require(effect.SetParameter(0, Vector4(1.0F, 0.25F, 0.25F, 0.0F)),
    "S20 shader effect rejected its initial parameter")
  S14Require(!effect.SetParameter(0, Vector4(1.0F, 0.25F, 0.25F, 0.0F)),
    "S20 shader effect reported an unchanged parameter as changed")
  let cell = S20ShaderEffectCell(effect)
  let capturedError = StringWriter()
  let originalError = Console.Error
  var window Window? = nil
  var parameterAllocated int64
  var warmObjectAllocations uint64
  var warmDeviceMemoryAllocations uint64
  var deviceRecoveries uint64
  var displayScaleX float64
  try {
    let opened = Window{
      Title: "Goo S20 shader effect gate",
      Width: 192,
      Height: 128,
      VSync: false,
      Root: cell,
    }
    window = opened
    Console.SetError(capturedError)
    opened.Open()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
    let metrics = WindowReadbackTestFixture.Metrics(opened)
    S14Require(metrics.LogicalWidth == 192 && metrics.LogicalHeight == 128,
      "S20 shader effect window metrics are incorrect")
    S14Require(S20ShaderEffectCell.Target.IsMounted,
      "S20 shader effect button did not mount")
    let initialBounds = S20ShaderEffectCell.Target.BorderBox
    let targetX = initialBounds.X + initialBounds.Width * 0.5
    let targetY = initialBounds.Y + initialBounds.Height * 0.5
    let first = S09RReadback(opened, metrics)
    let firstCenter = S09RLogicalPixel(first.Pixels, first.Width, metrics, targetX, targetY)
    S14Require(int32(firstCenter[0]) > int32(firstCenter[1]) + 80
        && int32(firstCenter[0]) > int32(firstCenter[2]) + 80,
      "S20 shader effect did not tint the control source: " + S09RPixelText(firstCenter))
    let clippedCorner = S09RLogicalPixel(first.Pixels, first.Width, metrics,
      initialBounds.X + 1.0, initialBounds.Y + 1.0)
    S14Require(int32(clippedCorner[2]) > int32(clippedCorner[0]) + 100
        && int32(clippedCorner[2]) > int32(clippedCorner[1]) + 60,
      "S20 shader effect escaped the rounded control source: "
        + S09RPixelText(clippedCorner))

    WindowReadbackTestFixture.S17QueuePointerMove(opened, targetX, targetY)
    WindowReadbackTestFixture.S17QueuePointerPress(opened, targetX, targetY)
    WindowReadbackTestFixture.S17QueuePointerRelease(opened, targetX, targetY)
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    S14Require(cell.ClickCount == 1,
      "S20 shader effect changed the button hit target")

    var slot int32
    effect.SetParameter(0, Vector4(1.0F, 0.25F, 0.25F, 0.0F))
    let beforeBytes = GC.GetAllocatedBytesForCurrentThread()
    while slot < 2048 {
      let red = if (slot & 1) == 0 { 0.75F } else { 1.0F }
      effect.SetParameter(0, Vector4(red, 0.25F, 0.25F, 0.0F))
      slot++
    }
    parameterAllocated = GC.GetAllocatedBytesForCurrentThread() - beforeBytes
    S14Require(parameterAllocated == 0L,
      "S20 warm parameter mutation allocated managed memory")
    effect.SetParameter(0, Vector4(0.25F, 1.0F, 0.25F, 1.0F))
    let countersBefore = WindowReadbackTestFixture.DiagnosticCounters(opened)
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
    let second = S09RReadback(opened, metrics)
    let countersAfter = WindowReadbackTestFixture.DiagnosticCounters(opened)
    warmObjectAllocations = S20Delta(countersAfter.vulkanObjectAllocationCount,
      countersBefore.vulkanObjectAllocationCount)
    warmDeviceMemoryAllocations = S20Delta(countersAfter.vulkanDeviceMemoryAllocationCount,
      countersBefore.vulkanDeviceMemoryAllocationCount)
    S14Require(warmObjectAllocations == 0uL && warmDeviceMemoryAllocations == 0uL,
      "S20 warm parameter frame created Vulkan resources")
    let secondCenter = S09RLogicalPixel(second.Pixels, second.Width, metrics, targetX, targetY)
    S14Require(int32(secondCenter[2]) > int32(secondCenter[0]) + 100
        && int32(secondCenter[2]) > int32(secondCenter[1]) + 60,
      "S20 shader effect did not sample the retained backdrop: "
        + S09RPixelText(secondCenter))
    S14Require(Math.Abs(int32(firstCenter[0]) - int32(secondCenter[0])) > 60,
      "S20 shader parameter mutation did not change the rendered control")
    effect.SetParameter(1, Vector4(-16.0F, 0.0F, 0.0F, 0.0F))
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
    let outset = S09RReadback(opened, metrics)
    let outsetSample = S09RLogicalPixel(outset.Pixels, outset.Width, metrics,
      initialBounds.X + 8.0, targetY)
    S14Require(int32(outsetSample[0]) > int32(outsetSample[2]) + 100
        && int32(outsetSample[1]) > int32(outsetSample[2]) + 70,
      "S20 shader effect backdrop outset did not expose neighboring pixels: "
        + S09RPixelText(outsetSample))
    effect.SetParameter(1, Vector4.Zero)
    let finalBounds = S20ShaderEffectCell.Target.BorderBox
    S14Require(finalBounds.X == initialBounds.X && finalBounds.Y == initialBounds.Y
        && finalBounds.Width == initialBounds.Width
        && finalBounds.Height == initialBounds.Height,
      "S20 shader effect changed control layout")

    opened.Width = 176
    opened.Height = 120
    var resizeAttempt int32
    var resizedMetrics = WindowReadbackTestFixture.Metrics(opened)
    while (resizedMetrics.LogicalWidth != 176 || resizedMetrics.LogicalHeight != 120)
        && resizeAttempt < 1000 {
      WindowReadbackTestFixture.PumpNativeEvents()
      WindowReadbackTestFixture.Pump(opened, 0.0)
      resizedMetrics = WindowReadbackTestFixture.Metrics(opened)
      resizeAttempt++
    }
    S14Require(resizedMetrics.LogicalWidth == 176 && resizedMetrics.LogicalHeight == 120,
      "S20 shader effect window did not resize")
    displayScaleX = resizedMetrics.DisplayScaleX
    S14Require(displayScaleX > 0.0 && resizedMetrics.DisplayScaleY > 0.0,
      "S20 shader effect display scale is invalid")
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
    let resized = S09RReadback(opened, resizedMetrics)
    let resizedCenter = S09RLogicalPixel(resized.Pixels, resized.Width,
      resizedMetrics, targetX, targetY)
    S14Require(int32(resizedCenter[2]) > int32(resizedCenter[0]) + 100
        && int32(resizedCenter[2]) > int32(resizedCenter[1]) + 60,
      "S20 shader effect output did not survive resize and display scaling: "
        + S09RPixelText(resizedCenter))

    let recoveryBefore = WindowReadbackTestFixture.DiagnosticCounters(opened).deviceRecoveryCount
    VulkanSharedRuntime.FailNextGraphicsSubmissionForTest()
    effect.SetParameter(0, Vector4(1.0F, 0.25F, 0.25F, 0.0F))
    WindowReadbackTestFixture.ForceRender(opened, 0.0166666666666667)
    deviceRecoveries = S20Delta(
      WindowReadbackTestFixture.DiagnosticCounters(opened).deviceRecoveryCount,
      recoveryBefore)
    S14Require(deviceRecoveries == 1uL,
      "S20 shader effect pipeline did not survive device recovery")
    let recovered = S09RReadback(opened, resizedMetrics)
    let recoveredCenter = S09RLogicalPixel(recovered.Pixels, recovered.Width,
      resizedMetrics, targetX, targetY)
    S14Require(int32(recoveredCenter[0]) > int32(recoveredCenter[1]) + 80
        && int32(recoveredCenter[0]) > int32(recoveredCenter[2]) + 80,
      "S20 shader effect output was not restored after device recovery: "
        + S09RPixelText(recoveredCenter))
    opened.RequestClose()
    WindowReadbackTestFixture.ForceRender(opened, 0.0)
    S14Require(!opened.IsOpen, "S20 shader effect gate window did not close")
    S14Require(WindowReadbackTestFixture.ResidentResourceBytes(opened) == 0uL,
      "S20 shader effect resources remain resident after close")
  } finally {
    Console.SetError(originalError)
    if let active = window {
      if active.IsOpen {
        active.RequestClose()
        WindowReadbackTestFixture.ForceRender(active, 0.0)
      }
    }
  }
  let diagnostics = capturedError.ToString()
  S14ValidateCommonDiagnostics(diagnostics, 1uL)
  S14Require(!diagnostics.Contains("\"event\":325")
      && !diagnostics.Contains("\"event\":326"),
    "S20 shader effect gate emitted unsupported-scene diagnostics")
  let layerPassCount = S14Counter(diagnostics, "layerPoolPassCount")
  let layerCompositeCount = S14Counter(diagnostics, "layerPoolCompositeCount")
  let layerCreateCount = S14Counter(diagnostics, "layerPoolCreateCount")
  let layerFailureCount = S14Counter(diagnostics, "layerPoolFailureCount")
  let layerPressureFailureCount = S14Counter(diagnostics, "layerPoolPressureFailureCount")
  let layerResidentBytes = S14Counter(diagnostics, "layerPoolResidentBytes")
  let layerTargetCount = S14Counter(diagnostics, "layerPoolTargetCount")
  let layerLeasedCount = S14Counter(diagnostics, "layerPoolLeasedCount")
  S14Require(layerPassCount > 0uL && layerCompositeCount > 0uL
      && layerCreateCount >= 2uL,
    "S20 shader effect gate did not execute the retained layer path")
  S14Require(layerFailureCount == 0uL && layerPressureFailureCount == 0uL,
    "S20 shader effect gate recorded a layer pool failure")
  S14Require(layerResidentBytes == 0uL && layerTargetCount == 0uL
      && layerLeasedCount == 0uL,
    "S20 shader effect gate left layer resources resident after close")
  Console.WriteLine("s20-shader-effect-gate: control=button backdrop=1 clip=rounded input=click"
    + " resize=1 dpi=" + displayScaleX.ToString("0.###")
    + " device_recovery=" + deviceRecoveries.ToString()
    + " parameter_alloc_B=" + parameterAllocated.ToString()
    + " warm_vk_objects=" + warmObjectAllocations.ToString()
    + " warm_device_memory=" + warmDeviceMemoryAllocations.ToString()
    + " layerPassCount=" + layerPassCount.ToString()
    + " layerCompositeCount=" + layerCompositeCount.ToString()
    + " layerCreateCount=" + layerCreateCount.ToString() + " close=1")
}

func RunS20ShaderEffectBenchmark() {
  S14Require(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  let warmup = S14EnvCount("GOO_S20_SHADER_EFFECT_WARMUP", 60, 300)
  let samples = S14EnvCount("GOO_S20_SHADER_EFFECT_SAMPLES", 240, 2000)
  S14Require(samples > 0, "GOO_S20_SHADER_EFFECT_SAMPLES must be positive")
  let shaderPath = Path.Combine(AppContext.BaseDirectory, "control_effect.frag.spv")
  S14Require(File.Exists(shaderPath), "S20 shader effect asset is missing")
  let effect = ShaderEffect(File.ReadAllBytes(shaderPath), true)
  effect.SetParameter(0, Vector4(1.0F, 0.25F, 0.25F, 0.0F))
  let frameNs = [samples]int64
  let frameAllocations = [samples]int64
  let window = Window{
    Title: "Goo S20 shader effect benchmark",
    Width: 192,
    Height: 128,
    VSync: false,
    Root: S20ShaderEffectCell(effect),
  }
  var before VulkanDiagnosticCounterSnapshot
  var after VulkanDiagnosticCounterSnapshot
  try {
    window.Open()
    WindowReadbackTestFixture.ForceRender(window, 0.0)
    var warmIndex int32
    while warmIndex < warmup {
      let red = if (warmIndex & 1) == 0 { 0.75F } else { 1.0F }
      effect.SetParameter(0, Vector4(red, 0.25F, 0.25F, 0.0F))
      WindowReadbackTestFixture.ForceRender(window, 0.0166666666666667)
      warmIndex++
    }
    before = WindowReadbackTestFixture.DiagnosticCounters(window)
    var sampleIndex int32
    while sampleIndex < samples {
      let red = if (sampleIndex & 1) == 0 { 0.75F } else { 1.0F }
      let allocatedBefore = GC.GetAllocatedBytesForCurrentThread()
      let start = Stopwatch.GetTimestamp()
      effect.SetParameter(0, Vector4(red, 0.25F, 0.25F, 0.0F))
      WindowReadbackTestFixture.ForceRender(window, 0.0166666666666667)
      let end = Stopwatch.GetTimestamp()
      let allocatedAfter = GC.GetAllocatedBytesForCurrentThread()
      frameNs[sampleIndex] = S14TicksToNs(end - start)
      frameAllocations[sampleIndex] = allocatedAfter - allocatedBefore
      sampleIndex++
    }
    after = WindowReadbackTestFixture.DiagnosticCounters(window)
    window.RequestClose()
    WindowReadbackTestFixture.ForceRender(window, 0.0)
    S14Require(!window.IsOpen, "S20 shader effect benchmark window did not close")
  } finally {
    if window.IsOpen {
      window.RequestClose()
      WindowReadbackTestFixture.ForceRender(window, 0.0)
    }
  }
  let allocationTotal = S20Sum(frameAllocations)
  let allocationP95 = S14Percentile(frameAllocations, 0.95)
  let allocationMax = S14Max(frameAllocations)
  let objectAllocations = S20Delta(after.vulkanObjectAllocationCount,
    before.vulkanObjectAllocationCount)
  let deviceMemoryAllocations = S20Delta(after.vulkanDeviceMemoryAllocationCount,
    before.vulkanDeviceMemoryAllocationCount)
  S14Require(allocationTotal == 0L && allocationP95 == 0L && allocationMax == 0L,
    "S20 warm shader effect frames allocated managed memory")
  S14Require(objectAllocations == 0uL && deviceMemoryAllocations == 0uL,
    "S20 warm shader effect frames created Vulkan resources")
  S14Require(S20Delta(after.planCompileCount, before.planCompileCount) == uint64(samples)
      && S20Delta(after.recordCount, before.recordCount) == uint64(samples),
    "S20 shader effect benchmark did not compile and record every changed frame")
  Console.WriteLine("s20-shader-effect-benchmark: warmup=" + warmup.ToString()
    + " samples=" + samples.ToString()
    + " frame_p50_ns=" + S14Percentile(frameNs, 0.50).ToString()
    + " frame_p95_ns=" + S14Percentile(frameNs, 0.95).ToString()
    + " frame_p99_ns=" + S14Percentile(frameNs, 0.99).ToString()
    + " frame_p999_ns=" + S14Percentile(frameNs, 0.999).ToString()
    + " frame_worst_ns=" + S14Max(frameNs).ToString()
    + " alloc_total_B=" + allocationTotal.ToString()
    + " alloc_p95_B=" + allocationP95.ToString()
    + " alloc_worst_B=" + allocationMax.ToString()
    + " vk_objects=" + objectAllocations.ToString()
    + " device_memory=" + deviceMemoryAllocations.ToString()
    + " plan=" + S20Delta(after.planCompileCount, before.planCompileCount).ToString()
    + " record=" + S20Delta(after.recordCount, before.recordCount).ToString()
    + " draws=" + S20Delta(after.drawCount, before.drawCount).ToString()
    + " layer_passes=" + S20Delta(after.layerPoolPassCount, before.layerPoolPassCount).ToString()
    + " layer_composites="
      + S20Delta(after.layerPoolCompositeCount, before.layerPoolCompositeCount).ToString()
    + " close=1")
}
