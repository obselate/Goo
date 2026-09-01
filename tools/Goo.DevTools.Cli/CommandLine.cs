namespace Goo.DevTools.Cli;

internal sealed class CommandLine
{
    private CommandLine(string command, Dictionary<string, string?> options, List<string> positionals, List<string> trailing)
    {
        Command = command;
        Options = options;
        Positionals = positionals;
        Trailing = trailing;
    }

    public string Command { get; }

    public IReadOnlyDictionary<string, string?> Options { get; }

    public IReadOnlyList<string> Positionals { get; }

    public IReadOnlyList<string> Trailing { get; }

    public bool Has(string name) => Options.ContainsKey(name);

    public string? Get(string name) => Options.TryGetValue(name, out var value) ? value : null;

    public static CommandLine Parse(string[] args)
    {
        var command = args.Length == 0 || args[0].StartsWith('-') ? "help" : args[0].ToLowerInvariant();
        var start = command == "help" && (args.Length == 0 || args[0].StartsWith('-')) ? 0 : 1;
        var options = new Dictionary<string, string?>(StringComparer.OrdinalIgnoreCase);
        var positionals = new List<string>();
        var trailing = new List<string>();
        var afterSeparator = false;

        for (var index = start; index < args.Length; index++)
        {
            var argument = args[index];
            if (afterSeparator)
            {
                trailing.Add(argument);
                continue;
            }

            if (argument == "--")
            {
                afterSeparator = true;
                continue;
            }

            if (!argument.StartsWith("--", StringComparison.Ordinal))
            {
                positionals.Add(argument);
                continue;
            }

            var valueSeparator = argument.IndexOf('=');
            var name = valueSeparator < 0 ? argument[2..] : argument[2..valueSeparator];
            if (name.Length == 0)
                throw new CliException("An option name is required after '--'.");

            if (valueSeparator >= 0)
            {
                options[name] = argument[(valueSeparator + 1)..];
                continue;
            }

            if (index + 1 < args.Length && args[index + 1] != "--" && !args[index + 1].StartsWith("--", StringComparison.Ordinal))
            {
                options[name] = args[++index];
                continue;
            }

            options[name] = null;
        }

        return new CommandLine(command, options, positionals, trailing);
    }
}

internal sealed class CliException : Exception
{
    public CliException(string message) : base(message)
    {
    }
}
