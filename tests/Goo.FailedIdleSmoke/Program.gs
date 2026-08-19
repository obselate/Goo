package GooFailedIdleSmoke

import System
import System.IO
import Goo

func Require(condition bool, message string) {
    if !condition {
        throw InvalidOperationException(message)
    }
}

func DiagnosticEventLine(
    diagnostics string, eventId uint64, category uint64, startIndex int32) string? {
    if startIndex < 0 {
        return nil
    }
    let eventMarker = "\"event\":" + eventId.ToString()
        + ",\"category\":" + category.ToString() + ","
    var offset int32 = startIndex
    if offset > 0 {
        let prefix = diagnostics.Substring(0, offset)
        let previousLineEnd = prefix.LastIndexOf("\n")
        offset = if previousLineEnd < 0 { 0 } else { previousLineEnd + 1 }
    }
    while offset < diagnostics.Length {
        let remaining = diagnostics.Substring(offset)
        let lineEnd = remaining.IndexOf("\n")
        let lineLength = lineEnd < 0 ? remaining.Length : lineEnd
        let line = remaining.Substring(0, lineLength)
        if line.IndexOf(eventMarker) >= 0 {
            return line
        }
        if lineEnd < 0 {
            return nil
        }
        offset = offset + lineEnd + 1
    }
    return nil
}

func DiagnosticField(line string, field string) uint64? {
    let marker = "\"" + field + "\":"
    let fieldIndex = line.IndexOf(marker)
    if fieldIndex < 0 {
        return nil
    }
    let valueStart = fieldIndex + marker.Length
    let remaining = line.Substring(valueStart)
    let commaIndex = remaining.IndexOf(",")
    let valueText = if commaIndex < 0 {
        remaining.TrimEnd('}')
    } else {
        remaining.Substring(0, commaIndex)
    }
    try {
        return UInt64.Parse(valueText)
    } catch (error Exception) {
        return nil
    }
}

func SuccessfulDiagnosticEventIndex(
    diagnostics string, eventId uint64, category uint64, startIndex int32) int32 {
    let eventMarker = "\"event\":" + eventId.ToString()
        + ",\"category\":" + category.ToString() + ","
    let successMarker = "\"result\":0,"
    var offset int32 = startIndex
    while offset < diagnostics.Length {
        let remaining = diagnostics.Substring(offset)
        let lineEnd = remaining.IndexOf("\n")
        let lineLength = lineEnd < 0 ? remaining.Length : lineEnd
        let line = remaining.Substring(0, lineLength)
        let localEvent = line.IndexOf(eventMarker)
        let eventIndex = offset + localEvent
        if localEvent >= 0 && line.Contains(successMarker) {
            return eventIndex
        }
        if lineEnd < 0 {
            return -1
        }
        offset = offset + lineEnd + 1
    }
    return -1
}

func DiagnosticCounterValue(diagnostics string, field string) uint64 {
    let marker = "\"kind\":\"counters\""
    let countersIndex = diagnostics.LastIndexOf(marker)
    if countersIndex < 0 {
        return 0uL
    }
    let lineEnd = diagnostics.IndexOf("\n", countersIndex)
    let line = if lineEnd < 0 {
        diagnostics.Substring(countersIndex)
    } else {
        diagnostics.Substring(countersIndex, lineEnd - countersIndex)
    }
    let value = DiagnosticField(line, field)
    return if let result = value { result } else { 0uL }
}

class RecoveryCell : Cell {
    shared {
        let Source ImageSource = ImageSource(2, 2, []uint8{
            255, 72, 72, 255,
            72, 224, 128, 255,
            72, 128, 224, 255,
            236, 196, 72, 255,
        })
    }

    internal let TextHandle ElementHandle
    internal var TextRevision State[int32]

    init() {
        TextHandle = ElementHandle()
        TextRevision = Track(0)
    }

    internal func ShowPostRecoveryText() {
        TextRevision.Value = 1
    }

    internal prop CurrentText string {
        get {
            return TextRevision.Value == 0
                ? "Goo Vulkan recovery"
                : "Post-recovery glyph Z9"
        }
    }

