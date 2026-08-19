package Goo

import System.Threading

internal data struct VulkanSharedDeviceFacts {
    var ApiVersion uint32
    var DriverVersion uint32
    var VendorId uint32
    var DeviceId uint32
    var DeviceType int32
    var TimestampValidBits uint32
    var TimestampPeriod float32
    var TimestampComputeAndGraphics VkBool32
}

internal unsafe sealed class VulkanSharedRuntime : IDisposable {
    private const ImageResourceCapacity int32 = 256
    private const LogicalResourceCapacity int32 = 512
    private const MaximumResidentImageBytes VkDeviceSize = 67108864uL
    private const MaximumLogicalSourceBytes VkDeviceSize = 134217728uL
    private const ImageStagingBytes VkDeviceSize = 16777216uL
    private const ImageUploadRangeCapacity int32 = 64
    private const ImageIdentityCapacity int32 = 4096
    private let instance VkInstance
    private let instanceDispatch VkInstanceDispatch
    private let physicalDevice VkPhysicalDevice
    private let device VkDevice
    private let dispatch VkDeviceDispatch
    private let graphicsQueue VkQueue
    private let presentQueue VkQueue
    private let graphicsFamilyIndex uint32
    private let presentFamilyIndex uint32
    private let deviceWaitIdleAddress nint
    private let instanceMaintenanceVariant VulkanSwapchainMaintenanceVariant
    private let swapchainMaintenanceVariant VulkanSwapchainMaintenanceVariant
    private let facts VulkanSharedDeviceFacts
    private let memoryAllocator VulkanMemoryAllocator
    private let imageResources VulkanImageResources
    private let primitiveState VulkanSharedPrimitiveState
    private let imageIdentityRegistry VulkanImageIdentityRegistry
    private let objectAccounting VulkanObjectAccounting?
    private let sharedObjectAccounting VulkanObjectAccounting?
    private let diagnostics VulkanDiagnostics?
    private let debugUtilsEnabled bool
    private let validation VulkanDiagnosticsValidation?
    private let validationMessenger VkDebugUtilsMessengerEXT
    private let validationMessengerCreated bool
    private let instanceDestroyAvailable bool
    private let deviceDestroyAvailable bool
    private let generation uint64
    private var nextGraphicsSubmissionSerial uint64
    private var references int32
    private var deviceLost bool
    private var terminal bool
    private var terminalIdleResult VkResult = VkConstants.VK_SUCCESS
    private var disposed bool

