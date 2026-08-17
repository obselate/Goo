using Goo;
using SkiaSharp;
using System.Collections;
using System.Diagnostics;
using System.Reflection;
using System.Runtime.CompilerServices;

internal static class NodeStorageBenchmark
{
    private const int KindSamples = 256;
    private const int GridColumns = 20;
    private const int GridRows = 10;
    private const int NativeTraversalMaxDepth = 16;
    private static readonly PropertyInfo YogaProperty = NodeProperty("Yoga");
    private static readonly PropertyInfo ImageRequestProperty = NodeProperty("ImageRequest");
    private static readonly PropertyInfo DecodedImageProperty = NodeProperty("DecodedImage");
    private static readonly FieldInfo ShapeGeometryValues = SidecarField(typeof(ShapeGeometry), "values");
    private static readonly FieldInfo ShapeShadowArtifacts = SidecarField(typeof(ShapeGeometry), "shadowArtifacts");
    private static readonly FieldInfo ShapePathEffects = SidecarField(typeof(ShapePathEffects), "values");
    private static readonly FieldInfo ImageSourceValues = SidecarField(typeof(ImageLayouts), "sourceValues");
    private static readonly FieldInfo TransformValues = SidecarField(typeof(Transforming), "values");
    private static readonly FieldInfo ClipPathValues = SidecarField(typeof(ClipPaths), "values");
    private static readonly FieldInfo ClipPathGeometryValues = SidecarField(typeof(ClipPathGeometry), "values");
    private static readonly FieldInfo TextAnalysisValues = SidecarField(typeof(TextAnalyses), "values");
    private static readonly FieldInfo PassivePresentationValues = SidecarField(typeof(PassiveTextPresentations), "values");
    private static readonly MethodInfo UnsafeSizeOfDefinition = typeof(Unsafe).GetMethods(BindingFlags.Public | BindingFlags.Static)
        .Single(method => method.Name == nameof(Unsafe.SizeOf) && method.IsGenericMethodDefinition
            && method.GetGenericArguments().Length == 1 && method.GetParameters().Length == 0);

    internal static bool TryRun(string[] args)
    {
        if (Array.IndexOf(args, "--node-storage") < 0)
            return false;

        Run();
        return true;
    }

    private static void Run()
    {
        Console.WriteLine("Node storage evidence");
        Console.WriteLine("Allocation bytes are GC.GetAllocatedBytesForCurrentThread diagnostics while every Node remains rooted.");
        Console.WriteLine("Retained managed bytes are post-GC GC.GetTotalMemory deltas with the tree still rooted.");
        Console.WriteLine("Blob declarations and caller-owned documents, controllers, and image sources are created before each measured delta.");
        Console.WriteLine("Warm allocation is transient diagnostic data. Warm retained is a second post-GC live-heap delta.");
        var shell = MeasurePlainNodeShell();
        Console.WriteLine($"plain Node shell: allocated {shell.AllocatedBytesPerNode:N0} B/node, retained {shell.RetainedBytesPerNode:N0} B/node");

        foreach (var kind in Enum.GetValues<NodeKind>())
        {
            var result = MeasureKind(kind);
            Console.WriteLine($"kind {kind}: mount allocated {result.MountAllocatedBytesPerNode:N0} B/node, retained {result.MountRetainedBytesPerNode:N0} B/node; warm allocated {result.WarmAllocatedBytesPerNode:N0} B/node, retained delta {result.WarmRetainedBytesPerNode:N0} B/node; {result.Census.Format()}");
        }

        foreach (var result in new[]
        {
            MeasureScenario("scale-1001", BuildScaleTree, TouchLayout),
            MeasureScenario("text-editor", BuildEditorTree, TouchEditor),
            MeasureScenario("shape-grid-200", BuildShapeGrid, TouchPaint),
            MeasureScenario("image-grid-200", BuildImageGrid, TouchPaint),
            MeasureScenario("cull-mixed", BuildCullFixtureScene, TouchPaint),
        })
        {
            Console.WriteLine($"{result.Name}: nodes {result.Census.TotalNodes}, mount allocated {result.MountAllocatedBytes:N0} B, retained {result.MountRetainedBytes:N0} B; warm allocated {result.WarmAllocatedBytes:N0} B, retained delta {result.WarmRetainedBytes:N0} B; {result.Census.Format()}");
        }

        ValidateCandidateGroups();
        PrintStorageMoveScreen(MeasureLookupCost());
    }

