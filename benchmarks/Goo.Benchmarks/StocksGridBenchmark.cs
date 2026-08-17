using System.Diagnostics;
using System.Globalization;
using Goo;

internal static class StocksGridBenchmark
{
    private const string AppName = "StressPerf.Goo";
    private const double TickSeconds = 0.033;

    internal static bool TryRun(string[] args)
    {
        if (Array.IndexOf(args, "--stocks-grid") < 0)
        {
            return false;
        }

        Run(Options.Parse(args));
        return true;
    }

    private static void Run(Options options)
    {
        if (options.Profile)
        {
            Environment.SetEnvironmentVariable("GOO_FRAME_PROFILE", "1");
        }

        var source = new StockDataSource();
        var root = new StockGridRootCell(source.Items);
        var window = new Window
        {
            Title = AppName,
            Width = 1280,
            Height = 720,
            State = options.Windowed ? WindowState.Normal : WindowState.Fullscreen,
            Background = Color.Rgb(13, 17, 23),
            Root = root,
            VSync = options.VSync,
        };

        var mountClock = Stopwatch.StartNew();
        try
        {
            window.Open();
            window.Pump(0.0);
            root.BindMountedCells(window.Tree);
            mountClock.Stop();

            if (root.MountedCellCount != StockDataSource.TotalItems)
            {
                throw new InvalidOperationException(
                    $"StocksGrid mounted {root.MountedCellCount} cells, expected {StockDataSource.TotalItems}");
            }

            Console.WriteLine(
                $"{AppName}: mounted {root.MountedCellCount:N0} cells in {mountClock.Elapsed.TotalMilliseconds:F1} ms");
            using (var self = Process.GetCurrentProcess())
            {
                Console.WriteLine(
                    $"{AppName}: process start to first frame {(DateTime.Now - self.StartTime).TotalMilliseconds:F0} ms");
            }
            RunLoop(window, root, source, options);
        }
        finally
        {
            if (window.IsOpen)
            {
                window.Close();
            }
        }
    }

    private static void RunLoop(
        Window window,
        StockGridRootCell root,
        StockDataSource source,
        Options options)
    {
        var metrics = new Metrics();
        var wall = Stopwatch.StartNew();
        var lastPumpTime = 0.0;
        var nextTick = 0.0;

        while (window.IsOpen && wall.Elapsed.TotalSeconds < options.DurationSeconds)
        {
            WaitUntil(wall, nextTick);
            if (wall.Elapsed.TotalSeconds >= options.DurationSeconds)
            {
                break;
            }

            var frameStart = Stopwatch.GetTimestamp();
            var updateStart = Stopwatch.GetTimestamp();
            var requestedChanges = source.Update(options.Percent, root);
            var updateMs = ElapsedMilliseconds(updateStart);

            var now = wall.Elapsed.TotalSeconds;
            window.Pump(Math.Max(0.0, now - lastPumpTime));
            lastPumpTime = now;

            metrics.Record(
                updateMs,
                ElapsedMilliseconds(frameStart),
                requestedChanges,
                wall.Elapsed.TotalSeconds);

            nextTick += TickSeconds;
            if (nextTick < wall.Elapsed.TotalSeconds)
            {
                nextTick = wall.Elapsed.TotalSeconds;
            }
        }

        wall.Stop();
        var report = metrics.Report(options.Percent, wall.Elapsed.TotalSeconds);
        Console.Write(report);

        var reportPath = Path.Combine(AppContext.BaseDirectory, $"{AppName}.report.txt");
        File.WriteAllText(reportPath, report);
        Console.WriteLine($"Report: {reportPath}");

        if (options.Json)
        {
            Console.WriteLine("GOO_PERF_JSON " + metrics.Json(options.Percent, wall.Elapsed.TotalSeconds));
        }
    }

