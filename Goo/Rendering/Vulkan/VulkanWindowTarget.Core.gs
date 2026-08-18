package Goo

import System
import System.Collections.Generic
import System.Numerics
import System.Threading

internal unsafe partial class VulkanWindowTarget : IDisposable, FrameProfileSink {
    shared {
        private var terminalTargets List[VulkanWindowTarget]? = nil
        private var testFailNextSurfaceLost int32

        internal func RetainTerminalTarget(target VulkanWindowTarget) {
            if terminalTargets == nil {
                terminalTargets = List[VulkanWindowTarget]()
            }
            terminalTargets!!.Add(target)
        }

        internal func FailNextSurfaceLostForTest() {
            Interlocked.Exchange(ref testFailNextSurfaceLost, 1)
        }

        private func TakeTestSurfaceLostForTest() bool {
            return Interlocked.Exchange(ref testFailNextSurfaceLost, 0) != 0
        }
    }

    private let host SdlHost
    private var diagnostics VulkanDiagnostics? = nil
    private var timestampState VulkanDiagnosticTimestampState? = nil
    private var validation VulkanDiagnosticsValidation? = nil
    private let sceneCompiler VulkanSceneCompiler
    private let presentationRetirement VulkanPresentationRetirement
    private var runtime VulkanSharedLease? = nil
    private var objectAccounting VulkanObjectAccounting? = nil
    private var sharedObjectAccounting VulkanObjectAccounting? = nil
    private var windowObjectAccounting VulkanObjectAccounting? = nil
    private var memoryAllocator VulkanMemoryAllocator? = nil
    private var imageResources VulkanImageResources? = nil
    private var imageScene VulkanImageScene? = nil
    private var textAtlas VulkanTextAtlasSet? = nil
    private var textScene VulkanTextScene? = nil
    private var instance VkInstance = nint(0)
    private var instanceDispatch VkInstanceDispatch = VkInstanceDispatch{}
    private var getProcAddress nint = nint(0)
    private var instanceMaintenanceVariant VulkanSwapchainMaintenanceVariant
    private var swapchainMaintenanceVariant VulkanSwapchainMaintenanceVariant
    private var memoryBudgetSupported bool
    private var physicalDevice VkPhysicalDevice = nint(0)
    private var device VkDevice = nint(0)
    private var dispatch VkDeviceDispatch = VkDeviceDispatch{}
    private var instanceDestroyAvailable bool
    private var deviceDestroyAvailable bool
    private var debugUtilsEnabled bool
    private var validationMessenger VkDebugUtilsMessengerEXT = 0uL
    private var validationMessengerCreated bool
    private var timestampValidBits uint32
    private var timestampPeriod float32
    private var timestampComputeAndGraphics VkBool32 = VkConstants.VK_FALSE
    private var deviceFacts VulkanSharedDeviceFacts
    private var queue VkQueue = nint(0)
    private var queueFamilyIndex uint32 = 0u
    private var surface VkSurfaceKHR = 0uL
    private var surfaceCreated bool
    private var vulkanLoaded bool
    private var deviceWaitIdleAddress nint = nint(0)
    private var commandPool VkCommandPool = 0uL
    private var commandBufferObjectCount int32
    private var frameSlot0 VulkanFrameSlot? = nil
    private var frameSlot1 VulkanFrameSlot? = nil
    private var generation VulkanSwapchainGeneration? = nil
    private var retiredSwapchains ([]VulkanRetiredWindowSwapchain?)? = nil
    private var retiredSwapchainCount int32
    private var primitiveRenderer VulkanPrimitiveRenderer? = nil
    private var framebufferWidth int32
    private var framebufferHeight int32
    private var requestedWidth int32
    private var requestedHeight int32
    private var nextFrameSlot uint32
    private var nextFrameId uint64
    private var activeFrameId uint64
    private var activeFrameSlot VulkanFrameSlot? = nil
    private var activeFrameSlotIndex uint32
    private var activeImageIndex uint32
    private var activeImageLayout VkImageLayout
    private var frameBegun bool
    private var renderingBegun bool
    private var frameRendered bool
    private var frameFailed bool
    private var textRedrawPending bool
    private var imageRedrawPending bool
    private var recreatePending bool = true
    private var surfaceLost bool
    private var disposed bool