    private static ShellResult MeasurePlainNodeShell()
    {
        const int count = 8192;
        var warm = new Node[count];
        for (var index = 0; index < warm.Length; index++)
            warm[index] = new Node { Kind = NodeKind.Container };
        GC.KeepAlive(warm);

        ForceGc();
        var nodes = new Node[count];
        var baseline = GC.GetTotalMemory(false);
        var before = GC.GetAllocatedBytesForCurrentThread();
        for (var index = 0; index < nodes.Length; index++)
            nodes[index] = new Node { Kind = NodeKind.Container };
        var allocated = GC.GetAllocatedBytesForCurrentThread() - before;
        var retained = RetainedDelta(baseline, nodes);
        GC.KeepAlive(nodes);
        return new ShellResult(allocated / count, retained / count);
    }

    private static KindResult MeasureKind(NodeKind kind)
    {
        WarmKind(kind);
        ForceGc();

        using var resources = new ScenarioResources();
        var blobs = new Blob[KindSamples];
        var roots = new Node[KindSamples];
        for (var index = 0; index < blobs.Length; index++)
            blobs[index] = CreateBlob(kind, index, resources);

        var reconciler = new Reconciler { Res = new Resolver() };
        ForceGc();
        var baseline = GC.GetTotalMemory(false);
        var beforeMount = GC.GetAllocatedBytesForCurrentThread();
        for (var index = 0; index < roots.Length; index++)
            roots[index] = reconciler.Mount(blobs[index]);
        var mountBytes = GC.GetAllocatedBytesForCurrentThread() - beforeMount;
        var mountRetained = RetainedDelta(baseline, roots);

        var beforeWarm = GC.GetAllocatedBytesForCurrentThread();
        foreach (var root in roots)
            TouchKind(root, kind);
        var warmBytes = GC.GetAllocatedBytesForCurrentThread() - beforeWarm;
        var warmRetained = RetainedDelta(baseline, roots) - mountRetained;
        var census = Census(roots);

        foreach (var root in roots)
            TextLayouts.DisposeTree(root);
        GC.KeepAlive(blobs);

        return new KindResult(kind, mountBytes / KindSamples, mountRetained / KindSamples,
            warmBytes / KindSamples, warmRetained / KindSamples, census);
    }

    private static void WarmKind(NodeKind kind)
    {
        using var resources = new ScenarioResources();
        var root = new Reconciler { Res = new Resolver() }.Mount(CreateBlob(kind, 0, resources));
        try
        {
            TouchKind(root, kind);
        }
        finally
        {
            TextLayouts.DisposeTree(root);
        }
    }

    private static void TouchKind(Node root, NodeKind kind)
    {
        switch (kind)
        {
            case NodeKind.Editor:
                TouchEditor(root);
                return;
            case NodeKind.Shape:
            case NodeKind.Image:
            case NodeKind.Text:
            case NodeKind.Entry:
                TouchPaint(root);
                return;
            default:
                TouchLayout(root);
                return;
        }
    }

    private static ScenarioResult MeasureScenario(string name, Func<Scenario> create, Action<Node> touch)
    {
        using (var warm = create())
        {
            warm.Root = new Reconciler { Res = new Resolver() }.Mount(warm.Blob);
            touch(warm.Root);
        }

        ForceGc();
        using var scenario = create();
        var reconciler = new Reconciler { Res = new Resolver() };
        ForceGc();
        var baseline = GC.GetTotalMemory(false);
        var beforeMount = GC.GetAllocatedBytesForCurrentThread();
        scenario.Root = reconciler.Mount(scenario.Blob);
        var mountBytes = GC.GetAllocatedBytesForCurrentThread() - beforeMount;
        var mountRetained = RetainedDelta(baseline, scenario);

        var beforeWarm = GC.GetAllocatedBytesForCurrentThread();
        touch(scenario.Root);
        var warmBytes = GC.GetAllocatedBytesForCurrentThread() - beforeWarm;
        var warmRetained = RetainedDelta(baseline, scenario) - mountRetained;
        return new ScenarioResult(name, mountBytes, mountRetained, warmBytes, warmRetained,
            Census(scenario.Root));
    }

