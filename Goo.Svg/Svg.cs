using Goo;
namespace Goo.Svg;

public sealed class SvgParseException : FormatException
{
    public SvgParseException(string message, Exception? innerException = null)
        : base(message, innerException)
    {
    }
}

public static class Svg
{
    public static VectorAsset Parse(string source)
    {
        ArgumentNullException.ThrowIfNull(source);
        return LoadCompiled(() => global::Goo.SvgCompiler.SvgCompiler.CompileText(source));
    }

    public static VectorAsset Load(Stream stream)
    {
        ArgumentNullException.ThrowIfNull(stream);
        return LoadCompiled(() => global::Goo.SvgCompiler.SvgCompiler.CompileStream(stream, "<stream>"));
    }

    public static VectorAsset Load(string path)
    {
        ArgumentException.ThrowIfNullOrWhiteSpace(path);
        return LoadCompiled(() => global::Goo.SvgCompiler.SvgCompiler.CompileFile(path));
    }

    private static VectorAsset LoadCompiled(Func<byte[]> compile)
    {
        try
        {
            return VectorAsset.Load(compile());
        }
        catch (global::Goo.SvgCompiler.SvgCompileException exception)
        {
            throw new SvgParseException(exception.Message, exception);
        }
    }
}
