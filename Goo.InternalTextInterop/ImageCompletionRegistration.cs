using System.Threading;

namespace Goo.InternalTextInterop;

internal sealed class ImageCompletionRegistration : IDisposable
{
    private readonly object gate = new();
    private readonly ManualResetEventSlim completed = new(false);
    private Action? callback;

    internal ImageCompletionRegistration(Action callback)
    {
        this.callback = callback;
    }

    public void Invoke()
    {
        Action? current;
        lock (gate)
        {
            current = callback;
            callback = null;
        }
        try
        {
            current?.Invoke();
        }
        finally
        {
            completed.Set();
        }
    }

    public void Dispose()
    {
        lock (gate)
            callback = null;
        completed.Set();
    }

    public void Wait() => completed.Wait();
}