    internal prop NeedsRender bool {
        get {
            return textRedrawPending || imageRedrawPending
                || (recreatePending && framebufferWidth > 0 && framebufferHeight > 0)
        }
    }

    internal init(nativeHost SdlHost) {
        if nativeHost == nil {
            throw ArgumentNullException("nativeHost")
        }
        host = nativeHost
        sceneCompiler = VulkanSceneCompiler()
        presentationRetirement = VulkanPresentationRetirement(64u, 8u)
        retiredSwapchains = [8]VulkanRetiredWindowSwapchain?
        try {
            Bootstrap()
            if let resources = textScene {
                sceneCompiler.SetTextScene(resources)
            }
            sceneCompiler.SetImageScene(imageScene)
            RecordDiagnosticEvent(
                VulkanDiagnosticEventIds.WindowCreate,
                VulkanDiagnosticCategories.Window,
                0uL,
                0,
                uint64(framebufferWidth),
                uint64(framebufferHeight))
            CaptureDiagnosticWsi()
        } catch (error Exception) {
            CaptureDiagnosticFatal(-1, VulkanDiagnosticEventIds.RuntimeStart)
            try { Dispose() } catch (cleanup Exception) { }
            throw error
        }
    }

    internal func BeginFrame() {
        if frameFailed {
            throw InvalidOperationException("Vulkan window target cannot continue after a failed frame")
        }
        if disposed || frameBegun || framebufferWidth <= 0 || framebufferHeight <= 0 {
            return
        }
        if let activeRuntime = runtime {
            if activeRuntime.DeviceLost || activeRuntime.Terminal {
                return
            }
        }
        activeFrameId = nextFrameId + 1uL
        nextFrameId = activeFrameId
        RecordDiagnosticEvent(
            VulkanDiagnosticEventIds.FrameBegin,
            VulkanDiagnosticCategories.Timing,
            0uL,
            0,
            uint64(framebufferWidth),
            uint64(framebufferHeight))
        try {
            if recreatePending {
                if !RecreateSwapchain(requestedWidth, requestedHeight) {
                    return
                }
            }
            guard let current = generation else {
                return
            }
            let slot = if nextFrameSlot == 0u { frameSlot0 } else { frameSlot1 }
            guard let selectedSlot = slot else {
                throw InvalidOperationException("Vulkan frame slots are unavailable")
            }
            let prepareResult = selectedSlot.PrepareAcquire()
            RecordDiagnosticResult(VulkanDiagnosticEventIds.PresentWait, prepareResult)
            if prepareResult != VkConstants.VK_SUCCESS {
                HandleFrameFailure(prepareResult, VulkanDiagnosticEventIds.PresentWait)
                return
            }
            ResolveDiagnosticTimestamp(selectedSlot, nextFrameSlot)
            if let atlas = textAtlas {
                atlas.Collect(selectedSlot.LastCompletedGlobalSubmissionSerial)
            }
            if let resources = imageResources {
                resources.Collect(selectedSlot.LastCompletedGlobalSubmissionSerial)
            }
            presentationRetirement.CollectCompleted(nextFrameSlot, selectedSlot.LastCompletedSerial)
            CollectRetiredSwapchains()
            var imageIndex uint32 = 0u
            let acquireNextImage = dispatch.vkAcquireNextImageKHR
            let acquire = acquireNextImage(
                device,
                current.Handle,
                VkConstants.VK_WHOLE_SIZE,
                selectedSlot.AcquireSemaphore,
                0uL,
                &imageIndex)
            RecordDiagnosticResult(VulkanDiagnosticEventIds.SwapchainAcquire, acquire)
            let markedAcquire = selectedSlot.MarkAcquired(acquire)
            if markedAcquire != acquire {
                RecordDiagnosticResult(VulkanDiagnosticEventIds.SwapchainAcquire, markedAcquire)
            }
            if markedAcquire == VkConstants.VK_ERROR_OUT_OF_DATE_KHR
                || markedAcquire == VkConstants.VK_ERROR_SURFACE_LOST_KHR {
                recreatePending = true
                surfaceLost = markedAcquire == VkConstants.VK_ERROR_SURFACE_LOST_KHR
                return
            }
            if markedAcquire != VkConstants.VK_SUCCESS && markedAcquire != VkConstants.VK_SUBOPTIMAL_KHR {
                HandleFrameFailure(markedAcquire, VulkanDiagnosticEventIds.SwapchainAcquire)
                return
            }
            if imageIndex >= current.ImageCount {
                throw InvalidOperationException("Vulkan acquired image index is invalid")
            }
            activeFrameSlot = selectedSlot
            activeFrameSlotIndex = nextFrameSlot
            activeImageIndex = imageIndex
            activeImageLayout = current.CurrentLayout(imageIndex)
            frameBegun = true
            renderingBegun = false
            frameRendered = false
            CaptureDiagnosticWsi()
            if markedAcquire == VkConstants.VK_SUBOPTIMAL_KHR {
                recreatePending = true
            }
            if !BeginCommandBuffer(selectedSlot) {
                return
            }
        } finally {
            if !frameBegun {
                CloseDiagnosticFrame(false)
            }
        }
    }