    private static Scenario BuildScaleTree()
    {
        var root = new Container { Width = 1280, Padding = 16, Gap = 8 };
        for (var index = 0; index < 200; index++)
        {
            var card = new Container { Padding = 12, Gap = 4, BorderRadius = 6 };
            card.Children.Add(new Text { Content = index == 0 ? "row" : "static title", FontSize = 18 });
            card.Children.Add(new Text { Content = "supporting copy", FontSize = 13 });
            var footer = new Container { Gap = 4 };
            footer.Children.Add(new Text { Content = "meta", FontSize = 11 });
            card.Children.Add(footer);
            root.Children.Add(card);
        }
        return new Scenario(root);
    }

    private static Scenario BuildEditorTree()
    {
        var document = new TextDocument("line one\nline two\nline three");
        var controller = new TextEditorController(document);
        return new Scenario(new TextEditor(document, controller) { Width = 800, Height = 500 }, controller);
    }

    private static Scenario BuildShapeGrid()
    {
        var path = UnitSquarePath();
        var root = new Container { Width = 800, Height = 600, Position = PositionType.Relative };
        for (var index = 0; index < GridColumns * GridRows; index++)
        {
            root.Children.Add(new Shape
            {
                Key = $"shape-{index}",
                Position = PositionType.Absolute,
                Left = 10 + index % GridColumns * 39.0,
                Top = 10 + index / GridColumns * 50.0,
                Width = 28,
                Height = 34,
                Path = path,
                Fit = ShapeFit.Fill,
                BackgroundColor = Color.Rgb(42, 104, 180),
                BorderWidth = 2,
                BorderColor = Color.Rgb(190, 220, 255),
            });
        }
        return new Scenario(root);
    }

    private static Scenario BuildImageGrid()
    {
        var source = new ImageSource(1, 1, [255, 0, 0, 255]);
        var root = new Container { Width = 800, Height = 600, Position = PositionType.Relative };
        for (var index = 0; index < GridColumns * GridRows; index++)
        {
            root.Children.Add(new Image
            {
                Key = $"image-{index}",
                Position = PositionType.Absolute,
                Left = 10 + index % GridColumns * 39.0,
                Top = 10 + index / GridColumns * 50.0,
                Width = 28,
                Height = 34,
                Source = source,
                Fit = ImageFit.Fill,
            });
        }
        return new Scenario(root, source);
    }

    private static Scenario BuildCullFixtureScene()
    {
        var content = new Container
        {
            Position = PositionType.Relative,
            Width = 280,
            Height = 180,
            Transform = new PanelTransform { TranslateX = 3, TranslateY = 2 },
            Children =
            [
                new Container
                {
                    Position = PositionType.Absolute, Left = -22, Top = 8, Width = 42, Height = 34,
                    BackgroundColor = Color.Rgb(200, 60, 60),
                    BoxShadow = new BoxShadow { OffsetX = 6, OffsetY = 4, Blur = 8, Spread = 4, Color = Color.Rgb(0, 0, 128) },
                },
                new Text
                {
                    Content = "overflowing text near the right clip edge",
                    Position = PositionType.Absolute, Left = 102, Top = 48, Width = 24, Height = 12,
                    FontSize = 8, Color = Color.White,
                },
                new Container
                {
                    Position = PositionType.Absolute, Left = 40, Top = 92, Width = 52, Height = 30,
                    BackgroundColor = Color.Rgb(60, 200, 60),
                    ClipPath = new PathBuilder(0, 0, 1, 1).MoveTo(0, 0).LineTo(1, 0).LineTo(0, 1).Close().Build(),
                },
                new Shape
                {
                    Position = PositionType.Absolute, Left = 108, Top = 118, Width = 44, Height = 36,
                    Path = UnitSquarePath(), Fit = ShapeFit.Fill,
                },
            ],
        };
        return new Scenario(new Container
        {
            Width = 128, Height = 72, BackgroundColor = Color.Black,
            Children =
            [
                new Container { Width = 128, Height = 72, OverflowY = Overflow.Scroll, Children = [content] },
            ],
        });
    }

