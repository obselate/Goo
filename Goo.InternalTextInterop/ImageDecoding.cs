using System.Threading;
using System.Threading.Tasks;
using SkiaSharp;

namespace Goo.InternalTextInterop;

internal static class ImageDecoding
{
    private const int MaxConcurrentDecodes = 2;
    private const int MaxCachedEntries = 128;
    private const long MaxCachedDecodedBytes = 64L * 1024 * 1024;

    internal sealed class CacheEntry
    {
        internal CacheEntry(string path, ImageRequest request)
        {
            Path = path;
            Request = request;
        }

        internal string Path { get; }
        internal ImageRequest Request { get; }
        internal LinkedListNode<CacheEntry>? Node { get; set; }
        internal long ChargedDecodedBytes { get; set; }
        internal bool Accounted { get; set; }
    }

    private static readonly StringComparer cacheComparer = OperatingSystem.IsWindows()
        ? StringComparer.OrdinalIgnoreCase
        : StringComparer.Ordinal;
    private static readonly Dictionary<string, CacheEntry> cache = new(cacheComparer);
    private static readonly LinkedList<CacheEntry> cacheOrder = new();
    private static readonly object cacheLock = new();
    private static readonly SemaphoreSlim decodeSemaphore = new(MaxConcurrentDecodes, MaxConcurrentDecodes);
    private static Task? decodeGateForTests;
    private static int syntheticDecoderForTests;
    private static long byteBudgetOverrideForTests = -1;
    private static long cachedDecodedBytes;

    public static ImageRequest Request(string path)
    {
        var canonical = Canonicalize(path);
        ImageRequest request;
        List<ImageRequest>? evicted;
        lock (cacheLock)
        {
            if (cache.TryGetValue(canonical, out var existing))
            {
                existing.Request.Retain();
                return existing.Request;
            }

            request = new ImageRequest(
                canonical,
                Volatile.Read(ref decodeGateForTests),
                Volatile.Read(ref syntheticDecoderForTests) != 0,
                20,
                10);
            var entry = new CacheEntry(canonical, request);
            entry.Node = cacheOrder.AddLast(entry);
            cache.Add(canonical, entry);
            request.Retain();
            evicted = EvictEntryLimitLocked();
            request.Start(entry);
        }
        ReleaseCacheLeases(evicted);
        return request;
    }
    public static bool MatchesPath(ImageRequest? request, string path) =>
        request is null ? path.Length == 0
            : cacheComparer.Equals(request.Path, Canonicalize(path));

    internal static void SetDecodeGateForTests(Task? gate)
    {
        Volatile.Write(ref decodeGateForTests, gate);
    }

    internal static void ClearDecodeGateForTests()
    {
        Volatile.Write(ref decodeGateForTests, null);
    }

    internal static void UseSyntheticDecoderForTests(bool enabled)
    {
        Volatile.Write(ref syntheticDecoderForTests, enabled ? 1 : 0);
    }

    internal static void SetCacheByteBudgetForTests(long bytes)
    {
        if (bytes < -1)
            throw new ArgumentOutOfRangeException(nameof(bytes));

        List<ImageRequest>? evicted;
        lock (cacheLock)
        {
            Volatile.Write(ref byteBudgetOverrideForTests, bytes);
            evicted = EvictToLimitsLocked();
        }
        ReleaseCacheLeases(evicted);
    }

    internal static int CacheCountForTests()
    {
        lock (cacheLock)
            return cache.Count;
    }

    internal static long CachedDecodedBytesForTests()
    {
        lock (cacheLock)
            return cachedDecodedBytes;
    }

    internal static void ResetForTests()
    {
        List<ImageRequest> requests;
        lock (cacheLock)
        {
            requests = new List<ImageRequest>(cache.Count);
            foreach (var entry in cache.Values)
            {
                entry.Node = null;
                entry.ChargedDecodedBytes = 0;
                requests.Add(entry.Request);
            }
            cache.Clear();
            cacheOrder.Clear();
            cachedDecodedBytes = 0;
        }
        ReleaseCacheLeases(requests);
        Volatile.Write(ref decodeGateForTests, null);
        Volatile.Write(ref syntheticDecoderForTests, 0);
        Volatile.Write(ref byteBudgetOverrideForTests, -1);
    }

    internal static ImageRequest? RemoveOrphan(ImageRequest request)
    {
        lock (cacheLock)
        {
            if (!request.HasOnlyCacheLease)
                return null;
            if (!cache.TryGetValue(request.Path, out var entry)
                || !ReferenceEquals(entry.Request, request)
                || entry.Accounted)
                return null;
            RemoveEntryLocked(entry, null);
            return request;
        }
    }

    private static List<ImageRequest>? EvictEntryLimitLocked()
    {
        List<ImageRequest>? evicted = null;
        while (cache.Count > MaxCachedEntries)
        {
            var first = cacheOrder.First;
            if (first is null)
                break;
            evicted ??= new List<ImageRequest>();
            RemoveEntryLocked(first.Value, evicted);
        }
        return evicted;
    }

