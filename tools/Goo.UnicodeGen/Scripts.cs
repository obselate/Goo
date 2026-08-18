using System.Globalization;
using System.Linq;
using System.Text;

internal sealed record ScriptGenerationResult(
    string ScriptsSource,
    string ScriptExtensionsSource,
    int ScriptRangeCount,
    int ScriptExtensionRangeCount);

internal static class ScriptGenerator
{
    public static ScriptGenerationResult Generate(
        string scriptsSource,
        string scriptExtensionsSource,
        string propertyValueAliasesSource,
        string version,
        string scriptsSourceUrl,
        string scriptsSourceSha256,
        string scriptExtensionsSourceUrl,
        string scriptExtensionsSourceSha256,
        string propertyValueAliasesSourceUrl,
        string propertyValueAliasesSourceSha256)
    {
        var aliases = ParseAliases(propertyValueAliasesSource);
        var scripts = ParseScripts(scriptsSource, aliases);
        var extensions = ParseScriptExtensions(scriptExtensionsSource, aliases);
        return new ScriptGenerationResult(
            RenderScripts(scripts, version, scriptsSourceUrl, scriptsSourceSha256,
                propertyValueAliasesSourceUrl, propertyValueAliasesSourceSha256),
            RenderScriptExtensions(extensions, version, scriptExtensionsSourceUrl,
                scriptExtensionsSourceSha256, propertyValueAliasesSourceUrl,
                propertyValueAliasesSourceSha256),
            scripts.Count,
            extensions.Ranges.Count);
    }

    private static Dictionary<string, string> ParseAliases(string source)
    {
        var result = new Dictionary<string, string>(StringComparer.Ordinal);
        foreach (var rawLine in source.Split('\n'))
        {
            var line = StripComment(rawLine);
            if (line.Length == 0)
                continue;
            var fields = line.Split(';', StringSplitOptions.TrimEntries);
            if (fields.Length < 3 || fields[0] != "sc")
                continue;
            var shortName = fields[1];
            foreach (var alias in fields.Skip(1))
            {
                if (alias.Length == 0)
                    continue;
                if (result.TryGetValue(alias, out var prior) && prior != shortName)
                    throw new InvalidDataException($"Conflicting Script alias: {alias}");
                result[alias] = shortName;
            }
        }
        return result;
    }

    private static List<ScriptRange> ParseScripts(string source,
        Dictionary<string, string> aliases)
    {
        var ranges = new List<ScriptRange>();
        foreach (var rawLine in source.Split('\n'))
        {
            var line = StripComment(rawLine);
            if (line.Length == 0)
                continue;
            var separator = line.IndexOf(';');
            if (separator < 0)
                throw new InvalidDataException($"Malformed Scripts row: {rawLine}");
            var range = ParseRange(line[..separator].Trim());
            var property = line[(separator + 1)..].Trim();
            ranges.Add(new ScriptRange(range.Start, range.End, ResolveTag(property, aliases)));
        }
        ranges.Sort((left, right) => left.Start.CompareTo(right.Start));
        var result = new List<ScriptRange>();
        foreach (var range in ranges)
        {
            if (result.Count != 0 && range.Start <= result[^1].End)
                throw new InvalidDataException("Overlapping Scripts ranges.");
            if (result.Count != 0 && result[^1].Tag == range.Tag
                && result[^1].End + 1 == range.Start)
            {
                var prior = result[^1];
                result[^1] = prior with { End = range.End };
            }
            else
            {
                result.Add(range);
            }
        }
        return result;
    }

    private static ScriptExtensionData ParseScriptExtensions(string source,
        Dictionary<string, string> aliases)
    {
        var sets = new List<uint[]>();
        var setIndices = new Dictionary<string, int>(StringComparer.Ordinal);
        var ranges = new List<ScriptExtensionRange>();
        foreach (var rawLine in source.Split('\n'))
        {
            var line = StripComment(rawLine);
            if (line.Length == 0)
                continue;
            var separator = line.IndexOf(';');
            if (separator < 0)
                throw new InvalidDataException($"Malformed ScriptExtensions row: {rawLine}");
            var range = ParseRange(line[..separator].Trim());
            var names = line[(separator + 1)..].Trim()
                .Split(' ', StringSplitOptions.RemoveEmptyEntries | StringSplitOptions.TrimEntries);
            if (names.Length == 0)
                throw new InvalidDataException($"Empty ScriptExtensions set: {rawLine}");
            var tags = names.Select(name => ResolveTag(name, aliases)).Distinct().Order().ToArray();
            if (tags.Length == 0)
                throw new InvalidDataException($"Empty ScriptExtensions set: {rawLine}");
            var key = string.Join(",", tags.Select(value => value.ToString(CultureInfo.InvariantCulture)));
            if (!setIndices.TryGetValue(key, out var setIndex))
            {
                setIndex = sets.Count;
                setIndices.Add(key, setIndex);
                sets.Add(tags);
            }
            if (ranges.Count != 0 && ranges[^1].End >= range.Start)
                throw new InvalidDataException("Overlapping ScriptExtensions ranges.");
            if (ranges.Count != 0 && ranges[^1].SetIndex == setIndex
                && ranges[^1].End + 1 == range.Start)
            {
                var prior = ranges[^1];
                ranges[^1] = prior with { End = range.End };
            }
            else
            {
                ranges.Add(new ScriptExtensionRange(range.Start, range.End, setIndex));
            }
        }

        var offsets = new int[sets.Count];
        var flattened = new List<uint>();
        for (var index = 0; index < sets.Count; index++)
        {
            offsets[index] = flattened.Count;
            flattened.AddRange(sets[index]);
        }
        return new ScriptExtensionData(ranges, offsets, sets.Select(set => set.Length).ToArray(), flattened);
    }

