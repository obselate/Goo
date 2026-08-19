package Goo

internal unsafe partial class VulkanWindowTarget {
    private const LiveTargetCapacity int32 = 8
    private var forceFullRedraw bool
    private var recoveryPending bool

    shared {
        private var liveTargets ([]VulkanWindowTarget?)? = nil
        private var liveTargetCount int32
        private var recoveryInProgress bool

        internal func RegisterLiveTarget(target VulkanWindowTarget) {
            if target == nil {
                throw ArgumentNullException("target")
            }
            if liveTargets == nil {
                liveTargets = [LiveTargetCapacity]VulkanWindowTarget?
            }
            var storage = liveTargets!!
            var index int32 = 0
            while index < liveTargetCount {
                if storage[index] == target {
                    return
                }
                index++
            }
            if liveTargetCount >= storage.Length {
                if storage.Length <= 0 || storage.Length > Int32.MaxValue / 2 {
                    throw InvalidOperationException("Vulkan live target capacity overflow")
                }
                let expanded = [storage.Length * 2]VulkanWindowTarget?
                var copyIndex int32 = 0
                while copyIndex < liveTargetCount {
                    expanded[copyIndex] = storage[copyIndex]
                    copyIndex = copyIndex + 1
                }
                liveTargets = expanded
                storage = expanded
            }
            storage[liveTargetCount] = target
            liveTargetCount = liveTargetCount + 1
        }

        internal func UnregisterLiveTarget(target VulkanWindowTarget) {
            guard let storage = liveTargets else {
                return
            }
            var index int32 = 0
            while index < liveTargetCount {
                if storage[index] == target {
                    var readIndex = index + 1
                    while readIndex < liveTargetCount {
                        storage[readIndex - 1] = storage[readIndex]
                        readIndex = readIndex + 1
                    }
                    liveTargetCount = liveTargetCount - 1
                    storage[liveTargetCount] = nil
                    return
                }
                index++
            }
        }

        internal func LiveTargetCount() int32 {
            return liveTargetCount
        }

        internal func RecoverDeviceLoss(result VkResult) bool {
            if recoveryInProgress {
                VulkanSharedRuntime.MarkGlobalTerminalFailure(result)
                return false
            }
            guard let storage = liveTargets else {
                VulkanSharedRuntime.MarkGlobalTerminalFailure(result)
                return false
            }
            if liveTargetCount == 0 {
                VulkanSharedRuntime.MarkGlobalTerminalFailure(result)
                return false
            }
            var leader VulkanWindowTarget? = nil
            var index int32 = 0
            while index < liveTargetCount {
                if let target = storage[index] {
                    leader = target
                    break
                }
                index++
            }
            guard let first = leader else {
                VulkanSharedRuntime.MarkGlobalTerminalFailure(result)
                return false
            }
            recoveryInProgress = true
            try {
                guard let oldRuntime = first.runtime else {
                    throw InvalidOperationException("Vulkan shared runtime is unavailable during recovery")
                }
                oldRuntime.MarkDeviceLost()
                index = 0
                while index < liveTargetCount {
                    if let target = storage[index] {
                        target.AbandonForDeviceRecovery()
                    }
                    index++
                }
                VulkanSharedRuntime.DiscardAfterDeviceLoss()
                first.RebuildAfterDeviceRecovery()
                index = 0
                while index < liveTargetCount {
                    if let target = storage[index] {
                        if target != first {
                            target.RebuildAfterDeviceRecovery()
                        }
                    }
                    index++
                }
                index = 0
                while index < liveTargetCount {
                    if let target = storage[index] {
                        target.FinishDeviceRecovery()
                    }
                    index++
                }
                if let currentDiagnostics = first.diagnostics {
                    currentDiagnostics.AddDeviceRecovery(1uL)
                }
                let newGeneration = if let currentRuntime = first.runtime {
                    currentRuntime.Generation
                } else {
                    0uL
                }
                first.RecordDiagnosticEvent(
                    VulkanDiagnosticEventIds.RuntimeDeviceLost,
                    VulkanDiagnosticCategories.Recovery,
                    1uL,
                    int32(result),
                    oldRuntime.Generation,
                    0uL)
                first.RecordDiagnosticEvent(
                    VulkanDiagnosticEventIds.RuntimeRecovery,
                    VulkanDiagnosticCategories.Recovery,
                    0uL,
                    0,
                    newGeneration,
                    liveTargetCount > 1 ? uint64(liveTargetCount) : 1uL)
                recoveryInProgress = false
                return true
            } catch (error Exception) {
                first.CaptureDiagnosticFatal(
                    int32(result), VulkanDiagnosticEventIds.RuntimeRecovery)
                index = 0
                while index < liveTargetCount {
                    if let target = storage[index] {
                        target.CleanupFailedDeviceRecovery()
                    }
                    index++
                }
                try { VulkanSharedRuntime.DiscardAfterDeviceLoss() } catch (cleanup Exception) { }
                recoveryInProgress = false
                VulkanSharedRuntime.MarkGlobalTerminalFailure(result)
                index = 0
                while index < liveTargetCount {
                    if let target = storage[index] {
                        target.MarkRecoveryTerminal()
                    }
                    index++
                }
                return false
            }
        }
    }

