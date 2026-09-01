using System.Xml.Linq;

var arguments = ParseArguments(args);
var generated = RequireFile(arguments, "generated");
var supplement = RequireFile(arguments, "supplement");
var document = LoadDocument(generated);
var members = RequireMembers(document, generated);
var existing = members.Elements("member")
    .ToDictionary(RequireMemberName, StringComparer.Ordinal);

foreach (var member in RequireMembers(LoadDocument(supplement), supplement).Elements("member"))
{
    var name = RequireMemberName(member);
    if (existing.TryGetValue(name, out var current))
    {
        if (!Equivalent(current, member))
            throw new InvalidDataException($"Conflicting XML documentation member: {name}");
        continue;
    }
    existing.Add(name, new XElement(member));
}

members.ReplaceNodes(existing.OrderBy(pair => pair.Key, StringComparer.Ordinal).Select(pair => pair.Value));
var temporary = Path.Combine(generated.DirectoryName!, $".{generated.Name}.{Guid.NewGuid():N}");
try
{
    document.Save(temporary);
    File.Move(temporary, generated.FullName, true);
}
finally
{
    if (File.Exists(temporary))
        File.Delete(temporary);
}

static Dictionary<string, string> ParseArguments(string[] values)
{
    if (values.Length % 2 != 0)
        throw new ArgumentException("Arguments must be --name value pairs.");
    var result = new Dictionary<string, string>(StringComparer.Ordinal);
    for (var index = 0; index < values.Length; index += 2)
    {
        if (!values[index].StartsWith("--", StringComparison.Ordinal))
            throw new ArgumentException($"Invalid argument: {values[index]}");
        if (!result.TryAdd(values[index][2..], values[index + 1]))
            throw new ArgumentException($"Duplicate argument: {values[index]}");
    }
    return result;
}

static FileInfo RequireFile(IReadOnlyDictionary<string, string> arguments, string name)
{
    if (!arguments.TryGetValue(name, out var value))
        throw new ArgumentException($"Missing argument: --{name}");
    var file = new FileInfo(value);
    if (!file.Exists)
        throw new FileNotFoundException($"XML documentation is missing: {file.FullName}", file.FullName);
    return file;
}

static XDocument LoadDocument(FileInfo file)
{
    var document = XDocument.Load(file.FullName, LoadOptions.PreserveWhitespace);
    if (document.Root?.Name != "doc")
        throw new InvalidDataException($"XML documentation root must be <doc>: {file.FullName}");
    return document;
}

static XElement RequireMembers(XDocument document, FileInfo file) =>
    document.Root?.Element("members")
    ?? throw new InvalidDataException($"XML documentation has no <members>: {file.FullName}");

static string RequireMemberName(XElement member) =>
    member.Attribute("name")?.Value
    ?? throw new InvalidDataException("XML documentation member has no name.");

static bool Equivalent(XElement left, XElement right)
{
    if (left.Name != right.Name)
        return false;
    var leftAttributes = left.Attributes().OrderBy(attribute => attribute.Name.ToString(), StringComparer.Ordinal).ToArray();
    var rightAttributes = right.Attributes().OrderBy(attribute => attribute.Name.ToString(), StringComparer.Ordinal).ToArray();
    if (leftAttributes.Length != rightAttributes.Length)
        return false;
    for (var index = 0; index < leftAttributes.Length; index++)
    {
        if (leftAttributes[index].Name != rightAttributes[index].Name
            || leftAttributes[index].Value != rightAttributes[index].Value)
            return false;
    }
    if (NormalizeText(left.Value) != NormalizeText(right.Value))
        return false;
    var leftChildren = left.Elements().ToArray();
    var rightChildren = right.Elements().ToArray();
    if (leftChildren.Length != rightChildren.Length)
        return false;
    for (var index = 0; index < leftChildren.Length; index++)
    {
        if (!Equivalent(leftChildren[index], rightChildren[index]))
            return false;
    }
    return true;
}

static string NormalizeText(string value) =>
    string.Join(" ", value.Split((char[]?)null, StringSplitOptions.RemoveEmptyEntries));