    private static Blob CreateBlob(NodeKind kind, int index, ScenarioResources resources) => kind switch
    {
        NodeKind.Container => new Container { Width = 80, Height = 24 },
        NodeKind.Button => new Button { Width = 80, Height = 24 },
        NodeKind.Text => new Text { Content = $"text {index}", Width = 80, Height = 24 },
        NodeKind.Entry => new TextEntry { Value = $"entry {index}", Width = 80, Height = 24 },
        NodeKind.Editor => CreateEditor(index, resources),
        NodeKind.Shape => new Shape { Width = 80, Height = 24, Path = UnitSquarePath(), Fit = ShapeFit.Fill },
        NodeKind.Image => new Image { Width = 80, Height = 24, Source = resources.ImageSource, Fit = ImageFit.Fill },
        _ => throw new ArgumentOutOfRangeException(nameof(kind)),
    };

    private static TextEditor CreateEditor(int index, ScenarioResources resources)
    {
        var document = new TextDocument($"editor {index}");
        var controller = new TextEditorController(document);
        resources.Add(controller);
        return new TextEditor(document, controller) { Width = 80, Height = 24 };
    }

    private static void TouchLayout(Node root) => new Layout().Calculate(root, 800, 600);

    private static void TouchEditor(Node root)
    {
        TouchLayout(root);
        _ = TextEditorLayouts.For(root, 800, 500);
    }

    private static void TouchPaint(Node root)
    {
        TouchLayout(root);
        using var surface = SKSurface.Create(new SKImageInfo(800, 600))
            ?? throw new InvalidOperationException("node storage surface creation failed");
        new Painter().Paint(root, surface.Canvas);
        surface.Canvas.Flush();
    }

    private static NodeCensus Census(IEnumerable<Node> roots)
    {
        var census = new NodeCensus();
        foreach (var root in roots)
            Census(root, census);
        return census;
    }

    private static NodeCensus Census(Node root)
    {
        var census = new NodeCensus();
        Census(root, census);
        return census;
    }

