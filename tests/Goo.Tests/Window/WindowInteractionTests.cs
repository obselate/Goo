using System;
using System.Collections.Generic;
using System.Threading;
using Goo;
using Xunit;

public sealed class WindowInteractionTests
{
    [Fact]
    public void ClipboardRequiresAnOpenWindowAndRejectsNullText()
    {
        var window = new Window();

        Assert.Throws<InvalidOperationException>(() => window.GetClipboardText());
        Assert.Throws<InvalidOperationException>(() => window.SetClipboardText("Goo"));
        Assert.Throws<ArgumentNullException>(() => window.SetClipboardText(null!));
    }

    [Fact]
    public void ClipboardRoundTripsWhileOpenRestoresThePriorValueAndFailsAfterClose()
    {
        var window = new Window { Width = 160, Height = 120 };
        string? original = null;
        window.Open();
        try
        {
            original = window.GetClipboardText();
            const string replacement = "Goo clipboard round-trip 0de36cf1";
            window.SetClipboardText(replacement);
            Assert.Equal(replacement, window.GetClipboardText());
        }
        finally
        {
            if (window.IsOpen)
            {
                if (original is not null)
                    window.SetClipboardText(original);
                Close(window);
            }
        }

        Assert.Throws<InvalidOperationException>(() => window.GetClipboardText());
        Assert.Throws<InvalidOperationException>(() => window.SetClipboardText("after-close"));
    }

    [Fact]
    public void OnlyTheOwnerMayMutate()
    {
        var window = new Window { Title = "owner-thread", Width = 160, Height = 120 };
        window.Open();
        try
        {
            Exception? mutationError = null;
            Exception? closeError = null;
            var worker = new Thread(() =>
            {
                try
                {
                    window.Title = "wrong-thread";
                }
                catch (Exception error)
                {
                    mutationError = error;
                }

                try
                {
                    window.RequestClose();
                }
                catch (Exception error)
                {
                    closeError = error;
                }
            });

            worker.Start();
            Assert.True(worker.Join(TimeSpan.FromSeconds(5)));
            Assert.IsType<InvalidOperationException>(mutationError);
            Assert.Null(closeError);
            Assert.Equal("owner-thread", window.Title);

            window.Pump(0.0);
            Assert.False(window.IsOpen);
        }
        finally
        {
            if (window.IsOpen)
            {
                window.RequestClose();
                window.Pump(0.0);
            }
        }
    }

    [Fact]
    public void OnlyTheOwnerMayAccessClipboard()
    {
        var window = new Window { Width = 160, Height = 120 };
        window.Open();
        try
        {
            Exception? clipboardError = null;
            var worker = new Thread(() =>
            {
                try
                {
                    window.GetClipboardText();
                }
                catch (Exception error)
                {
                    clipboardError = error;
                }
            });

            worker.Start();
            Assert.True(worker.Join(TimeSpan.FromSeconds(5)));
            Assert.IsType<InvalidOperationException>(clipboardError);
        }
        finally
        {
            Close(window);
        }
    }

    [Fact]
    public void WorkerPostRunsOnTheBoundUiThread()
    {
        var window = new Window { Width = 160, Height = 120 };
        window.Open();
        try
        {
            var uiThread = Environment.CurrentManagedThreadId;
            var actionThread = 0;
            var workerThread = 0;
            var worker = new Thread(() =>
            {
                workerThread = Environment.CurrentManagedThreadId;
                window.Post(() => actionThread = Environment.CurrentManagedThreadId);
            });

            worker.Start();
            Assert.True(worker.Join(TimeSpan.FromSeconds(5)));
            Assert.Equal(0, actionThread);

            window.Pump(0.0);

            Assert.NotEqual(uiThread, workerThread);
            Assert.Equal(uiThread, actionThread);
        }
        finally
        {
            Close(window);
        }
    }

    [Fact]
    public void WorkerPostsKeepTheirAcceptedOrder()
    {
        var window = new Window { Width = 160, Height = 120 };
        window.Open();
        try
        {
            var values = new List<int>();
            var gate = new object();
            using var first = new ManualResetEvent(false);
            using var second = new ManualResetEvent(false);
            using var third = new ManualResetEvent(false);
            var workers = new[]
            {
                StartPost(window, first, second, 1, values, gate),
                StartPost(window, second, third, 2, values, gate),
                StartPost(window, third, null, 3, values, gate),
            };

            first.Set();
            foreach (var worker in workers)
                Assert.True(worker.Join(TimeSpan.FromSeconds(5)));

            window.Pump(0.0);

            lock (gate)
                Assert.Equal(new[] { 1, 2, 3 }, values);
        }
        finally
        {
            Close(window);
        }
    }

    [Fact]
    public void PostAcceptsBeforeOpenAndRejectsAfterTeardown()
    {
        var window = new Window { Width = 160, Height = 120 };
        var calls = 0;
        window.Post(() => calls++);
        window.Open();
        try
        {
            window.Pump(0.0);
            Assert.Equal(1, calls);

            window.OnClosing = () => true;
            window.RequestClose();
            window.Pump(0.0);
            Assert.False(window.IsOpen);
            Assert.Throws<InvalidOperationException>(() => window.Post(() => calls++));
        }
        finally
        {
            Close(window);
        }
    }