    private static List<ImageRequest>? EvictToLimitsLocked()
    {
        List<ImageRequest>? evicted = null;
        while (cache.Count > MaxCachedEntries || cachedDecodedBytes > CurrentByteBudget())
        {
            var first = cacheOrder.First;
            if (first is null)
                break;
            evicted ??= new List<ImageRequest>();
            RemoveEntryLocked(first.Value, evicted);
        }
        return evicted;
    }

    private static void RemoveEntryLocked(CacheEntry entry, List<ImageRequest>? evicted)
    {
        if (!cache.TryGetValue(entry.Path, out var current)
            || !ReferenceEquals(current, entry))
            return;
        cache.Remove(entry.Path);
        if (entry.Node is not null)
        {
            cacheOrder.Remove(entry.Node);
            entry.Node = null;
        }
        cachedDecodedBytes -= entry.ChargedDecodedBytes;
        entry.ChargedDecodedBytes = 0;
        evicted?.Add(entry.Request);
    }

    private static void ReleaseCacheLeases(List<ImageRequest>? requests)
    {
        if (requests is null)
            return;
        foreach (var request in requests)
            request.Release();
    }

    internal static void Complete(CacheEntry entry, DecodedImage? decoded)
    {
        List<ImageRequest>? evicted = null;
        lock (cacheLock)
        {
            if (!cache.TryGetValue(entry.Path, out var current)
                || !ReferenceEquals(current, entry))
                return;

            entry.Accounted = true;
            var charge = DecodedByteCharge(decoded);
            entry.ChargedDecodedBytes = charge;
            cachedDecodedBytes = charge > long.MaxValue - cachedDecodedBytes
                ? long.MaxValue
                : cachedDecodedBytes + charge;
            evicted = EvictToLimitsLocked();
        }
        ReleaseCacheLeases(evicted);
    }

    private static long CurrentByteBudget()
    {
        var overrideValue = Volatile.Read(ref byteBudgetOverrideForTests);
        return overrideValue >= 0 ? overrideValue : MaxCachedDecodedBytes;
    }

    private static long DecodedByteCharge(DecodedImage? decoded)
    {
        if (decoded is null || !decoded.IsValid)
            return 0;
        var width = (ulong)(decoded.Width < 0 ? 0 : decoded.Width);
        var height = (ulong)(decoded.Height < 0 ? 0 : decoded.Height);
        var pixels = width * height;
        var maxPixels = (ulong)long.MaxValue / 4;
        return pixels > maxPixels ? long.MaxValue : (long)pixels * 4;
    }

    private static string Canonicalize(string path)
    {
        if (string.IsNullOrWhiteSpace(path))
            return "<empty>";
        try
        {
            return System.IO.Path.GetFullPath(path);
        }
        catch (Exception)
        {
            return "<invalid>" + path;
        }
    }

    internal static DecodedImage Decode(
        string path,
        bool synthetic,
        int syntheticWidth,
        int syntheticHeight)
    {
        if (synthetic)
            return SyntheticImage(syntheticWidth, syntheticHeight);
        if (path.StartsWith('<'))
            return DecodedImage.Failed;
        try
        {
            using var data = SKData.Create(path);
            if (data is null)
                return DecodedImage.Failed;
            var image = SKImage.FromEncodedData(data);
            return image is null ? DecodedImage.Failed : DecodedImage.From(image);
        }
        catch (Exception)
        {
            return DecodedImage.Failed;
        }
    }

    internal static async Task<DecodedImage> DecodeAsync(
        string path,
        Task? gate,
        bool synthetic,
        int syntheticWidth,
        int syntheticHeight,
        CancellationToken cancellationToken)
    {
        var admitted = false;
        try
        {
            await decodeSemaphore.WaitAsync(cancellationToken).ConfigureAwait(false);
            admitted = true;
            if (gate is not null)
                await gate.WaitAsync(cancellationToken).ConfigureAwait(false);
            cancellationToken.ThrowIfCancellationRequested();
            return Decode(path, synthetic, syntheticWidth, syntheticHeight);
        }
        catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
        {
            return DecodedImage.Failed;
        }
        finally
        {
            if (admitted)
                decodeSemaphore.Release();
        }
    }

    private static DecodedImage SyntheticImage(int width, int height)
    {
        using var surface = SKSurface.Create(new SKImageInfo(
            width, height, SKColorType.Rgba8888, SKAlphaType.Premul));
        var canvas = surface.Canvas;
        canvas.Clear(SKColors.Red);
        using var blue = new SKPaint { Color = SKColors.Blue };
        var split = width / 2;
        canvas.DrawRect(SKRect.Create(split, 0, width - split, height), blue);
        var image = surface.Snapshot();
        return DecodedImage.From(image);
    }
}
