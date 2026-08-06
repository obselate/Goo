using System.Globalization;

namespace Goo.InternalTextInterop;

internal readonly record struct TextHit(int Index, int Affinity);

internal sealed class TextGeometry
{
    private readonly float[] upstream;
    private readonly float[] downstream;
    private readonly TextHitPosition[] stops;
    private readonly GlyphBox[] boxes;
    private int selectionStart = -1;
    private int selectionEnd = -1;
    private float[] selectionRects = [];

    private TextGeometry(float[] upstream, float[] downstream,
        TextHitPosition[] stops, GlyphBox[] boxes)
    {
        this.upstream = upstream;
        this.downstream = downstream;
        this.stops = stops;
        this.boxes = boxes;
    }

    internal static TextGeometry Build(string text, IReadOnlyList<ShapedRun> runs, float width, bool rightToLeft)
    {
        var upstream = Enumerable.Repeat(float.NaN, text.Length + 1).ToArray();
        var downstream = Enumerable.Repeat(float.NaN, text.Length + 1).ToArray();
        var boxes = new List<GlyphBox>();

        foreach (var run in runs)
            AddRun(run, upstream, downstream, boxes);

        var fallback = rightToLeft ? width : 0f;
        if (float.IsNaN(downstream[0]))
            downstream[0] = fallback;
        if (float.IsNaN(upstream[text.Length]))
            upstream[text.Length] = rightToLeft ? 0f : width;

        var boundaries = StringInfo.ParseCombiningCharacters(text).ToList();
        if (boundaries.Count == 0 || boundaries[0] != 0)
            boundaries.Insert(0, 0);
        if (boundaries[^1] != text.Length)
            boundaries.Add(text.Length);

        var positions = new List<TextHitPosition>(boundaries.Count * 2);
        foreach (var boundary in boundaries)
        {
            var up = upstream[boundary];
            var down = downstream[boundary];
            if (!float.IsNaN(up))
                positions.Add(new TextHitPosition(boundary, 0, up));
            if (!float.IsNaN(down) && (float.IsNaN(up) || MathF.Abs(down - up) > 0.01f))
                positions.Add(new TextHitPosition(boundary, 1, down));
        }
        positions.Sort(static (a, b) =>
        {
            var compared = a.X.CompareTo(b.X);
            if (compared != 0)
                return compared;
            compared = a.Index.CompareTo(b.Index);
            return compared != 0 ? compared : a.Affinity.CompareTo(b.Affinity);
        });

        return new TextGeometry(upstream, downstream, positions.ToArray(), boxes.ToArray());
    }

    internal float CaretX(int index, int affinity)
    {
        index = Math.Clamp(index, 0, upstream.Length - 1);
        var preferred = affinity == 0 ? upstream[index] : downstream[index];
        if (!float.IsNaN(preferred))
            return preferred;
        var alternate = affinity == 0 ? downstream[index] : upstream[index];
        if (!float.IsNaN(alternate))
            return alternate;

        for (var distance = 1; distance < upstream.Length; distance++)
        {
            var left = index - distance;
            if (left >= 0)
            {
                var x = !float.IsNaN(downstream[left]) ? downstream[left] : upstream[left];
                if (!float.IsNaN(x))
                    return x;
            }
            var right = index + distance;
            if (right < upstream.Length)
            {
                var x = !float.IsNaN(upstream[right]) ? upstream[right] : downstream[right];
                if (!float.IsNaN(x))
                    return x;
            }
        }
        return 0f;
    }

    internal TextHit HitTest(float x)
    {
        if (stops.Length == 0)
            return new TextHit(0, 1);
        var best = 0;
        var distance = MathF.Abs(stops[0].X - x);
        for (var i = 1; i < stops.Length; i++)
        {
            var next = MathF.Abs(stops[i].X - x);
            if (next >= distance)
                continue;
            best = i;
            distance = next;
        }
        return stops[best].Hit();
    }