    private static void WaitUntil(Stopwatch wall, double targetSeconds)
    {
        while (true)
        {
            var remaining = targetSeconds - wall.Elapsed.TotalSeconds;
            if (remaining <= 0.0)
            {
                return;
            }
            if (remaining > 0.002)
            {
                Thread.Sleep(1);
            }
            else
            {
                Thread.SpinWait(64);
            }
        }
    }

    private static double ElapsedMilliseconds(long start) =>
        (Stopwatch.GetTimestamp() - start) * 1000.0 / Stopwatch.Frequency;

    private sealed class Options
    {
        internal double Percent { get; private set; } = 10.0;
        internal double DurationSeconds { get; private set; } = 10.0;
        internal bool Json { get; private set; }
        internal bool Profile { get; private set; }
        internal bool VSync { get; private set; } = true;
        internal bool Windowed { get; private set; }

        internal static Options Parse(string[] args)
        {
            var options = new Options();
            for (var i = 0; i < args.Length; i++)
            {
                switch (args[i])
                {
                    case "--percent" when i + 1 < args.Length:
                        options.Percent = double.Parse(args[++i], CultureInfo.InvariantCulture);
                        break;
                    case "--duration" when i + 1 < args.Length:
                        options.DurationSeconds = double.Parse(args[++i], CultureInfo.InvariantCulture);
                        break;
                    case "--json":
                        options.Json = true;
                        break;
                    case "--profile":
                        options.Profile = true;
                        break;
                    case "--no-vsync":
                        options.VSync = false;
                        break;
                    case "--windowed":
                        options.Windowed = true;
                        break;
                }
            }

            if (options.Percent < 0.0 || options.Percent > 100.0)
            {
                throw new ArgumentOutOfRangeException("--percent", "percent must be between 0 and 100");
            }
            if (options.DurationSeconds <= 0.0)
            {
                throw new ArgumentOutOfRangeException("--duration", "duration must be positive");
            }
            return options;
        }
    }

    private readonly record struct StockItem(
        string Symbol,
        double PrevPrice,
        double CurrentPrice,
        bool IsUp);

    private sealed class StockDataSource
    {
        internal const int Columns = 70;
        internal const int Rows = 70;
        internal const int TotalItems = Columns * Rows;

        private readonly Random _random = new(42);
        private readonly StockItem[] _items = new StockItem[TotalItems];

        internal StockItem[] Items => _items;

        internal StockDataSource()
        {
            for (var i = 0; i < TotalItems; i++)
            {
                var row = i / Columns;
                var column = i % Columns;
                var symbol = string.Create(3, (row, column), static (span, position) =>
                {
                    span[0] = (char)('A' + position.row % 26);
                    span[1] = (char)('A' + position.column / 3 % 26);
                    span[2] = (char)('A' + position.column % 26);
                });
                var price = Math.Round(10.0 + _random.NextDouble() * 990.0, 2);
                _items[i] = new StockItem(symbol, price, price, true);
            }
        }

        internal int Update(double percent, StockGridRootCell root)
        {
            if (percent <= 0.0)
            {
                return 0;
            }
            var count = Math.Max(1, (int)(TotalItems * percent / 100.0));
            var changed = new List<int>(count);
            for (var i = 0; i < count; i++)
            {
                var index = _random.Next(TotalItems);
                var item = _items[index];
                var delta = ((_random.NextDouble() - 0.48) * 2.0) * item.CurrentPrice * 0.02;
                var price = Math.Max(0.01, Math.Round(item.CurrentPrice + delta, 2));
                _items[index] = new StockItem(item.Symbol, item.CurrentPrice, price, price >= item.CurrentPrice);
                changed.Add(index);
            }

            foreach (var index in changed)
            {
                root.Apply(index, _items[index]);
            }
            return changed.Count;
        }
    }

    private readonly record struct StockGridCellInput(int Index, StockItem Item);

