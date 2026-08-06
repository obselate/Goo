using System.Text;
using System.Text.RegularExpressions;
using System.Xml.Linq;

var repositoryRoot = FindRepositoryRoot(Environment.CurrentDirectory);
var arguments = ParseArguments(args);
var xmlPath = Resolve(arguments.GetValueOrDefault("xml"),
    Path.Combine(repositoryRoot, "Goo", "bin", "Release", "net10.0", "Goo.xml"));
var sourceRoot = Resolve(arguments.GetValueOrDefault("source"), Path.Combine(repositoryRoot, "Goo"));
var outputRoot = Resolve(arguments.GetValueOrDefault("output"), Path.Combine(repositoryRoot, "docs", "api"));

if (!File.Exists(xmlPath))
    throw new FileNotFoundException("Build Goo in Release mode before generating API pages.", xmlPath);

var sourceDirectories = Directory.EnumerateDirectories(sourceRoot)
    .Where(path => Path.GetFileName(path) is not ("bin" or "obj"))
    .OrderBy(Path.GetFileName, StringComparer.Ordinal)
    .ToArray();
var types = sourceDirectories
    .SelectMany(path => ReadTypes(path, sourceRoot))
    .GroupBy(type => type.XmlName, StringComparer.Ordinal)
    .Select(group => group.First() with
    {
        Sources = group.SelectMany(type => type.Sources)
            .OrderBy(source => source.RelativeFile, StringComparer.Ordinal)
            .ToArray(),
    })
    .OrderBy(type => type.Directory, StringComparer.Ordinal)
    .ThenBy(type => type.DisplayName, StringComparer.Ordinal)
    .ToArray();
var members = XDocument.Load(xmlPath)
    .Descendants("member")
    .Select(element => new ApiMember(
        element.Attribute("name")?.Value ?? throw new InvalidDataException("XML member has no name."),
        element))
    .ToArray();

var matched = new HashSet<string>(StringComparer.Ordinal);
Directory.CreateDirectory(outputRoot);
foreach (var directoryPath in sourceDirectories)
{
    var directory = Path.GetFileName(directoryPath);
    var pageTypes = types.Where(type => type.Directory == directory).ToArray();
    var markdown = BuildPage(directory, pageTypes, members, matched);
    WriteIfChanged(Path.Combine(outputRoot, directory.ToLowerInvariant() + ".md"), markdown);
}

var unmatched = members.Select(member => member.Id)
    .Where(id => !matched.Contains(id))
    .Order(StringComparer.Ordinal)
    .ToArray();
if (unmatched.Length != 0)
    throw new InvalidDataException("Unmapped Goo.xml members:" + Environment.NewLine + string.Join(Environment.NewLine, unmatched));

WriteIfChanged(Path.Combine(outputRoot, "README.md"), BuildIndex(sourceDirectories));
Console.WriteLine($"Generated {sourceDirectories.Length} API pages in {outputRoot}.");

static string BuildPage(string directory, ApiType[] types, ApiMember[] members, HashSet<string> matched)
{
    var text = new StringBuilder();
    text.AppendLine($"# {directory} API");
    text.AppendLine();
    text.AppendLine("Generated from `Goo.xml`. Source declarations supply type ownership and XML-emitter omissions.");
    text.AppendLine();
    text.AppendLine($"Source: [`Goo/{directory}`](../../Goo/{directory})");

    if (directory == "Accessibility")
        AppendAccessibilityGuide(text);
    if (directory == "Window")
        AppendWindowMetricsGuide(text);
    if (directory == "Window")
        AppendWindowDispatcherGuide(text);
    if (directory == "Window")
        AppendClipboardGuide(text);
    if (directory == "Input")
        AppendTextInputGuide(text);
    if (directory == "Input")
        AppendPointerLifecycleGuide(text);
    if (directory == "Tree")
        AppendOwnedImageSourceGuide(text);
    if (directory == "Tree")
        AppendElementMetricsGuide(text);
    if (directory == "Tree")
        AppendTextInputAreaGuide(text);

    if (types.Length == 0)
    {
        text.AppendLine();
        text.AppendLine("This source directory declares no public types.");
        return text.ToString();
    }

    foreach (var type in types)
    {
        text.AppendLine();
        text.AppendLine($"## `{type.DisplayName}`");
        text.AppendLine();
        text.AppendLine(type.Sources.Count == 1 ? "Source:" : "Sources:");
        text.AppendLine();
        foreach (var source in type.Sources)
            text.AppendLine($"- [`{source.FileName}`](../../Goo/{type.Directory}/{source.RelativeFile})");

        var typeId = "T:" + type.XmlName;
        var typeMember = members.SingleOrDefault(member => member.Id == typeId);
        if (typeMember is not null)
        {
            matched.Add(typeId);
            AppendText(text, Summary(typeMember.Element));
        }
        else
        {
            AppendText(text, type.Summary);
        }

        if (type.EnumValues.Count != 0)
        {
            text.AppendLine();
            text.AppendLine("### Values");
            text.AppendLine();
            foreach (var value in type.EnumValues)
                text.AppendLine($"- `{value}`");
        }

        if (type.XmlName == "Goo.ImageSourceProvider"
            && !members.Any(member => BelongsTo(member.Id, type.XmlName)))
            AppendImageSourceProviderMembers(text);

        foreach (var member in members
            .Where(member => BelongsTo(member.Id, type.XmlName))
            .OrderBy(member => member.Id, StringComparer.Ordinal))
        {
            matched.Add(member.Id);
            text.AppendLine();
            text.AppendLine($"### `{DisplayMember(member, type)}`");
            AppendText(text, Summary(member.Element));

            var parameters = member.Element.Elements("typeparam")
                .Concat(member.Element.Elements("param"))
                .ToArray();
            if (parameters.Length != 0)
            {
                text.AppendLine();
                foreach (var parameter in parameters)
                    text.AppendLine($"- `{parameter.Attribute("name")?.Value}`: {Normalize(parameter.Value)}");
            }

            var returns = Normalize(member.Element.Element("returns")?.Value);
            if (returns.Length != 0)
            {
                text.AppendLine();
                text.AppendLine($"Returns: {returns}");
            }
        }
    }

    return text.ToString();
}

