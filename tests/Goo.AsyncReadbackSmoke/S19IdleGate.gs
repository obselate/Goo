package GooAsyncReadbackSmoke

import System
import System.Diagnostics
import System.Threading
import Goo

func S19IdleDelta(after uint64, before uint64) uint64 -> after >= before ? after - before : uint64.MaxValue

func S19IdleDurationMs() int32 {
  let value = Environment.GetEnvironmentVariable("GOO_S19_IDLE_DURATION_MS")
  if value == nil || value!!.Length == 0 {
    return 60000
  }
  let parsed = Int32.Parse(value!!)
  S14Require(parsed >= 1000, "GOO_S19_IDLE_DURATION_MS must be at least 1000")
  return parsed
}

func S19IdleWarmupMs() int32 {
  let value = Environment.GetEnvironmentVariable("GOO_S19_IDLE_WARMUP_MS")
  if value == nil || value!!.Length == 0 {
    return 3000
  }
  let parsed = Int32.Parse(value!!)
  S14Require(parsed >= 1000, "GOO_S19_IDLE_WARMUP_MS must be at least 1000")
  return parsed
}

func RunS19IdleGate() {
  S14Require(Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
    "GOO_VK_DIAGNOSTICS=1 is required")
  let durationMs = S19IdleDurationMs()
  let warmupMs = S19IdleWarmupMs()
  let opened = Window{
    Title: "Goo S19 true idle gate",
    Width: 1280,
    Height: 720,
    VSync: false,
    Root: Cell{},
  }
  var beforeCaptured int32 = 0
  var afterCaptured int32 = 0
  var before VulkanDiagnosticCounterSnapshot
  var after VulkanDiagnosticCounterSnapshot
  var mainAllocatedBefore int64
  var mainAllocatedAfter int64
  var wallBefore int64
  var wallAfter int64
  var cpuBefore int64
  var cpuAfter int64
  let process = Process.GetCurrentProcess()
  let captureBefore = func() {
    before = WindowReadbackTestFixture.DiagnosticCounters(opened)
    mainAllocatedBefore = GC.GetAllocatedBytesForCurrentThread()
    cpuBefore = process.TotalProcessorTime.Ticks
    wallBefore = Stopwatch.GetTimestamp()
    Interlocked.Exchange(&beforeCaptured, 1)
  }
  let captureAfter = func() {
    after = WindowReadbackTestFixture.DiagnosticCounters(opened)
    mainAllocatedAfter = GC.GetAllocatedBytesForCurrentThread()
    wallAfter = Stopwatch.GetTimestamp()
    cpuAfter = process.TotalProcessorTime.Ticks
    Interlocked.Exchange(&afterCaptured, 1)
  }
  let closeWorker = Thread(func() {
    Thread.Sleep(warmupMs)
    opened.Post(captureBefore)
    let beforeDeadline = Stopwatch.GetTimestamp() + Stopwatch.Frequency * 5L
    while Interlocked.CompareExchange(&beforeCaptured, 0, 0) == 0
      && Stopwatch.GetTimestamp() < beforeDeadline{
        Thread.Sleep(1)
      }
    Thread.Sleep(durationMs)
    opened.Post(captureAfter)
    let deadline = Stopwatch.GetTimestamp() + Stopwatch.Frequency * 5L
    while Interlocked.CompareExchange(&afterCaptured, 0, 0) == 0
      && Stopwatch.GetTimestamp() < deadline{
        Thread.Sleep(1)
      }
    opened.RequestClose()
  })
  closeWorker.IsBackground = true
  try {
    opened.Open()
    closeWorker.Start()
    opened.Run()
    closeWorker.Join()
    S14Require(Interlocked.CompareExchange(&beforeCaptured, 0, 0) != 0,
      "S19 idle gate did not capture the post-warm state")
    S14Require(Interlocked.CompareExchange(&afterCaptured, 0, 0) != 0,
      "S19 idle gate did not capture the pre-close state")
    S14Require(!opened.IsOpen, "S19 idle gate window did not close")
  } finally {
    if opened.IsOpen {
      opened.RequestClose()
    }
    if closeWorker.IsAlive {
      closeWorker.Join()
    }
  }
  let elapsedSeconds = float64(wallAfter - wallBefore) / float64(Stopwatch.Frequency)
  let cpuSeconds = float64(cpuAfter - cpuBefore) / float64(TimeSpan.TicksPerSecond)
  let cpuPercentOneCore = cpuSeconds / elapsedSeconds * 100.0
  let managedThreadBytes = mainAllocatedAfter - mainAllocatedBefore
  Console.WriteLine("s19-idle-observed: duration_ms="
    +Math.Round(elapsedSeconds * 1000.0).ToString()
    +" cpu_one_core_percent=" + cpuPercentOneCore.ToString("F4")
    +" rebuild=" + S19IdleDelta(after.rebuildCount, before.rebuildCount).ToString()
    +" layout=" + S19IdleDelta(after.layoutCount, before.layoutCount).ToString()
    +" plan=" + S19IdleDelta(after.planCompileCount, before.planCompileCount).ToString()
    +" upload=" + S19IdleDelta(after.uploadCount, before.uploadCount).ToString()
    +" record=" + S19IdleDelta(after.recordCount, before.recordCount).ToString()
    +" submit=" + S19IdleDelta(after.submitCount, before.submitCount).ToString()
    +" present=" + S19IdleDelta(after.presentCount, before.presentCount).ToString()
    +" diagnostic_managed_B="
    +S19IdleDelta(after.managedAllocatedBytes, before.managedAllocatedBytes).ToString()
    +" main_managed_B=" + managedThreadBytes.ToString()
    +" objects=" + S19IdleDelta(after.vulkanObjectAllocationCount,
      before.vulkanObjectAllocationCount).ToString()
    +" device_memory=" + S19IdleDelta(after.vulkanDeviceMemoryAllocationCount,
      before.vulkanDeviceMemoryAllocationCount).ToString())
  S14Require(elapsedSeconds >= float64(durationMs) / 1000.0,
    "S19 idle observation ended early")
  S14Require(S19IdleDelta(after.rebuildCount, before.rebuildCount) == 0uL,
    "S19 idle rebuilt the tree")
  S14Require(S19IdleDelta(after.layoutCount, before.layoutCount) == 0uL,
    "S19 idle performed layout")
  S14Require(S19IdleDelta(after.planCompileCount, before.planCompileCount) == 0uL,
    "S19 idle compiled a render plan")
  S14Require(S19IdleDelta(after.uploadCount, before.uploadCount) == 0uL,
    "S19 idle uploaded resources")
  S14Require(S19IdleDelta(after.recordCount, before.recordCount) == 0uL,
    "S19 idle recorded commands")
  S14Require(S19IdleDelta(after.submitCount, before.submitCount) == 0uL,
    "S19 idle submitted GPU work")
  S14Require(S19IdleDelta(after.presentCount, before.presentCount) == 0uL,
    "S19 idle presented a frame")
  S14Require(S19IdleDelta(after.managedAllocatedBytes, before.managedAllocatedBytes) == 0uL,
    "S19 idle diagnostics recorded managed allocation")
  S14Require(S19IdleDelta(after.vulkanObjectAllocationCount,
    before.vulkanObjectAllocationCount) == 0uL,
    "S19 idle created a Vulkan object")
  S14Require(S19IdleDelta(after.vulkanDeviceMemoryAllocationCount,
    before.vulkanDeviceMemoryAllocationCount) == 0uL,
    "S19 idle allocated Vulkan device memory")
  S14Require(managedThreadBytes == 0L,
    "S19 idle allocated on the UI thread")
  S14Require(cpuPercentOneCore < 0.5,
    "S19 idle used at least 0.5 percent of one CPU core")
  Console.WriteLine("s19-idle: duration_ms="
    +Math.Round(elapsedSeconds * 1000.0).ToString()
    +" cpu_one_core_percent=" + cpuPercentOneCore.ToString("F4")
    +" rebuild=0 layout=0 plan=0 upload=0 record=0 submit=0 present=0"
    +" managed_B=0 objects=0 device_memory=0 close=1")
}
