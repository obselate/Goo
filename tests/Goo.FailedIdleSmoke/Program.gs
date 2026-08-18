package GooFailedIdleSmoke

import System
import System.IO
import Goo

func Require(condition bool, message string) {
    if !condition {
        throw InvalidOperationException(message)
    }
}

func Main() {
    Require(
        Environment.GetEnvironmentVariable("GOO_VK_DIAGNOSTICS") == "1",
        "GOO_VK_DIAGNOSTICS=1 is required")
    Window.ConfigureApplication("Goo failed idle smoke", "0.2.0", "io.github.obselate.goo.failed-idle")
    let capturedError = StringWriter()
    let originalError = Console.Error
    Console.SetError(capturedError)
    var window Window? = nil
    var otherWindow Window? = nil
    try {
        let root = Cell{}
        let opened = Window{
            Title: "Goo failed idle smoke",
            Width: 320,
            Height: 180,
            VSync: false,
            Root: root,
        }
        window = opened
        opened.Open()
        opened.Pump(0.0)
        Require(opened.IsOpen, "failed idle smoke did not warm a window")
        let other = Window{
            Title: "Goo surface loss other window",
            Width: 240,
            Height: 140,
            VSync: false,
            Root: Cell{},
        }
        otherWindow = other
        other.Open()
        other.Pump(0.0)
        Require(other.IsOpen, "surface loss smoke did not warm the other window")
        VulkanWindowTarget.FailNextSurfaceLostForTest()
        opened.Width = 321
        opened.Height = 181
        var recoveryPump int32 = 0
        while recoveryPump < 4 {
            opened.Pump(0.0)
            recoveryPump = recoveryPump + 1
        }
        Require(opened.IsOpen, "surface loss smoke window did not remain open")
        other.Pump(0.0)
        Require(other.IsOpen, "surface loss smoke other window did not remain open")
        other.RequestClose()
        other.Pump(0.0)
        Require(!other.IsOpen, "surface loss smoke other window did not close")
        VulkanSharedRuntime.FailNextDeviceIdleForTest()
        opened.RequestClose()
        opened.Pump(0.0)
        Require(!opened.IsOpen, "failed idle smoke window did not close")

        let rejected = Window{
            Title: "Goo terminal rejection",
            Width: 160,
            Height: 90,
            VSync: false,
            Root: Cell{},
        }
        var rejectionMessage string? = nil
        try {
            rejected.Open()
        } catch (error Exception) {
            rejectionMessage = error.Message
        }
        Require(
            rejectionMessage == "Vulkan shared runtime device is lost",
            "second open rejection was not terminal device-loss rejection")

        let diagnostics = capturedError.ToString()
        Require(
            diagnostics.Contains("\"event\":322")
                && diagnostics.Contains("\"event\":101")
                && diagnostics.Contains("\"result\":-4")
                && diagnostics.Contains("\"value0\":1")
                && diagnostics.Contains("\"surfaceRecoveryCount\":1"),
            "failed idle diagnostics did not record terminal VK_ERROR_DEVICE_LOST")
        Console.SetError(originalError)
        Console.WriteLine("surface-loss: warm=1 other=1 recovered=1 other-usable=1")
        Console.WriteLine("failed-idle: warm=1 close=1 second-open=terminal")
        Console.WriteLine("failed-idle: event322=-4 event101=-4 value0=1")
        Console.WriteLine("failed-idle: diagnostics=" + diagnostics.Length.ToString())
    } finally {
        Console.SetError(originalError)
        if let activeOther = otherWindow {
            if activeOther.IsOpen {
                activeOther.RequestClose()
                activeOther.Pump(0.0)
            }
        }
        if let activeWindow = window {
            if activeWindow.IsOpen {
                activeWindow.RequestClose()
                activeWindow.Pump(0.0)
            }
        }
    }
}