    private static void Census(Node node, NodeCensus census)
    {
        census.TotalNodes++;
        census.Kinds[(int)node.Kind]++;
        var yoga = Value(YogaProperty, node);
        if (yoga is not null)
        {
            census.YogaReferences++;
            census.YogaWrapperObjects.Add(yoga);
        }
        census.TextLayouts += node.TextLayout is null ? 0 : 1;
        census.TextLayoutCaches += node.TextLayoutCache is null ? 0 : 1;
        census.EntryShapes += node.EntryShape is null ? 0 : 1;
        census.EditorStates += node.EditorState is null ? 0 : 1;
        CensusNativeWrappers(node.TextLayout, census);
        CensusTextLayoutCache(node.TextLayoutCache, census);
        CensusNativeWrappers(node.EntryShape, census);
        CensusNativeWrappers(node.EditorState, census);
        census.DirectImageSources += node.HasDirectImageSourceState ? 1 : 0;
        census.ImageRequests += Value(ImageRequestProperty, node) is null ? 0 : 1;
        var decodedImage = Value(DecodedImageProperty, node);
        if (decodedImage is not null)
        {
            census.DecodedImageReferences++;
            census.DecodedImageObjects.Add(decodedImage);
        }
        CensusNativeWrappers(decodedImage, census);
        CensusSidecar(SidecarValue(ShapeGeometryValues, node), ref census.ShapeGeometrySidecars, census);
        CensusSidecar(SidecarValue(ShapeShadowArtifacts, node), ref census.ShapeShadowSidecars, census);
        CensusSidecar(SidecarValue(ShapePathEffects, node), ref census.ShapePathEffectSidecars, census);
        CensusSidecar(SidecarValue(ImageSourceValues, node), ref census.ImageSourceSidecars, census);
        CensusSidecar(SidecarValue(TransformValues, node), ref census.TransformSidecars, census);
        CensusSidecar(SidecarValue(ClipPathValues, node), ref census.ClipPathSidecars, census);
        CensusSidecar(SidecarValue(ClipPathGeometryValues, node), ref census.ClipPathGeometrySidecars, census);
        CensusSidecar(SidecarValue(TextAnalysisValues, node), ref census.TextAnalysisSidecars, census);
        CensusSidecar(SidecarValue(PassivePresentationValues, node), ref census.PassivePresentationSidecars, census);
        census.TextCacheParticipants += node.TextLayout is not null || node.TextLayoutCache is not null
            || node.EntryShape is not null ? 1 : 0;
        census.EditorParticipants += node.Kind == NodeKind.Editor ? 1 : 0;
        census.ImageParticipants += node.Kind == NodeKind.Image ? 1 : 0;
        census.ShapeParticipants += node.Kind == NodeKind.Shape ? 1 : 0;
        foreach (var child in node.Children)
            Census(child, census);
    }

    private static void CensusTextLayoutCache(IList? cache, NodeCensus census)
    {
        if (cache is null)
            return;
        census.TextLayoutCacheEntries += cache.Count;
        foreach (var layout in cache)
        {
            if (layout is not null)
                census.TextLayoutCacheObjects.Add(layout);
            CensusNativeWrappers(layout, census);
        }
    }

    private static VectorPath UnitSquarePath() => new PathBuilder()
        .MoveTo(0, 0).LineTo(1, 0).LineTo(1, 1).LineTo(0, 1).Close().Build();

    private static PropertyInfo NodeProperty(string name) => typeof(Node).GetProperty(name,
        BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic)
        ?? throw new InvalidOperationException($"Node property not found: {name}");

    private static object? Value(PropertyInfo property, Node node) => property.GetValue(node);

    private static FieldInfo SidecarField(Type owner, string name) => owner.GetField(name,
        BindingFlags.Static | BindingFlags.NonPublic)
        ?? throw new InvalidOperationException($"Sidecar field not found: {owner.Name}.{name}");

    private static object? SidecarValue(FieldInfo field, Node node)
    {
        var table = field.GetValue(null);
        if (table is null)
            return null;

        var method = table.GetType().GetMethod("TryGetValue")
            ?? throw new InvalidOperationException($"Conditional weak table has no TryGetValue: {field.Name}");
        var args = new object?[] { node, null };
        return method.Invoke(table, args) is true ? args[1] : null;
    }

    private static void CensusSidecar(object? value, ref int participants, NodeCensus census)
    {
        if (value is null)
            return;
        participants++;
        census.CwtHolderObjects.Add(value);
        CensusNativeWrappers(value, census);
    }

    private static void CensusNativeWrappers(object? value, NodeCensus census, int depth = 0)
    {
        if (value is null || !census.NativeTraversalObjects.Add(value))
            return;
        if (value is SKNativeObject wrapper)
        {
            census.NativeWrapperObjects.Add(wrapper);
            var kind = wrapper.GetType().Name;
            if (!census.NativeWrappersByKind.TryGetValue(kind, out var wrappers))
            {
                wrappers = new HashSet<object>(ReferenceEqualityComparer.Instance);
                census.NativeWrappersByKind.Add(kind, wrappers);
            }
            wrappers.Add(wrapper);
            return;
        }
        var type = value.GetType();
        if (depth == NativeTraversalMaxDepth || value is string || value is Delegate
            || value is Type || value is MemberInfo || type.IsPrimitive || type.IsEnum
            || type.IsValueType || value is Node)
            return;
        if (value is Array array)
        {
            foreach (var item in array)
                CensusNativeWrappers(item, census, depth + 1);
            return;
        }
        if (value is IList list)
        {
            foreach (var item in list)
                CensusNativeWrappers(item, census, depth + 1);
            return;
        }
        if (!IsNativeTraversalType(type))
            return;
        foreach (var field in type.GetFields(BindingFlags.Instance | BindingFlags.Public | BindingFlags.NonPublic))
        {
            if (!field.FieldType.IsValueType)
                CensusNativeWrappers(field.GetValue(value), census, depth + 1);
        }
    }

