using System.Diagnostics;
using System.Text;
using Goo;
using SkiaSharp;

if (!Options.TryParse(args, out var options, out var error))
{
    Console.Error.WriteLine(error);
    Console.Error.WriteLine("Usage: --iterations N [--document-mb 0..50] [--deep-scroll] [--stage name]");
    Environment.ExitCode = 2;
    return;
}

TextEditorBenchmark.Run(options!);

internal static class TextEditorBenchmark
{
    internal static void Run(Options options)
    {
        var name = options.DocumentMiB == 0
            ? "Gallery TextEditor card"
            : $"{options.DocumentMiB} MiB ASCII document";
        if (options.DeepScroll)
        {
            name += ", deep viewport";
        }

        Console.WriteLine($"TextEditor: {name}, {options.Iterations:N0} measured operations");
        Console.WriteLine("Edit workloads alternate one inserted character and one backspace.");

        if (options.Stage == "presentation")
        {
            ProfileGalleryPresentation(options);
            return;
        }
        if (Includes(options, "semantic"))
            Measure("semantic command", options, () => new EditorCase(options.DocumentMiB, options.DeepScroll), static value => value.SemanticEdit());
        if (Includes(options, "queued"))
            Measure("queued input + drain", options, () => new EditorCase(options.DocumentMiB, options.DeepScroll), static value => value.QueuedEdit());
        if (Includes(options, "retained"))
            Measure("input + retained update", options, () => new EditorCase(options.DocumentMiB, options.DeepScroll), static value => value.QueuedEditAndUpdate());
        if (Includes(options, "paint"))
            Measure("input + update + raster paint", options, () => new EditorCase(options.DocumentMiB, options.DeepScroll), static value => value.QueuedEditUpdateAndPaint());
        if (Includes(options, "unchanged"))
            Measure("unchanged update + raster paint", options, () => new EditorCase(options.DocumentMiB, options.DeepScroll), static value => value.UpdateAndPaint());
    }

    private static bool Includes(Options options, string stage) =>
        options.Stage == "all" || options.Stage == stage;

    private static void ProfileGalleryPresentation(Options options)
    {
        if (options.DocumentMiB != 0)
            throw new ArgumentException("The presentation profile only applies to the Gallery case.");

        Measure("presentation defensive snapshots", options, () => new EditorCase(0, false),
            static value => value.DefensiveSnapshots());
        Measure("presentation layer rebase + synchronization", options, () => new GalleryPresentationCase(),
            static value => value.Edit());
    }

    private static void Measure<T>(string name, Options options, Func<T> create,
        Func<T, long> operation)
        where T : IDisposable
    {
        using var value = create();
        var firstStart = Stopwatch.GetTimestamp();
        var firstResult = operation(value);
        var first = Stopwatch.GetElapsedTime(firstStart).TotalMicroseconds;
        for (var index = 0; index < 32; index++)
        {
            operation(value);
        }

        GC.Collect();
        GC.WaitForPendingFinalizers();
        GC.Collect();
        var elapsed = new double[options.Iterations];
        var beforeAllocation = GC.GetAllocatedBytesForCurrentThread();
        var beforeGen0 = GC.CollectionCount(0);
        var beforeGen1 = GC.CollectionCount(1);
        var beforeGen2 = GC.CollectionCount(2);
        long sink = 0;
        for (var index = 0; index < elapsed.Length; index++)
        {
            var start = Stopwatch.GetTimestamp();
            sink += operation(value);
            elapsed[index] = Stopwatch.GetElapsedTime(start).TotalMicroseconds;
        }

        var allocated = GC.GetAllocatedBytesForCurrentThread() - beforeAllocation;
        var gen0 = GC.CollectionCount(0) - beforeGen0;
        var gen1 = GC.CollectionCount(1) - beforeGen1;
        var gen2 = GC.CollectionCount(2) - beforeGen2;
        Array.Sort(elapsed);
        var p50 = Percentile(elapsed, 0.50);
        var p95 = Percentile(elapsed, 0.95);
        var p99 = Percentile(elapsed, 0.99);
        var max = elapsed[^1];
        var overBudget = elapsed.Count(value => value > 16_666.7);
        var overFifty = elapsed.Count(value => value > 50_000.0);
        Console.WriteLine(
            $"{name}: first {first:F2} us, p50 {p50:F2} us, p95 {p95:F2} us, "
            + $"p99 {p99:F2} us, max {max:F2} us, {allocated / elapsed.Length:N0} B/op, "
            + $">16.7 ms {overBudget}, >50 ms {overFifty}, GC {gen0}/{gen1}/{gen2}");
        GC.KeepAlive(sink + firstResult);
    }