    private static uint ResolveTag(string name, Dictionary<string, string> aliases)
    {
        if (!aliases.TryGetValue(name, out var shortName))
            throw new InvalidDataException($"Unknown Script value: {name}");
        if (shortName.Length != 4)
            throw new InvalidDataException($"Invalid ISO 15924 Script tag: {shortName}");
        return ((uint)(byte)shortName[0] << 24)
            | ((uint)(byte)shortName[1] << 16)
            | ((uint)(byte)shortName[2] << 8)
            | (uint)(byte)shortName[3];
    }

    private static string RenderScripts(List<ScriptRange> ranges, string version,
        string sourceUrl, string sourceSha256, string aliasesUrl, string aliasesSha256)
    {
        var builder = new StringBuilder();
        AppendLine(builder, "package Goo");
        AppendLine(builder, "");
        AppendLine(builder, "internal data struct UnicodeScriptRange(Start int32, End int32, Tag uint32) { }");
        AppendLine(builder, "");
        AppendLine(builder, "internal class UnicodeScriptsData {");
        AppendLine(builder, "  shared {");
        AppendLine(builder, $"    internal const SourceVersion string = \"{version}\"");
        AppendLine(builder, $"    internal const SourceUrl string = \"{sourceUrl}\"");
        AppendLine(builder, $"    internal const SourceSha256 string = \"{sourceSha256}\"");
        AppendLine(builder, $"    internal const PropertyValueAliasesSourceUrl string = \"{aliasesUrl}\"");
        AppendLine(builder, $"    internal const PropertyValueAliasesSourceSha256 string = \"{aliasesSha256}\"");
        AppendLine(builder, "    internal const CommonTag uint32 = 1517910393u");
        AppendLine(builder, "    internal const InheritedTag uint32 = 1516858984u");
        AppendLine(builder, "    internal const UnknownTag uint32 = 1517976186u");
        AppendLine(builder, "    private let ranges []UnicodeScriptRange = []UnicodeScriptRange{");
        foreach (var range in ranges)
            AppendLine(builder, $"      UnicodeScriptRange(0x{range.Start:X}, 0x{range.End:X}, {range.Tag}u),");
        AppendLine(builder, "    }");
        AppendLine(builder, "");
        AppendLine(builder, "    internal func Classify(value int32) uint32 {");
        AppendLine(builder, "      var low int32 = 0");
        AppendLine(builder, "      var high = ranges.Length - 1");
        AppendLine(builder, "      while low <= high {");
        AppendLine(builder, "        let middle = low + (high - low) / 2");
        AppendLine(builder, "        let current = ranges[middle]");
        AppendLine(builder, "        if value < current.Start {");
        AppendLine(builder, "          high = middle - 1");
        AppendLine(builder, "        } else if value > current.End {");
        AppendLine(builder, "          low = middle + 1");
        AppendLine(builder, "        } else {");
        AppendLine(builder, "          return current.Tag");
        AppendLine(builder, "        }");
        AppendLine(builder, "      }");
        AppendLine(builder, "      return UnknownTag");
        AppendLine(builder, "    }");
        AppendLine(builder, "  }");
        AppendLine(builder, "}");
        return builder.ToString();
    }