    private static bool IsNativeTraversalType(Type type)
        => type.Namespace is { } name && (name == "Goo" || name.StartsWith("Goo.", StringComparison.Ordinal));

    private static long RetainedDelta(long baseline, object keepAlive)
    {
        var current = GC.GetTotalMemory(true);
        GC.KeepAlive(keepAlive);
        return current - baseline;
    }

    private static LookupCost MeasureLookupCost()
    {
        const int iterations = 10_000_000;
        const int nodeCount = 1024;
        var path = UnitSquarePath();
        var nodes = new Node[nodeCount];
        var sidecars = new ConditionalWeakTable<Node, LookupMarker>();
        for (var index = 0; index < nodes.Length; index++)
        {
            var node = new Node { Kind = NodeKind.Shape, ShapePath = path };
            nodes[index] = node;
            sidecars.Add(node, new LookupMarker());
        }
        long sink = 0;

        for (var index = 0; index < iterations / 100; index++)
        {
            var node = nodes[index & (nodeCount - 1)];
            sink += (long)node.ShapePath.Hash;
        }
        var directStart = Stopwatch.GetTimestamp();
        for (var index = 0; index < iterations; index++)
        {
            var node = nodes[index & (nodeCount - 1)];
            sink += (long)node.ShapePath.Hash;
        }
        var directTicks = Stopwatch.GetTimestamp() - directStart;

        for (var index = 0; index < iterations / 100; index++)
        {
            var node = nodes[index & (nodeCount - 1)];
            sink += sidecars.TryGetValue(node, out _) ? 1 : 0;
        }
        var sidecarStart = Stopwatch.GetTimestamp();
        for (var index = 0; index < iterations; index++)
        {
            var node = nodes[index & (nodeCount - 1)];
            sink += sidecars.TryGetValue(node, out _) ? 1 : 0;
        }
        var sidecarTicks = Stopwatch.GetTimestamp() - sidecarStart;
        GC.KeepAlive(sink);
        GC.KeepAlive(nodes);
        return new LookupCost(directTicks * 1_000_000_000.0 / Stopwatch.Frequency / iterations,
            sidecarTicks * 1_000_000_000.0 / Stopwatch.Frequency / iterations);
    }

    private static void PrintStorageMoveScreen(LookupCost lookup)
    {
        Console.WriteLine($"lookup direct {lookup.DirectNanoseconds:F2} ns, CWT {lookup.SidecarNanoseconds:F2} ns, ratio {lookup.Ratio:F1}x");
        foreach (var group in CandidateGroups)
        {
            Console.WriteLine($"candidate {group.Name}: gross raw payload {group.RawFieldBytes} B/node ({group.Arithmetic}), "
                + $"1,001-node gross {group.RawFieldBytes * 1001:N0} B. CLR auto-layout and a CWT holder object make realized savings unproven; CPU/allocation/locality FAIL pending path-specific proof");
        }
        Console.WriteLine("No candidate clears the required <=5% CPU and allocation projection. No storage move or follow-up task is authorized.");
    }

    private static void ValidateCandidateGroups()
    {
        foreach (var group in CandidateGroups)
        {
            var actual = 0;
            foreach (var field in group.Fields)
            {
                var property = NodeProperty(field.Name);
                var bytes = ManagedFieldBytes(property.PropertyType);
                if (bytes != field.Bytes)
                    throw new InvalidOperationException($"Node field size changed: {field.Name} is {bytes} B, expected {field.Bytes} B");
                actual += bytes;
            }
            if (actual != group.RawFieldBytes)
                throw new InvalidOperationException($"Node storage arithmetic changed: {group.Name} is {actual} B, expected {group.RawFieldBytes} B");
        }
    }

