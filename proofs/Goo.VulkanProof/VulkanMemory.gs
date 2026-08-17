package Goo.VulkanProof

import System
import Goo.Vulkan.Generated

internal enum VulkanMemoryAllocationState {
    Empty;
    Live;
    Retired;
}

internal unsafe class VulkanMemoryAllocation {
    var memory VkDeviceMemory
    var size VkDeviceSize
    var offset VkDeviceSize
    var memoryTypeIndex uint32
    var heapIndex uint32
    var propertyFlags VkMemoryPropertyFlags
    var hostVisible bool
    var hostCoherent bool
    var dedicated bool
    var mapped *void
    var state VulkanMemoryAllocationState
}

internal data struct VulkanMemoryTypeSelection {
    var memoryTypeIndex uint32
    var heapIndex uint32
    var propertyFlags VkMemoryPropertyFlags
}

internal data struct VulkanMemoryCounters {
    var liveBytes VkDeviceSize
    var liveAllocations uint64
    var retiredBytes VkDeviceSize
    var retiredAllocations uint64
}

internal unsafe class VulkanMemoryAllocator {
    private const MaxTrackedAllocations uint64 = 1048576uL

    private let device VkDevice
    private let deviceDispatch VkDeviceDispatch
    private let memoryProperties VkPhysicalDeviceMemoryProperties
    private let maxAllocationCount uint64
    private let heapResidentBytes []VkDeviceSize
    private var liveBytes VkDeviceSize
    private var liveAllocations uint64
    private var retiredBytes VkDeviceSize
    private var retiredAllocations uint64
    private var residentAllocations uint64

    internal prop LiveBytes VkDeviceSize { get { return liveBytes } }
    internal prop LiveAllocationCount uint64 { get { return liveAllocations } }
    internal prop RetiredBytes VkDeviceSize { get { return retiredBytes } }
    internal prop RetiredAllocationCount uint64 { get { return retiredAllocations } }

    internal init(nativeDevice VkDevice, nativeDispatch VkDeviceDispatch,
        physicalProperties VkPhysicalDeviceMemoryProperties, allocationLimit uint32) {
        if physicalProperties.memoryTypeCount == 0u || physicalProperties.memoryTypeCount > VkConstants.VK_MAX_MEMORY_TYPES {
            throw ArgumentOutOfRangeException("memoryTypeCount")
        }
        if physicalProperties.memoryHeapCount == 0u || physicalProperties.memoryHeapCount > VkConstants.VK_MAX_MEMORY_HEAPS {
            throw ArgumentOutOfRangeException("memoryHeapCount")
        }
        if allocationLimit == 0u {
            throw ArgumentOutOfRangeException("maxAllocationCount")
        }
        this.device = nativeDevice
        this.deviceDispatch = nativeDispatch
        this.memoryProperties = physicalProperties
        let requestedMaximum = uint64(allocationLimit)
        if requestedMaximum > MaxTrackedAllocations {
            this.maxAllocationCount = MaxTrackedAllocations
        } else {
            this.maxAllocationCount = requestedMaximum
        }
        heapResidentBytes = [int32(VkConstants.VK_MAX_MEMORY_HEAPS)]VkDeviceSize
    }

    internal prop Counters VulkanMemoryCounters {
        get {
            return VulkanMemoryCounters{
                liveBytes: liveBytes,
                liveAllocations: liveAllocations,
                retiredBytes: retiredBytes,
                retiredAllocations: retiredAllocations,
            }
        }
    }

    internal func SelectMemoryType(typeBits uint32, requiredProperties VkMemoryPropertyFlags,
        preferredProperties VkMemoryPropertyFlags) VulkanMemoryTypeSelection {
        var found bool = false
        var bestIndex uint32 = 0u
        var bestScore int32 = -1
        var index uint32 = 0u
        var bit uint32 = 1u
        while index < memoryProperties.memoryTypeCount {
            if (typeBits & bit) != 0u {
                let memoryType = MemoryType(memoryProperties, index)
                if (memoryType.propertyFlags & requiredProperties) == requiredProperties {
                    let score = BitCount(memoryType.propertyFlags & preferredProperties)
                    if !found || score > bestScore {
                        found = true
                        bestIndex = index
                        bestScore = score
                    }
                }
            }
            index++
            bit = bit << 1
        }
        if !found {
            throw InvalidOperationException("No compatible Vulkan memory type")
        }
        let selected = MemoryType(memoryProperties, bestIndex)
        if selected.heapIndex >= memoryProperties.memoryHeapCount {
            throw InvalidOperationException("Vulkan memory type references an invalid heap")
        }
        return VulkanMemoryTypeSelection{
            memoryTypeIndex: bestIndex,
            heapIndex: selected.heapIndex,
            propertyFlags: selected.propertyFlags,
        }
    }

