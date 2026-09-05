using System.Globalization;
using System.Reflection;

namespace Goo.SvgCompiler;

internal readonly record struct GooAssetCounts(int ByteCount, int Nodes, int Contours, int Curves,
    int Paints, int Strokes, int Clips, int Tracks, int Keyframes, int MorphCurves);

internal static class GooRuntimeGate
{
    internal static GooAssetCounts Read(string assemblyPath, byte[] bytes)
    {
        if (!File.Exists(assemblyPath))
        {
            throw new SvgCompileException($"Goo assembly '{assemblyPath}' was not found");
        }
        var assembly = Assembly.LoadFrom(Path.GetFullPath(assemblyPath));
        var assetType = assembly.GetType("Goo.CompiledVectorAsset", throwOnError: true)!;
        var load = assetType.GetMethod("Load", BindingFlags.Public | BindingFlags.Static)
            ?? throw new SvgCompileException("Goo.CompiledVectorAsset.Load was not found");
        object asset;
        try
        {
            asset = load.Invoke(null, [bytes])
                ?? throw new SvgCompileException("Goo.CompiledVectorAsset.Load returned null");
        }
        catch (TargetInvocationException exception)
        {
            throw new SvgCompileException(exception.InnerException?.Message ?? exception.Message);
        }
        return new GooAssetCounts(
            ReadProperty(assetType, asset, "ByteCount"),
            ReadProperty(assetType, asset, "NodeCount"),
            ReadProperty(assetType, asset, "ContourCount"),
            ReadProperty(assetType, asset, "CurveCount"),
            ReadProperty(assetType, asset, "PaintCount"),
            ReadProperty(assetType, asset, "StrokeCount"),
            ReadProperty(assetType, asset, "ClipCount"),
            ReadProperty(assetType, asset, "TrackCount"),
            ReadProperty(assetType, asset, "KeyframeCount"),
            ReadProperty(assetType, asset, "MorphCurveCount"));
    }

    private static int ReadProperty(Type assetType, object asset, string name)
    {
        var property = assetType.GetProperty(name, BindingFlags.Public | BindingFlags.Instance)
            ?? throw new SvgCompileException($"Goo.CompiledVectorAsset.{name} was not found");
        return Convert.ToInt32(property.GetValue(asset), CultureInfo.InvariantCulture);
    }
}