    private static double Percentile(double[] sorted, double percentile)
    {
        var index = (int)Math.Ceiling(sorted.Length * percentile) - 1;
        return sorted[Math.Clamp(index, 0, sorted.Length - 1)];
    }

    private sealed class EditorCase : IDisposable
    {
        private const int Width = 800;
        private const int Height = 520;

        private readonly TextDocument _document;
        private readonly TextEditorController _controller;
        private readonly TextPresentationLayer? _layer;
        private readonly Window _window;
        private readonly InputCoordinator _input;
        private readonly Resolver _resolver;
        private readonly SKSurface _surface;
        private bool _insert = true;
        private bool _disposed;
        private double _time;

        internal EditorCase(int documentMiB, bool deepScroll)
        {
            var source = documentMiB == 0 ? GallerySource() : LargeSource(documentMiB);
            _document = new TextDocument(source);
            _controller = new TextEditorController(_document);
            _layer = documentMiB == 0 ? ConfigureGalleryLayer(_document, source) : null;
            if (_layer is not null)
            {
                _document.Changed += SyncGalleryPresentation;
            }
            var editOffset = deepScroll ? DeepEditOffset(source) : VisibleEditOffset(source);
            _controller.Selection = CollapsedSelection(editOffset);
            if (deepScroll)
            {
                _controller.ScrollTo(0, _document.GetLineIndex(editOffset) * 20.0);
            }

            var layers = _layer is null ? Array.Empty<TextPresentationLayer>() : new[] { _layer };
            var editor = new TextEditor(_document, _controller, layers)
            {
                Width = Length.Percent(100),
                Height = Length.Percent(100),
            };
            _window = new Window
            {
                Width = Width,
                Height = Height,
                Root = new EditorRootCell(editor),
            };
            _window.UpdateTree();

            _resolver = new Resolver();
            _input = new InputCoordinator();
            _input.AfterTreeUpdated(_window.Tree, _resolver, true);
            _input.HandlePress(_window.Tree, _resolver, 0, 20, 20);
            _input.HandleRelease(_window.Tree, _resolver, 20, 20);
            if (!_controller.IsFocused)
            {
                throw new InvalidOperationException("TextEditor benchmark could not focus the editor");
            }

            _window.UpdateTree(0);
            _surface = SKSurface.Create(new SKImageInfo(Width, Height))
                ?? throw new InvalidOperationException("TextEditor benchmark surface creation failed");
            _window.PaintTo(_surface.Canvas);
            _window.markFrameRendered();
        }

        internal long SemanticEdit()
        {
            var accepted = _insert ? _controller.Insert("x") : _controller.DeleteBackward();
            _insert = !_insert;
            if (!accepted)
            {
                throw new InvalidOperationException("TextEditor benchmark edit was rejected");
            }
            return _document.Version;
        }

        internal long QueuedEdit()
        {
            if (_insert)
            {
                _input.QueueText("x");
            }
            else
            {
                _input.QueueKeyPress(Key.Backspace, new KeyModifiers());
                _input.QueueKeyRelease(Key.Backspace);
            }
            var changed = _input.Drain(_window.Tree, _resolver, _time, null);
            _time += 0.001;
            _insert = !_insert;
            if (!changed)
            {
                throw new InvalidOperationException("TextEditor benchmark input was not handled");
            }
            return _document.Version;
        }

        internal long QueuedEditAndUpdate()
        {
            var result = QueuedEdit();
            _window.UpdateTree(0);
            return result;
        }

        internal long QueuedEditUpdateAndPaint()
        {
            var result = QueuedEditAndUpdate();
            _window.PaintTo(_surface.Canvas);
            _window.markFrameRendered();
            return result;
        }

        internal long UpdateAndPaint()
        {
            _window.UpdateTree(0);
            _window.PaintTo(_surface.Canvas);
            _window.markFrameRendered();
            return _document.Version;
        }