    shared {
        private var current VulkanSharedRuntime?
        private var generationSeed uint64
        private var logicalImageIdentityRegistry VulkanImageIdentityRegistry?
        private var terminalFailure bool
        private var terminalFailureResult VkResult = VkConstants.VK_SUCCESS
        private var testFailNextDeviceIdle int32
        private var testFailNextGraphicsSubmission int32

        internal func FailNextDeviceIdleForTest() {
            Interlocked.Exchange(ref testFailNextDeviceIdle, 1)
        }

        internal func FailNextGraphicsSubmissionForTest() {
            Interlocked.Exchange(ref testFailNextGraphicsSubmission, 1)
        }

        private func TakeTestDeviceIdleFailure() bool {
            return Interlocked.Exchange(ref testFailNextDeviceIdle, 0) != 0
        }

        internal func TakeTestGraphicsSubmissionFailure() bool {
            return Interlocked.Exchange(ref testFailNextGraphicsSubmission, 0) != 0
        }

        internal func TryAcquire() VulkanSharedLease? {
            if let owner = current {
                if owner.DeviceLost {
                    throw InvalidOperationException("Vulkan shared runtime device is lost")
                }
                if owner.Terminal {
                    throw InvalidOperationException("Vulkan shared runtime is terminal after idle failure")
                }
                return owner.AcquireLease()
            }
            if terminalFailure {
                throw InvalidOperationException(
                    "Vulkan shared runtime is terminal after idle failure: "
                    + int32(terminalFailureResult).ToString())
            }
            return nil
        }

        internal func Publish(nativeInstance VkInstance, nativeInstanceDispatch VkInstanceDispatch,
            nativePhysicalDevice VkPhysicalDevice, nativeDevice VkDevice,
            nativeDispatch VkDeviceDispatch, nativeGraphicsQueue VkQueue,
            nativePresentQueue VkQueue, nativeGraphicsFamilyIndex uint32,
            nativePresentFamilyIndex uint32, nativeDeviceWaitIdleAddress nint,
            nativeInstanceMaintenanceVariant VulkanSwapchainMaintenanceVariant,
            nativeSwapchainMaintenanceVariant VulkanSwapchainMaintenanceVariant,
            nativeFacts VulkanSharedDeviceFacts,
            nativeMemoryProperties VkPhysicalDeviceMemoryProperties,
            nativeMaxMemoryAllocationCount uint32,
            nativeNonCoherentAtomSize VkDeviceSize,
            nativeBufferImageGranularity VkDeviceSize,
            nativeMemoryBudgetAvailable bool,
            nativeDiagnostics VulkanDiagnostics?,
            nativeDebugUtilsEnabled bool,
            nativeValidation VulkanDiagnosticsValidation?,
            nativeValidationMessenger VkDebugUtilsMessengerEXT,
            nativeValidationMessengerCreated bool,
            nativeInstanceDestroyAvailable bool,
            nativeDeviceDestroyAvailable bool,
            nativeObjectAccounting VulkanObjectAccounting?,
            nativeSharedObjectAccounting VulkanObjectAccounting?) VulkanSharedLease {
            if current != nil {
                throw InvalidOperationException("Vulkan shared runtime is already published")
            }
            if terminalFailure {
                throw InvalidOperationException(
                    "Vulkan shared runtime is terminal after idle failure: "
                    + int32(terminalFailureResult).ToString())
            }
            if generationSeed == uint64.MaxValue {
                throw OverflowException("Vulkan shared runtime generation overflow")
            }
            generationSeed = generationSeed + 1uL
            var allocator VulkanMemoryAllocator? = nil
            var imageResources VulkanImageResources? = nil
            var primitiveState VulkanSharedPrimitiveState? = nil
            var imageIdentityRegistry VulkanImageIdentityRegistry? = nil
            var createdImageIdentityRegistry bool = false
            try {
                let createdBudget = VulkanMemoryBudgetState(
                    nativePhysicalDevice,
                    nativeInstanceDispatch,
                    nativeMemoryProperties.memoryHeapCount,
                    nativeMemoryBudgetAvailable)
                let createdAllocator = VulkanMemoryAllocator(
                    nativeDevice,
                    nativeDispatch,
                    nativeMemoryProperties,
                    nativeMaxMemoryAllocationCount,
                    nativeNonCoherentAtomSize,
                    nativeBufferImageGranularity,
                    createdBudget,
                    nativeSharedObjectAccounting)
                allocator = createdAllocator
                let createdImageResources = VulkanImageResources(
                    nativeDevice,
                    nativeDispatch,
                    createdAllocator,
                    ImageResourceCapacity,
                    LogicalResourceCapacity,
                    MaximumResidentImageBytes,
                    MaximumLogicalSourceBytes,
                    ImageStagingBytes,
                    ImageUploadRangeCapacity,
                    nativeDiagnostics,
                    generationSeed,
                    nativeSharedObjectAccounting)
                imageResources = createdImageResources
                let createdPrimitiveState = VulkanSharedPrimitiveState(
                    nativeDevice,
                    nativeDispatch,
                    createdImageResources,
                    generationSeed,
                    nativeSharedObjectAccounting)
                primitiveState = createdPrimitiveState
                let identityRegistry = if let retained = logicalImageIdentityRegistry {
                    retained
                } else {
                    let created = VulkanImageIdentityRegistry(ImageIdentityCapacity)
                    logicalImageIdentityRegistry = created
                    createdImageIdentityRegistry = true
                    created
                }
                imageIdentityRegistry = identityRegistry
                let owner = VulkanSharedRuntime(
                    nativeInstance,
                    nativeInstanceDispatch,
                    nativePhysicalDevice,
                    nativeDevice,
                    nativeDispatch,
                    nativeGraphicsQueue,
                    nativePresentQueue,
                    nativeGraphicsFamilyIndex,
                    nativePresentFamilyIndex,
                    nativeDeviceWaitIdleAddress,
                    nativeInstanceMaintenanceVariant,
                    nativeSwapchainMaintenanceVariant,
                    nativeFacts,
                    createdAllocator,
                    createdImageResources,
                    createdPrimitiveState,
                    identityRegistry,
                    nativeDiagnostics,
                    nativeDebugUtilsEnabled,
                    nativeValidation,
                    nativeValidationMessenger,
                    nativeValidationMessengerCreated,
                    nativeInstanceDestroyAvailable,
                    nativeDeviceDestroyAvailable,
                    generationSeed,
                    nativeObjectAccounting,
                    nativeSharedObjectAccounting)
                let lease = VulkanSharedLease(owner)
                current = owner
                return lease
            } catch (error Exception) {
                if createdImageIdentityRegistry {
                    if let createdIdentityRegistry = imageIdentityRegistry {
                        try { createdIdentityRegistry.Dispose() } catch (cleanup Exception) { }
                    }
                    logicalImageIdentityRegistry = nil
                }
                if let createdPrimitiveState = primitiveState {
                    try { createdPrimitiveState.Dispose() } catch (cleanup Exception) { }
                }
                if let createdImageResources = imageResources {
                    try { createdImageResources.Dispose() } catch (cleanup Exception) { }
                }
                if let createdAllocator = allocator {
                    try { createdAllocator.Dispose() } catch (cleanup Exception) { }
                }
                throw error
            }
        }

        internal func MarkGlobalTerminalFailure(result VkResult) {
            terminalFailure = true
            terminalFailureResult = result
            if current == nil {
                DisposeRetainedLogicalImageIdentityRegistry()
            }
        }

        private func DisposeRetainedLogicalImageIdentityRegistry() {
            let retained = logicalImageIdentityRegistry
            logicalImageIdentityRegistry = nil
            if let registry = retained {
                try { registry.Dispose() } catch (cleanup Exception) { }
            }
        }

        internal func DiscardAfterDeviceLoss() {
            if let owner = current {
                owner.DisposeAfterDeviceLoss()
                current = nil
            }
        }
    }