    internal TextHit Move(int index, int affinity, int delta)
    {
        if (stops.Length == 0 || delta == 0)
            return new TextHit(index, affinity);

        var current = FindStop(index, affinity);
        var next = Math.Clamp(current + Math.Sign(delta), 0, stops.Length - 1);
        return stops[next].Hit();
    }

    internal TextHit LineEdge(bool end)
    {
        return end
            ? new TextHit(upstream.Length - 1, 0)
            : new TextHit(0, 1);
    }

    internal TextHit Collapse(int index, int affinity, int anchorIndex, int anchorAffinity, int delta)
    {
        var segments = SelectionRects(index, anchorIndex);
        if (segments.Length != 0)
            return HitTest(delta < 0 ? segments[0] : segments[^1]);
        var caretX = CaretX(index, affinity);
        var anchorX = CaretX(anchorIndex, anchorAffinity);
        if (delta < 0)
            return caretX <= anchorX ? new TextHit(index, affinity) : new TextHit(anchorIndex, anchorAffinity);
        return caretX >= anchorX ? new TextHit(index, affinity) : new TextHit(anchorIndex, anchorAffinity);
    }

    internal float[] SelectionRects(int start, int end)
    {
        start = Math.Clamp(start, 0, upstream.Length - 1);
        end = Math.Clamp(end, 0, upstream.Length - 1);
        if (end < start)
            (start, end) = (end, start);
        if (start == end)
            return [];
        lock (this)
        {
            if (start == selectionStart && end == selectionEnd)
                return selectionRects;

            var result = new List<float>();
            var hasSegment = false;
            var x0 = 0f;
            var x1 = 0f;
            foreach (var box in boxes)
            {
                if (box.LogicalStart >= end || box.LogicalEnd <= start || box.X1 <= box.X0)
                    continue;
                if (!hasSegment)
                {
                    x0 = box.X0;
                    x1 = box.X1;
                    hasSegment = true;
                }
                else if (box.X0 <= x1 + 0.01f)
                {
                    x1 = MathF.Max(x1, box.X1);
                }
                else
                {
                    result.Add(x0);
                    result.Add(x1);
                    x0 = box.X0;
                    x1 = box.X1;
                }
            }
            if (hasSegment)
            {
                result.Add(x0);
                result.Add(x1);
            }
            selectionStart = start;
            selectionEnd = end;
            selectionRects = result.ToArray();
            return selectionRects;
        }
    }

    internal int SelectionRectCount(int start, int end)
    {
        NormalizeSelection(ref start, ref end);
        if (start == end)
            return 0;

        var count = 0;
        var hasSegment = false;
        var x1 = 0f;
        foreach (var box in boxes)
        {
            if (box.LogicalStart >= end || box.LogicalEnd <= start || box.X1 <= box.X0)
                continue;
            if (!hasSegment)
            {
                x1 = box.X1;
                hasSegment = true;
            }
            else if (box.X0 <= x1 + 0.01f)
            {
                x1 = MathF.Max(x1, box.X1);
            }
            else
            {
                count++;
                x1 = box.X1;
            }
        }
        return hasSegment ? count + 1 : count;
    }

    internal int CopySelectionRects(int start, int end, int rectOffset, Span<float> destination)
    {
        NormalizeSelection(ref start, ref end);
        if (start == end || destination.Length < 2)
            return 0;

        var rectIndex = 0;
        var written = 0;
        var hasSegment = false;
        var x0 = 0f;
        var x1 = 0f;
        foreach (var box in boxes)
        {
            if (box.LogicalStart >= end || box.LogicalEnd <= start || box.X1 <= box.X0)
                continue;
            if (!hasSegment)
            {
                x0 = box.X0;
                x1 = box.X1;
                hasSegment = true;
            }
            else if (box.X0 <= x1 + 0.01f)
            {
                x1 = MathF.Max(x1, box.X1);
            }
            else
            {
                if (rectIndex >= rectOffset && written + 1 < destination.Length)
                {
                    destination[written++] = x0;
                    destination[written++] = x1;
                }
                rectIndex++;
                x0 = box.X0;
                x1 = box.X1;
            }
        }
        if (hasSegment && rectIndex >= rectOffset && written + 1 < destination.Length)
        {
            destination[written++] = x0;
            destination[written++] = x1;
        }
        return written;
    }

