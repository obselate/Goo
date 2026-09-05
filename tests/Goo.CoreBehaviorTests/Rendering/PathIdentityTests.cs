using System;
using Goo;
using Xunit;

public sealed class PathIdentityTests
{
    [Fact]
    public void RepeatedSourceLookupDoesNotAllocate()
    {
        var registry = new VulkanPathIdentityRegistry();
        try
        {
            var path = Path(2);
            var expected = registry.Resolve(path);
            for (var index = 0; index < 1_000; index++)
                registry.Resolve(path);

            var before = GC.GetAllocatedBytesForCurrentThread();
            var actual = expected;
            for (var index = 0; index < 1_000; index++)
                actual = registry.Resolve(path);
            var allocated = GC.GetAllocatedBytesForCurrentThread() - before;

            Assert.Equal(expected, actual);
            Assert.Equal(0, allocated);
            GC.KeepAlive(path);
        }
        finally
        {
            registry.Dispose();
        }
    }

    [Fact]
    public void EqualContentSharesIdentityButHashCollisionsDoNot()
    {
        var registry = new VulkanPathIdentityRegistry();
        try
        {
            var first = Path(2);
            var equal = Path(2);
            var collision = Path(3);
            var identity = registry.Resolve(first);

            Assert.Equal(identity, registry.Resolve(equal));
            var distinct = registry.Resolve(collision);
            Assert.NotEqual(identity.PathId.LogicalId, distinct.PathId.LogicalId);
            Assert.NotEqual(identity.SourceId, distinct.SourceId);
            Assert.Equal(2, registry.Count);
            GC.KeepAlive(first);
            GC.KeepAlive(equal);
            GC.KeepAlive(collision);
        }
        finally
        {
            registry.Dispose();
        }
    }

    [Fact]
    public void MutableOwnerKeepsIdentityAndAdvancesRevision()
    {
        var registry = new VulkanPathIdentityRegistry();
        try
        {
            var owner = new VectorPathNormalizedOwner(1, 1, 0, 0, 10, 10);
            owner.Update(new[] { PathGeometry.Quadratic(0, 0, 1, 0, 2, 0) }, 1,
                new[] { PathGeometry.Contour(0, 1, false) }, 1);
            var first = new VectorPathData(owner, 0, 0, 10, 10);
            var identity = registry.Resolve(first);

            owner.Update(new[] { PathGeometry.Quadratic(0, 0, 2, 0, 4, 0) }, 1,
                new[] { PathGeometry.Contour(0, 1, false) }, 1);
            var updated = registry.Resolve(first);
            var alias = new VectorPathData(owner, 0, 0, 10, 10);

            Assert.Equal(identity.PathId.LogicalId, updated.PathId.LogicalId);
            Assert.Equal(identity.SourceId, updated.SourceId);
            Assert.Equal(identity.GeometryRevision + 1, updated.GeometryRevision);
            Assert.Equal(updated.GeometryRevision, updated.PathId.Version);
            Assert.Equal(updated, registry.Resolve(alias));
            Assert.Equal(1, registry.Count);
            GC.KeepAlive(first);
            GC.KeepAlive(alias);
        }
        finally
        {
            registry.Dispose();
        }
    }

    private static VectorPathData Path(double end)
    {
        var source = new PathBuilder(0, 0, 10, 10).MoveTo(0, 0).LineTo(end, 0).Build();
        return new VectorPathData(source.payload!.Commands, 42, false, 0, 0, 10, 10);
    }
}
