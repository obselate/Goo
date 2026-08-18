package Goo

import System

internal enum VulkanRuntimeState {
    Empty;
    InstanceReady;
    DeviceReady;
    Lost;
    Disposed;
}

internal data struct VulkanQueueBinding {
    var Queue VkQueue
    var FamilyIndex uint32
}

internal data struct VulkanDeviceSnapshot {
    var Instance VkInstance
    var PhysicalDevice VkPhysicalDevice
    var Device VkDevice
    var Dispatch VkDeviceDispatch
    var Graphics VulkanQueueBinding
    var Present VulkanQueueBinding
    var Generation uint64
}

internal unsafe class VulkanRuntime : IDisposable {
    private let instanceDispatch VkInstanceDispatch
    private let instance VkInstance
    private var physicalDevice VkPhysicalDevice
    private var device VkDevice
    private var dispatch VkDeviceDispatch
    private var graphics VulkanQueueBinding
    private var present VulkanQueueBinding
    private var generation uint64
    private var state VulkanRuntimeState
    private var disposed bool

    internal prop State VulkanRuntimeState { get { return state } }
    internal prop Generation uint64 { get { return generation } }
    internal prop HasDevice bool { get { return state == VulkanRuntimeState.DeviceReady } }

    internal init(nativeInstance VkInstance, nativeDispatch VkInstanceDispatch) {
        if nativeInstance == nint(0) {
            throw ArgumentException("Vulkan instance is null", "nativeInstance")
        }
        this.instance = nativeInstance
        this.instanceDispatch = nativeDispatch
        this.state = VulkanRuntimeState.InstanceReady
    }

    internal func AttachDevice(
        nativePhysicalDevice VkPhysicalDevice,
        nativeDevice VkDevice,
        nativeDispatch VkDeviceDispatch,
        graphicsQueue VkQueue,
        presentQueue VkQueue,
        graphicsFamily uint32,
        presentFamily uint32) uint64 {
        EnsureOpen()
        if state == VulkanRuntimeState.Lost {
            throw InvalidOperationException("Vulkan runtime requires recovery before device attach")
        }
        if nativePhysicalDevice == nint(0) || nativeDevice == nint(0) {
            throw ArgumentException("Vulkan device handles cannot be null")
        }
        if graphicsQueue == nint(0) || presentQueue == nint(0) {
            throw ArgumentException("Vulkan queue handles cannot be null")
        }
        if state == VulkanRuntimeState.DeviceReady {
            throw InvalidOperationException("Vulkan runtime already has a device")
        }
        physicalDevice = nativePhysicalDevice
        device = nativeDevice
        dispatch = nativeDispatch
        graphics = VulkanQueueBinding{ Queue: graphicsQueue, FamilyIndex: graphicsFamily }
        present = VulkanQueueBinding{ Queue: presentQueue, FamilyIndex: presentFamily }
        generation = generation + 1uL
        if generation == 0uL {
            throw OverflowException("Vulkan device generation overflow")
        }
        state = VulkanRuntimeState.DeviceReady
        return generation
    }

    internal func MarkDeviceLost() {
        EnsureOpen()
        if state == VulkanRuntimeState.DeviceReady {
            state = VulkanRuntimeState.Lost
        }
    }

    internal func BeginRecovery() {
        EnsureOpen()
        if state != VulkanRuntimeState.Lost {
            throw InvalidOperationException("Vulkan runtime is not lost")
        }
        physicalDevice = nint(0)
        device = nint(0)
        graphics = VulkanQueueBinding{}
        present = VulkanQueueBinding{}
        state = VulkanRuntimeState.InstanceReady
    }

    internal func Snapshot() VulkanDeviceSnapshot {
        EnsureOpen()
        if state != VulkanRuntimeState.DeviceReady {
            throw InvalidOperationException("Vulkan runtime has no ready device")
        }
        return VulkanDeviceSnapshot{
            Instance: instance,
            PhysicalDevice: physicalDevice,
            Device: device,
            Dispatch: dispatch,
            Graphics: graphics,
            Present: present,
            Generation: generation,
        }
    }

    public func Dispose() {
        if disposed {
            return
        }
        disposed = true
        state = VulkanRuntimeState.Disposed
        if device != nint(0) {
            let destroyDevice = dispatch.vkDestroyDevice
            destroyDevice(device, nil)
            device = nint(0)
        }
        if instance != nint(0) {
            let destroyInstance = instanceDispatch.vkDestroyInstance
            destroyInstance(instance, nil)
        }
        physicalDevice = nint(0)
        graphics = VulkanQueueBinding{}
        present = VulkanQueueBinding{}
    }

    deinit {
        Dispose()
    }

    private func EnsureOpen() {
        if disposed {
            throw ObjectDisposedException("VulkanRuntime")
        }
    }
}
