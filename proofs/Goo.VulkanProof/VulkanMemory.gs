package Goo.VulkanProof

import System
import Goo.Vulkan.Generated

internal enum VulkanMemoryResourceClass {
    Buffer;
    Image;
}

internal enum VulkanMemoryAllocationState {
    Empty;
    Live;
    Retired;
}

internal unsafe class VulkanMemoryBlock {
    var memory VkDeviceMemory
    var size VkDeviceSize
    var memoryTypeIndex uint32
    var heapIndex uint32
    var propertyFlags VkMemoryPropertyFlags
    var hostVisible bool
    var hostCoherent bool
    var resourceClass VulkanMemoryResourceClass
    var dedicated bool
    var mapped *void
    var allocationCount uint32
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
    var block VulkanMemoryBlock?
    var activeIndex int32
    var blockFresh bool
    var pendingBind bool
    var state VulkanMemoryAllocationState
}

internal data struct VulkanMemoryPlacement {
    var block VulkanMemoryBlock?
    var offset VkDeviceSize
    var newBlock bool
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
    var residentBytes VkDeviceSize
    var residentAllocations uint64
}

internal unsafe class VulkanMemoryAllocator : IDisposable {
    private const MaxTrackedAllocations uint64 = 1048576uL
    private const InitialActiveCapacity int32 = 32
    private const InitialBlockCapacity int32 = 4
    private const BufferBlockSize VkDeviceSize = 1048576uL
    private const ImageBlockSize VkDeviceSize = 4194304uL
    private const BufferDedicatedThreshold VkDeviceSize = 524288uL
    private const ImageDedicatedThreshold VkDeviceSize = 2097152uL

    private let device VkDevice
    private let deviceDispatch VkDeviceDispatch
    private let memoryProperties VkPhysicalDeviceMemoryProperties
    private let maxAllocationCount uint64
    private let heapResidentBytes []VkDeviceSize
    private var activeAllocations []VulkanMemoryAllocation?
    private var blocks []VulkanMemoryBlock?
    private var activeCount int32
    private var blockCount int32
    private var liveBytes VkDeviceSize
    private var liveAllocations uint64
    private var retiredBytes VkDeviceSize
    private var retiredAllocations uint64
    private var residentBytes VkDeviceSize
    private var residentAllocations uint64
    private var disposed bool