    private static string RenderScriptExtensions(ScriptExtensionData data, string version,
        string sourceUrl, string sourceSha256, string aliasesUrl, string aliasesSha256)
    {
        var builder = new StringBuilder();
        AppendLine(builder, "package Goo");
        AppendLine(builder, "");
        AppendLine(builder, "internal data struct UnicodeScriptExtensionRange(Start int32, End int32, Offset int32, Count int32) { }");
        AppendLine(builder, "");
        AppendLine(builder, "internal class UnicodeScriptExtensionsData {");
        AppendLine(builder, "  shared {");
        AppendLine(builder, $"    internal const SourceVersion string = \"{version}\"");
        AppendLine(builder, $"    internal const SourceUrl string = \"{sourceUrl}\"");
        AppendLine(builder, $"    internal const SourceSha256 string = \"{sourceSha256}\"");
        AppendLine(builder, $"    internal const PropertyValueAliasesSourceUrl string = \"{aliasesUrl}\"");
        AppendLine(builder, $"    internal const PropertyValueAliasesSourceSha256 string = \"{aliasesSha256}\"");
        AppendLine(builder, "    private let offsets []int32 = []int32{");
        foreach (var offset in data.Offsets)
            AppendLine(builder, $"      {offset},");
        AppendLine(builder, "    }");
        AppendLine(builder, "    private let counts []int32 = []int32{");
        foreach (var count in data.Counts)
            AppendLine(builder, $"      {count},");
        AppendLine(builder, "    }");
        AppendLine(builder, "    private let tags []uint32 = []uint32{");
        foreach (var tag in data.Tags)
            AppendLine(builder, $"      {tag}u,");
        AppendLine(builder, "    }");
        AppendLine(builder, "    private let ranges []UnicodeScriptExtensionRange = []UnicodeScriptExtensionRange{");
        foreach (var range in data.Ranges)
        {
            var offset = data.Offsets[range.SetIndex];
            var count = data.Counts[range.SetIndex];
            AppendLine(builder, $"      UnicodeScriptExtensionRange(0x{range.Start:X}, 0x{range.End:X}, {offset}, {count}),");
        }
        AppendLine(builder, "    }");
        AppendLine(builder, "");
        AppendLine(builder, "    internal func Contains(value int32, script uint32) bool {");
        AppendLine(builder, "      let index = Find(value)");
        AppendLine(builder, "      if index < 0 { return UnicodeScriptsData.Classify(value) == script }");
        AppendLine(builder, "      let entry = ranges[index]");
        AppendLine(builder, "      var offset = entry.Offset");
        AppendLine(builder, "      let end = offset + entry.Count");
        AppendLine(builder, "      while offset < end {");
        AppendLine(builder, "        if tags[offset] == script { return true }");
        AppendLine(builder, "        offset++");
        AppendLine(builder, "      }");
        AppendLine(builder, "      return false");
        AppendLine(builder, "    }");
        AppendLine(builder, "");
        AppendLine(builder, "    internal func AllowsAny(value int32) bool {");
        AppendLine(builder, "      let index = Find(value)");
        AppendLine(builder, "      if index < 0 {");
        AppendLine(builder, "        let script = UnicodeScriptsData.Classify(value)");
        AppendLine(builder, "        return script == UnicodeScriptsData.CommonTag || script == UnicodeScriptsData.InheritedTag");
        AppendLine(builder, "      }");
        AppendLine(builder, "      let entry = ranges[index]");
        AppendLine(builder, "      var offset = entry.Offset");
        AppendLine(builder, "      let end = offset + entry.Count");
        AppendLine(builder, "      while offset < end {");
        AppendLine(builder, "        if tags[offset] == UnicodeScriptsData.CommonTag || tags[offset] == UnicodeScriptsData.InheritedTag { return true }");
        AppendLine(builder, "        offset++");
        AppendLine(builder, "      }");
        AppendLine(builder, "      return false");
        AppendLine(builder, "    }");
        AppendLine(builder, "");
        AppendLine(builder, "    private func Find(value int32) int32 {");
        AppendLine(builder, "      var low int32 = 0");
        AppendLine(builder, "      var high = ranges.Length - 1");
        AppendLine(builder, "      while low <= high {");
        AppendLine(builder, "        let middle = low + (high - low) / 2");
        AppendLine(builder, "        let current = ranges[middle]");
        AppendLine(builder, "        if value < current.Start {");
        AppendLine(builder, "          high = middle - 1");
        AppendLine(builder, "        } else if value > current.End {");
        AppendLine(builder, "          low = middle + 1");
        AppendLine(builder, "        } else {");
        AppendLine(builder, "          return middle");
        AppendLine(builder, "        }");
        AppendLine(builder, "      }");
        AppendLine(builder, "      return -1");
        AppendLine(builder, "    }");
        AppendLine(builder, "  }");
        AppendLine(builder, "}");
        return builder.ToString();
    }

    private static string StripComment(string rawLine)
    {
        var line = rawLine.Trim().TrimStart('\uFEFF');
        var comment = line.IndexOf('#');
        return comment >= 0 ? line[..comment].Trim() : line;
    }

    private static CodePointRange ParseRange(string value)
    {
        var separator = value.IndexOf("..", StringComparison.Ordinal);
        var start = ParseCodePoint(separator < 0 ? value : value[..separator]);
        var end = ParseCodePoint(separator < 0 ? value : value[(separator + 2)..]);
        if (end < start)
            throw new InvalidDataException($"Descending Unicode range: {value}");
        return new CodePointRange(start, end);
    }

    private static int ParseCodePoint(string value) =>
        int.Parse(value.Trim(), NumberStyles.HexNumber, CultureInfo.InvariantCulture);

    private static void AppendLine(StringBuilder builder, string value) => builder.Append(value).Append('\n');

    private sealed record ScriptRange(int Start, int End, uint Tag);
    private sealed record ScriptExtensionRange(int Start, int End, int SetIndex);
    private sealed record ScriptExtensionData(
        List<ScriptExtensionRange> Ranges,
        int[] Offsets,
        int[] Counts,
        List<uint> Tags);
    private readonly record struct CodePointRange(int Start, int End);
}