    internal func Render(root Node?, background Color, dpi Vector2) {
        if disposed || !frameBegun || frameRendered {
            return
        }
        if let activeRuntime = runtime {
            if activeRuntime.DeviceLost || activeRuntime.Terminal {
                return
            }
        }
        guard let renderer = primitiveRenderer else {
            return
        }
        try {
            let scaleX = ResolveScale(dpi.X)
            let scaleY = ResolveScale(dpi.Y)
            let logicalWidth = host.LogicalWidth > 0
                ? float32(host.LogicalWidth)
                : float32(framebufferWidth) / scaleX
            let logicalHeight = host.LogicalHeight > 0
                ? float32(host.LogicalHeight)
                : float32(framebufferHeight) / scaleY
            let planStart = DiagnosticTimestamp()
            var completedGlobalSubmissionSerial uint64 = 0uL
            if let slot = activeFrameSlot {
                completedGlobalSubmissionSerial = slot.LastCompletedGlobalSubmissionSerial
            }
            textScene?.BeginCompile(completedGlobalSubmissionSerial)
            imageScene?.BeginCompile()
            let compileResult = sceneCompiler.Compile(root, background, logicalWidth, logicalHeight)
            textRedrawPending = textScene?.RedrawRequired == true
            imageRedrawPending = imageScene?.RedrawRequired == true
            ScaleFrame(sceneCompiler.Frame, scaleX, scaleY)
            RecordDiagnosticPlan(planStart, compileResult, sceneCompiler.Frame.Counters, sceneCompiler.Frame)
            let uploadStart = DiagnosticTimestamp()
            var uploadBytes uint64 = 0uL
            if let resources = imageResources {
                if let slot = activeFrameSlot {
                    var imageUploadBytes VkDeviceSize = 0uL
                    var imageUploadBarriers int32 = 0
                    resources.RecordUploads(
                        slot.CommandBuffer,
                        resources.Generation,
                        out imageUploadBytes,
                        out imageUploadBarriers)
                    RecordDiagnosticBarrierCount(imageUploadBarriers)
                    uploadBytes = uploadBytes + uint64(imageUploadBytes)
                }
            }
            if let resources = textScene {
                resources.PrepareUpload()
                if let slot = activeFrameSlot, let atlas = textAtlas {
                    let timestampStarted = BeginDiagnosticTimestamp(
                        slot, VulkanDiagnosticTimestampStage.Upload)
                    var recordedBytes VkDeviceSize = 0uL
                    var recordedBarriers int32 = 0
                    atlas.RecordUploads(slot.CommandBuffer, out recordedBytes, out recordedBarriers)
                    RecordDiagnosticBarrierCount(recordedBarriers)
                    if timestampStarted {
                        EndDiagnosticTimestamp(slot, VulkanDiagnosticTimestampStage.Upload)
                    }
                    uploadBytes = uploadBytes + uint64(recordedBytes)
                }
            }
            RecordDiagnosticUpload(uploadStart, uploadBytes)
            if let current = generation {
                if let slot = activeFrameSlot {
                    let recordStart = DiagnosticTimestamp()
                    renderer.ReserveImageReferences(sceneCompiler.Frame)
                    BeginRendering(current, slot, activeImageIndex)
                    let recordResult = renderer.RecordInsideRendering(
                        slot.CommandBuffer, sceneCompiler.Frame, current.Extent)
                    RecordDiagnosticRecord(recordStart, sceneCompiler.Frame, recordResult)
                    frameRendered = true
                }
            }
        } catch (error Exception) {
            try {
                if !renderingBegun {
                    if let current = generation {
                        if let slot = activeFrameSlot {
                            BeginRendering(current, slot, activeImageIndex)
                        }
                    }
                }
            } catch (cleanup Exception) { }
            try { Present() } catch (cleanup Exception) { }
            CaptureDiagnosticFatal(-1, VulkanDiagnosticEventIds.CommandRecord)
            throw error
        }
    }