    private sealed class StockGridRootCell(StockItem[] items) : Cell
    {
        private readonly StockGridCell?[] _cells = new StockGridCell?[StockDataSource.TotalItems];

        internal int MountedCellCount { get; private set; }

        public override Blob Build()
        {
            var grid = new Container
            {
                Width = StockDataSource.Columns * 64.0,
                Height = StockDataSource.Rows * 18.0,
            };
            for (var i = 0; i < StockDataSource.TotalItems; i++)
            {
                grid.Children.Add(Cell.Mount<StockGridCellInput, StockGridCell>(
                    null,
                    new StockGridCellInput(i, items[i])));
            }
            return grid;
        }

        internal void BindMountedCells(Node? tree)
        {
            if (tree is null || tree.Children.Count != StockDataSource.TotalItems)
            {
                throw new InvalidOperationException("StocksGrid tree shape does not match the 70x70 workload");
            }

            MountedCellCount = 0;
            for (var i = 0; i < tree.Children.Count; i++)
            {
                if (tree.Children[i].Fiber is not StockGridCell cell)
                {
                    throw new InvalidOperationException($"StocksGrid cell {i} has no mounted Cell fiber");
                }
                _cells[i] = cell;
                MountedCellCount++;
            }
        }

        internal void Apply(int index, StockItem item)
        {
            var cell = _cells[index]
                ?? throw new InvalidOperationException($"StocksGrid cell {index} is not mounted");
            cell.Apply(item);
        }
    }

    private sealed class StockGridCell : Cell<StockGridCellInput>
    {
        private StockItem _current;
        private bool _hasCurrent;

        public StockGridCell()
        {
        }

        internal void Apply(StockItem item)
        {
            _current = item;
            _hasCurrent = true;
            Rebuild();
        }

        public override Blob Build()
        {
            var input = Input;
            var item = _hasCurrent ? _current : input.Item;
            var row = input.Index / StockDataSource.Columns;
            var column = input.Index % StockDataSource.Columns;
            return new Text
            {
                Content = $"{item.Symbol} {item.CurrentPrice:F2}",
                Position = PositionType.Absolute,
                Left = column * 64.0,
                Top = row * 18.0,
                Width = 64.0,
                Height = 18.0,
                PaddingLeft = 2.0,
                PaddingTop = 1.0,
                PaddingRight = 2.0,
                PaddingBottom = 1.0,
                FontSize = 8.0,
                TextWrap = TextWrap.NoWrap,
                TextTrimming = TextTrimming.Ellipsis,
                Color = item.IsUp ? Color.Rgb(0, 128, 0) : Color.Rgb(255, 0, 0),
            };
        }
    }

    private sealed class Metrics
    {
        private readonly List<double> _updates = new();
        private readonly List<double> _frames = new();
        private readonly List<long> _memory = new();
        private int _renders;
        private long _requestedChanges;
        private long _allocationStart;
        private int _gen0Start;
        private int _gen1Start;
        private int _gen2Start;
        private bool _allocationStarted;
        private long _allocationEnd;
        private int _gen0End;
        private int _gen1End;
        private int _gen2End;
        private bool _frozen;
        private double _nextMemorySample = 1.0;

        internal void Record(double updateMs, double frameMs, int requestedChanges, double elapsedSeconds)
        {
            _updates.Add(updateMs);
            _frames.Add(frameMs);
            _renders++;
            _requestedChanges += requestedChanges;

            if (!_allocationStarted)
            {
                _allocationStarted = true;
                _allocationStart = GC.GetTotalAllocatedBytes();
                _gen0Start = GC.CollectionCount(0);
                _gen1Start = GC.CollectionCount(1);
                _gen2Start = GC.CollectionCount(2);
            }

            if (elapsedSeconds >= _nextMemorySample)
            {
                _memory.Add(Process.GetCurrentProcess().WorkingSet64);
                _nextMemorySample += 1.0;
            }
        }