    private static int ManagedFieldBytes(Type type)
    {
        if (!type.IsValueType)
            return IntPtr.Size;
        return (int)UnsafeSizeOfDefinition.MakeGenericMethod(type).Invoke(null, null)!;
    }

    private static void ForceGc()
    {
        GC.Collect(2, GCCollectionMode.Forced, true, true);
        GC.WaitForPendingFinalizers();
        GC.Collect(2, GCCollectionMode.Forced, true, true);
    }

    private sealed class Scenario : IDisposable
    {
        private readonly IDisposable[] _resources;

        internal Scenario(Blob blob, params IDisposable[] resources)
        {
            Blob = blob;
            _resources = resources;
        }

        internal Blob Blob { get; }
        internal Node Root { get; set; } = null!;

        public void Dispose()
        {
            if (Root is not null)
            {
                TextLayouts.DisposeTree(Root);
                Root = null!;
            }
            foreach (var resource in _resources)
                resource.Dispose();
        }
    }

    private sealed class ScenarioResources : IDisposable
    {
        private readonly List<IDisposable> _items = [];

        internal ScenarioResources()
        {
            ImageSource = new ImageSource(1, 1, [255, 0, 0, 255]);
            _items.Add(ImageSource);
        }

        internal ImageSource ImageSource { get; }

        internal void Add(IDisposable item) => _items.Add(item);

        public void Dispose()
        {
            for (var index = _items.Count - 1; index >= 0; index--)
                _items[index].Dispose();
        }
    }

    private sealed class NodeCensus
    {
        internal readonly int[] Kinds = new int[Enum.GetValues<NodeKind>().Length];
        internal int TotalNodes;
        internal int YogaReferences;
        internal int TextLayouts;
        internal int TextLayoutCaches;
        internal int TextLayoutCacheEntries;
        internal int EntryShapes;
        internal int EditorStates;
        internal int DirectImageSources;
        internal int ImageRequests;
        internal int DecodedImageReferences;
        internal int ShapeGeometrySidecars;
        internal int ShapeShadowSidecars;
        internal int ShapePathEffectSidecars;
        internal int ImageSourceSidecars;
        internal int TransformSidecars;
        internal int ClipPathSidecars;
        internal int ClipPathGeometrySidecars;
        internal int TextAnalysisSidecars;
        internal int PassivePresentationSidecars;
        internal int TextCacheParticipants;
        internal int EditorParticipants;
        internal int ImageParticipants;
        internal int ShapeParticipants;
        internal readonly HashSet<object> YogaWrapperObjects = new(ReferenceEqualityComparer.Instance);
        internal readonly HashSet<object> DecodedImageObjects = new(ReferenceEqualityComparer.Instance);
        internal readonly HashSet<object> TextLayoutCacheObjects = new(ReferenceEqualityComparer.Instance);
        internal readonly HashSet<object> CwtHolderObjects = new(ReferenceEqualityComparer.Instance);
        internal readonly HashSet<object> NativeTraversalObjects = new(ReferenceEqualityComparer.Instance);
        internal readonly HashSet<object> NativeWrapperObjects = new(ReferenceEqualityComparer.Instance);

        internal readonly Dictionary<string, HashSet<object>> NativeWrappersByKind = new(StringComparer.Ordinal);

