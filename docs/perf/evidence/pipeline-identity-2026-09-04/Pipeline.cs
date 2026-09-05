using System.Diagnostics;
using System.Reflection;
using Goo;
var mode = args.Length > 0 ? args[0] : "duplicate";
int count = args.Length > 1 ? int.Parse(args[1]) : 64;
var window = new Window { Title = "Pipeline identity probe", Width = 128, Height = 128, VSync = false, Root = new Blank() };
window.Open();
WindowReadbackTestFixture.ForceRender(window, 0.0);
var target = Field(window, "windowTarget");
var renderer = Field(target, "primitiveRenderer");
var pipelines = (VulkanSharedPrimitiveFormatState)Field(renderer, "primitivePipelines");
var bytes = File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "control_effect.frag.goo-effect"));
var effects = new ShaderEffect[count];
var firstStart = Stopwatch.GetTimestamp();
var shared = new ShaderEffectProgram(bytes);
var firstProgramNs = Ns(Stopwatch.GetTimestamp() - firstStart);
_ = new ShaderEffect(shared);
var beforeAlloc = GC.GetAllocatedBytesForCurrentThread();
var start = Stopwatch.GetTimestamp();
for (int i = 0; i < count; i++) effects[i] = new ShaderEffect(mode == "shared" ? shared : new ShaderEffectProgram(bytes));
var loadNs = Ns(Stopwatch.GetTimestamp() - start);
var loadBytes = GC.GetAllocatedBytesForCurrentThread() - beforeAlloc;
var handles = new HashSet<ulong>();
var resolved = new ulong[count];
int accepted = 0;
string failure = "none";
start = Stopwatch.GetTimestamp();
for (int i = 0; i < count; i++) {
 try { resolved[i] = pipelines.ResolveShaderEffectPipeline(effects[i]); accepted++; }
 catch (InvalidOperationException e) when (e.Message.Contains("capacity exhausted")) { failure = "capacity"; break; }
}
var resolveNs = Ns(Stopwatch.GetTimestamp() - start);
for (int i = 0; i < accepted; i++) handles.Add(resolved[i]);
ulong check = 0;
var warmStart = Stopwatch.GetTimestamp();
int warmBatch = 0;
do {
 for (int n = 0; n < 1000; n++) check ^= pipelines.ResolveShaderEffectPipeline(effects[(warmBatch + n) % accepted]);
 warmBatch++;
} while (Stopwatch.GetElapsedTime(warmStart).TotalSeconds < 1.0);
var times = new long[10000];
long allocated = GC.GetAllocatedBytesForCurrentThread();
for (int i = 0; i < times.Length; i++) {
 var t = Stopwatch.GetTimestamp();
 for (int n = 0; n < 1000; n++) check ^= pipelines.ResolveShaderEffectPipeline(effects[(i + n) % accepted]);
 times[i] = Ns(Stopwatch.GetTimestamp() - t);
}
long warmBytes = GC.GetAllocatedBytesForCurrentThread() - allocated;
Array.Sort(times);
Console.WriteLine($"pipeline-probe: mode={mode} requested={count} accepted={accepted} unique_handles={handles.Count} cache_count={Field(pipelines, "shaderEffectPipelineCount")} failure={failure} first_program_ns={firstProgramNs} load_ns={loadNs} load_bytes={loadBytes} resolve_ns={resolveNs} warm_p50_batch_ns={times[4999]} warm_p99_batch_ns={times[9899]} warm_bytes={warmBytes} check={check}");
window.RequestClose();WindowReadbackTestFixture.ForceRender(window, 0.0);
static long Ns(long ticks) => (long)((double)ticks * 1e9 / Stopwatch.Frequency);
static object Field(object target, string name) => target.GetType().GetField(name, BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public)?.GetValue(target) ?? target.GetType().GetProperty(name, BindingFlags.Instance | BindingFlags.NonPublic | BindingFlags.Public)?.GetValue(target) ?? throw new Exception(target.GetType().Name + ": missing " + name);
sealed class Blank : Cell { public override Blob Build() => new Container { Width = 128, Height = 128, BackgroundColor = Color.Rgb(24, 56, 112) }; }