    internal prop LiveBytes VkDeviceSize { get { return liveBytes } }
    internal prop LiveAllocationCount uint64 { get { return liveAllocations } }
    internal prop RetiredBytes VkDeviceSize { get { return retiredBytes } }
    internal prop RetiredAllocationCount uint64 { get { return retiredAllocations } }
    internal prop ResidentBytes VkDeviceSize { get { return residentBytes } }
    internal prop ResidentAllocationCount uint64 { get { return residentAllocations } }

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
        activeAllocations = [InitialActiveCapacity]VulkanMemoryAllocation?
        let initialBlockCapacity = if this.maxAllocationCount < uint64(InitialBlockCapacity) {
            int32(this.maxAllocationCount)
        } else {
            InitialBlockCapacity
        }
        blocks = [initialBlockCapacity]VulkanMemoryBlock?
    }

    internal prop Counters VulkanMemoryCounters {
        get {
            return VulkanMemoryCounters{
                liveBytes: liveBytes,
                liveAllocations: liveAllocations,
                retiredBytes: retiredBytes,
                retiredAllocations: retiredAllocations,
                residentBytes: residentBytes,
                residentAllocations: residentAllocations,
            }
        }
    }

    internal func SelectMemoryType(typeBits uint32, requiredProperties VkMemoryPropertyFlags,
        preferredProperties VkMemoryPropertyFlags) VulkanMemoryTypeSelection {
        EnsureOpen()
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
        EnsureOpen()
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
        EnsureOpen()
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
        let block = allocation.block!!
        if block.mapped == nil {
            return VkConstants.VK_ERROR_MEMORY_MAP_FAILED
        }
        allocation.mapped = PointerAt(block.mapped, allocation.offset)
        if allocation.mapped == nil {
            return VkConstants.VK_ERROR_MEMORY_MAP_FAILED
        }
        return VkConstants.VK_SUCCESS
    }

    internal func Unmap(allocation VulkanMemoryAllocation) {
        EnsureUsable(allocation)
        allocation.mapped = nil
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
        let block = allocation.block!!
        var mappedRange = VkMappedMemoryRange{
            sType: VkConstants.VK_STRUCTURE_TYPE_MAPPED_MEMORY_RANGE,
            pNext: nil,
            memory: block.memory,
            offset: 0uL,
            size: VkConstants.VK_WHOLE_SIZE,
        }
        let invalidateMappedMemoryRanges = deviceDispatch.vkInvalidateMappedMemoryRanges
        return invalidateMappedMemoryRanges(device, 1u, &mappedRange)
    }

    internal func FlushBeforeSubmit(allocation VulkanMemoryAllocation) VkResult {
        EnsureUsable(allocation)
        if allocation.hostCoherent {
            return VkConstants.VK_SUCCESS
        }
        if !allocation.hostVisible {
            throw InvalidOperationException("Vulkan memory is not host visible")
        }
        if allocation.mapped == nil {
            throw InvalidOperationException("Vulkan memory must be mapped before flushing")
        }
        let block = allocation.block!!
        var mappedRange = VkMappedMemoryRange{
            sType: VkConstants.VK_STRUCTURE_TYPE_MAPPED_MEMORY_RANGE,
            pNext: nil,
            memory: block.memory,
            offset: 0uL,
            size: VkConstants.VK_WHOLE_SIZE,
        }
        let flushMappedMemoryRanges = deviceDispatch.vkFlushMappedMemoryRanges
        return flushMappedMemoryRanges(device, 1u, &mappedRange)
    }

    internal func Retire(allocation VulkanMemoryAllocation) {
        if allocation.state != VulkanMemoryAllocationState.Live {
            return
        }
        if allocation.size > uint64.MaxValue - retiredBytes {
            throw OverflowException("Vulkan retired memory counter overflow")
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
        let block = allocation.block
        let removeBlock = allocation.dedicated || (allocation.pendingBind && allocation.blockFresh)
        if block != nil {
            let owningBlock = block!!
            if owningBlock.allocationCount == 0u {
                throw InvalidOperationException("Vulkan memory block allocation count underflow")
            }
            owningBlock.allocationCount--
        }
        if allocation.state == VulkanMemoryAllocationState.Live {
            liveBytes -= allocation.size
            liveAllocations--
        } else if allocation.state == VulkanMemoryAllocationState.Retired {
            retiredBytes -= allocation.size
            retiredAllocations--
        }
        RemoveActive(allocation)
        allocation.mapped = nil
        ResetAllocation(allocation)
        if removeBlock && block != nil {
            RemoveBlock(block!!)
        } else if block != nil && block!!.allocationCount == 0u {
            TrimEmptyPooledBlocks(block!!)
        }
    }

    public func Dispose() {
        if disposed {
            return
        }
        disposed = true
        var allocationIndex int32 = 0
        while allocationIndex < activeCount {
            if let allocation = activeAllocations[allocationIndex] {
                ResetAllocation(allocation)
                activeAllocations[allocationIndex] = nil
            }
            allocationIndex = allocationIndex + 1
        }
        activeCount = 0
        var blockIndex int32 = 0
        let unmapMemory = deviceDispatch.vkUnmapMemory
        let freeMemory = deviceDispatch.vkFreeMemory
        while blockIndex < blockCount {
            if let block = blocks[blockIndex] {
                if block.mapped != nil {
                    unmapMemory(device, block.memory)
                    block.mapped = nil
                }
                if block.memory != 0uL {
                    freeMemory(device, block.memory, nil)
                    block.memory = 0uL
                }
            }
            blocks[blockIndex] = nil
            blockIndex = blockIndex + 1
        }
        var heapIndex int32 = 0
        while heapIndex < heapResidentBytes.Length {
            heapResidentBytes[heapIndex] = 0uL
            heapIndex = heapIndex + 1
        }
        liveBytes = 0uL
        liveAllocations = 0uL
        retiredBytes = 0uL
        retiredAllocations = 0uL
        residentBytes = 0uL
        residentAllocations = 0uL
        blockCount = 0
    }

    private func AllocateImageMemory(image VkImage, requirements VkMemoryRequirements,
        dedicatedRequirements VkMemoryDedicatedRequirements, requiredProperties VkMemoryPropertyFlags,
        preferredProperties VkMemoryPropertyFlags) VulkanMemoryAllocation {
        ValidateRequirements(requirements)
        let selection = SelectMemoryType(requirements.memoryTypeBits, requiredProperties, preferredProperties)
        let dedicated = IsDedicated(requirements, dedicatedRequirements, VulkanMemoryResourceClass.Image)
        EnsureLiveCapacity(requirements.size)
        EnsureActiveCapacity()
        let placement = AcquirePlacement(requirements, selection, VulkanMemoryResourceClass.Image, dedicated,
            image, 0uL)
        let allocation = VulkanMemoryAllocation{}
        InitializeAllocation(allocation, placement, requirements, selection, dedicated)
        TrackLive(allocation)
        var bindInfo = VkBindImageMemoryInfo{
            sType: VkConstants.VK_STRUCTURE_TYPE_BIND_IMAGE_MEMORY_INFO,
            pNext: nil,
            image: image,
            memory: allocation.memory,
            memoryOffset: allocation.offset,
        }
        let bindImageMemory2 = deviceDispatch.vkBindImageMemory2
        let bindResult = bindImageMemory2(device, 1u, &bindInfo)
        if bindResult != VkConstants.VK_SUCCESS {
            Release(allocation)
            throw InvalidOperationException("vkBindImageMemory2 failed")
        }
        allocation.pendingBind = false
        return allocation
    }

    private func AllocateBufferMemory(buffer VkBuffer, requirements VkMemoryRequirements,
        dedicatedRequirements VkMemoryDedicatedRequirements, requiredProperties VkMemoryPropertyFlags,
        preferredProperties VkMemoryPropertyFlags) VulkanMemoryAllocation {
        ValidateRequirements(requirements)
        let selection = SelectMemoryType(requirements.memoryTypeBits, requiredProperties, preferredProperties)
        let dedicated = IsDedicated(requirements, dedicatedRequirements, VulkanMemoryResourceClass.Buffer)
        EnsureLiveCapacity(requirements.size)
        EnsureActiveCapacity()
        let placement = AcquirePlacement(requirements, selection, VulkanMemoryResourceClass.Buffer, dedicated,
            0uL, buffer)
        let allocation = VulkanMemoryAllocation{}
        InitializeAllocation(allocation, placement, requirements, selection, dedicated)
        TrackLive(allocation)
        var bindInfo = VkBindBufferMemoryInfo{
            sType: VkConstants.VK_STRUCTURE_TYPE_BIND_BUFFER_MEMORY_INFO,
            pNext: nil,
            buffer: buffer,
            memory: allocation.memory,
            memoryOffset: allocation.offset,
        }
        let bindBufferMemory2 = deviceDispatch.vkBindBufferMemory2
        let bindResult = bindBufferMemory2(device, 1u, &bindInfo)
        if bindResult != VkConstants.VK_SUCCESS {
            Release(allocation)
            throw InvalidOperationException("vkBindBufferMemory2 failed")
        }
        allocation.pendingBind = false
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

    private func IsDedicated(requirements VkMemoryRequirements,
        dedicatedRequirements VkMemoryDedicatedRequirements,
        resourceClass VulkanMemoryResourceClass) bool {
        let threshold = if resourceClass == VulkanMemoryResourceClass.Image {
            ImageDedicatedThreshold
        } else {
            BufferDedicatedThreshold
        }
        return dedicatedRequirements.requiresDedicatedAllocation != 0u
            || dedicatedRequirements.prefersDedicatedAllocation != 0u
            || requirements.size >= threshold
    }

    private func AcquirePlacement(requirements VkMemoryRequirements,
        selection VulkanMemoryTypeSelection, resourceClass VulkanMemoryResourceClass,
        dedicated bool, dedicatedImage VkImage, dedicatedBuffer VkBuffer) VulkanMemoryPlacement {
        if dedicated {
            let block = CreateBlock(requirements.size, selection, resourceClass, true,
                dedicatedImage, dedicatedBuffer)
            return VulkanMemoryPlacement{ block: block, offset: 0uL, newBlock: true }
        }
        var blockIndex int32 = 0
        var offset VkDeviceSize = 0uL
        while blockIndex < blockCount {
            if let block = blocks[blockIndex] {
                if block.memoryTypeIndex == selection.memoryTypeIndex
                    && block.resourceClass == resourceClass
                    && !block.dedicated
                    && TryFindOffset(block, requirements.size, requirements.alignment, ref offset) {
                    return VulkanMemoryPlacement{ block: block, offset: offset, newBlock: false }
                }
            }
            blockIndex = blockIndex + 1
        }
        let blockSize = BlockSize(requirements, resourceClass, selection.heapIndex)
        let newBlock = CreateBlock(blockSize, selection, resourceClass, false,
            dedicatedImage, dedicatedBuffer)
        if !TryFindOffset(newBlock, requirements.size, requirements.alignment, ref offset) {
            RemoveBlock(newBlock)
            throw InvalidOperationException("Vulkan memory block cannot satisfy requirements")
        }
        return VulkanMemoryPlacement{ block: newBlock, offset: offset, newBlock: true }
    }

    private func BlockSize(requirements VkMemoryRequirements,
        resourceClass VulkanMemoryResourceClass, heapIndex uint32) VkDeviceSize {
        let baseSize = if resourceClass == VulkanMemoryResourceClass.Image {
            ImageBlockSize
        } else {
            BufferBlockSize
        }
        let padding = requirements.alignment - 1uL
        if requirements.size > uint64.MaxValue - padding {
            throw OverflowException("Vulkan memory block size overflow")
        }
        let minimumSize = requirements.size + padding
        let heap = MemoryHeap(memoryProperties, heapIndex)
        let current = heapResidentBytes[int32(heapIndex)]
        if current > heap.size {
            throw InvalidOperationException("Vulkan memory heap capacity exceeded")
        }
        let remaining = heap.size - current
        if minimumSize > remaining || remaining < baseSize {
            return minimumSize
        }
        return baseSize
    }

    private func CreateBlock(blockSize VkDeviceSize, selection VulkanMemoryTypeSelection,
        resourceClass VulkanMemoryResourceClass, dedicated bool,
        dedicatedImage VkImage, dedicatedBuffer VkBuffer) VulkanMemoryBlock {
        EnsureBlockCapacity(selection.heapIndex, blockSize)
        var dedicatedInfo = VkMemoryDedicatedAllocateInfo{
            sType: VkConstants.VK_STRUCTURE_TYPE_MEMORY_DEDICATED_ALLOCATE_INFO,
            pNext: nil,
            image: dedicatedImage,
            buffer: dedicatedBuffer,
        }
        var allocateInfo = VkMemoryAllocateInfo{
            sType: VkConstants.VK_STRUCTURE_TYPE_MEMORY_ALLOCATE_INFO,
            pNext: nil,
            allocationSize: blockSize,
            memoryTypeIndex: selection.memoryTypeIndex,
        }
        if dedicated {
            allocateInfo.pNext = *void(&dedicatedInfo)
        }
        var memory VkDeviceMemory = 0uL
        let allocateMemory = deviceDispatch.vkAllocateMemory
        let allocateResult = allocateMemory(device, &allocateInfo, nil, &memory)
        if allocateResult != VkConstants.VK_SUCCESS || memory == 0uL {
            throw InvalidOperationException("vkAllocateMemory failed")
        }
        let hostVisible = (selection.propertyFlags & uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT)) != 0u
        let hostCoherent = (selection.propertyFlags & uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_COHERENT_BIT)) != 0u
        var mapped *void = nil
        if hostVisible {
            let mapMemory = deviceDispatch.vkMapMemory
            let mapResult = mapMemory(device, memory, 0uL, VkConstants.VK_WHOLE_SIZE, 0u, *void(&mapped))
            if mapResult != VkConstants.VK_SUCCESS || mapped == nil {
                let freeMemory = deviceDispatch.vkFreeMemory
                freeMemory(device, memory, nil)
                throw InvalidOperationException("vkMapMemory failed")
            }
        }
        let block = VulkanMemoryBlock{
            memory: memory,
            size: blockSize,
            memoryTypeIndex: selection.memoryTypeIndex,
            heapIndex: selection.heapIndex,
            propertyFlags: selection.propertyFlags,
            hostVisible: hostVisible,
            hostCoherent: hostCoherent,
            resourceClass: resourceClass,
            dedicated: dedicated,
            mapped: mapped,
            allocationCount: 0u,
        }
        blocks[blockCount] = block
        blockCount = blockCount + 1
        residentBytes += blockSize
        residentAllocations++
        heapResidentBytes[int32(selection.heapIndex)] += blockSize
        return block
    }

    private func TryFindOffset(block VulkanMemoryBlock, size VkDeviceSize,
        alignment VkDeviceSize, ref offset VkDeviceSize) bool {
        var cursor VkDeviceSize = 0uL
        while true {
            let remainder = cursor % alignment
            let padding = if remainder == 0uL { 0uL } else { alignment - remainder }
            if cursor > uint64.MaxValue - padding {
                return false
            }
            let aligned = cursor + padding
            if aligned > block.size {
                return false
            }
            var overlapping bool = false
            var overlapEnd VkDeviceSize = aligned
            var nextStart VkDeviceSize = uint64.MaxValue
            var nextEnd VkDeviceSize = uint64.MaxValue
            var allocationIndex int32 = 0
            while allocationIndex < activeCount {
                if let allocation = activeAllocations[allocationIndex] {
                    if allocation.state != VulkanMemoryAllocationState.Empty
                        && allocation.block != nil && allocation.block!! == block {
                        let allocationEnd = allocation.offset + allocation.size
                        if allocation.offset < aligned && allocationEnd > aligned {
                            overlapping = true
                            if allocationEnd > overlapEnd {
                                overlapEnd = allocationEnd
                            }
                        } else if allocation.offset >= aligned && allocation.offset < nextStart {
                            nextStart = allocation.offset
                            nextEnd = allocationEnd
                        }
                    }
                }
                allocationIndex = allocationIndex + 1
            }
            if overlapping {
                cursor = overlapEnd
            } else if nextStart == uint64.MaxValue {
                if size <= block.size - aligned {
                    offset = aligned
                    return true
                }
                return false
            } else if size <= nextStart - aligned {
                offset = aligned
                return true
            } else {
                cursor = nextEnd
            }
        }
    }

    private func InitializeAllocation(allocation VulkanMemoryAllocation,
        placement VulkanMemoryPlacement, requirements VkMemoryRequirements,
        selection VulkanMemoryTypeSelection, dedicated bool) {
        let block = placement.block!!
        allocation.memory = block.memory
        allocation.size = requirements.size
        allocation.offset = placement.offset
        allocation.memoryTypeIndex = selection.memoryTypeIndex
        allocation.heapIndex = selection.heapIndex
        allocation.propertyFlags = selection.propertyFlags
        allocation.hostVisible = block.hostVisible
        allocation.hostCoherent = block.hostCoherent
        allocation.dedicated = dedicated
        allocation.mapped = nil
        allocation.block = block
        allocation.activeIndex = -1
        allocation.blockFresh = placement.newBlock
        allocation.pendingBind = true
        allocation.state = VulkanMemoryAllocationState.Live
    }

    private func TrackLive(allocation VulkanMemoryAllocation) {
        let block = allocation.block!!
        block.allocationCount++
        allocation.activeIndex = activeCount
        activeAllocations[activeCount] = allocation
        activeCount = activeCount + 1
        liveBytes += allocation.size
        liveAllocations++
    }

    private func EnsureActiveCapacity() {
        if activeCount < activeAllocations.Length {
            return
        }
        let maximum = int32(MaxTrackedAllocations)
        if activeAllocations.Length >= maximum {
            throw InvalidOperationException("Vulkan tracked allocation limit reached")
        }
        var nextCapacity = activeAllocations.Length * 2
        if nextCapacity > maximum {
            nextCapacity = maximum
        }
        let expanded = [nextCapacity]VulkanMemoryAllocation?
        Array.Copy(activeAllocations, expanded, activeAllocations.Length)
        activeAllocations = expanded
    }

    private func EnsureBlockMetadataCapacity() {
        let maximum = int32(maxAllocationCount)
        if blockCount < blocks.Length {
            return
        }
        if blocks.Length >= maximum {
            throw InvalidOperationException("Vulkan memory block tracking limit reached")
        }
        var nextCapacity = blocks.Length * 2
        if nextCapacity > maximum {
            nextCapacity = maximum
        }
        let expanded = [nextCapacity]VulkanMemoryBlock?
        Array.Copy(blocks, expanded, blocks.Length)
        blocks = expanded
    }

    private func RemoveActive(allocation VulkanMemoryAllocation) {
        let activeIndex = allocation.activeIndex
        if activeIndex < 0 || activeIndex >= activeCount {
            return
        }
        let lastIndex = activeCount - 1
        if activeIndex != lastIndex {
            let moved = activeAllocations[lastIndex]!!
            activeAllocations[activeIndex] = moved
            moved.activeIndex = activeIndex
        }
        activeAllocations[lastIndex] = nil
        activeCount = lastIndex
        allocation.activeIndex = -1
    }

    private func RemoveBlock(block VulkanMemoryBlock) {
        var blockIndex int32 = 0
        while blockIndex < blockCount {
            if let candidate = blocks[blockIndex] {
                if candidate == block {
                    if block.mapped != nil {
                        let unmapMemory = deviceDispatch.vkUnmapMemory
                        unmapMemory(device, block.memory)
                        block.mapped = nil
                    }
                    if block.memory != 0uL {
                        let freeMemory = deviceDispatch.vkFreeMemory
                        freeMemory(device, block.memory, nil)
                        block.memory = 0uL
                    }
                    block.allocationCount = 0u
                    heapResidentBytes[int32(block.heapIndex)] -= block.size
                    residentBytes -= block.size
                    residentAllocations--
                    let lastIndex = blockCount - 1
                    if blockIndex != lastIndex {
                        blocks[blockIndex] = blocks[lastIndex]
                    }
                    blocks[lastIndex] = nil
                    blockCount = lastIndex
                    return
                }
            }
            blockIndex = blockIndex + 1
        }
    }

    private func TrimEmptyPooledBlocks(block VulkanMemoryBlock) {
        var blockIndex int32 = 0
        while blockIndex < blockCount {
            if let candidate = blocks[blockIndex] {
                if candidate != block
                    && !candidate.dedicated
                    && candidate.memoryTypeIndex == block.memoryTypeIndex
                    && candidate.resourceClass == block.resourceClass
                    && candidate.allocationCount == 0u {
                    RemoveBlock(candidate)
                    continue
                }
            }
            blockIndex = blockIndex + 1
        }
    }

    private func EnsureLiveCapacity(size VkDeviceSize) {
        if size > uint64.MaxValue - liveBytes
            || size > uint64.MaxValue - retiredBytes {
            throw OverflowException("Vulkan memory counter overflow")
        }
    }

    private func EnsureBlockCapacity(heapIndex uint32, blockSize VkDeviceSize) {
        if residentAllocations >= maxAllocationCount {
            throw InvalidOperationException("Vulkan memory allocation count limit reached")
        }
        if heapIndex >= memoryProperties.memoryHeapCount {
            throw InvalidOperationException("Vulkan memory allocation references an invalid heap")
        }
        let heap = MemoryHeap(memoryProperties, heapIndex)
        let current = heapResidentBytes[int32(heapIndex)]
        if blockSize > heap.size || current > heap.size - blockSize {
            throw InvalidOperationException("Vulkan memory heap capacity exceeded")
        }
        if residentBytes > uint64.MaxValue - blockSize {
            throw OverflowException("Vulkan resident memory counter overflow")
        }
        EnsureBlockMetadataCapacity()
    }

    private func EnsureUsable(allocation VulkanMemoryAllocation) {
        if allocation.state != VulkanMemoryAllocationState.Live || allocation.memory == 0uL {
            throw InvalidOperationException("Vulkan memory allocation is not live")
        }
    }

    private func EnsureOpen() {
        if disposed {
            throw ObjectDisposedException("VulkanMemoryAllocator")
        }
    }

    private func ResetAllocation(allocation VulkanMemoryAllocation) {
        allocation.memory = 0uL
        allocation.size = 0uL
        allocation.offset = 0uL
        allocation.memoryTypeIndex = 0u
        allocation.heapIndex = 0u
        allocation.propertyFlags = 0u
        allocation.hostVisible = false
        allocation.hostCoherent = false
        allocation.dedicated = false
        allocation.mapped = nil
        allocation.block = nil
        allocation.activeIndex = -1
        allocation.blockFresh = false
        allocation.pendingBind = false
        allocation.state = VulkanMemoryAllocationState.Empty
    }

    private func PointerAt(basePointer *void, offset VkDeviceSize) *void {
        return *void(nint(basePointer) + nint(offset))
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