    internal func AllocateImage(image VkImage, requiredProperties VkMemoryPropertyFlags,
        preferredProperties VkMemoryPropertyFlags) VulkanMemoryAllocation {
        if image == 0uL {
            throw ArgumentOutOfRangeException("image")
        }
        var dedicatedRequirements = VkMemoryDedicatedRequirements{
            sType: VkConstants.VK_STRUCTURE_TYPE_MEMORY_DEDICATED_REQUIREMENTS,
            pNext: nil,
            prefersDedicatedAllocation: 0u,
            requiresDedicatedAllocation: 0u,
        }
        var requirements = VkMemoryRequirements2{
            sType: VkConstants.VK_STRUCTURE_TYPE_MEMORY_REQUIREMENTS_2,
            pNext: *void(&dedicatedRequirements),
            memoryRequirements: VkMemoryRequirements{},
        }
        var requirementsInfo = VkImageMemoryRequirementsInfo2{
            sType: VkConstants.VK_STRUCTURE_TYPE_IMAGE_MEMORY_REQUIREMENTS_INFO_2,
            pNext: nil,
            image: image,
        }
        let getImageMemoryRequirements2 = deviceDispatch.vkGetImageMemoryRequirements2
        getImageMemoryRequirements2(device, &requirementsInfo, &requirements)
        return AllocateImageMemory(image, requirements.memoryRequirements, dedicatedRequirements,
            requiredProperties, preferredProperties)
    }

    internal func AllocateBuffer(buffer VkBuffer, requiredProperties VkMemoryPropertyFlags,
        preferredProperties VkMemoryPropertyFlags) VulkanMemoryAllocation {
        if buffer == 0uL {
            throw ArgumentOutOfRangeException("buffer")
        }
        var dedicatedRequirements = VkMemoryDedicatedRequirements{
            sType: VkConstants.VK_STRUCTURE_TYPE_MEMORY_DEDICATED_REQUIREMENTS,
            pNext: nil,
            prefersDedicatedAllocation: 0u,
            requiresDedicatedAllocation: 0u,
        }
        var requirements = VkMemoryRequirements2{
            sType: VkConstants.VK_STRUCTURE_TYPE_MEMORY_REQUIREMENTS_2,
            pNext: *void(&dedicatedRequirements),
            memoryRequirements: VkMemoryRequirements{},
        }
        var requirementsInfo = VkBufferMemoryRequirementsInfo2{
            sType: VkConstants.VK_STRUCTURE_TYPE_BUFFER_MEMORY_REQUIREMENTS_INFO_2,
            pNext: nil,
            buffer: buffer,
        }
        let getBufferMemoryRequirements2 = deviceDispatch.vkGetBufferMemoryRequirements2
        getBufferMemoryRequirements2(device, &requirementsInfo, &requirements)
        return AllocateBufferMemory(buffer, requirements.memoryRequirements, dedicatedRequirements,
            requiredProperties, preferredProperties)
    }

    internal func Map(allocation VulkanMemoryAllocation) VkResult {
        EnsureUsable(allocation)
        if !allocation.hostVisible {
            throw InvalidOperationException("Vulkan memory is not host visible")
        }
        if allocation.mapped != nil {
            return VkConstants.VK_SUCCESS
        }
        var mapped *void = nil
        let mapMemory = deviceDispatch.vkMapMemory
        let result = mapMemory(device, allocation.memory, 0uL,
            VkConstants.VK_WHOLE_SIZE, 0u, *void(&mapped))
        if result == VkConstants.VK_SUCCESS {
            allocation.mapped = mapped
        }
        return result
    }

    internal func Unmap(allocation VulkanMemoryAllocation) {
        EnsureUsable(allocation)
        if allocation.mapped != nil {
            let unmapMemory = deviceDispatch.vkUnmapMemory
            unmapMemory(device, allocation.memory)
            allocation.mapped = nil
        }
    }