        internal string Report(double percent, double elapsedSeconds)
        {
            Freeze();
            var rendersPerSecond = elapsedSeconds > 0.0 ? _renders / elapsedSeconds : 0.0;
            var averageMemory = _memory.Count > 0 ? _memory.Average() / 1048576.0 : 0.0;
            var peakMemory = _memory.Count > 0 ? _memory.Max() / 1048576.0 : 0.0;
            return string.Create(CultureInfo.InvariantCulture, $"""
                === {AppName} ===
                Duration:    {elapsedSeconds:F1}s
                Percent:     {percent:F0}%
                Cells:       {StockDataSource.TotalItems}
                Tick:        {TickSeconds * 1000.0:F0} ms
                Logical renders/sec: {rendersPerSecond:F2}
                Total Renders: {_renders}
                Avg Update:  {Average(_updates):F2} ms
                Avg Frame:   {Average(_frames):F2} ms
                P50 Frame:   {Percentile(_frames, 0.50):F2} ms
                P95 Frame:   {Percentile(_frames, 0.95):F2} ms
                P99 Frame:   {Percentile(_frames, 0.99):F2} ms
                Max Frame:   {(_frames.Count > 0 ? _frames.Max() : 0.0):F2} ms
                Avg Memory:  {averageMemory:F1} MB
                Peak Memory: {peakMemory:F1} MB
                Alloc/render: {AllocatedBytesPerRender():F0} bytes
                GC Gen0/1/2: {_gen0End - _gen0Start} / {_gen1End - _gen1Start} / {_gen2End - _gen2Start}
                Requested changes: {_requestedChanges}
                """) + Environment.NewLine;
        }

        internal string Json(double percent, double elapsedSeconds)
        {
            Freeze();
            var rendersPerSecond = elapsedSeconds > 0.0 ? _renders / elapsedSeconds : 0.0;
            var peakMemory = _memory.Count > 0 ? _memory.Max() / 1048576.0 : 0.0;
            return string.Create(CultureInfo.InvariantCulture, $$"""
                {"app":"{{AppName}}","percent":{{percent:F0}},"durationSeconds":{{elapsedSeconds:F3}},"renders":{{_renders}},"rendersPerSec":{{rendersPerSecond:F4}},"avgUpdateMs":{{Average(_updates):F4}},"avgFrameMs":{{Average(_frames):F4}},"p50FrameMs":{{Percentile(_frames, 0.50):F4}},"p95FrameMs":{{Percentile(_frames, 0.95):F4}},"p99FrameMs":{{Percentile(_frames, 0.99):F4}},"peakMemoryMB":{{peakMemory:F2}},"allocBytesPerRender":{{AllocatedBytesPerRender():F2}}}
                """);
        }

        private void Freeze()
        {
            if (_frozen)
            {
                return;
            }
            _allocationEnd = GC.GetTotalAllocatedBytes();
            _gen0End = GC.CollectionCount(0);
            _gen1End = GC.CollectionCount(1);
            _gen2End = GC.CollectionCount(2);
            if (_memory.Count == 0)
            {
                _memory.Add(Process.GetCurrentProcess().WorkingSet64);
            }
            _frozen = true;
        }

        private double AllocatedBytesPerRender()
        {
            var measuredRenders = Math.Max(0, _renders - 1);
            return measuredRenders > 0
                ? (_allocationEnd - _allocationStart) / (double)measuredRenders
                : 0.0;
        }

        private static double Average(List<double> values) =>
            values.Count > 0 ? values.Average() : 0.0;

        private static double Percentile(List<double> values, double percentile)
        {
            if (values.Count == 0)
            {
                return 0.0;
            }
            var ordered = values.ToArray();
            Array.Sort(ordered);
            var index = (int)Math.Ceiling(percentile * ordered.Length) - 1;
            return ordered[Math.Clamp(index, 0, ordered.Length - 1)];
        }
    }
}
