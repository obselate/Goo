package Goo

import System
import System.Numerics

internal unsafe partial class VulkanWindowTarget : IDisposable {
    private let host SdlHost
    private let sceneCompiler VulkanSceneCompiler
    private let presentationRetirement VulkanPresentationRetirement
    private var runtime VulkanRuntime? = nil
    private var memoryAllocator VulkanMemoryAllocator? = nil
    private var textAtlas VulkanTextAtlas? = nil
    private var textScene VulkanTextScene? = nil
    private var instance VkInstance = nint(0)
    private var instanceDispatch VkInstanceDispatch = VkInstanceDispatch{}
    private var getProcAddress nint = nint(0)
    private var instanceMaintenanceVariant VulkanSwapchainMaintenanceVariant
    private var swapchainMaintenanceVariant VulkanSwapchainMaintenanceVariant
    private var physicalDevice VkPhysicalDevice = nint(0)
    private var device VkDevice = nint(0)
    private var dispatch VkDeviceDispatch = VkDeviceDispatch{}
    private var instanceDestroyAvailable bool
    private var deviceDestroyAvailable bool
    private var queue VkQueue = nint(0)
    private var queueFamilyIndex uint32 = 0u
    private var surface VkSurfaceKHR = 0uL
    private var surfaceCreated bool
    private var vulkanLoaded bool
    private var deviceWaitIdleAddress nint = nint(0)
    private var commandPool VkCommandPool = 0uL
    private var frameSlot0 VulkanFrameSlot? = nil
    private var frameSlot1 VulkanFrameSlot? = nil
    private var generation VulkanSwapchainGeneration? = nil
    private var primitiveRenderer VulkanPrimitiveRenderer? = nil
    private var framebufferWidth int32
    private var framebufferHeight int32
    private var requestedWidth int32
    private var requestedHeight int32
    private var nextFrameSlot uint32
    private var activeFrameSlot VulkanFrameSlot? = nil
    private var activeFrameSlotIndex uint32
    private var activeImageIndex uint32
    private var activeImageLayout VkImageLayout
    private var frameBegun bool
    private var renderingBegun bool
    private var frameRendered bool
    private var frameFailed bool
    private var recreatePending bool = true
    private var surfaceLost bool
    private var disposed bool