    internal init(nativeInstance VkInstance, nativeInstanceDispatch VkInstanceDispatch,
        nativePhysicalDevice VkPhysicalDevice, nativeDevice VkDevice,
        nativeDispatch VkDeviceDispatch, nativeGraphicsQueue VkQueue,
        nativePresentQueue VkQueue, nativeGraphicsFamilyIndex uint32,
        nativePresentFamilyIndex uint32, nativeDeviceWaitIdleAddress nint,
        nativeInstanceMaintenanceVariant VulkanSwapchainMaintenanceVariant,
        nativeSwapchainMaintenanceVariant VulkanSwapchainMaintenanceVariant,
        nativeFacts VulkanSharedDeviceFacts, nativeAllocator VulkanMemoryAllocator,
        nativeImageResources VulkanImageResources,
        nativePrimitiveState VulkanSharedPrimitiveState,
        nativeImageIdentityRegistry VulkanImageIdentityRegistry,
        nativeDiagnostics VulkanDiagnostics?,
        nativeDebugUtilsEnabled bool,
        nativeValidation VulkanDiagnosticsValidation?,
        nativeValidationMessenger VkDebugUtilsMessengerEXT,
        nativeValidationMessengerCreated bool,
        nativeInstanceDestroyAvailable bool,
        nativeDeviceDestroyAvailable bool, nativeGeneration uint64,
        nativeObjectAccounting VulkanObjectAccounting?,
        nativeSharedObjectAccounting VulkanObjectAccounting?) {
        if nativeInstance == nint(0) || nativePhysicalDevice == nint(0) || nativeDevice == nint(0) {
            throw ArgumentException("Vulkan shared runtime handles cannot be null")
        }
        if nativeGraphicsQueue == nint(0) || nativePresentQueue == nint(0) {
            throw ArgumentException("Vulkan shared runtime queues cannot be null")
        }
        if nativeImageResources == nil {
            throw ArgumentNullException("nativeImageResources")
        }
        if nativePrimitiveState == nil {
            throw ArgumentNullException("nativePrimitiveState")
        }
        if nativePrimitiveState.Generation != nativeImageResources.Generation
            || nativePrimitiveState.Generation == 0uL {
            throw ArgumentOutOfRangeException("nativePrimitiveState")
        }
        if nativeImageIdentityRegistry == nil {
            throw ArgumentNullException("nativeImageIdentityRegistry")
        }
        if nativeObjectAccounting == nil && nativeSharedObjectAccounting != nil {
            throw ArgumentException("Vulkan shared object accounting parent is unavailable")
        }
        instance = nativeInstance
        instanceDispatch = nativeInstanceDispatch
        physicalDevice = nativePhysicalDevice
        device = nativeDevice
        dispatch = nativeDispatch
        graphicsQueue = nativeGraphicsQueue
        presentQueue = nativePresentQueue
        graphicsFamilyIndex = nativeGraphicsFamilyIndex
        presentFamilyIndex = nativePresentFamilyIndex
        deviceWaitIdleAddress = nativeDeviceWaitIdleAddress
        instanceMaintenanceVariant = nativeInstanceMaintenanceVariant
        swapchainMaintenanceVariant = nativeSwapchainMaintenanceVariant
        facts = nativeFacts
        memoryAllocator = nativeAllocator
        imageResources = nativeImageResources
        primitiveState = nativePrimitiveState
        imageIdentityRegistry = nativeImageIdentityRegistry
        objectAccounting = nativeObjectAccounting
        sharedObjectAccounting = nativeSharedObjectAccounting
        diagnostics = nativeDiagnostics
        debugUtilsEnabled = nativeDebugUtilsEnabled
        validation = nativeValidation
        validationMessenger = nativeValidationMessenger
        validationMessengerCreated = nativeValidationMessengerCreated
        instanceDestroyAvailable = nativeInstanceDestroyAvailable
        deviceDestroyAvailable = nativeDeviceDestroyAvailable
        generation = nativeGeneration
        nextGraphicsSubmissionSerial = 1uL
        references = 1
    }