    internal func Present() {
        if disposed || !frameBegun {
            return
        }
        if let activeRuntime = runtime {
            if activeRuntime.DeviceLost || activeRuntime.Terminal {
                return
            }
        }
        guard let current = generation, let slot = activeFrameSlot else {
            if let renderer = primitiveRenderer {
                try { renderer.ReleaseImageReferences(sceneCompiler.Frame) } catch (cleanup Exception) { }
            }
            CloseDiagnosticFrame(false)
            ClearActiveFrame()
            return
        }
        var submissionAccepted = false
        var endStart uint64 = 0uL
        var uploadFlushStart uint64 = 0uL
        var submitStart uint64 = 0uL
        try {
            if !renderingBegun {
                BeginRendering(current, slot, activeImageIndex)
            }
            endStart = DiagnosticTimestamp()
            EndRendering(current, slot)
            let endCommandBuffer = dispatch.vkEndCommandBuffer
            let endResult = endCommandBuffer(slot.CommandBuffer)
            RecordDiagnosticResult(VulkanDiagnosticEventIds.CommandRecord, endResult)
            RecordDiagnosticTiming(VulkanDiagnosticEventIds.CommandRecord, VulkanDiagnosticCategories.Timing, endStart)
            if endResult != VkConstants.VK_SUCCESS {
                HandleFrameFailure(endResult, VulkanDiagnosticEventIds.CommandRecord)
                return
            }
            if let atlas = textAtlas {
                uploadFlushStart = DiagnosticTimestamp()
                let flushResult = atlas.FlushBeforeSubmit()
                RecordDiagnosticResult(VulkanDiagnosticEventIds.UploadStage, flushResult)
                RecordDiagnosticTiming(VulkanDiagnosticEventIds.UploadStage, VulkanDiagnosticCategories.Timing, uploadFlushStart)
                if flushResult != VkConstants.VK_SUCCESS {
                    HandleFrameFailure(flushResult, VulkanDiagnosticEventIds.UploadStage)
                    return
                }
            }
            if let resources = imageResources {
                uploadFlushStart = DiagnosticTimestamp()
                let flushResult = resources.FlushBeforeSubmit()
                RecordDiagnosticResult(VulkanDiagnosticEventIds.UploadStage, flushResult)
                RecordDiagnosticTiming(VulkanDiagnosticEventIds.UploadStage, VulkanDiagnosticCategories.Timing, uploadFlushStart)
                if flushResult != VkConstants.VK_SUCCESS {
                    HandleFrameFailure(flushResult, VulkanDiagnosticEventIds.UploadStage)
                    return
                }
            }
            submitStart = DiagnosticTimestamp()
            let prepareSubmit = slot.PrepareSubmit(true)
            RecordDiagnosticResult(VulkanDiagnosticEventIds.Submit, prepareSubmit)
            if prepareSubmit != VkConstants.VK_SUCCESS {
                RecordDiagnosticTiming(VulkanDiagnosticEventIds.Submit, VulkanDiagnosticCategories.Timing, submitStart)
                HandleFrameFailure(prepareSubmit, VulkanDiagnosticEventIds.Submit)
                return
            }
            var waitInfo = VkSemaphoreSubmitInfo{}
            waitInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SEMAPHORE_SUBMIT_INFO
            waitInfo.semaphore = slot.AcquireSemaphore
            waitInfo.stageMask = VkConstants.VK_PIPELINE_STAGE_2_ALL_COMMANDS_BIT
            var signalInfo = VkSemaphoreSubmitInfo{}
            signalInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SEMAPHORE_SUBMIT_INFO
            signalInfo.semaphore = current.RenderSemaphore(activeImageIndex)
            signalInfo.stageMask = VkConstants.VK_PIPELINE_STAGE_2_ALL_COMMANDS_BIT
            var commandInfo = VkCommandBufferSubmitInfo{}
            commandInfo.sType = VkConstants.VK_STRUCTURE_TYPE_COMMAND_BUFFER_SUBMIT_INFO
            commandInfo.commandBuffer = slot.CommandBuffer
            var submitInfo = VkSubmitInfo2{}
            submitInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SUBMIT_INFO_2
            submitInfo.waitSemaphoreInfoCount = 1u
            submitInfo.pWaitSemaphoreInfos = &waitInfo
            submitInfo.commandBufferInfoCount = 1u
            submitInfo.pCommandBufferInfos = &commandInfo
            submitInfo.signalSemaphoreInfoCount = 1u
            submitInfo.pSignalSemaphoreInfos = &signalInfo
            guard let activeRuntime = runtime else {
                throw InvalidOperationException("Vulkan shared runtime is unavailable")
            }
            let globalSubmissionSerial = activeRuntime.ReserveGraphicsSubmissionSerial()
            if let resources = imageResources {
                resources.ValidateUploadSubmission(
                    slot.CommandBuffer,
                    globalSubmissionSerial,
                    resources.Generation)
            }
            let queueSubmit = dispatch.vkQueueSubmit2
            let submitResult = queueSubmit(queue, 1u, &submitInfo, slot.SubmissionFence)
            RecordDiagnosticResult(VulkanDiagnosticEventIds.Submit, submitResult)
            let markedSubmit = slot.MarkSubmitted(submitResult, globalSubmissionSerial)
            if markedSubmit != VkConstants.VK_SUCCESS {
                RecordDiagnosticTiming(VulkanDiagnosticEventIds.Submit, VulkanDiagnosticCategories.Timing, submitStart)
                HandleFrameFailure(markedSubmit, VulkanDiagnosticEventIds.Submit)
                return
            }
            submissionAccepted = true
            if let resources = imageResources {
                resources.MarkSubmitted(
                    slot.CommandBuffer,
                    globalSubmissionSerial,
                    resources.Generation)
                var imageIndex int32 = 0
                while imageIndex < sceneCompiler.Frame.CachedImageCount {
                    let image = sceneCompiler.Frame.CachedImages[imageIndex]
                    if image.ImageId.IsValid {
                        resources.MarkUsed(
                            image.ImageId,
                            resources.Generation,
                            globalSubmissionSerial)
                    }
                    imageIndex = imageIndex + 1
                }
            }
            SubmitDiagnosticTimestamp(slot)
            RecordDiagnosticSubmit(submitStart)
            if let atlas = textAtlas {
                atlas.MarkSubmitted(slot.CommandBuffer, globalSubmissionSerial)
                var glyphIndex int32 = 0
                while glyphIndex < sceneCompiler.Frame.CachedGlyphRunCount {
                    atlas.MarkUsed(sceneCompiler.Frame.CachedGlyphRuns[glyphIndex].AtlasId,
                        globalSubmissionSerial)
                    glyphIndex = glyphIndex + 1
                }
            }
            if activeImageLayout == VkConstants.VK_IMAGE_LAYOUT_PRESENT_SRC_KHR {
                presentationRetirement.BindPriorSameImageToCompletion(
                    current.Generation,
                    activeImageIndex,
                    activeFrameSlotIndex,
                    slot.SubmissionSerial)
            }
            var completedPresentId uint64 = 0uL
            var presentFence VkFence = current.PreparePresent(activeImageIndex, out completedPresentId)
            if completedPresentId != 0uL {
                presentationRetirement.CompletePresent(completedPresentId)
            }
            var fenceInfo = VkSwapchainPresentFenceInfoEXT{}
            var presentInfo = VkPresentInfoKHR{}
            presentInfo.sType = VkConstants.VK_STRUCTURE_TYPE_PRESENT_INFO_KHR
            if current.PresentFenceEnabled {
                fenceInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SWAPCHAIN_PRESENT_FENCE_INFO_EXT
                fenceInfo.swapchainCount = 1u
                fenceInfo.pFences = &presentFence
                presentInfo.pNext = *void(&fenceInfo)
            }
            presentInfo.waitSemaphoreCount = 1u
            presentInfo.pWaitSemaphores = &signalInfo.semaphore
            var swapchainHandle = current.Handle
            presentInfo.swapchainCount = 1u
            presentInfo.pSwapchains = &swapchainHandle
            presentInfo.pImageIndices = &activeImageIndex
            let queuePresent = dispatch.vkQueuePresentKHR
            let presentStart = DiagnosticTimestamp()
            let presentResult = queuePresent(queue, &presentInfo)
            RecordDiagnosticResult(VulkanDiagnosticEventIds.SwapchainPresent, presentResult)
            RecordDiagnosticPresent(presentStart)
            if presentResult == VkConstants.VK_ERROR_SURFACE_LOST_KHR {
                current.MarkPresented(activeImageIndex, presentResult, 0uL)
                surfaceLost = true
                recreatePending = true
            } else {
                var presentId uint64 = 0uL
                if presentResult == VkConstants.VK_SUCCESS || presentResult == VkConstants.VK_SUBOPTIMAL_KHR {
                    presentId = presentationRetirement.RecordPresent(current.Generation, activeImageIndex)
                }
                let markedPresent = current.MarkPresented(activeImageIndex, presentResult, presentId)
                if markedPresent != presentResult {
                    RecordDiagnosticResult(VulkanDiagnosticEventIds.SwapchainPresent, markedPresent)
                }
                if markedPresent != VkConstants.VK_SUCCESS
                    && markedPresent != VkConstants.VK_SUBOPTIMAL_KHR
                    && markedPresent != VkConstants.VK_ERROR_OUT_OF_DATE_KHR {
                    HandleFrameFailure(markedPresent, VulkanDiagnosticEventIds.SwapchainPresent)
                }
                if presentId != 0uL {
                    presentationRetirement.AnchorRetiredGenerations(current.Generation)
                }
                if presentResult == VkConstants.VK_ERROR_OUT_OF_DATE_KHR {
                    recreatePending = true
                } else if presentResult == VkConstants.VK_SUBOPTIMAL_KHR {
                    recreatePending = true
                } else if presentResult != VkConstants.VK_SUCCESS {
                    HandleFrameFailure(presentResult, VulkanDiagnosticEventIds.SwapchainPresent)
                } else {
                    current.CommitLayout(activeImageIndex, VkConstants.VK_IMAGE_LAYOUT_PRESENT_SRC_KHR)
                }
            }
            CaptureDiagnosticWsi()
        } finally {
            if !submissionAccepted {
                if let renderer = primitiveRenderer {
                    try { renderer.ReleaseImageReferences(sceneCompiler.Frame) } catch (cleanup Exception) { }
                }
                try { AbortUnsubmittedTextUpload() } catch (cleanup Exception) { }
                try { AbortUnsubmittedImageUploads() } catch (cleanup Exception) { }
                frameFailed = true
            }
            CaptureDiagnosticResources()
            CloseDiagnosticFrame(submissionAccepted)
            CaptureDiagnosticValidationBoundary()
            ClearActiveFrame()
        }
    }

