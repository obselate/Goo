using System.Diagnostics;
using System.Reflection;
using Goo;
const int records = 1000;
var mode = args.Length > 0 ? args[0] : "unchanged";
if (mode is not ("unchanged" or "sparse" or "full" or "cold")) throw new ArgumentException(mode);
var window = new Window { Title = "Primitive prepare probe", Width = 1000, Height = 640, VSync = false, Background = Color.Transparent, Root = new Boxes() };
window.Open();
for (int i = 0; i < 6; i++) WindowReadbackTestFixture.ForceRender(window, 1.0 / 60.0);
var target = (VulkanWindowTarget)Field(window, "windowTarget");
var wait = target.GetType().GetMethod("WaitForGpu", BindingFlags.Instance | BindingFlags.NonPublic)!.CreateDelegate<Func<bool>>(target);
for (int i = 0; !wait(); i++) { if (i == 1000) throw new TimeoutException(); Thread.Sleep(1); }
var renderer = (VulkanPrimitiveRenderer)Field(target, "primitiveRenderer");
var data = (VulkanPrimitiveFrameData)Field(renderer, "primitiveFrameData");
var slots = (VulkanPrimitiveFrameSlot[])Field(data, "slots");
var source = new uint[records * 32];
Array.Copy(slots[0].HistoryWords, source, source.Length);
if (mode == "sparse") source[24] ^= 1;
if (mode == "full") for (int i = 0; i < records; i++) source[i * 32 + 24] ^= 1;
if (mode == "cold") slots[0].HistoryValid = false;
const int warmup = 3000;
const int samples = 10000;
var times = new long[samples];
var allocations = new long[samples];
VulkanPrimitiveFrameStats stats = default;
unsafe {
 fixed (uint* pointer = source) {
  for (int sample = -warmup; sample < samples; sample++) {
   long bytes = GC.GetAllocatedBytesForCurrentThread();
   long start = Stopwatch.GetTimestamp();
   data.BeginPrepare(0, records, 0, 0, ulong.MaxValue);
   for (int i = 0; i < records; i++) data.WriteRecord(i, pointer + i * 32);
   data.WriteEffectData(Array.Empty<byte>(), 0);
   data.FinishPrepare();
   data.Abort(0);
   long elapsed = Stopwatch.GetTimestamp() - start;
   long allocated = GC.GetAllocatedBytesForCurrentThread() - bytes;
   if (sample >= 0) { times[sample] = elapsed; allocations[sample] = allocated; }
  }
 }
}
stats = data.LastStats;
Array.Sort(times); Array.Sort(allocations);
Console.WriteLine($"prepare-probe: mode={mode} samples={samples} p50_ns={Ns(times[4999])} p95_ns={Ns(times[9499])} p99_ns={Ns(times[9899])} alloc_B={allocations[4999]} cpu_written={stats.CpuWrittenBytes} cpu_compared={stats.CpuComparedBytes} planned={stats.PlannedTransferBytes} submitted={stats.SubmittedTransferBytes}");
window.RequestClose();
WindowReadbackTestFixture.ForceRender(window, 0.0);
static long Ns(long ticks) => (long)((double)ticks * 1000000000 / Stopwatch.Frequency);
static object Field(object target, string name) => target.GetType().GetField(name, BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public)?.GetValue(target) ?? target.GetType().GetProperty(name, BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public)?.GetValue(target) ?? throw new Exception(target.GetType().Name + ": missing " + name);
sealed class Boxes : Cell {
 public override Blob Build() {
  var children = new List<Blob>(1000);
  for(int i = 0; i < 1000; i++) children.Add(new Container { Position = PositionType.Absolute, Left = (i % 25) * 40.0, Top = (i / 25) * 16.0, Width = 40.0, Height = 16.0, BackgroundColor = Color.Rgb(24, 56, 112) });
  return new Container { Width = 1000, Height = 640, Children = children };
 }
}