    internal func InvalidateAfterFence(allocation VulkanMemoryAllocation) VkResult {
        EnsureUsable(allocation)
        if allocation.hostCoherent {
            return VkConstants.VK_SUCCESS
        }
        if !allocation.hostVisible {
            throw InvalidOperationException("Vulkan memory is not host visible")
        }
        if allocation.mapped == nil {
            throw InvalidOperationException("Vulkan memory must be mapped before invalidation")
        }
        var mappedRange = VkMappedMemoryRange{
            sType: VkConstants.VK_STRUCTURE_TYPE_MAPPED_MEMORY_RANGE,
            pNext: nil,
            memory: allocation.memory,
            offset: 0uL,
            size: VkConstants.VK_WHOLE_SIZE,
        }
        let invalidateMappedMemoryRanges = deviceDispatch.vkInvalidateMappedMemoryRanges
        return invalidateMappedMemoryRanges(device, 1u, &mappedRange)
    }

    internal func Retire(allocation VulkanMemoryAllocation) {
        if allocation.state != VulkanMemoryAllocationState.Live {
            return
        }
        liveBytes -= allocation.size
        liveAllocations--
        retiredBytes += allocation.size
        retiredAllocations++
        allocation.state = VulkanMemoryAllocationState.Retired
    }

    internal func Release(allocation VulkanMemoryAllocation) {
        if allocation.state == VulkanMemoryAllocationState.Empty {
            return
        }
        if allocation.mapped != nil {
            let unmapMemory = deviceDispatch.vkUnmapMemory
            unmapMemory(device, allocation.memory)
            allocation.mapped = nil
        }
        let freeMemory = deviceDispatch.vkFreeMemory
        freeMemory(device, allocation.memory, nil)
        if allocation.state == VulkanMemoryAllocationState.Live {
            liveBytes -= allocation.size
            liveAllocations--
        } else if allocation.state == VulkanMemoryAllocationState.Retired {
            retiredBytes -= allocation.size
            retiredAllocations--
        }
        residentAllocations--
        let heapIndex = int32(allocation.heapIndex)
        heapResidentBytes[heapIndex] -= allocation.size
        allocation.memory = 0uL
        allocation.size = 0uL
        allocation.offset = 0uL
        allocation.memoryTypeIndex = 0u
        allocation.heapIndex = 0u
        allocation.propertyFlags = 0u
        allocation.hostVisible = false
        allocation.hostCoherent = false
        allocation.dedicated = false
        allocation.state = VulkanMemoryAllocationState.Empty
    }