    [Fact]
    public void RequestCloseRemainsPostableUntilClosingBegins()
    {
        var window = new Window { Width = 160, Height = 120, OnClosing = () => false };
        window.Open();
        try
        {
            var calls = 0;
            window.RequestClose();
            window.Post(() => calls++);

            window.Pump(0.0);

            Assert.True(window.IsOpen);
            Assert.Equal(1, calls);
        }
        finally
        {
            Close(window);
        }
    }

    [Fact]
    public void ClosingDiscardsQueuedPostsAndRejectsLaterPosts()
    {
        var window = new Window { Width = 160, Height = 120, OnClosing = () => true };
        window.Open();
        try
        {
            var calls = 0;
            window.Post(() => calls++);
            window.RequestClose();

            window.Pump(0.0);

            Assert.False(window.IsOpen);
            Assert.Equal(0, calls);
            Assert.Throws<InvalidOperationException>(() => window.Post(() => calls++));
        }
        finally
        {
            Close(window);
        }
    }

    [Fact]
    public void PostExceptionSurfacesAndLeavesLaterWorkForTheNextPump()
    {
        var window = new Window { Width = 160, Height = 120 };
        window.Open();
        try
        {
            var failed = 0;
            var completed = 0;
            window.Post(() =>
            {
                failed++;
                throw new InvalidOperationException("expected");
            });
            window.Post(() => completed++);

            Assert.Throws<InvalidOperationException>(() => window.Pump(0.0));
            Assert.Equal(1, failed);
            Assert.Equal(0, completed);

            window.Pump(0.0);
            Assert.Equal(1, completed);
        }
        finally
        {
            Close(window);
        }
    }

    [Fact]
    public void ReentrantPostWaitsForTheNextPump()
    {
        var window = new Window { Width = 160, Height = 120 };
        window.Open();
        try
        {
            var values = new List<int>();
            window.Post(() =>
            {
                values.Add(1);
                window.Post(() => values.Add(3));
            });
            window.Post(() => values.Add(2));

            window.Pump(0.0);
            Assert.Equal(new[] { 1, 2 }, values);
            Assert.True(window.DispatcherHasDemandForTest());

            window.Pump(0.0);
            Assert.Equal(new[] { 1, 2, 3 }, values);
            Assert.False(window.DispatcherHasDemandForTest());
        }
        finally
        {
            Close(window);
        }
    }

    [Fact]
    public void PostedActionCanCallAccessibilityApis()
    {
        var window = new Window { Width = 160, Height = 120 };
        window.Open();
        try
        {
            var called = false;
            var worker = new Thread(() => window.Post(() =>
            {
                called = true;
                Assert.False(window.PerformAccessibilityAction(
                    new AccessibilityId(1), new AccessibilityActionRequest(AccessibilityAction.Focus)));
            }));

            worker.Start();
            Assert.True(worker.Join(TimeSpan.FromSeconds(5)));
            window.Pump(0.0);
            Assert.True(called);
        }
        finally
        {
            Close(window);
        }
    }

    [Fact]
    public void FieldClickRepaints()
    {
        Assert.True(new WindowFixtures().FieldClickRepaints());
    }

    [Fact]
    public void EmptyDispatcherDoesNotDemandAPump()
    {
        Assert.True(new WindowFixtures().EmptyDispatcherHasNoDemand());
    }

    [Fact]
    public void CloseHonorsVeto()
    {
        Assert.True(new WindowFixtures().CloseHonorsVeto());
    }

    [Fact]
    public void CustomChromeRoutesHitTests()
    {
        Assert.True(new WindowFixtures().CustomChromeRoutesHitTests());
    }

    [Fact]
    public void VisualChangesRepaint()
    {
        var fixtures = new WindowFixtures();
        Assert.True(fixtures.GradientRepaints(), "gradient");
        Assert.True(fixtures.ZIndexRepaints(), "z-index");
        Assert.True(fixtures.TextFlowRepaints(), "text flow");
        Assert.True(fixtures.TextDecorationRepaints(), "text decoration");
        Assert.True(fixtures.TextTransformRepaints(), "text transform");
        Assert.True(fixtures.TextShadowRepaints(), "text shadow");
        Assert.True(fixtures.TextStrokeRepaints(), "text stroke");
        Assert.True(fixtures.OutlineRepaints(), "outline");
        Assert.True(fixtures.TransformRepaints(), "transform");
        Assert.True(fixtures.VisibilityRepaints(), "visibility");
    }

    private static Thread StartPost(Window window, WaitHandle ready, EventWaitHandle? next,
        int value, List<int> values, object gate)
    {
        var worker = new Thread(() =>
        {
            ready.WaitOne();
            window.Post(() =>
            {
                lock (gate)
                    values.Add(value);
            });
            next?.Set();
        });
        worker.Start();
        return worker;
    }

    private static void Close(Window window)
    {
        if (!window.IsOpen)
            return;

        window.OnClosing = () => true;
        window.RequestClose();
        window.Pump(0.0);
    }
}