    override func Build() Blob {
        return Container{
            Width: Length.Percent(100),
            Height: Length.Percent(100),
            Padding: 12,
            Gap: 8,
            BackgroundColor: Color.Rgb(12, 20, 32),
            Children: {
                Text{
                    Content: CurrentText,
                    Handle: TextHandle,
                    FontSize: 24,
                    Color: Color.White,
                },
                Image{
                    Width: 128,
                    Height: 96,
                    Source: RecoveryCell.Source,
                    Fit: ImageFit.Contain,
                },
            },
        }
    }
}

func RequireTextGeometry(cell RecoveryCell, label string) {
    Require(cell.TextHandle.IsMounted, label + " text handle is not mounted")
    let box = cell.TextHandle.BorderBox
    Require(
        box.Width > 0.0 && box.Height > 0.0,
        label + " text border box is empty")
    var caret ElementRect
    Require(
        cell.TextHandle.TryGetTextCaretRect(
            TextPosition{ Offset: 0, Affinity: TextAffinity.Downstream },
            TextCoordinateSpace.Window,
            out caret),
        label + " text caret geometry is unavailable")
    Require(caret.Height > 0.0, label + " text caret geometry is empty")
    let values = [8]ElementRect
    var destination = values.AsSpan()
    var required int32
    Require(
        cell.TextHandle.TryCopyTextRangeRects(
            TextRange{ Start: 0, Length: cell.CurrentText.Length },
            TextCoordinateSpace.Window,
            destination,
            out required) && required > 0,
        label + " text range geometry is unavailable")
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
    var failedIdleWindow Window? = nil
    try {
        let root = RecoveryCell{}
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
        let otherRoot = RecoveryCell{}
        let other = Window{
            Title: "Goo surface loss other window",
            Width: 240,
            Height: 140,
            VSync: false,
            Root: otherRoot,
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
        VulkanSharedRuntime.FailNextGraphicsSubmissionForTest()
        opened.Width = 322
        opened.Pump(0.0)
        Require(opened.IsOpen, "device loss closed the initiating window before recovery")
        opened.RequestClose()
        opened.Pump(0.0)
        Require(!opened.IsOpen, "device-loss initiator did not close cleanly")
        other.Pump(0.0)
        Require(other.IsOpen, "surviving window did not initiate device recovery")
        other.Pump(0.0)
        otherRoot.ShowPostRecoveryText()
        var textRecoveryPump int32 = 0
        while textRecoveryPump < 4 {
            other.Pump(0.0)
            textRecoveryPump = textRecoveryPump + 1
        }
        Require(
            otherRoot.TextRevision.Value == 1,
            "post-recovery text state did not update")
        RequireTextGeometry(otherRoot, "post-recovery")
        other.RequestClose()
        other.Pump(0.0)
        Require(!other.IsOpen, "recovered image window did not close cleanly")
        let imageDiagnostics = capturedError.ToString()

        let failedIdle = Window{
            Title: "Goo failed idle terminal",
            Width: 160,
            Height: 90,
            VSync: false,
            Root: Cell{},
        }
        failedIdleWindow = failedIdle
        failedIdle.Open()
        failedIdle.Pump(0.0)
        Require(failedIdle.IsOpen, "failed idle smoke did not warm the terminal probe")
        VulkanSharedRuntime.FailNextDeviceIdleForTest()
        failedIdle.RequestClose()
        failedIdle.Pump(0.0)
        Require(!failedIdle.IsOpen, "failed idle smoke terminal probe did not close")

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
        let textAtlasRecordedUploadBytes = DiagnosticCounterValue(
            imageDiagnostics, "textAtlasRecordedUploadBytes")
        let textAtlasPeakCount = DiagnosticCounterValue(imageDiagnostics, "textAtlasPeakCount")
        let drawCount = DiagnosticCounterValue(imageDiagnostics, "drawCount")
        let presentCount = DiagnosticCounterValue(imageDiagnostics, "presentCount")
        let validationErrorCount = DiagnosticCounterValue(
            imageDiagnostics, "validationErrorCount")
        let imageResidentBytes = DiagnosticCounterValue(
            imageDiagnostics, "imageResidentBytes")
        let imageLiveObjectCount = DiagnosticCounterValue(
            imageDiagnostics, "imageLiveObjectCount")
        let imagePeakResidentBytes = DiagnosticCounterValue(
            imageDiagnostics, "imagePeakResidentBytes")
        let imagePeakLiveObjectCount = DiagnosticCounterValue(
            imageDiagnostics, "imagePeakLiveObjectCount")
        let deviceLostLine = DiagnosticEventLine(
            imageDiagnostics, VulkanDiagnosticEventIds.RuntimeDeviceLost,
            VulkanDiagnosticCategories.Recovery, 0)
        let recoveryLine = DiagnosticEventLine(
            imageDiagnostics, VulkanDiagnosticEventIds.RuntimeRecovery,
            VulkanDiagnosticCategories.Recovery, 0)
        let recoveryEvent = SuccessfulDiagnosticEventIndex(
            imageDiagnostics, VulkanDiagnosticEventIds.RuntimeRecovery,
            VulkanDiagnosticCategories.Recovery, 0)
        let uploadEvent = SuccessfulDiagnosticEventIndex(
            imageDiagnostics, VulkanDiagnosticEventIds.UploadStage,
            VulkanDiagnosticCategories.Timing, recoveryEvent + 1)
        let presentEvent = SuccessfulDiagnosticEventIndex(
            imageDiagnostics, VulkanDiagnosticEventIds.SwapchainPresent,
            VulkanDiagnosticCategories.Timing, uploadEvent + 1)
        let imageUploadEvent = SuccessfulDiagnosticEventIndex(
            imageDiagnostics, VulkanDiagnosticEventIds.ResourceUpload,
            VulkanDiagnosticCategories.Image, recoveryEvent + 1)
        let uploadLine = DiagnosticEventLine(
            imageDiagnostics, VulkanDiagnosticEventIds.UploadStage,
            VulkanDiagnosticCategories.Timing, uploadEvent)
        let presentLine = DiagnosticEventLine(
            imageDiagnostics, VulkanDiagnosticEventIds.SwapchainPresent,
            VulkanDiagnosticCategories.Timing, presentEvent)
        let imageUploadLine = DiagnosticEventLine(
            imageDiagnostics, VulkanDiagnosticEventIds.ResourceUpload,
            VulkanDiagnosticCategories.Image, imageUploadEvent)
        Require(
            deviceLostLine != nil && recoveryLine != nil
                && recoveryEvent > 0 && recoveryEvent > imageDiagnostics.IndexOf(deviceLostLine!!),
            "failed idle diagnostics did not record device loss before recovery")
        Require(
            deviceLostLine!!.Contains("\"result\":-4,")
                && recoveryLine!!.Contains("\"result\":0,"),
            "failed idle diagnostics did not record successful recovery transition")
        let oldGenerationValue = if let line = deviceLostLine {
            DiagnosticField(line, "value0")
        } else { nil }
        let newGenerationValue = if let line = recoveryLine {
            DiagnosticField(line, "value0")
        } else { nil }
        Require(
            oldGenerationValue != nil && newGenerationValue != nil,
            "failed idle diagnostics did not record recovery generations")
        let oldGeneration = oldGenerationValue!!
        let newGeneration = newGenerationValue!!
        Require(
            oldGeneration != 0uL && newGeneration > oldGeneration,
            "failed idle diagnostics did not advance the Vulkan generation")
        let recoveryWindowValue = if let line = recoveryLine {
            DiagnosticField(line, "window")
        } else { nil }
        let uploadWindowValue = if let line = uploadLine {
            DiagnosticField(line, "window")
        } else { nil }
        let presentWindowValue = if let line = presentLine {
            DiagnosticField(line, "window")
        } else { nil }
        let uploadFrameValue = if let line = uploadLine {
            DiagnosticField(line, "frame")
        } else { nil }
        let presentFrameValue = if let line = presentLine {
            DiagnosticField(line, "frame")
        } else { nil }
        Require(
            uploadLine != nil && presentLine != nil
                && recoveryWindowValue != nil && uploadWindowValue != nil
                && presentWindowValue != nil && uploadFrameValue != nil
                && presentFrameValue != nil
                && recoveryWindowValue!! != 0uL
                && uploadWindowValue!! == recoveryWindowValue!!
                && presentWindowValue!! == recoveryWindowValue!!
                && uploadFrameValue!! != 0uL && presentFrameValue!! == uploadFrameValue!!,
            "failed idle diagnostics did not tie recovered upload and present to the recovery window")
        let imageUploadBytesValue = if let line = imageUploadLine {
            DiagnosticField(line, "value0")
        } else { nil }
        let imageUploadGenerationValue = if let line = imageUploadLine {
            DiagnosticField(line, "value1")
        } else { nil }
        Require(
            imageUploadEvent > recoveryEvent && imageUploadLine != nil
                && imageUploadBytesValue != nil && imageUploadGenerationValue != nil
                && imageUploadBytesValue!! > 0uL
                && imageUploadGenerationValue!! == newGeneration
                && imagePeakResidentBytes > 0uL
                && imagePeakLiveObjectCount > 0uL
                && imageResidentBytes == 0uL
                && imageLiveObjectCount == 0uL,
            "failed idle diagnostics did not prove recovered image upload and final image release")
        let terminalDeviceLost = diagnostics.Contains("\"event\":322")
            && diagnostics.Contains("\"event\":101")
            && diagnostics.Contains("\"result\":-4")
            && diagnostics.Contains("\"value0\":1")
            && diagnostics.Contains("\"surfaceRecoveryCount\":1")
            && diagnostics.Contains("\"deviceRecoveryCount\":1")
            && diagnostics.Contains("\"event\":5")
            && !diagnostics.Contains("\"kind\":\"fatal\"")
        if !terminalDeviceLost {
            Console.SetError(originalError)
            Console.Error.Write(diagnostics)
        }
        Require(
            terminalDeviceLost,
            "failed idle diagnostics did not record terminal VK_ERROR_DEVICE_LOST: event322="
                + diagnostics.Contains("\"event\":322").ToString()
                + " event101=" + diagnostics.Contains("\"event\":101").ToString()
                + " result=-4=" + diagnostics.Contains("\"result\":-4").ToString()
                + " value0=1=" + diagnostics.Contains("\"value0\":1").ToString()
                + " surfaceRecovery=1="
                + diagnostics.Contains("\"surfaceRecoveryCount\":1").ToString()
                + " deviceRecovery=1="
                + diagnostics.Contains("\"deviceRecoveryCount\":1").ToString()
                + " event5=" + diagnostics.Contains("\"event\":5").ToString()
                + " fatal=" + diagnostics.Contains("\"kind\":\"fatal\"").ToString()
                + " fatalCode=" + DiagnosticCounterValue(diagnostics, "fatalCode").ToString()
                + " fatalValue=" + DiagnosticCounterValue(diagnostics, "fatalValue").ToString()
                + " resultFailures="
                + DiagnosticCounterValue(diagnostics, "resultFailureCount").ToString())
        Require(
            recoveryEvent >= 0 && uploadEvent > recoveryEvent && presentEvent > uploadEvent,
            "failed idle diagnostics did not record ordered recovery upload and present: "
                + recoveryEvent.ToString() + "," + uploadEvent.ToString() + ","
                + presentEvent.ToString())
        Require(
            textAtlasRecordedUploadBytes > 0uL && textAtlasPeakCount > 0uL
                && drawCount > 0uL && presentCount > 0uL
                && validationErrorCount == 0uL,
            "failed idle diagnostics did not record recovered text atlas upload and draw")
        Console.SetError(originalError)
        Console.WriteLine("surface-loss: warm=1 other=1 recovered=1 other-usable=1")
        Console.WriteLine("failed-idle: warm=1 close=1 second-open=terminal")
        Console.WriteLine("failed-idle: event322=-4 event101=-4 value0=1")
        Console.WriteLine("failed-idle: text=recovered atlasRecordedUploadBytes="
            + textAtlasRecordedUploadBytes.ToString() + " atlasPeakCount="
            + textAtlasPeakCount.ToString()
            + " drawCount=" + drawCount.ToString() + " presentCount="
            + presentCount.ToString() + " geometry=1")
        Console.WriteLine("failed-idle: image=reuploaded uploadBytes="
            + imageUploadBytesValue!!.ToString() + " uploadGeneration="
            + imageUploadGenerationValue!!.ToString() + " residentPeak="
            + imagePeakResidentBytes.ToString() + " livePeak="
            + imagePeakLiveObjectCount.ToString() + " residentFinal="
            + imageResidentBytes.ToString() + " liveFinal="
            + imageLiveObjectCount.ToString())
        Console.WriteLine("failed-idle: diagnostics=" + diagnostics.Length.ToString())
    } finally {
        Console.SetError(originalError)
        if let activeFailedIdle = failedIdleWindow {
            if activeFailedIdle.IsOpen {
                activeFailedIdle.RequestClose()
                activeFailedIdle.Pump(0.0)
            }
        }
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
