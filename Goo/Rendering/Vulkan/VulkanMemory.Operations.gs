package Goo

import System

internal unsafe partial class VulkanMemoryAllocator : IDisposable {
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

}
