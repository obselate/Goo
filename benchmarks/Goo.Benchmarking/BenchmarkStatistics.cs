namespace Goo.Benchmarking;

public static class BenchmarkStatistics
{
    public static double NearestRank(IReadOnlyList<double> samples, double percentile)
    {
        ArgumentNullException.ThrowIfNull(samples);
        if (samples.Count == 0)
        {
            throw new ArgumentException("The sample set must not be empty.", nameof(samples));
        }
        if (percentile is < 0.0 or > 1.0 || double.IsNaN(percentile))
        {
            throw new ArgumentOutOfRangeException(nameof(percentile));
        }

        var sorted = samples.ToArray();
        Array.Sort(sorted);
        return sorted[NearestRankIndex(sorted.Length, percentile)];
    }

    public static BenchmarkMetricAggregate Aggregate(BenchmarkMetricSamples samples)
    {
        ArgumentNullException.ThrowIfNull(samples);
        ValidateFinite(samples.Samples, samples.MetricId);
        return new BenchmarkMetricAggregate(samples.MetricId, samples.Unit, samples.Samples);
    }

    public static BenchmarkMetricAggregate Aggregate(
        string metricId,
        string unit,
        IReadOnlyList<double> samples)
    {
        ArgumentNullException.ThrowIfNull(metricId);
        ArgumentNullException.ThrowIfNull(unit);
        ArgumentNullException.ThrowIfNull(samples);
        ValidateFinite(samples, metricId);
        return new BenchmarkMetricAggregate(metricId, unit, samples);
    }

    internal static int NearestRankIndex(int count, double percentile) =>
        Math.Clamp((int)Math.Ceiling(count * percentile) - 1, 0, count - 1);

    internal static void ValidateFinite(IReadOnlyList<double> samples, string metricId)
    {
        for (var index = 0; index < samples.Count; index++)
        {
            if (!double.IsFinite(samples[index]))
            {
                throw new ArgumentException(
                    $"Metric '{metricId}' contains a non-finite sample at index {index}.", nameof(samples));
            }
        }
    }
}
