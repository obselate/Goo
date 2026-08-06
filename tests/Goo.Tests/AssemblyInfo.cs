using System.Runtime.CompilerServices;
using Goo;
using Xunit;

// Motion.TimeScale, Motion.Default, and fixture counters remain global, so tests stay
// serialized even though each Window owns an isolated pump.
[assembly: CollectionBehavior(DisableTestParallelization = true)]

internal static class TestApplication
{
    [ModuleInitializer]
    internal static void Configure()
    {
        Window.ConfigureApplication("Goo Tests", "0.1.0", "io.github.obselate.goo.tests");
    }
}