static void AppendOwnedImageSourceGuide(StringBuilder text)
{
    text.AppendLine();
    text.AppendLine("## Owned image sources");
    text.AppendLine();
    text.AppendLine("`Image.Source` and `Style.BackgroundImageSource` accept an `ImageSourceProvider`. A source wins over its local image path. Goo preserves the path for a later source removal, but never falls back to it after source failure.");
    text.AppendLine();
    text.AppendLine("`ImageSource(width, height, pixels)` copies one exact row-major premultiplied-RGBA buffer (`width * height * 4` bytes) into Goo-owned storage. Width and height must be positive. The buffer must be non-null and exactly that length. Disposing the source releases its owner reference while already-mounted leases remain usable until their elements unmount or replace the source.");
    text.AppendLine();
    text.AppendLine("Custom providers create one `ImageSourceLease` per mounted binding. Each lease completes once through `Complete(source)` or `Fail()`. Goo releases a replaced or unmounted lease synchronously and raises `Released` exactly once, so providers should cancel outstanding work from that event. Late completion returns `false`; callback exceptions cannot interrupt Goo cleanup. Stable source identity keeps its existing lease, so warm paints do not reacquire or lock provider state.");
}

static void AppendImageSourceProviderMembers(StringBuilder text)
{
    text.AppendLine();
    text.AppendLine("### `Acquire`");
    text.AppendLine();
    text.AppendLine("Creates the lease that Goo owns and disposes for one mounted image or background binding.");
}

static void AppendAccessibilityGuide(StringBuilder text)
{
    text.AppendLine();
    text.AppendLine("## Use accessibility semantics");
    text.AppendLine();
    text.AppendLine("Set `Blob.Accessibility` to declare role, name, description, value, state, relationships, and composed-control actions. The model is backend-neutral. An `AccessibilityAdapter` maps the retained tree to a platform API.");
    text.AppendLine();
    text.AppendLine("Native primitives publish defaults: text, button, text entry, editor, and image. `Role.None` removes only its own node and keeps semantic descendants. `Hidden` removes the complete subtree. Display and visibility exclusion also remove a subtree.");
    text.AppendLine();
    text.AppendLine("Semantic IDs are stable for the mounted window lifetime. Adapters receive mutable retained node and tree views. Read each view again after an update. Call the adapter and route actions only on Goo's UI thread.");
    text.AppendLine();
    text.AppendLine("`AccessibilityTree` exposes `Root` and monotonic `Version`. Each `AccessibilityNode` exposes ID, role, name, value, state, bounds, actions, children, relationships, and editor `TextSnapshot`, selection, and caret. `AccessibilityRelationshipIds` exposes ordered ID lists plus an active descendant.");
    text.AppendLine();
    text.AppendLine("Replacing an adapter delivers the current retained tree to the replacement. A failed delivery retries once on a later UI update and exposes `Window.LastAccessibilityError`.");
    text.AppendLine();
    text.AppendLine("Use `ElementHandle` relationships only for mounted nodes in the same window. Hidden, flattened, detached, and foreign targets are omitted.");
    text.AppendLine();
    text.AppendLine("Route neutral actions with `new AccessibilityActionRequest(action)`. Use `SetValue`, `SetSelection`, and `Scroll` factories for payload actions. `Window.PerformAccessibilityAction` checks the advertised capability before routing built-in or declared actions.");
    text.AppendLine();
    text.AppendLine("Text editors expose `TextSnapshot`, selection, and caret metadata. The snapshot is versioned and avoids a full document copy.");
}