    private func AbandonForDeviceRecovery() {
        let staleLease = runtime
        PrepareForDeviceRecovery()
        runtime = nil
        if let lease = staleLease {
            lease.AbandonAfterDeviceLoss()
        }
    }

    private func CleanupFailedDeviceRecovery() {
        let staleLease = runtime
        if staleLease == nil {
            CleanupUnpublishedBootstrap()
        }
        try { PrepareForDeviceRecovery() } catch (cleanup Exception) { }
        runtime = nil
        if let lease = staleLease {
            try { lease.AbandonAfterDeviceLoss() } catch (cleanup Exception) { }
        }
    }

    private func CleanupUnpublishedBootstrap() {
        let staleInstance = instance
        let staleDevice = device
        let staleSurface = surface
        let staleSurfaceCreated = surfaceCreated
        surface = 0uL
        surfaceCreated = false
        if staleSurfaceCreated && staleSurface != 0uL && staleInstance != nint(0) {
            try {
                host.DestroyVulkanSurface(staleInstance, staleSurface)
                if let accounting = windowObjectAccounting {
                    accounting.Release()
                }
            } catch (cleanup Exception) { }
        }
        if staleDevice != nint(0) {
            var destroyed = false
            if deviceDestroyAvailable {
                try {
                    let destroyDevice = dispatch.vkDestroyDevice
                    destroyDevice(staleDevice, nil)
                    destroyed = true
                } catch (cleanup Exception) { }
            } else if staleInstance != nint(0) {
                try {
                    let nullable = ResolveGlobalProc(staleInstance, "vkDestroyDevice") as (unmanaged[Cdecl] (VkDevice, *VkAllocationCallbacks) -> void)?
                    if nullable != nil {
                        let destroyDevice = nullable!!
                        destroyDevice(staleDevice, nil)
                        destroyed = true
                    }
                } catch (cleanup Exception) { }
            }
            if destroyed {
                if let accounting = sharedObjectAccounting {
                    try { accounting.Release() } catch (cleanup Exception) { }
                }
            }
            device = nint(0)
        }
        try { DestroyValidationMessenger() } catch (cleanup Exception) { }
        if staleInstance != nint(0) {
            var destroyed = false
            if instanceDestroyAvailable {
                try {
                    let destroyInstance = instanceDispatch.vkDestroyInstance
                    destroyInstance(staleInstance, nil)
                    destroyed = true
                } catch (cleanup Exception) { }
            } else {
                try {
                    let nullable = ResolveGlobalProc(staleInstance, "vkDestroyInstance") as (unmanaged[Cdecl] (VkInstance, *VkAllocationCallbacks) -> void)?
                    if nullable != nil {
                        let destroyInstance = nullable!!
                        destroyInstance(staleInstance, nil)
                        destroyed = true
                    }
                } catch (cleanup Exception) { }
            }
            if destroyed {
                if let accounting = sharedObjectAccounting {
                    try { accounting.Release() } catch (cleanup Exception) { }
                }
            }
            instance = nint(0)
        }
    }

    private func AbandonAfterDeviceLossForClose() {
        let staleLease = runtime
        try { PrepareForDeviceRecovery() } catch (cleanup Exception) { }
        runtime = nil
        if let lease = staleLease {
            try { lease.AbandonAfterDeviceLoss() } catch (cleanup Exception) { }
        }
        if vulkanLoaded {
            try { host.UnloadVulkanLibrary() } catch (cleanup Exception) { }
            vulkanLoaded = false
        }
    }