    internal func Resize(width int32, height int32) bool {
        if disposed {
            return false
        }
        if let activeRuntime = runtime {
            if activeRuntime.DeviceLost || activeRuntime.Terminal {
                return false
            }
        }
        if width < 0 || height < 0 {
            return false
        }
        requestedWidth = width
        requestedHeight = height
        framebufferWidth = width
        framebufferHeight = height
        if width == 0 || height == 0 {
            recreatePending = true
            return true
        }
        if frameBegun {
            return false
        }
        return RecreateSwapchain(width, height)
    }

    public func Dispose() {
        if disposed {
            return
        }
        disposed = true
        if let scene = imageScene {
            try { scene.Dispose() } catch (cleanup Exception) { }
        }
        CaptureDiagnosticWsi()
        CaptureDiagnosticResources()
        var idleResult VkResult = VkConstants.VK_ERROR_INITIALIZATION_FAILED
        if device != nint(0) {
            idleResult = WaitDeviceIdleResult()
        }
        RecordDiagnosticResult(VulkanDiagnosticEventIds.PresentWait, idleResult)
        let deviceIdleCompleted = device == nint(0) || idleResult == VkConstants.VK_SUCCESS
        CaptureDiagnosticValidationBoundary()
        if !deviceIdleCompleted {
            if let activeRuntime = runtime {
                activeRuntime.MarkTeardownFailed(idleResult)
            } else {
                VulkanSharedRuntime.MarkGlobalTerminalFailure(idleResult)
            }
            RecordDiagnosticEvent(
                VulkanDiagnosticEventIds.WindowDestroy,
                VulkanDiagnosticCategories.Window,
                1uL,
                int32(idleResult),
                uint64(surface),
                DiagnosticSwapchainValue())
            VulkanWindowTarget.RetainTerminalTarget(this)
            if let currentDiagnostics = diagnostics {
                currentDiagnostics.Seal()
                try { currentDiagnostics.FlushNdjson(Console.Error) } catch (cleanup Exception) { }
            }
            return
        }
        if let renderer = primitiveRenderer {
            try { renderer.ReleaseImageReferences(sceneCompiler.Frame) } catch (cleanup Exception) { }
        }
        try { AbortUnsubmittedImageUploads() } catch (cleanup Exception) { }
        CloseDiagnosticFrame(false)
        ClearActiveFrame()
        DestroyDiagnosticTimestampPool()
        let timestampPoolDestroyed = ForceDestroyDiagnosticTimestampPool()
        if let renderer = primitiveRenderer {
            try { renderer.Dispose() } catch (cleanup Exception) { }
            primitiveRenderer = nil
        }
        if let atlas = textAtlas {
            try { atlas.RetireAll(uint64.MaxValue) } catch (cleanup Exception) { }
            try { atlas.Collect(uint64.MaxValue) } catch (cleanup Exception) { }
            try { atlas.AbortUploads() } catch (cleanup Exception) { }
            try { atlas.Dispose() } catch (cleanup Exception) { }
            textAtlas = nil
        }
        textScene = nil
        textRedrawPending = false
        imageScene = nil
        imageRedrawPending = false
        imageResources = nil
        if let current = generation {
            try {
                let presentCompletionResult = current.WaitForPresentCompletion(presentationRetirement)
                RecordDiagnosticResult(VulkanDiagnosticEventIds.PresentWait, presentCompletionResult)
            } catch (cleanup Exception) { }
            try { current.Dispose() } catch (cleanup Exception) { }
            generation = nil
        }
        DisposeRetiredSwapchains()
        if let slot = frameSlot0 {
            try { slot.Dispose() } catch (cleanup Exception) { }
            frameSlot0 = nil
        }
        if let slot = frameSlot1 {
            try { slot.Dispose() } catch (cleanup Exception) { }
            frameSlot1 = nil
        }
        if commandPool != 0uL && device != nint(0) {
            let destroyCommandPool = dispatch.vkDestroyCommandPool
            destroyCommandPool(device, commandPool, nil)
            var bufferIndex int32 = 0
            while bufferIndex < commandBufferObjectCount {
                if let accounting = windowObjectAccounting {
                    accounting.Release()
                }
                bufferIndex = bufferIndex + 1
            }
            commandBufferObjectCount = 0
            if let accounting = windowObjectAccounting {
                accounting.Release()
            }
            commandPool = 0uL
        }
        if surfaceCreated && instance != nint(0) {
            try { host.DestroyVulkanSurface(instance, surface) } catch (cleanup Exception) { }
            if let accounting = windowObjectAccounting {
                accounting.Release()
            }
            surface = 0uL
            surfaceCreated = false
        }
        if runtime == nil {
            try { DestroyValidationMessenger() } catch (cleanup Exception) { }
        }
        if runtime == nil && device != nint(0) && deviceDestroyAvailable {
            let destroyDevice = dispatch.vkDestroyDevice
            destroyDevice(device, nil)
            if let accounting = sharedObjectAccounting {
                accounting.Release()
            }
            device = nint(0)
        }
        if runtime == nil && instance != nint(0) && instanceDestroyAvailable {
            let destroyInstance = instanceDispatch.vkDestroyInstance
            destroyInstance(instance, nil)
            if let accounting = sharedObjectAccounting {
                accounting.Release()
            }
            instance = nint(0)
        }
        var flushDiagnostics = runtime == nil
        if let activeRuntime = runtime {
            var releasedLastLease = false
            try { releasedLastLease = activeRuntime.ReleaseAfterIdle() } catch (cleanup Exception) { }
            if !releasedLastLease && activeRuntime.Terminal {
                RecordDiagnosticResult(
                    VulkanDiagnosticEventIds.PresentWait,
                    activeRuntime.TerminalIdleResult)
                RecordDiagnosticEvent(
                    VulkanDiagnosticEventIds.WindowDestroy,
                    VulkanDiagnosticCategories.Window,
                    1uL,
                    int32(activeRuntime.TerminalIdleResult),
                    0uL,
                    0uL)
                VulkanWindowTarget.RetainTerminalTarget(this)
                if let currentDiagnostics = diagnostics {
                    currentDiagnostics.Seal()
                    try { currentDiagnostics.FlushNdjson(Console.Error) } catch (cleanup Exception) { }
                }
                return
            }
            runtime = nil
            if releasedLastLease {
                flushDiagnostics = true
            }
        }
        if !timestampPoolDestroyed {
            AbandonDiagnosticTimestampPool()
        }
        instance = nint(0)
        device = nint(0)
        CaptureDiagnosticResources()
        memoryAllocator = nil
        if vulkanLoaded {
            try { host.UnloadVulkanLibrary() } catch (cleanup Exception) { }
            vulkanLoaded = false
        }
        CaptureDiagnosticValidationBoundary()
        RecordDiagnosticEvent(
            VulkanDiagnosticEventIds.WindowDestroy,
            VulkanDiagnosticCategories.Window,
            0uL,
            0,
            0uL,
            0uL)
        if flushDiagnostics {
            if let currentDiagnostics = diagnostics {
                currentDiagnostics.Seal()
                try { currentDiagnostics.FlushNdjson(Console.Error) } catch (cleanup Exception) { }
            }
        }
        activeFrameSlot = nil
        activeFrameSlotIndex = 0u
        activeImageIndex = 0u
        activeImageLayout = VkConstants.VK_IMAGE_LAYOUT_UNDEFINED
        activeFrameId = 0uL
        frameBegun = false
    }