    internal prop Instance VkInstance { get { return instance } }
    internal prop InstanceDispatch VkInstanceDispatch { get { return instanceDispatch } }
    internal prop PhysicalDevice VkPhysicalDevice { get { return physicalDevice } }
    internal prop Device VkDevice { get { return device } }
    internal prop Dispatch VkDeviceDispatch { get { return dispatch } }
    internal prop GraphicsQueue VkQueue { get { return graphicsQueue } }
    internal prop PresentQueue VkQueue { get { return presentQueue } }
    internal prop GraphicsFamilyIndex uint32 { get { return graphicsFamilyIndex } }
    internal prop PresentFamilyIndex uint32 { get { return presentFamilyIndex } }
    internal prop DeviceWaitIdleAddress nint { get { return deviceWaitIdleAddress } }
    internal prop InstanceMaintenanceVariant VulkanSwapchainMaintenanceVariant {
        get { return instanceMaintenanceVariant }
    }
    internal prop SwapchainMaintenanceVariant VulkanSwapchainMaintenanceVariant {
        get { return swapchainMaintenanceVariant }
    }
    internal prop Facts VulkanSharedDeviceFacts { get { return facts } }
    internal prop MemoryAllocator VulkanMemoryAllocator { get { return memoryAllocator } }
    internal prop ImageResources VulkanImageResources { get { return imageResources } }
    internal prop PrimitiveState VulkanSharedPrimitiveState { get { return primitiveState } }
    internal prop ImageIdentityRegistry VulkanImageIdentityRegistry {
        get { return imageIdentityRegistry }
    }
    internal prop ObjectAccounting VulkanObjectAccounting? { get { return objectAccounting } }
    internal prop Diagnostics VulkanDiagnostics? { get { return diagnostics } }
    internal prop DebugUtilsEnabled bool { get { return debugUtilsEnabled } }
    internal prop DeviceLost bool { get { return deviceLost } }
    internal prop Terminal bool { get { return terminal } }
    internal prop TerminalIdleResult VkResult { get { return terminalIdleResult } }
    internal prop Generation uint64 { get { return generation } }

