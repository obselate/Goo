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
    private Task<DecodedImage>? task;
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
    public bool IsComplete => task!.IsCompleted;
    public DecodedImage Result => task!.Status == TaskStatus.RanToCompletion ? task.Result : DecodedImage.Failed;

    public DecodedImage Wait() => task!.GetAwaiter().GetResult();

    public ImageCompletionRegistration OnCompleted(Action callback)
    {
        var registration = new ImageCompletionRegistration(callback);
        _ = task!.ContinueWith(
            static (_, state) => ((ImageCompletionRegistration)state!).Invoke(),
            registration,
            CancellationToken.None,
            TaskContinuationOptions.ExecuteSynchronously,
            TaskScheduler.Default);
        return registration;
    }

    internal void Start(ImageDecoding.CacheEntry entry)
    {
        task = Task.Run(() => DecodeAndAccountAsync(entry));
    }

    private async Task<DecodedImage> DecodeAndAccountAsync(ImageDecoding.CacheEntry entry)
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
            return decoded;
        }
        catch
        {
            ImageDecoding.Complete(entry, null);
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
        var current = task!;
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