static void AppendWindowDispatcherGuide(StringBuilder text)
{
    text.AppendLine();
    text.AppendLine("## Post UI work");
    text.AppendLine();
    text.AppendLine("Call `Window.Post` from any thread. Accepted actions use FIFO order. Post accepts work before the first `Open`. A pending `RequestClose` still accepts work because `OnClosing` can veto the request.");
    text.AppendLine();
    text.AppendLine("Each `Pump` drains one fixed accepted batch after close decisions and native metrics, and before input. Posts made while that batch runs wait for the next `Pump`. When native closing or teardown starts, Goo discards queued work. Teardown is terminal and later `Post` calls throw `InvalidOperationException`.");
    text.AppendLine();
    text.AppendLine("Pump removes an action before it calls the action. If it throws, Pump throws the same exception and later queued actions remain for the next direct `Pump`. `Run` propagates the exception, then closes the window and discards queued work. Accessibility adapters can use `Post` before calling Window accessibility APIs.");
}

static void AppendWindowMetricsGuide(StringBuilder text)
{
    text.AppendLine();
    text.AppendLine("## Observe window metrics");
    text.AppendLine();
    text.AppendLine("Subscribe to `Window.MetricsChanged` on the UI thread. Goo delivers an immutable snapshot after queued native metrics and tree layout settle. A callback can queue UI work, but it must not expect recursive layout.");
    text.AppendLine();
    text.AppendLine("The snapshot reports the dimensions from the latest native metrics event. A zero framebuffer dimension is reported as zero and its corresponding display scale is zero. Goo keeps the prior render target while minimized or otherwise zero-sized.");
    text.AppendLine();
    text.AppendLine("Equal snapshots do not notify. A listener added after another listener has already received the current snapshot waits for a real change. Removing the final listener resets that listener stream, so a later first listener receives a new initial snapshot.");
}

static void AppendClipboardGuide(StringBuilder text)
{
    text.AppendLine();
    text.AppendLine("## Use the native clipboard");
    text.AppendLine();
    text.AppendLine("Call `Window.GetClipboardText` and `Window.SetClipboardText` only on the open window's UI thread. Both fail deterministically after close. An empty getter result can mean either an empty clipboard or a native copy failure; setter failures propagate. Built-in text entry and editor shortcuts use the same native clipboard path.");
}

static void AppendTextInputGuide(StringBuilder text)
{
    text.AppendLine();
    text.AppendLine("## Receive generic text and IME input");
    text.AppendLine();
    text.AppendLine("A focusable `Blob` can opt into `OnTextInput`, `OnTextComposition`, `OnTextCompositionCancel`, and `OnTextCandidates`. Committed text and composition offsets use UTF-16. Invalid or surrogate-splitting composition selections are delivered as the empty range. Candidate snapshots are read-only and use `SelectedCandidate = -1` when native selection is invalid.");
    text.AppendLine();
    text.AppendLine("Callbacks run only for the currently focused, enabled, visible client. Queued text is bound to the focus generation that received it, so it is discarded after a focus transfer, including a transfer back to the original element. `TextEntry` and `TextEditor` retain their existing default behavior before these observers run. Goo provides no candidate UI; applications own candidate presentation.");
}

static void AppendPointerLifecycleGuide(StringBuilder text)
{
    text.AppendLine();
    text.AppendLine("## Receive pointer lifecycle and pressure input");
    text.AppendLine();
    text.AppendLine("`OnPointerEnter` and `OnPointerLeave` are sparse, non-bubbling lifecycle callbacks. They run only for mouse hover-route changes. Goo sends leaves from the old route leaf to root, then enters from the new route root to leaf. Shared route ancestors receive neither callback. Removal, disable, hidden state, focus loss, and transformed hit routes use the same order.");
    text.AppendLine();
    text.AppendLine("`PointerEvent.IsPrimary` is true for the mouse and the first active touch or pen contact in a device-type sequence. The primary contact stays primary through its up callback. Goo does not promote another held contact during that sequence.");
    text.AppendLine();
    text.AppendLine("`PointerEvent.Pressure` is normalized to the inclusive range from 0 to 1. Mouse pressure is 1 only while the primary button is held and 0 otherwise. Touch samples every SDL down, move, and up event. Pen samples its latest pressure-axis value on the next down, move, up, or pen-button event. A pressure-axis event alone emits no `PointerMove`. A pen proximity-out clears that pen's sampled pressure. Goo does not coalesce movement or expose tilt, twist, contact geometry, raw history, or gesture recognition.");
}