        internal long DefensiveSnapshots()
        {
            if (_layer is null)
                throw new InvalidOperationException("The Gallery presentation layer is unavailable.");

            var count = 0L;
            for (var index = 0; index < 6; index++)
                count += _layer.StyleSpans.Length;
            for (var index = 0; index < 5; index++)
                count += _layer.Projections.Length;
            return count;
        }

        public void Dispose()
        {
            if (_disposed)
            {
                return;
            }
            _disposed = true;
            try
            {
                if (_layer is not null)
                {
                    _document.Changed -= SyncGalleryPresentation;
                }
                _input.Dispose();
                if (_window.Tree is not null)
                {
                    TextLayouts.DisposeTree(_window.Tree);
                }
            }
            finally
            {
                _surface.Dispose();
                _layer?.Dispose();
                _controller.Dispose();
            }
        }

        private void SyncGalleryPresentation(TextDocumentChange _)
        {
            if (_layer is not null)
            {
                SyncGalleryLayer(_layer, _document.GetText());
            }
        }
    }

    private sealed class GalleryPresentationCase : IDisposable
    {
        private readonly TextDocument _document;
        private readonly TextPresentationLayer _layer;
        private readonly int _offset;
        private bool _insert = true;

        internal GalleryPresentationCase()
        {
            var source = GallerySource();
            _document = new TextDocument(source);
            _layer = ConfigureGalleryLayer(_document, source);
            _document.Changed += SyncGalleryPresentation;
            _offset = VisibleEditOffset(source);
        }

        internal long Edit()
        {
            var range = _insert ? new TextRange(_offset, 0) : new TextRange(_offset, 1);
            _document.Apply(new TextChange(range, _insert ? "x" : ""));
            _insert = !_insert;
            return _document.Version;
        }

        public void Dispose()
        {
            _document.Changed -= SyncGalleryPresentation;
            _layer.Dispose();
        }

        private void SyncGalleryPresentation(TextDocumentChange _)
        {
            SyncGalleryLayer(_layer, _document.GetText());
        }
    }

    private sealed class EditorRootCell(TextEditor editor) : Cell
    {
        public override Blob Build() => new Container
        {
            Width = Length.Percent(100),
            Height = 430,
            Padding = 14,
            BackgroundColor = Color.Rgb(22, 27, 34),
            BorderWidth = 1,
            BorderColor = Color.Rgb(48, 54, 61),
            BorderRadius = 6,
            Overflow = Overflow.Hidden,
            Color = Color.Rgb(230, 237, 243),
            FontFamily = "JetBrains Mono",
            FontSize = 14,
            LineHeight = 1.45,
            Children = new List<Blob> { editor },
        };
    }

    private static TextSelection CollapsedSelection(int offset) => new(
        new TextPosition(offset, TextAffinity.Downstream),
        new TextPosition(offset, TextAffinity.Downstream));

    private static int VisibleEditOffset(string source)
    {
        const string marker = "IME composition target: ";
        var offset = source.IndexOf(marker, StringComparison.Ordinal);
        return offset < 0 ? Math.Min(32, source.Length) : offset + marker.Length;
    }

    private static int DeepEditOffset(string source)
    {
        var offset = source.Length * 4 / 5;
        while (offset < source.Length && source[offset] != '\n')
        {
            offset++;
        }
        return Math.Min(source.Length, offset + 1);
    }

    private static string LargeSource(int documentMiB)
    {
        var target = checked(documentMiB * 1024 * 1024);
        const string line = "The quick brown fox jumps over the lazy dog. Goo TextEditor benchmark line 0123456789.\n";
        var result = new StringBuilder(target + line.Length);
        while (result.Length < target)
        {
            result.Append(line);
        }
        if (result.Length > target)
        {
            result.Length = target;
        }
        return result.ToString();
    }

    private static string GallerySource() => "# Goo TextEditor\n"
        + "\n"
        + "Edit this document. It is backed by a versioned piece tree.\n"
        + "\n"
        + "Keyboard checks\n"
        + "- Shift + arrows extends the selection.\n"
        + "- Ctrl+A/C/X/V tests selection and clipboard.\n"
        + "- Ctrl+Z and Ctrl+Y test grouped undo and redo.\n"
        + "- Home, End, Page Up, and Page Down move the caret.\n"
        + "- Double-click a word. Triple-click a line.\n"
        + "\n"
        + "Unicode checks\n"
        + "- Emoji cluster: 👩🏽‍💻\n"
        + "- Combining cluster: é\n"
        + "- Mixed direction: English עברית العربية 42\n"
        + "- IME composition target: \n"
        + "\n"
        + "Presentation checks\n"
        + "- This has **bold source** with hidden delimiters.\n"
        + "- Status: [[status]]\n"
        + "- Link: https://goo.local/docs\n"
        + "[[preview]]\n"
        + "\n"
        + "Edit around the styled spans and watch them rebase.\n";