        internal string Format() => $"kinds C={Kinds[(int)NodeKind.Container]}, B={Kinds[(int)NodeKind.Button]}, T={Kinds[(int)NodeKind.Text]}, E={Kinds[(int)NodeKind.Entry]}, Ed={Kinds[(int)NodeKind.Editor]}, S={Kinds[(int)NodeKind.Shape]}, I={Kinds[(int)NodeKind.Image]}; "
            + $"Yoga refs={YogaReferences}/distinct={YogaWrapperObjects.Count}, textLayout={TextLayouts}, textCache nodes={TextLayoutCaches}/entries={TextLayoutCacheEntries}/distinct={TextLayoutCacheObjects.Count}, entryShape={EntryShapes}, editorState={EditorStates}, imageSource={DirectImageSources}, imageRequest={ImageRequests}, decoded refs={DecodedImageReferences}/distinct={DecodedImageObjects.Count}; "
            + $"CWT shapeGeometry={ShapeGeometrySidecars}, shapeShadow={ShapeShadowSidecars}, shapeEffects={ShapePathEffectSidecars}, imageSource={ImageSourceSidecars}, transform={TransformSidecars}, clip={ClipPathSidecars}, clipGeometry={ClipPathGeometrySidecars}, textAnalysis={TextAnalysisSidecars}, passivePresentation={PassivePresentationSidecars}, holders distinct={CwtHolderObjects.Count}; "
            + $"native wrappers distinct={NativeWrapperObjects.Count} ({NativeWrapperKinds()}); candidate added holders text={TextCacheParticipants}, editor={EditorParticipants}, image={ImageParticipants}, shape={ShapeParticipants}";

        private string NativeWrapperKinds() => NativeWrappersByKind.Count == 0
            ? "none"
            : string.Join(", ", NativeWrappersByKind.OrderBy(static pair => pair.Key, StringComparer.Ordinal)
                .Select(static pair => $"{pair.Key}={pair.Value.Count}"));
    }

    private static readonly CandidateGroup[] CandidateGroups =
    [
        new("Text caches", [
            new("TextLayout", 8), new("TextLayoutCache", 8), new("EntryShape", 8)],
            "8+8+8"),
        new("TextEditor state", [
            new("EditorController", 8), new("EditorState", 8), new("EditorReadOnly", 1),
            new("EditorCaretColor", 16), new("EditorCurrentLineColor", 16), new("EditorOverscanLines", 4),
            new("EditorOnChange", 8), new("EditorOnSubmit", 8), new("EditorSlotRange", 8),
            new("EditorSlotKey", 8), new("EditorSlotBlock", 1)],
            "8+8+1+16+16+4+8+8+8+8+1"),
        new("Image state", [
            new("ImagePath", 8), new("ImageFit", 4), new("ImageRequest", 8),
            new("ImageCompletion", 8), new("DecodedImage", 8), new("ImageIntrinsicWidth", 4),
            new("ImageIntrinsicHeight", 4)],
            "8+4+8+8+8+4+4"),
        new("Shape state", [
            new("ShapePath", 8), new("ShapeFit", 4), new("ShapeFillRule", 4),
            new("ShapeStrokeCap", 4), new("ShapeStrokeJoin", 4), new("MiterLimit", 8),
            new("ShapeCornerRadius", 8), new("Dashes", 8)],
            "8+4+4+4+4+8+8+8"),
    ];

    private sealed class LookupMarker { }
    private readonly record struct ShellResult(long AllocatedBytesPerNode, long RetainedBytesPerNode);
    private readonly record struct LookupCost(double DirectNanoseconds, double SidecarNanoseconds)
    {
        internal double Ratio => DirectNanoseconds == 0 ? 0 : SidecarNanoseconds / DirectNanoseconds;
    }
    private readonly record struct CandidateField(string Name, int Bytes);
    private readonly record struct CandidateGroup(string Name, CandidateField[] Fields, string Arithmetic)
    {
        internal int RawFieldBytes => Fields.Sum(static candidateField => candidateField.Bytes);
    }
    private readonly record struct KindResult(NodeKind Kind, long MountAllocatedBytesPerNode,
        long MountRetainedBytesPerNode, long WarmAllocatedBytesPerNode,
        long WarmRetainedBytesPerNode, NodeCensus Census);
    private readonly record struct ScenarioResult(string Name, long MountAllocatedBytes,
        long MountRetainedBytes, long WarmAllocatedBytes, long WarmRetainedBytes, NodeCensus Census);
}