    internal func ReserveGraphicsSubmissionSerial() uint64 {
        if disposed {
            throw ObjectDisposedException("VulkanSharedRuntime")
        }
        if deviceLost {
            throw InvalidOperationException("Vulkan shared runtime device is lost")
        }
        if terminal {
            throw InvalidOperationException("Vulkan shared runtime is terminal after idle failure")
        }
        if nextGraphicsSubmissionSerial == uint64.MaxValue {
            throw OverflowException("Vulkan graphics submission serial overflow")
        }
        let serial = nextGraphicsSubmissionSerial
        nextGraphicsSubmissionSerial = nextGraphicsSubmissionSerial + 1uL
        return serial
    }

    private func AcquireLease() VulkanSharedLease {
        if disposed {
            throw ObjectDisposedException("VulkanSharedRuntime")
        }
        if deviceLost {
            throw InvalidOperationException("Vulkan shared runtime device is lost")
        }
        if terminal {
            throw InvalidOperationException("Vulkan shared runtime is terminal after idle failure")
        }
        if references == Int32.MaxValue {
            throw OverflowException("Vulkan shared runtime reference count overflow")
        }
        references = references + 1
        return VulkanSharedLease(this)
    }

    private func ReleaseLeaseCore(alreadyIdle bool) bool {
        if disposed {
            return false
        }
        if references <= 0 {
            throw InvalidOperationException("Vulkan shared runtime lease count is invalid")
        }
        references = references - 1
        if references == 0 {
            DisposeWithIdleState(alreadyIdle)
            if disposed {
                current = nil
                return true
            }
            return false
        }
        return false
    }

    internal func ReleaseLease() bool {
        return ReleaseLeaseCore(false)
    }

    internal func ReleaseLeaseAfterIdle() bool {
        return ReleaseLeaseCore(true)
    }

    internal func AbandonLeaseAfterDeviceLoss() {
        if disposed {
            return
        }
        if references <= 0 {
            throw InvalidOperationException("Vulkan shared runtime lease count is invalid")
        }
        references = references - 1
    }

    internal func MarkDeviceLost() {
        if !disposed {
            deviceLost = true
        }
    }

    internal func MarkTeardownFailed(result VkResult) {
        if disposed {
            return
        }
        terminal = true
        terminalIdleResult = result
        terminalFailure = true
        terminalFailureResult = result
        VulkanSharedRuntime.DisposeRetainedLogicalImageIdentityRegistry()
        if result == VkConstants.VK_ERROR_DEVICE_LOST {
            deviceLost = true
        }
    }