    private func PrepareForDeviceRecovery() {
        frameFailed = false
        recoveryPending = true
        let staleImageScene = imageScene
        imageScene = nil
        if let scene = staleImageScene {
            try { scene.Dispose() } catch (cleanup Exception) { }
        }
        textScene = nil
        RemoveTextAtlasDiagnosticContribution()
        let staleTextAtlas = textAtlas
        textAtlas = nil
        if let atlas = staleTextAtlas {
            try { atlas.DisposeAfterDeviceLoss() } catch (cleanup Exception) { }
        }
        let staleRenderer = primitiveRenderer
        primitiveRenderer = nil
        if let renderer = staleRenderer {
            try { renderer.Dispose() } catch (cleanup Exception) { }
        }
        let staleTimestampState = timestampState
        timestampState = nil
        if let current = staleTimestampState {
            try { current.ForceDestroyTimestampQueryPool() } catch (cleanup Exception) {
                try { current.AbandonTimestampQueryPool() } catch (cleanup Exception) { }
            }
        }
        let staleGeneration = generation
        generation = nil
        try { if let current = staleGeneration { current.DisposeAfterDeviceLoss() } } catch (cleanup Exception) { }
        try { DisposeRetiredSwapchainsAfterDeviceLoss() } catch (cleanup Exception) { }
        presentationRetirement.ResetAfterDeviceLoss()
        let staleFrameSlot0 = frameSlot0
        frameSlot0 = nil
        if let slot = staleFrameSlot0 {
            try { slot.DisposeAfterDeviceLoss() } catch (cleanup Exception) { }
        }
        let staleFrameSlot1 = frameSlot1
        frameSlot1 = nil
        if let slot = staleFrameSlot1 {
            try { slot.DisposeAfterDeviceLoss() } catch (cleanup Exception) { }
        }
        let staleDevice = device
        let staleCommandPool = commandPool
        let staleCommandBufferCount = commandBufferObjectCount
        commandPool = 0uL
        commandBufferObjectCount = 0
        if staleCommandPool != 0uL && staleDevice != nint(0) {
            let destroyCommandPool = dispatch.vkDestroyCommandPool
            try { destroyCommandPool(staleDevice, staleCommandPool, nil) } catch (cleanup Exception) { }
            var bufferIndex int32 = 0
            while bufferIndex < staleCommandBufferCount {
                if let accounting = windowObjectAccounting {
                    try { accounting.Release() } catch (cleanup Exception) { }
                }
                bufferIndex = bufferIndex + 1
            }
            if let accounting = windowObjectAccounting {
                try { accounting.Release() } catch (cleanup Exception) { }
            }
        }
        AbandonCurrentSurfaceAfterDeviceLoss()
        runtime = nil
        memoryAllocator = nil
        imageResources = nil
        instance = nint(0)
        instanceDispatch = VkInstanceDispatch{}
        instanceMaintenanceVariant = VulkanSwapchainMaintenanceVariant.None
        swapchainMaintenanceVariant = VulkanSwapchainMaintenanceVariant.None
        physicalDevice = nint(0)
        device = nint(0)
        dispatch = VkDeviceDispatch{}
        queue = nint(0)
        queueFamilyIndex = 0u
        deviceWaitIdleAddress = nint(0)
        memoryBudgetSupported = false
        debugUtilsEnabled = false
        instanceDestroyAvailable = false
        deviceDestroyAvailable = false
        validation = nil
        validationMessenger = 0uL
        validationMessengerCreated = false
        timestampValidBits = 0u
        timestampPeriod = 0.0F
        timestampComputeAndGraphics = VkConstants.VK_FALSE
        deviceFacts = VulkanSharedDeviceFacts{}
        surface = 0uL
        surfaceCreated = false
        frameBegun = false
        renderingBegun = false
        frameRendered = false
        activeFrameSlot = nil
        activeFrameSlotIndex = 0u
        activeImageIndex = 0u
        activeImageLayout = VkConstants.VK_IMAGE_LAYOUT_UNDEFINED
        activeFrameId = 0uL
        nextFrameSlot = 0u
        recreatePending = true
        surfaceLost = false
        forceFullRedraw = true
    }

    private func AbandonCurrentSurfaceAfterDeviceLoss() {
        let staleInstance = instance
        let staleSurface = surface
        let staleSurfaceCreated = surfaceCreated
        surface = 0uL
        surfaceCreated = false
        if staleSurfaceCreated && staleSurface != 0uL && staleInstance != nint(0) {
            try { host.DestroyVulkanSurface(staleInstance, staleSurface) } catch (cleanup Exception) { }
            if let accounting = windowObjectAccounting {
                try { accounting.Release() } catch (cleanup Exception) { }
            }
        }
    }

    private func RebuildAfterDeviceRecovery() {
        Bootstrap()
        sceneCompiler.SetTextScene(textScene)
        sceneCompiler.SetImageScene(imageScene)
        let width = if requestedWidth > 0 { requestedWidth } else { framebufferWidth }
        let height = if requestedHeight > 0 { requestedHeight } else { framebufferHeight }
        if width > 0 && height > 0 {
            if !RecreateSwapchain(width, height) {
                throw InvalidOperationException("Vulkan swapchain recreation failed during device recovery")
            }
        }
        frameFailed = false
        recoveryPending = false
        forceFullRedraw = true
    }

    private func FinishDeviceRecovery() {
        frameFailed = false
        recoveryPending = false
        forceFullRedraw = true
    }

    private func MarkRecoveryTerminal() {
        frameFailed = true
        recoveryPending = false
        runtime = nil
    }

    private func DisposeRetiredSwapchainsAfterDeviceLoss() {
        guard let storage = retiredSwapchains else {
            return
        }
        let staleInstance = instance
        let staleCount = retiredSwapchainCount
        retiredSwapchainCount = 0
        var index int32 = 0
        while index < staleCount {
            if let retired = storage[index] {
                storage[index] = nil
                try { retired.Generation.DisposeAfterDeviceLoss() } catch (cleanup Exception) { }
                if retired.DestroySurface && retired.Surface != 0uL && staleInstance != nint(0) {
                    try { host.DestroyVulkanSurface(staleInstance, retired.Surface) } catch (cleanup Exception) { }
                    if let accounting = windowObjectAccounting {
                        try { accounting.Release() } catch (cleanup Exception) { }
                    }
                }
            }
            index++
        }
    }

    internal prop RecoveryInProgress bool {
        get { return VulkanWindowTarget.recoveryInProgress }
    }
}