    private static TextPresentationLayer ConfigureGalleryLayer(TextDocument document, string source)
    {
        var layer = new TextPresentationLayer(document);
        SyncGalleryLayer(layer, source);
        return layer;
    }

    private static void SyncGalleryLayer(TextPresentationLayer layer, string source)
    {
        SetHeading(layer, source, "# Goo TextEditor", "heading", Color.Rgb(88, 166, 255), 22);
        SetHeading(layer, source, "Keyboard checks", "keyboard", Color.Rgb(210, 153, 34), 14);
        SetHeading(layer, source, "Unicode checks", "unicode", Color.Rgb(63, 185, 80), 14);
        SetHeading(layer, source, "Presentation checks", "presentation", Color.Rgb(248, 81, 73), 14);

        const string bold = "**bold source**";
        var boldStart = source.IndexOf(bold, StringComparison.Ordinal);
        if (boldStart >= 0)
        {
            var open = new TextRange(boldStart, 2);
            var close = new TextRange(boldStart + bold.Length - 2, 2);
            var text = new TextRange(boldStart + 2, bold.Length - 4);
            if (!ProjectionMatches(layer, "bold.open", TextProjectionKind.Hidden, open, ""))
                layer.SetHiddenRange("bold.open", open);
            if (!ProjectionMatches(layer, "bold.close", TextProjectionKind.Hidden, close, ""))
                layer.SetHiddenRange("bold.close", close);
            if (!StyleMatches(layer, "bold.text", text))
            {
                layer.SetStyle("bold.text", text, new Style
                {
                    FontWeight = 700,
                    TextDecoration = TextDecoration.Underline,
                });
            }
        }
        else
        {
            RemoveProjectionIfActive(layer, "bold.open");
            RemoveProjectionIfActive(layer, "bold.close");
            RemoveStyleIfActive(layer, "bold.text");
        }

        const string status = "[[status]]";
        var statusStart = source.IndexOf(status, StringComparison.Ordinal);
        if (statusStart >= 0)
        {
            var range = new TextRange(statusStart, status.Length);
            if (!ProjectionMatches(layer, "status", TextProjectionKind.InlineSlot, range, ""))
            {
                layer.SetInlineSlot("status", range, new Container
                {
                    Width = 82,
                    Height = 22,
                    Padding = 4,
                    BorderRadius = 999,
                    BackgroundColor = Color.Rgba(63, 185, 80, 51),
                    BorderWidth = 1,
                    BorderColor = Color.Rgb(63, 185, 80),
                    Color = Color.Rgb(230, 237, 243),
                    AlignItems = AlignItems.Center,
                    JustifyContent = JustifyContent.Center,
                    Children = new List<Blob> { new Text { Content = "READY", FontSize = 10, FontWeight = 700 } },
                });
            }
        }
        else
        {
            RemoveProjectionIfActive(layer, "status");
        }

        const string link = "https://goo.local/docs";
        var linkStart = source.IndexOf(link, StringComparison.Ordinal);
        if (linkStart >= 0)
        {
            var range = new TextRange(linkStart, link.Length);
            if (!ProjectionMatches(layer, "link", TextProjectionKind.Replacement, range, "Goo documentation"))
                layer.SetReplacement("link", range, "Goo documentation");
            if (!StyleMatches(layer, "link.style", range))
            {
                layer.SetStyle("link.style", range, new Style
                {
                    Color = Color.Rgb(88, 166, 255),
                    TextDecoration = TextDecoration.Underline,
                });
            }
        }
        else
        {
            RemoveProjectionIfActive(layer, "link");
            RemoveStyleIfActive(layer, "link.style");
        }

        const string preview = "[[preview]]";
        var previewStart = source.IndexOf(preview, StringComparison.Ordinal);
        if (previewStart >= 0)
        {
            var range = new TextRange(previewStart, preview.Length);
            if (!ProjectionMatches(layer, "preview", TextProjectionKind.BlockSlot, range, ""))
            {
                layer.SetBlockSlot("preview", range, new Container
                {
                    Width = 460,
                    Height = 56,
                    Padding = 10,
                    BorderRadius = 6,
                    BackgroundColor = Color.Rgb(33, 38, 45),
                    BorderWidth = 1,
                    BorderColor = Color.Rgb(48, 54, 61),
                    Color = Color.Rgb(230, 237, 243),
                    Children = new List<Blob>
                    {
                        new Text { Content = "Retained block Goo slot", FontWeight = 700 },
                        new Text
                        {
                            Content = "The source token remains in TextDocument.",
                            FontSize = 11,
                            Color = Color.Rgb(139, 148, 158),
                        },
                    },
                });
            }
        }
        else
        {
            RemoveProjectionIfActive(layer, "preview");
        }
    }