    internal func WaitDeviceIdleResult() VkResult {
        if terminal {
            return terminalIdleResult
        }
        if deviceLost {
            return VkConstants.VK_ERROR_DEVICE_LOST
        }
        if VulkanSharedRuntime.TakeTestDeviceIdleFailure() {
            MarkDeviceLost()
            return VkConstants.VK_ERROR_DEVICE_LOST
        }
        if disposed || device == nint(0) || deviceWaitIdleAddress == nint(0) {
            return VkConstants.VK_ERROR_INITIALIZATION_FAILED
        }
        let nullable = deviceWaitIdleAddress as (unmanaged[Cdecl] (VkDevice) -> VkResult)?
        if nullable == nil {
            return VkConstants.VK_ERROR_INITIALIZATION_FAILED
        }
        let deviceWaitIdleFunction = nullable!!
        let result = deviceWaitIdleFunction(device)
        if result == VkConstants.VK_ERROR_DEVICE_LOST {
            MarkDeviceLost()
        }
        return result
    }

    internal func WaitDeviceIdle() bool {
        return WaitDeviceIdleResult() == VkConstants.VK_SUCCESS
    }

    private func DisposeWithIdleState(alreadyIdle bool) {
        if disposed || terminal {
            return
        }
        var idleResult VkResult = VkConstants.VK_SUCCESS
        if !alreadyIdle {
            idleResult = WaitDeviceIdleResult()
        }
        if idleResult != VkConstants.VK_SUCCESS {
            MarkTeardownFailed(idleResult)
            return
        }
        disposed = true
        try { primitiveState.Dispose() } catch (cleanup Exception) { }
        try { imageResources.Collect(uint64.MaxValue) } catch (cleanup Exception) { }
        try { imageResources.Dispose() } catch (cleanup Exception) { }
        try { imageIdentityRegistry.Dispose() } catch (cleanup Exception) { }
        if Object.ReferenceEquals(logicalImageIdentityRegistry, imageIdentityRegistry) {
            logicalImageIdentityRegistry = nil
        }
        try { memoryAllocator.Dispose() } catch (cleanup Exception) { }
        if device != nint(0) && deviceDestroyAvailable {
            let destroyDevice = dispatch.vkDestroyDevice
            destroyDevice(device, nil)
            if let accounting = sharedObjectAccounting {
                accounting.Release()
            }
        }
        if validationMessengerCreated && instance != nint(0)
            && instanceDispatch.vkDestroyDebugUtilsMessengerEXT != nil {
            let destroyMessenger = instanceDispatch.vkDestroyDebugUtilsMessengerEXT
            destroyMessenger(instance, validationMessenger, nil)
            if let accounting = sharedObjectAccounting {
                accounting.Release()
            }
        }
        if instance != nint(0) && instanceDestroyAvailable {
            let destroyInstance = instanceDispatch.vkDestroyInstance
            destroyInstance(instance, nil)
            if let accounting = sharedObjectAccounting {
                accounting.Release()
            }
        }
        if let currentValidation = validation {
            currentValidation.KeepAlive()
        }
    }

    internal func DisposeAfterDeviceLoss() {
        if disposed {
            return
        }
        disposed = true
        references = 0
        try { primitiveState.Dispose() } catch (cleanup Exception) { }
        try { imageResources.DisposeAfterDeviceLoss() } catch (cleanup Exception) { }
        try { memoryAllocator.Dispose() } catch (cleanup Exception) { }
        if device != nint(0) && deviceDestroyAvailable {
            let destroyDevice = dispatch.vkDestroyDevice
            destroyDevice(device, nil)
            if let accounting = sharedObjectAccounting {
                accounting.Release()
            }
        }
        if validationMessengerCreated && instance != nint(0)
            && instanceDispatch.vkDestroyDebugUtilsMessengerEXT != nil {
            let destroyMessenger = instanceDispatch.vkDestroyDebugUtilsMessengerEXT
            destroyMessenger(instance, validationMessenger, nil)
            if let accounting = sharedObjectAccounting {
                accounting.Release()
            }
        }
        if instance != nint(0) && instanceDestroyAvailable {
            let destroyInstance = instanceDispatch.vkDestroyInstance
            destroyInstance(instance, nil)
            if let accounting = sharedObjectAccounting {
                accounting.Release()
            }
        }
        if let currentValidation = validation {
            currentValidation.KeepAlive()
        }
    }