    private func ClearActiveFrame() {
        frameBegun = false
        renderingBegun = false
        frameRendered = false
        activeFrameSlot = nil
        activeFrameSlotIndex = 0u
        activeImageIndex = 0u
        activeImageLayout = VkConstants.VK_IMAGE_LAYOUT_UNDEFINED
        activeFrameId = 0uL
        nextFrameSlot = nextFrameSlot == 0u ? 1u : 0u
    }

    private func AbortUnsubmittedTextUpload() {
        if let atlas = textAtlas {
            if atlas.AbortUploads() {
                textScene?.RestoreUpload()
            }
        }
    }

    private func AbortUnsubmittedImageUploads() {
        guard let resources = imageResources, let slot = activeFrameSlot else {
            return
        }
        resources.AbortUploads(slot.CommandBuffer, resources.Generation)
        resources.AbortUnrecordedUploads(resources.Generation)
    }

    private func HandleFrameFailure(result VkResult, eventId uint64) {
        if result == VkConstants.VK_ERROR_OUT_OF_DATE_KHR
            || result == VkConstants.VK_SUBOPTIMAL_KHR {
            recreatePending = true
            return
        }
        if result == VkConstants.VK_ERROR_SURFACE_LOST_KHR {
            surfaceLost = true
            recreatePending = true
            return
        }
        if result == VkConstants.VK_ERROR_DEVICE_LOST {
            runtime?.MarkDeviceLost()
        }
        CaptureDiagnosticFatal(int32(result), eventId)
        throw InvalidOperationException("Vulkan frame operation failed: " + result.ToString())
    }

    private func ResolveScale(value float32) float32 {
        if Single.IsNaN(value) || Single.IsInfinity(value) || value <= 0.0F {
            return 1.0F
        }
        return value
    }
}