    internal init(nativeHost SdlHost) {
        if nativeHost == nil {
            throw ArgumentNullException("nativeHost")
        }
        host = nativeHost
        sceneCompiler = VulkanSceneCompiler()
        presentationRetirement = VulkanPresentationRetirement(64u, 8u)
        try {
            Bootstrap()
            if let resources = textScene {
                sceneCompiler.SetTextScene(resources)
            }
        } catch (error Exception) {
            Dispose()
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
        if prepareResult != VkConstants.VK_SUCCESS {
            HandleFrameFailure(prepareResult)
            return
        }
        if let atlas = textAtlas {
            atlas.Collect(selectedSlot.LastCompletedSerial)
        }
        presentationRetirement.CollectCompleted(nextFrameSlot, selectedSlot.LastCompletedSerial)
        var imageIndex uint32 = 0u
        let acquireNextImage = dispatch.vkAcquireNextImageKHR
        let acquire = acquireNextImage(
            device,
            current.Handle,
            VkConstants.VK_WHOLE_SIZE,
            selectedSlot.AcquireSemaphore,
            0uL,
            &imageIndex)
        let markedAcquire = selectedSlot.MarkAcquired(acquire)
        if markedAcquire == VkConstants.VK_ERROR_OUT_OF_DATE_KHR
            || markedAcquire == VkConstants.VK_ERROR_SURFACE_LOST_KHR {
            recreatePending = true
            surfaceLost = markedAcquire == VkConstants.VK_ERROR_SURFACE_LOST_KHR
            return
        }
        if markedAcquire != VkConstants.VK_SUCCESS && markedAcquire != VkConstants.VK_SUBOPTIMAL_KHR {
            HandleFrameFailure(markedAcquire)
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
        if markedAcquire == VkConstants.VK_SUBOPTIMAL_KHR {
            recreatePending = true
        }
        if !BeginCommandBuffer(selectedSlot) {
            return
        }
    }

    internal func Render(root Node?, background Color, dpi Vector2) {
        if disposed || !frameBegun || frameRendered {
            return
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
            sceneCompiler.Compile(root, background, logicalWidth, logicalHeight)
            ScaleFrame(sceneCompiler.Frame, scaleX, scaleY)
            if let resources = textScene {
                resources.PrepareUpload()
                if let slot = activeFrameSlot {
                    let stats = resources.Atlas.Stats
                    if stats.UploadPending && !stats.UploadRecorded {
                        resources.Atlas.RecordUpload(slot.CommandBuffer)
                    }
                }
            }
            if let current = generation {
                if let slot = activeFrameSlot {
                    BeginRendering(current, slot, activeImageIndex)
                    renderer.RecordInsideRendering(slot.CommandBuffer, sceneCompiler.Frame, current.Extent)
                    frameRendered = true
                }
            }
        } catch (error Exception) {
            if !renderingBegun {
                if let current = generation {
                    if let slot = activeFrameSlot {
                        BeginRendering(current, slot, activeImageIndex)
                    }
                }
            }
            try { Present() } catch (cleanup Exception) { }
            throw error
        }
    }

    internal func Present() {
        if disposed || !frameBegun {
            return
        }
        guard let current = generation, let slot = activeFrameSlot else {
            ClearActiveFrame()
            return
        }
        var submissionAccepted = false
        try {
            if !renderingBegun {
                BeginRendering(current, slot, activeImageIndex)
            }
            EndRendering(current, slot)
            let endCommandBuffer = dispatch.vkEndCommandBuffer
            let endResult = endCommandBuffer(slot.CommandBuffer)
            if endResult != VkConstants.VK_SUCCESS {
                HandleFrameFailure(endResult)
                return
            }
            if let atlas = textAtlas {
                let flushResult = atlas.FlushBeforeSubmit()
                if flushResult != VkConstants.VK_SUCCESS {
                    HandleFrameFailure(flushResult)
                    return
                }
            }
            let prepareSubmit = slot.PrepareSubmit(true)
            if prepareSubmit != VkConstants.VK_SUCCESS {
                HandleFrameFailure(prepareSubmit)
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
            let queueSubmit = dispatch.vkQueueSubmit2
            let submitResult = queueSubmit(queue, 1u, &submitInfo, slot.SubmissionFence)
            let markedSubmit = slot.MarkSubmitted(submitResult)
            if markedSubmit != VkConstants.VK_SUCCESS {
                HandleFrameFailure(markedSubmit)
                return
            }
            submissionAccepted = true
            if let atlas = textAtlas {
                let stats = atlas.Stats
                if stats.UploadPending && stats.UploadRecorded && !stats.UploadSubmitted
                    && stats.UploadCommandBuffer == slot.CommandBuffer {
                    atlas.MarkSubmitted(slot.CommandBuffer, slot.SubmissionSerial)
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
            let presentResult = queuePresent(queue, &presentInfo)
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
                if markedPresent != VkConstants.VK_SUCCESS
                    && markedPresent != VkConstants.VK_SUBOPTIMAL_KHR
                    && markedPresent != VkConstants.VK_ERROR_OUT_OF_DATE_KHR {
                    HandleFrameFailure(markedPresent)
                }
                if presentResult == VkConstants.VK_ERROR_OUT_OF_DATE_KHR {
                    recreatePending = true
                } else if presentResult == VkConstants.VK_SUBOPTIMAL_KHR {
                    recreatePending = true
                } else if presentResult != VkConstants.VK_SUCCESS {
                    HandleFrameFailure(presentResult)
                } else {
                    current.CommitLayout(activeImageIndex, VkConstants.VK_IMAGE_LAYOUT_PRESENT_SRC_KHR)
                }
            }
        } finally {
            if !submissionAccepted {
                AbortUnsubmittedTextUpload()
                frameFailed = true
            }
            ClearActiveFrame()
        }
    }

    internal func Resize(width int32, height int32) bool {
        if disposed {
            return false
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
        try {
            if device != nint(0) {
                WaitDeviceIdle()
            }
        } catch (cleanup Exception) { }
        if let renderer = primitiveRenderer {
            try { renderer.Dispose() } catch (cleanup Exception) { }
            primitiveRenderer = nil
        }
        if let atlas = textAtlas {
            try { atlas.Collect(uint64.MaxValue) } catch (cleanup Exception) { }
            let stats = atlas.Stats
            if stats.UploadPending && !stats.UploadSubmitted {
                try { atlas.AbortUpload(stats.UploadCommandBuffer) } catch (cleanup Exception) { }
            }
            try { atlas.Dispose() } catch (cleanup Exception) { }
            textAtlas = nil
        }
        textScene = nil
        if let current = generation {
            try { current.Dispose() } catch (cleanup Exception) { }
            generation = nil
        }
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
            commandPool = 0uL
        }
        if surfaceCreated && instance != nint(0) {
            try { host.DestroyVulkanSurface(instance, surface) } catch (cleanup Exception) { }
            surface = 0uL
            surfaceCreated = false
        }
        if let allocator = memoryAllocator {
            try { allocator.Dispose() } catch (cleanup Exception) { }
            memoryAllocator = nil
        }
        if runtime == nil && device != nint(0) && deviceDestroyAvailable {
            let destroyDevice = dispatch.vkDestroyDevice
            destroyDevice(device, nil)
            device = nint(0)
        }
        if runtime == nil && instance != nint(0) && instanceDestroyAvailable {
            let destroyInstance = instanceDispatch.vkDestroyInstance
            destroyInstance(instance, nil)
            instance = nint(0)
        }
        if let activeRuntime = runtime {
            try { activeRuntime.Dispose() } catch (cleanup Exception) { }
            runtime = nil
        }
        instance = nint(0)
        device = nint(0)
        if vulkanLoaded {
            try { host.UnloadVulkanLibrary() } catch (cleanup Exception) { }
            vulkanLoaded = false
        }
        activeFrameSlot = nil
        frameBegun = false
    }

    deinit {
        Dispose()
    }

    private func ClearActiveFrame() {
        frameBegun = false
        renderingBegun = false
        frameRendered = false
        activeFrameSlot = nil
        nextFrameSlot = nextFrameSlot == 0u ? 1u : 0u
    }

    private func AbortUnsubmittedTextUpload() {
        if let atlas = textAtlas {
            let stats = atlas.Stats
            if stats.UploadPending && !stats.UploadSubmitted
                && atlas.AbortUpload(stats.UploadCommandBuffer) {
                textScene?.RestoreUpload()
            }
        }
    }

    private func HandleFrameFailure(result VkResult) {
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
        throw InvalidOperationException("Vulkan frame operation failed: " + result.ToString())
    }

    private func ResolveScale(value float32) float32 {
        if Single.IsNaN(value) || Single.IsInfinity(value) || value <= 0.0F {
            return 1.0F
        }
        return value
    }
}