    private func AllocateImageMemory(image VkImage, requirements VkMemoryRequirements,
        dedicatedRequirements VkMemoryDedicatedRequirements, requiredProperties VkMemoryPropertyFlags,
        preferredProperties VkMemoryPropertyFlags) VulkanMemoryAllocation {
        ValidateRequirements(requirements)
        let selection = SelectMemoryType(requirements.memoryTypeBits, requiredProperties, preferredProperties)
        EnsureCapacity(selection.heapIndex, requirements.size)
        let dedicated = dedicatedRequirements.requiresDedicatedAllocation != 0u
            || dedicatedRequirements.prefersDedicatedAllocation != 0u
        var dedicatedInfo = VkMemoryDedicatedAllocateInfo{
            sType: VkConstants.VK_STRUCTURE_TYPE_MEMORY_DEDICATED_ALLOCATE_INFO,
            pNext: nil,
            image: image,
            buffer: 0uL,
        }
        var allocateInfo = VkMemoryAllocateInfo{
            sType: VkConstants.VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO,
            pNext: nil,
            allocationSize: requirements.size,
            memoryTypeIndex: selection.memoryTypeIndex,
        }
        if dedicated {
            allocateInfo.pNext = *void(&dedicatedInfo)
        }
        var memory VkDeviceMemory = 0uL
        let allocateMemory = deviceDispatch.vkAllocateMemory
        let allocateResult = allocateMemory(device, &allocateInfo, nil, &memory)
        if allocateResult != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkAllocateMemory failed")
        }
        var bindInfo = VkBindImageMemoryInfo{
            sType: VkConstants.VK_STRUCTURE_TYPE_BIND_IMAGE_MEMORY_INFO,
            pNext: nil,
            image: image,
            memory: memory,
            memoryOffset: 0uL,
        }
        let bindImageMemory2 = deviceDispatch.vkBindImageMemory2
        let bindResult = bindImageMemory2(device, 1u, &bindInfo)
        if bindResult != VkConstants.VK_SUCCESS {
            let freeMemory = deviceDispatch.vkFreeMemory
            freeMemory(device, memory, nil)
            throw InvalidOperationException("vkBindImageMemory2 failed")
        }
        var allocation = VulkanMemoryAllocation{
            memory: memory,
            size: requirements.size,
            offset: 0uL,
            memoryTypeIndex: selection.memoryTypeIndex,
            heapIndex: selection.heapIndex,
            propertyFlags: selection.propertyFlags,
            hostVisible: (selection.propertyFlags & uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT)) != 0u,
            hostCoherent: (selection.propertyFlags & uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_COHERENT_BIT)) != 0u,
            dedicated: dedicated,
            mapped: nil,
            state: VulkanMemoryAllocationState.Live,
        }
        TrackLive(allocation)
        return allocation
    }

    private func AllocateBufferMemory(buffer VkBuffer, requirements VkMemoryRequirements,
        dedicatedRequirements VkMemoryDedicatedRequirements, requiredProperties VkMemoryPropertyFlags,
        preferredProperties VkMemoryPropertyFlags) VulkanMemoryAllocation {
        ValidateRequirements(requirements)
        let selection = SelectMemoryType(requirements.memoryTypeBits, requiredProperties, preferredProperties)
        EnsureCapacity(selection.heapIndex, requirements.size)
        let dedicated = dedicatedRequirements.requiresDedicatedAllocation != 0u
            || dedicatedRequirements.prefersDedicatedAllocation != 0u
        var dedicatedInfo = VkMemoryDedicatedAllocateInfo{
            sType: VkConstants.VK_STRUCTURE_TYPE_MEMORY_DEDICATED_ALLOCATE_INFO,
            pNext: nil,
            image: 0uL,
            buffer: buffer,
        }
        var allocateInfo = VkMemoryAllocateInfo{
            sType: VkConstants.VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO,
            pNext: nil,
            allocationSize: requirements.size,
            memoryTypeIndex: selection.memoryTypeIndex,
        }
        if dedicated {
            allocateInfo.pNext = *void(&dedicatedInfo)
        }
        var memory VkDeviceMemory = 0uL
        let allocateMemory = deviceDispatch.vkAllocateMemory
        let allocateResult = allocateMemory(device, &allocateInfo, nil, &memory)
        if allocateResult != VkConstants.VK_SUCCESS {
            throw InvalidOperationException("vkAllocateMemory failed")
        }
        var bindInfo = VkBindBufferMemoryInfo{
            sType: VkConstants.VK_STRUCTURE_TYPE_BIND_BUFFER_MEMORY_INFO,
            pNext: nil,
            buffer: buffer,
            memory: memory,
            memoryOffset: 0uL,
        }
        let bindBufferMemory2 = deviceDispatch.vkBindBufferMemory2
        let bindResult = bindBufferMemory2(device, 1u, &bindInfo)
        if bindResult != VkConstants.VK_SUCCESS {
            let freeMemory = deviceDispatch.vkFreeMemory
            freeMemory(device, memory, nil)
            throw InvalidOperationException("vkBindBufferMemory2 failed")
        }
        var allocation = VulkanMemoryAllocation{
            memory: memory,
            size: requirements.size,
            offset: 0uL,
            memoryTypeIndex: selection.memoryTypeIndex,
            heapIndex: selection.heapIndex,
            propertyFlags: selection.propertyFlags,
            hostVisible: (selection.propertyFlags & uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT)) != 0u,
            hostCoherent: (selection.propertyFlags & uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_COHERENT_BIT)) != 0u,
            dedicated: dedicated,
            mapped: nil,
            state: VulkanMemoryAllocationState.Live,
        }
        TrackLive(allocation)
        return allocation
    }

    private func ValidateRequirements(requirements VkMemoryRequirements) {
        if requirements.size == 0uL {
            throw InvalidOperationException("Vulkan memory requirements have zero size")
        }
        if requirements.alignment == 0uL {
            throw InvalidOperationException("Vulkan memory requirements have zero alignment")
        }
        if requirements.memoryTypeBits == 0u {
            throw InvalidOperationException("Vulkan memory requirements have no memory types")
        }
    }

    private func EnsureCapacity(heapIndex uint32, allocationSize VkDeviceSize) {
        if residentAllocations >= maxAllocationCount || residentAllocations >= MaxTrackedAllocations {
            throw InvalidOperationException("Vulkan memory allocation count limit reached")
        }
        if heapIndex >= memoryProperties.memoryHeapCount {
            throw InvalidOperationException("Vulkan memory allocation references an invalid heap")
        }
        let heap = MemoryHeap(memoryProperties, heapIndex)
        let current = heapResidentBytes[int32(heapIndex)]
        if allocationSize > heap.size || current > heap.size - allocationSize {
            throw InvalidOperationException("Vulkan memory heap capacity exceeded")
        }
        if allocationSize > uint64.MaxValue - liveBytes || allocationSize > uint64.MaxValue - retiredBytes {
            throw InvalidOperationException("Vulkan memory counter overflow")
        }
    }

    private func TrackLive(allocation VulkanMemoryAllocation) {
        let heapIndex = int32(allocation.heapIndex)
        heapResidentBytes[heapIndex] += allocation.size
        residentAllocations++
        liveBytes += allocation.size
        liveAllocations++
    }

    private func EnsureUsable(allocation VulkanMemoryAllocation) {
        if allocation.state != VulkanMemoryAllocationState.Live || allocation.memory == 0uL {
            throw InvalidOperationException("Vulkan memory allocation is not live")
        }
    }

    private func BitCount(value uint32) int32 {
        var remaining = value
        var count int32 = 0
        while remaining != 0u {
            count += int32(remaining & 1u)
            remaining = remaining >> 1
        }
        return count
    }

    private func MemoryType(properties VkPhysicalDeviceMemoryProperties, index uint32) VkMemoryType {
        switch index {
            case 0u { return properties.memoryTypes_0 }
            case 1u { return properties.memoryTypes_1 }
            case 2u { return properties.memoryTypes_2 }
            case 3u { return properties.memoryTypes_3 }
            case 4u { return properties.memoryTypes_4 }
            case 5u { return properties.memoryTypes_5 }
            case 6u { return properties.memoryTypes_6 }
            case 7u { return properties.memoryTypes_7 }
            case 8u { return properties.memoryTypes_8 }
            case 9u { return properties.memoryTypes_9 }
            case 10u { return properties.memoryTypes_10 }
            case 11u { return properties.memoryTypes_11 }
            case 12u { return properties.memoryTypes_12 }
            case 13u { return properties.memoryTypes_13 }
            case 14u { return properties.memoryTypes_14 }
            case 15u { return properties.memoryTypes_15 }
            case 16u { return properties.memoryTypes_16 }
            case 17u { return properties.memoryTypes_17 }
            case 18u { return properties.memoryTypes_18 }
            case 19u { return properties.memoryTypes_19 }
            case 20u { return properties.memoryTypes_20 }
            case 21u { return properties.memoryTypes_21 }
            case 22u { return properties.memoryTypes_22 }
            case 23u { return properties.memoryTypes_23 }
            case 24u { return properties.memoryTypes_24 }
            case 25u { return properties.memoryTypes_25 }
            case 26u { return properties.memoryTypes_26 }
            case 27u { return properties.memoryTypes_27 }
            case 28u { return properties.memoryTypes_28 }
            case 29u { return properties.memoryTypes_29 }
            case 30u { return properties.memoryTypes_30 }
            case 31u { return properties.memoryTypes_31 }
            case _ { throw ArgumentOutOfRangeException("index") }
        }
    }

    private func MemoryHeap(properties VkPhysicalDeviceMemoryProperties, index uint32) VkMemoryHeap {
        switch index {
            case 0u { return properties.memoryHeaps_0 }
            case 1u { return properties.memoryHeaps_1 }
            case 2u { return properties.memoryHeaps_2 }
            case 3u { return properties.memoryHeaps_3 }
            case 4u { return properties.memoryHeaps_4 }
            case 5u { return properties.memoryHeaps_5 }
            case 6u { return properties.memoryHeaps_6 }
            case 7u { return properties.memoryHeaps_7 }
            case 8u { return properties.memoryHeaps_8 }
            case 9u { return properties.memoryHeaps_9 }
            case 10u { return properties.memoryHeaps_10 }
            case 11u { return properties.memoryHeaps_11 }
            case 12u { return properties.memoryHeaps_12 }
            case 13u { return properties.memoryHeaps_13 }
            case 14u { return properties.memoryHeaps_14 }
            case 15u { return properties.memoryHeaps_15 }
            case _ { throw ArgumentOutOfRangeException("index") }
        }
    }
}