static void AppendTextInputAreaGuide(StringBuilder text)
{
    text.AppendLine();
    text.AppendLine("## Position a custom IME");
    text.AppendLine();
    text.AppendLine("A focused generic text client can call `ElementHandle.SetTextInputArea` with a finite, non-negative logical-window rectangle. Goo floors the origin, ceils the far edge, and passes cursor offset zero to the native IME. The call returns false for unmounted, unfocused, built-in, closed-window, nonparticipating, or native-IME-unavailable elements. Invalid and out-of-range rectangles throw.");
}

static void AppendElementMetricsGuide(StringBuilder text)
{
    text.AppendLine();
    text.AppendLine("## Observe mounted element metrics");
    text.AppendLine();
    text.AppendLine("Subscribe to `ElementHandle.MetricsChanged` on the UI thread. The immutable snapshot contains mounted state, transformed border and content boxes in window logical coordinates, and the actual scroll offset.");
    text.AppendLine();
    text.AppendLine("Goo calls listeners after reconciliation, layout, rect refresh, and scroll stepping settle. Detach produces one final `IsMounted = false` snapshot after tree disposal. A detach followed by reattach in the same update reports only the final mounted state.");
    text.AppendLine();
    text.AppendLine("Subscription state is sparse. Handles without a listener and ordinary blobs and nodes do not retain metrics state. New handle subscriptions made during metric delivery wait for the next update. Listener changes on an already accepted handle follow ordinary live event behavior.");
}

static string BuildIndex(string[] sourceDirectories)
{
    var text = new StringBuilder();
    text.AppendLine("# Goo API");
    text.AppendLine();
    text.AppendLine("These pages are generated from the Release `Goo.xml` file.");
    text.AppendLine();
    foreach (var path in sourceDirectories)
    {
        var name = Path.GetFileName(path);
        text.AppendLine($"- [{name}]({name.ToLowerInvariant()}.md)");
    }
    return text.ToString();
}

static IEnumerable<ApiType> ReadTypes(string directoryPath, string sourceRoot)
{
    var typePattern = new Regex(
        @"(?m)^public\s+(?:(?:partial|sealed|open|data)\s+)*(?<kind>class|struct|enum|interface)\s+(?<name>[A-Za-z_][A-Za-z0-9_]*)(?<generic>\[[^\]\r\n]+\])?",
        RegexOptions.CultureInvariant);
    foreach (var file in Directory.EnumerateFiles(directoryPath, "*.gs", SearchOption.AllDirectories)
        .Order(StringComparer.Ordinal))
    {
        var source = File.ReadAllText(file);
        foreach (Match match in typePattern.Matches(source))
        {
            var name = match.Groups["name"].Value;
            var generic = match.Groups["generic"].Value;
            var arity = generic.Length == 0 ? 0 : generic.Count(character => character == ',') + 1;
            var xmlName = "Goo." + name + (arity == 0 ? "" : "`" + arity);
            var values = match.Groups["kind"].Value == "enum"
                ? ReadEnumValues(source, match.Index + match.Length)
                : [];
            yield return new ApiType(
                Path.GetFileName(directoryPath),
                name + generic.Replace('[', '<').Replace(']', '>'),
                xmlName,
                ReadSourceSummary(source, match.Index),
                values,
                [new ApiSource(
                    Path.GetRelativePath(directoryPath, file).Replace(Path.DirectorySeparatorChar, '/'),
                    Path.GetFileName(file))]);
        }
    }
}

static IReadOnlyList<string> ReadEnumValues(string source, int start)
{
    var open = source.IndexOf('{', start);
    if (open < 0)
        return [];
    var depth = 0;
    var close = -1;
    for (var index = open; index < source.Length; index++)
    {
        if (source[index] == '{')
            depth++;
        else if (source[index] == '}' && --depth == 0)
        {
            close = index;
            break;
        }
    }
    if (close < 0)
        return [];

    var body = Regex.Replace(source[(open + 1)..close], @"(?m)^\s*///.*$", "");
    return body.Split(';', StringSplitOptions.RemoveEmptyEntries)
        .Select(part => Regex.Match(part, @"^\s*(?<name>[A-Za-z_][A-Za-z0-9_]*)"))
        .Where(match => match.Success)
        .Select(match => match.Groups["name"].Value)
        .ToArray();
}