    public func Dispose() {
        DisposeWithIdleState(false)
    }

}

internal unsafe sealed class VulkanSharedLease : IDisposable {
    private let owner VulkanSharedRuntime
    private var disposed bool

    internal init(nativeOwner VulkanSharedRuntime) {
        owner = nativeOwner
    }

    internal prop Instance VkInstance { get { return owner.Instance } }
    internal prop InstanceDispatch VkInstanceDispatch { get { return owner.InstanceDispatch } }
    internal prop PhysicalDevice VkPhysicalDevice { get { return owner.PhysicalDevice } }
    internal prop Device VkDevice { get { return owner.Device } }
    internal prop Dispatch VkDeviceDispatch { get { return owner.Dispatch } }
    internal prop GraphicsQueue VkQueue { get { return owner.GraphicsQueue } }
    internal prop PresentQueue VkQueue { get { return owner.PresentQueue } }
    internal prop GraphicsFamilyIndex uint32 { get { return owner.GraphicsFamilyIndex } }
    internal prop PresentFamilyIndex uint32 { get { return owner.PresentFamilyIndex } }
    internal prop DeviceWaitIdleAddress nint { get { return owner.DeviceWaitIdleAddress } }
    internal prop InstanceMaintenanceVariant VulkanSwapchainMaintenanceVariant {
        get { return owner.InstanceMaintenanceVariant }
    }
    internal prop SwapchainMaintenanceVariant VulkanSwapchainMaintenanceVariant {
        get { return owner.SwapchainMaintenanceVariant }
    }
    internal prop Facts VulkanSharedDeviceFacts { get { return owner.Facts } }
    internal prop MemoryAllocator VulkanMemoryAllocator { get { return owner.MemoryAllocator } }
    internal prop ImageResources VulkanImageResources { get { return owner.ImageResources } }
    internal prop PrimitiveState VulkanSharedPrimitiveState { get { return owner.PrimitiveState } }
    internal prop ImageIdentityRegistry VulkanImageIdentityRegistry {
        get { return owner.ImageIdentityRegistry }
    }
    internal prop ObjectAccounting VulkanObjectAccounting? { get { return owner.ObjectAccounting } }
    internal prop Diagnostics VulkanDiagnostics? { get { return owner.Diagnostics } }
    internal prop DebugUtilsEnabled bool { get { return owner.DebugUtilsEnabled } }
    internal prop DeviceLost bool { get { return owner.DeviceLost } }
    internal prop Terminal bool { get { return owner.Terminal } }
    internal prop TerminalIdleResult VkResult { get { return owner.TerminalIdleResult } }
    internal prop Generation uint64 { get { return owner.Generation } }

    internal func ReserveGraphicsSubmissionSerial() uint64 {
        return owner.ReserveGraphicsSubmissionSerial()
    }

    internal func MarkDeviceLost() {
        owner.MarkDeviceLost()
    }

    internal func MarkTeardownFailed(result VkResult) {
        owner.MarkTeardownFailed(result)
    }

    internal func WaitDeviceIdle() bool {
        return owner.WaitDeviceIdle()
    }

    internal func WaitDeviceIdleResult() VkResult {
        return owner.WaitDeviceIdleResult()
    }

    private func ReleaseCore(alreadyIdle bool) bool {
        if disposed {
            return false
        }
        disposed = true
        if alreadyIdle {
            return owner.ReleaseLeaseAfterIdle()
        }
        return owner.ReleaseLease()
    }

    internal func Release() bool {
        return ReleaseCore(false)
    }

    internal func ReleaseAfterIdle() bool {
        return ReleaseCore(true)
    }

    internal func AbandonAfterDeviceLoss() {
        if disposed {
            return
        }
        disposed = true
        owner.AbandonLeaseAfterDeviceLoss()
    }

    public func Dispose() {
        Release()
    }
}