    private void NormalizeSelection(ref int start, ref int end)
    {
        start = Math.Clamp(start, 0, upstream.Length - 1);
        end = Math.Clamp(end, 0, upstream.Length - 1);
        if (end < start)
            (start, end) = (end, start);
    }

    private int FindStop(int index, int affinity)
    {
        var fallback = -1;
        for (var i = 0; i < stops.Length; i++)
        {
            if (stops[i].Index != index)
                continue;
            if (stops[i].Affinity == affinity)
                return i;
            if (fallback == -1)
                fallback = i;
        }
        if (fallback != -1)
            return fallback;

        var x = CaretX(index, affinity);
        var nearest = 0;
        var distance = MathF.Abs(stops[0].X - x);
        for (var i = 1; i < stops.Length; i++)
        {
            var next = MathF.Abs(stops[i].X - x);
            if (next >= distance)
                continue;
            nearest = i;
            distance = next;
        }
        return nearest;
    }

    private static void AddRun(ShapedRun run, float[] upstream, float[] downstream, List<GlyphBox> boxes)
    {
        if (run.Text.Length == 0)
            return;

        var visualClusters = new List<VisualCluster>();
        var glyph = 0;
        while (glyph < run.Clusters.Length)
        {
            var cluster = checked((int)run.Clusters[glyph]);
            var next = glyph + 1;
            while (next < run.Clusters.Length && run.Clusters[next] == run.Clusters[glyph])
                next++;
            var x0 = glyph == 0 ? run.VisualStart : run.Points[glyph].X;
            var x1 = next < run.Clusters.Length ? run.Points[next].X : run.VisualEnd;
            visualClusters.Add(new VisualCluster(cluster, MathF.Min(x0, x1), MathF.Max(x0, x1)));
            glyph = next;
        }

        var logicalClusters = visualClusters.Select(cluster => cluster.LogicalStart).Distinct().Order().ToArray();
        foreach (var cluster in visualClusters)
        {
            var logical = Array.BinarySearch(logicalClusters, cluster.LogicalStart);
            var localEnd = logical + 1 < logicalClusters.Length ? logicalClusters[logical + 1] : run.Text.Length;
            var localBoundaries = StringInfo.ParseCombiningCharacters(
                run.Text.Substring(cluster.LogicalStart, localEnd - cluster.LogicalStart));
            var segmentCount = Math.Max(localBoundaries.Length, 1);
            for (var i = 0; i <= segmentCount; i++)
            {
                var local = i == segmentCount
                    ? localEnd
                    : cluster.LogicalStart + localBoundaries[i];
                var ratio = (float)i / segmentCount;
                var x = run.RightToLeft
                    ? cluster.X1 - (cluster.X1 - cluster.X0) * ratio
                    : cluster.X0 + (cluster.X1 - cluster.X0) * ratio;
                var absolute = run.LogicalStart + local;
                if (i == 0)
                    Set(ref downstream[absolute], x);
                else if (i == segmentCount)
                    Set(ref upstream[absolute], x);
                else
                {
                    Set(ref upstream[absolute], x);
                    Set(ref downstream[absolute], x);
                }
            }
            boxes.Add(new GlyphBox(
                run.LogicalStart + cluster.LogicalStart,
                run.LogicalStart + localEnd,
                cluster.X0,
                cluster.X1));
        }
    }

    private static void Set(ref float target, float value)
    {
        if (float.IsNaN(target))
            target = value;
    }

    private readonly record struct TextHitPosition(int Index, int Affinity, float X)
    {
        internal TextHit Hit() => new(Index, Affinity);
    }

    private readonly record struct GlyphBox(int LogicalStart, int LogicalEnd, float X0, float X1);
    private readonly record struct VisualCluster(int LogicalStart, float X0, float X1);
}