static string ReadSourceSummary(string source, int declarationStart)
{
    var lines = source[..declarationStart].Replace("\r\n", "\n").Split('\n').ToList();
    while (lines.Count != 0 && (lines[^1].Trim().Length == 0 || lines[^1].TrimStart().StartsWith('@')))
        lines.RemoveAt(lines.Count - 1);
    var summary = new List<string>();
    while (lines.Count != 0 && lines[^1].TrimStart().StartsWith("///", StringComparison.Ordinal))
    {
        summary.Add(lines[^1].TrimStart()[3..].Trim());
        lines.RemoveAt(lines.Count - 1);
    }
    summary.Reverse();
    return Normalize(string.Join(' ', summary));
}

static bool BelongsTo(string id, string xmlTypeName) =>
    id.StartsWith("M:" + xmlTypeName + ".", StringComparison.Ordinal) ||
    id.StartsWith("P:" + xmlTypeName + ".", StringComparison.Ordinal) ||
    id.StartsWith("F:" + xmlTypeName + ".", StringComparison.Ordinal) ||
    id.StartsWith("E:" + xmlTypeName + ".", StringComparison.Ordinal);

static string DisplayMember(ApiMember member, ApiType type)
{
    var value = member.Id[(type.XmlName.Length + 3)..];
    var methodParameters = member.Element.Elements("typeparam")
        .Select(element => element.Attribute("name")?.Value ?? "T")
        .ToArray();
    for (var index = 0; index < methodParameters.Length; index++)
        value = value.Replace("``" + index, methodParameters[index], StringComparison.Ordinal);
    var typeParameters = GenericNames(type.DisplayName);
    for (var index = 0; index < typeParameters.Length; index++)
        value = value.Replace("`" + index, typeParameters[index], StringComparison.Ordinal);
    return value
        .Replace("#ctor", "new", StringComparison.Ordinal)
        .Replace("System.Boolean", "bool", StringComparison.Ordinal)
        .Replace("System.Double", "float64", StringComparison.Ordinal)
        .Replace("System.Single", "float32", StringComparison.Ordinal)
        .Replace("System.Int32", "int32", StringComparison.Ordinal)
        .Replace("System.String", "string", StringComparison.Ordinal)
        .Replace("Goo.", "", StringComparison.Ordinal);
}

static string[] GenericNames(string displayName)
{
    var open = displayName.IndexOf('<');
    return open < 0
        ? []
        : displayName[(open + 1)..^1].Split(',', StringSplitOptions.TrimEntries);
}

static string Summary(XElement element) => Normalize(element.Element("summary")?.Value);

static string Normalize(string? value) =>
    Regex.Replace(value ?? "", @"\s+", " ").Trim();

static void AppendText(StringBuilder text, string value)
{
    if (value.Length == 0)
        return;
    text.AppendLine();
    text.AppendLine(value);
}

static void WriteIfChanged(string path, string content)
{
    content = content.Replace("\r\n", "\n");
    if (File.Exists(path) && File.ReadAllText(path) == content)
        return;
    Directory.CreateDirectory(Path.GetDirectoryName(path)!);
    File.WriteAllText(path, content, new UTF8Encoding(false));
}

static Dictionary<string, string> ParseArguments(string[] values)
{
    var result = new Dictionary<string, string>(StringComparer.Ordinal);
    for (var index = 0; index < values.Length; index += 2)
    {
        if (!values[index].StartsWith("--", StringComparison.Ordinal) || index + 1 >= values.Length)
            throw new ArgumentException("Use --xml, --source, or --output followed by a path.");
        result[values[index][2..]] = values[index + 1];
    }
    return result;
}

static string Resolve(string? value, string fallback) =>
    Path.GetFullPath(value ?? fallback);

static string FindRepositoryRoot(string start)
{
    for (var directory = new DirectoryInfo(start); directory is not null; directory = directory.Parent)
    {
        if (File.Exists(Path.Combine(directory.FullName, "Goo", "Goo.gsproj")))
            return directory.FullName;
    }
    throw new DirectoryNotFoundException("Could not find the Goo repository root.");
}

sealed record ApiType(
    string Directory,
    string DisplayName,
    string XmlName,
    string Summary,
    IReadOnlyList<string> EnumValues,
    IReadOnlyList<ApiSource> Sources);

sealed record ApiSource(string RelativeFile, string FileName);

sealed record ApiMember(string Id, XElement Element);