    private static void SetHeading(
        TextPresentationLayer layer,
        string source,
        string text,
        string key,
        Color color,
        double fontSize)
    {
        var start = source.IndexOf(text, StringComparison.Ordinal);
        if (start < 0)
        {
            RemoveStyleIfActive(layer, key);
            return;
        }
        var range = new TextRange(start, text.Length);
        if (StyleMatches(layer, key, range))
            return;
        layer.SetStyle(key, range, new Style
        {
            Color = color,
            FontSize = fontSize,
            FontWeight = 700,
        });
    }

    private static bool StyleMatches(TextPresentationLayer layer, string key, TextRange range) =>
        layer.StyleSpans.Any(span => span.Key == key && span.Range == range);

    private static bool ProjectionMatches(
        TextPresentationLayer layer,
        string key,
        TextProjectionKind kind,
        TextRange range,
        string text) => layer.Projections.Any(projection => projection.Key == key
            && projection.Kind == kind
            && projection.Range == range
            && (kind != TextProjectionKind.Replacement || projection.Text == text));

    private static void RemoveStyleIfActive(TextPresentationLayer layer, string key)
    {
        if (layer.StyleSpans.Any(value => value.Key == key && value.Range.Length != 0))
            layer.RemoveStyle(key);
    }

    private static void RemoveProjectionIfActive(TextPresentationLayer layer, string key)
    {
        if (layer.Projections.Any(value => value.Key == key))
            layer.RemoveProjection(key);
    }
}

internal sealed class Options
{
    internal int DocumentMiB { get; private set; }
    internal int Iterations { get; private set; } = 500;
    internal bool DeepScroll { get; private set; }
    internal string Stage { get; private set; } = "all";

    internal static bool TryParse(string[] args, out Options? options, out string error)
    {
        var result = new Options();
        for (var index = 0; index < args.Length; index++)
        {
            switch (args[index])
            {
                case "--document-mb":
                    if (!TryReadInt(args, ref index, out var documentMiB))
                    {
                        options = null;
                        error = "--document-mb requires an integer value";
                        return false;
                    }
                    result.DocumentMiB = documentMiB;
                    break;
                case "--iterations":
                    if (!TryReadInt(args, ref index, out var iterations))
                    {
                        options = null;
                        error = "--iterations requires an integer value";
                        return false;
                    }
                    result.Iterations = iterations;
                    break;
                case "--deep-scroll":
                    result.DeepScroll = true;
                    break;
                case "--stage":
                    if (++index >= args.Length)
                    {
                        options = null;
                        error = "--stage requires a value";
                        return false;
                    }
                    result.Stage = args[index];
                    break;
                default:
                    options = null;
                    error = $"Unknown option: {args[index]}";
                    return false;
            }
        }
        if (result.DocumentMiB is < 0 or > 50)
        {
            options = null;
            error = "--document-mb must be from 0 through 50";
            return false;
        }
        if (result.Iterations < 20)
        {
            options = null;
            error = "--iterations must be at least 20";
            return false;
        }
        if (result.Stage is not ("all" or "semantic" or "queued" or "retained" or "paint" or "unchanged" or "presentation"))
        {
            options = null;
            error = "--stage must be all, semantic, queued, retained, paint, unchanged, or presentation";
            return false;
        }
        options = result;
        error = "";
        return true;
    }

    private static bool TryReadInt(string[] args, ref int index, out int value)
    {
        value = 0;
        return index + 1 < args.Length && int.TryParse(args[++index], out value);
    }
}
