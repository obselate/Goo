using System.Threading;
using System.Threading.Tasks;

namespace Goo.InternalTextInterop;

internal sealed class ImageRequest
{
    private readonly Task? decodeGate;
    private readonly bool synthetic;
    private readonly int syntheticWidth;
    private readonly int syntheticHeight;
    private readonly CancellationTokenSource cancellation = new();
    private readonly TaskCompletionSource<DecodedImage> completion =
        new(TaskCreationOptions.RunContinuationsAsynchronously);
    private int references = 1;

    internal ImageRequest(
        string path,
        Task? decodeGate,
        bool synthetic,
        int syntheticWidth,
        int syntheticHeight)
    {
        Path = path;
        this.decodeGate = decodeGate;
        this.synthetic = synthetic;
        this.syntheticWidth = syntheticWidth;
        this.syntheticHeight = syntheticHeight;
    }

    public string Path { get; }
    public bool IsComplete => completion.Task.IsCompleted;
    public DecodedImage Result => completion.Task.Status == TaskStatus.RanToCompletion
        ? completion.Task.Result
        : DecodedImage.Failed;

    public DecodedImage Wait() => completion.Task.GetAwaiter().GetResult();

    public ImageCompletionRegistration OnCompleted(Action callback)
    {
        var registration = new ImageCompletionRegistration(callback);
        _ = completion.Task.ContinueWith(
            static (_, state) => ((ImageCompletionRegistration)state!).Invoke(),
            registration,
            CancellationToken.None,
            TaskContinuationOptions.ExecuteSynchronously,
            TaskScheduler.Default);
        return registration;
    }

    internal async ValueTask DecodeAndAccountAsync(ImageDecoding.CacheEntry entry)
    {
        try
        {
            var decoded = await ImageDecoding.DecodeAsync(
                Path,
                decodeGate,
                synthetic,
                syntheticWidth,
                syntheticHeight,
                cancellation.Token).ConfigureAwait(false);
            ImageDecoding.Complete(entry, decoded);
            completion.TrySetResult(decoded);
        }
        catch (Exception exception)
        {
            ImageDecoding.Complete(entry, null);
            completion.TrySetException(exception);
            throw;
        }
    }

    internal bool HasOnlyCacheLease => Volatile.Read(ref references) == 1;

    internal void Retain()
    {
        Interlocked.Increment(ref references);
    }

    public void Release()
    {
        var remaining = Interlocked.Decrement(ref references);
        if (remaining == 1)
        {
            var orphan = ImageDecoding.RemoveOrphan(this);
            if (orphan is not null)
            {
                orphan.Release();
                return;
            }
        }
        if (remaining != 0)
            return;

        FinishFinalRelease();
    }

    private void FinishFinalRelease()
    {
        var current = completion.Task;
        cancellation.Cancel();
        if (current.IsCompleted)
        {
            ReleaseSettled(current);
            return;
        }
        _ = current.ContinueWith(
            static (completed, state) => ((ImageRequest)state!).ReleaseSettled(completed),
            this,
            CancellationToken.None,
            TaskContinuationOptions.ExecuteSynchronously,
            TaskScheduler.Default);
    }

    private void ReleaseSettled(Task<DecodedImage> completed)
    {
        try
        {
            if (completed.Status == TaskStatus.RanToCompletion)
                completed.Result.Release();
        }
        finally
        {
            cancellation.Dispose();
        }
    }
}
