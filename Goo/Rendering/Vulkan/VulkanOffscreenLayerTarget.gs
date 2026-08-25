package Goo

import System

internal unsafe sealed class VulkanOffscreenLayerTarget : IDisposable {
    private let device VkDevice
    private let dispatch VkDeviceDispatch
    private let allocator VulkanMemoryAllocator
    private let objectAccounting VulkanObjectAccounting?
    private let targetFormat VkFormat
    private let extent VkExtent2D
    private let descriptorSet VkDescriptorSet
    private let sampler VkSampler
    private var image VkImage
    private var imageView VkImageView
    private var allocation VulkanMemoryAllocation? = nil
    private var bytes VkDeviceSize
    private var imageLayout VkImageLayout
    private var leaseInitialLayout VkImageLayout
    private var leaseActive bool
    private var lastUseSerial uint64
    private var imageAccounted bool
    private var imageViewAccounted bool
    private var disposed bool

    internal prop Image VkImage { get { return image } }
    internal prop ImageView VkImageView { get { return imageView } }
    internal prop DescriptorSet VkDescriptorSet { get { return descriptorSet } }
    internal prop Extent VkExtent2D { get { return extent } }
    internal prop Bytes VkDeviceSize { get { return bytes } }
    internal prop LastUseSerial uint64 { get { return lastUseSerial } }
    internal prop ImageLayout VkImageLayout { get { return imageLayout } }

    internal init(
        nativeDevice VkDevice,
        nativeDispatch VkDeviceDispatch,
        nativeAllocator VulkanMemoryAllocator,
        targetExtent VkExtent2D,
        colorFormat VkFormat,
        nativeDescriptorSet VkDescriptorSet,
        nativeSampler VkSampler,
        nativeObjectAccounting VulkanObjectAccounting?) {
        if nativeDevice == nint(0) {
            throw ArgumentException("Vulkan layer target device is invalid")
        }
        if targetExtent.width == 0u || targetExtent.height == 0u {
            throw ArgumentOutOfRangeException("targetExtent")
        }
        if colorFormat != VkConstants.VK_FORMAT_R8G8B8A8_SRGB
            && colorFormat != VkConstants.VK_FORMAT_B8G8R8A8_SRGB {
            throw ArgumentException("Vulkan layer target requires an sRGB RGBA format", "colorFormat")
        }
        if nativeDescriptorSet == 0uL || nativeSampler == 0uL {
            throw ArgumentException("Vulkan layer target descriptor is invalid")
        }
        device = nativeDevice
        dispatch = nativeDispatch
        allocator = nativeAllocator
        objectAccounting = nativeObjectAccounting
        targetFormat = colorFormat
        extent = targetExtent
        descriptorSet = nativeDescriptorSet
        sampler = nativeSampler
        imageLayout = VkConstants.VK_IMAGE_LAYOUT_UNDEFINED
        leaseInitialLayout = imageLayout
        leaseActive = false
        lastUseSerial = 0uL
        bytes = 0uL
        disposed = false
        Create()
    }

    internal func BeginLease() {
        EnsureOpen()
        if leaseActive {
            return
        }
        leaseInitialLayout = imageLayout
        leaseActive = true
    }

    internal func RestoreLeaseLayout() {
        if leaseActive {
            imageLayout = leaseInitialLayout
            leaseActive = false
        }
    }

    internal func CompleteLease(submissionSerial uint64) {
        EnsureOpen()
        if submissionSerial == 0uL {
            throw ArgumentOutOfRangeException("submissionSerial")
        }
        lastUseSerial = submissionSerial
        leaseActive = false
    }

    internal func TransitionToColorAttachment(commandBuffer VkCommandBuffer) {
        EnsureOpen()
        if commandBuffer == nint(0) {
            throw ArgumentException("commandBuffer")
        }
        if imageLayout == VkConstants.VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL {
            return
        }
        var srcStageMask VkPipelineStageFlags2
        var srcAccessMask VkAccessFlags2
        if imageLayout == VkConstants.VK_IMAGE_LAYOUT_UNDEFINED {
            srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_TOP_OF_PIPE_BIT
            srcAccessMask = VkConstants.VK_ACCESS_2_NONE
        } else if imageLayout == VkConstants.VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL {
            srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT
            srcAccessMask = VkConstants.VK_ACCESS_2_SHADER_SAMPLED_READ_BIT
        } else if imageLayout == VkConstants.VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL {
            srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_TRANSFER_BIT
            srcAccessMask = VkConstants.VK_ACCESS_2_TRANSFER_READ_BIT
        } else {
            throw InvalidOperationException("Vulkan layer target layout is invalid")
        }
        VulkanTransitions.RecordImage(
            commandBuffer,
            dispatch.vkCmdPipelineBarrier2,
            image,
            VulkanTransitions.ColorSubresourceRange(),
            imageLayout,
            VkConstants.VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL,
            srcStageMask,
            srcAccessMask,
            VkConstants.VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT,
            VkConstants.VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT)
        imageLayout = VkConstants.VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL
    }

    internal func TransitionToTransferSource(commandBuffer VkCommandBuffer) {
        EnsureOpen()
        if commandBuffer == nint(0) {
            throw ArgumentException("commandBuffer")
        }
        if imageLayout == VkConstants.VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL {
            return
        }
        var srcStageMask VkPipelineStageFlags2
        var srcAccessMask VkAccessFlags2
        if imageLayout == VkConstants.VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL {
            srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT
            srcAccessMask = VkConstants.VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT
        } else if imageLayout == VkConstants.VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL {
            srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT
            srcAccessMask = VkConstants.VK_ACCESS_2_SHADER_SAMPLED_READ_BIT
        } else {
            throw InvalidOperationException("Vulkan layer target cannot become a transfer source")
        }
        VulkanTransitions.RecordImage(
            commandBuffer,
            dispatch.vkCmdPipelineBarrier2,
            image,
            VulkanTransitions.ColorSubresourceRange(),
            imageLayout,
            VkConstants.VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL,
            srcStageMask,
            srcAccessMask,
            VkConstants.VK_PIPELINE_STAGE_2_TRANSFER_BIT,
            VkConstants.VK_ACCESS_2_TRANSFER_READ_BIT)
        imageLayout = VkConstants.VK_IMAGE_LAYOUT_TRANSFER_SRC_OPTIMAL
    }

    internal func TransitionToTransferDestination(commandBuffer VkCommandBuffer) {
        EnsureOpen()
        if commandBuffer == nint(0) {
            throw ArgumentException("commandBuffer")
        }
        if imageLayout == VkConstants.VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL {
            return
        }
        var srcStageMask VkPipelineStageFlags2
        var srcAccessMask VkAccessFlags2
        if imageLayout == VkConstants.VK_IMAGE_LAYOUT_UNDEFINED {
            srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_TOP_OF_PIPE_BIT
            srcAccessMask = VkConstants.VK_ACCESS_2_NONE
        } else if imageLayout == VkConstants.VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL {
            srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT
            srcAccessMask = VkConstants.VK_ACCESS_2_SHADER_SAMPLED_READ_BIT
        } else {
            throw InvalidOperationException("Vulkan layer target cannot become a transfer destination")
        }
        VulkanTransitions.RecordImage(
            commandBuffer,
            dispatch.vkCmdPipelineBarrier2,
            image,
            VulkanTransitions.ColorSubresourceRange(),
            imageLayout,
            VkConstants.VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL,
            srcStageMask,
            srcAccessMask,
            VkConstants.VK_PIPELINE_STAGE_2_TRANSFER_BIT,
            VkConstants.VK_ACCESS_2_TRANSFER_WRITE_BIT)
        imageLayout = VkConstants.VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL
    }

    internal func TransitionToShaderRead(commandBuffer VkCommandBuffer) {
        EnsureOpen()
        if commandBuffer == nint(0) {
            throw ArgumentException("commandBuffer")
        }
        if imageLayout == VkConstants.VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL {
            return
        }
        if imageLayout != VkConstants.VK_IMAGE_LAYOUT_COLOR_ATTACHMENT_OPTIMAL
            && imageLayout != VkConstants.VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL {
            throw InvalidOperationException("Vulkan layer target is not a color attachment")
        }
        var srcStageMask VkPipelineStageFlags2
        var srcAccessMask VkAccessFlags2
        if imageLayout == VkConstants.VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL {
            srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_TRANSFER_BIT
            srcAccessMask = VkConstants.VK_ACCESS_2_TRANSFER_WRITE_BIT
        } else {
            srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_COLOR_ATTACHMENT_OUTPUT_BIT
            srcAccessMask = VkConstants.VK_ACCESS_2_COLOR_ATTACHMENT_WRITE_BIT
        }
        VulkanTransitions.RecordImage(
            commandBuffer,
            dispatch.vkCmdPipelineBarrier2,
            image,
            VulkanTransitions.ColorSubresourceRange(),
            imageLayout,
            VkConstants.VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL,
            srcStageMask,
            srcAccessMask,
            VkConstants.VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT,
            VkConstants.VK_ACCESS_2_SHADER_SAMPLED_READ_BIT)
        imageLayout = VkConstants.VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL
    }

    internal func AbandonAfterDeviceLoss() {
        if disposed {
            return
        }
        if imageView != 0uL {
            let staleImageView = imageView
            imageView = 0uL
            let destroyImageView = dispatch.vkDestroyImageView
            try { destroyImageView(device, staleImageView, nil) } catch (cleanup Exception) { }
        }
        if image != 0uL {
            let staleImage = image
            image = 0uL
            let destroyImage = dispatch.vkDestroyImage
            try { destroyImage(device, staleImage, nil) } catch (cleanup Exception) { }
        }
        if allocation != nil {
            try { allocator.Release(allocation!!) } catch (cleanup Exception) { }
            allocation = nil
        }
        bytes = 0uL
        if imageAccounted {
            if let accounting = objectAccounting {
                try { accounting.Release() } catch (cleanup Exception) { }
            }
        }
        if imageViewAccounted {
            if let accounting = objectAccounting {
                try { accounting.Release() } catch (cleanup Exception) { }
            }
        }
        imageAccounted = false
        imageViewAccounted = false
        leaseActive = false
        disposed = true
    }

    public func Dispose() {
        if disposed {
            return
        }
        if imageView != 0uL {
            let destroyImageView = dispatch.vkDestroyImageView
            destroyImageView(device, imageView, nil)
            imageView = 0uL
            if imageViewAccounted {
                if let accounting = objectAccounting { accounting.Release() }
                imageViewAccounted = false
            }
        }
        if image != 0uL {
            let destroyImage = dispatch.vkDestroyImage
            destroyImage(device, image, nil)
            image = 0uL
            if imageAccounted {
                if let accounting = objectAccounting { accounting.Release() }
                imageAccounted = false
            }
        }
        if allocation != nil {
            allocator.Release(allocation!!)
            allocation = nil
        }
        bytes = 0uL
        disposed = true
    }

    private func Create() {
        try {
            let creation = VulkanImageFactory.Create2D(
                device,
                dispatch,
                allocator,
                objectAccounting,
                extent,
                targetFormat,
                uint32(VkConstants.VK_IMAGE_USAGE_COLOR_ATTACHMENT_BIT)
                    | uint32(VkConstants.VK_IMAGE_USAGE_SAMPLED_BIT)
                    | uint32(VkConstants.VK_IMAGE_USAGE_TRANSFER_SRC_BIT)
                    | uint32(VkConstants.VK_IMAGE_USAGE_TRANSFER_DST_BIT),
                uint32(VkConstants.VK_IMAGE_ASPECT_COLOR_BIT),
                VulkanMemoryPolicy.DeviceLocalRequiredPreferred)
            image = creation.Image
            imageView = creation.ImageView
            allocation = creation.Allocation
            bytes = creation.Allocation.size
            imageAccounted = objectAccounting != nil
            imageViewAccounted = objectAccounting != nil
            UpdateDescriptor()
        } catch (error Exception) {
            Dispose()
            throw error
        }
    }

    private func UpdateDescriptor() {
        VulkanDescriptorFactory.WriteCombinedImageSampler(
            device,
            dispatch,
            descriptorSet,
            0u,
            sampler,
            imageView,
            VkConstants.VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL)
    }

    private func EnsureOpen() {
        if disposed {
            throw ObjectDisposedException("VulkanOffscreenLayerTarget")
        }
    }

    deinit {
        Dispose()
    }
}

internal unsafe sealed class VulkanOffscreenLayerPool : IDisposable {
    private const MaxTargetCount int32 = 16
    private const IdleRetirementSerials uint64 = 2uL
    private let device VkDevice
    private let dispatch VkDeviceDispatch
    private let allocator VulkanMemoryAllocator
    private let objectAccounting VulkanObjectAccounting?
    private let diagnostics VulkanDiagnostics?
    private let targetFormat VkFormat
    private let descriptorLayout VkDescriptorSetLayout
    private let targets []VulkanOffscreenLayerTarget?
    private let leased []bool
    private let inFrame []bool
    private let descriptorSets []VkDescriptorSet
    private var descriptorPool VkDescriptorPool = 0uL
    private var sampler VkSampler = 0uL
    private let byteBudget VkDeviceSize
    private var residentBytes VkDeviceSize
    private var descriptorPoolAccounted bool
    private var samplerAccounted bool
    private var descriptorSetsAccounted int32
    private var lastCollectedSerial uint64
    private var disposed bool

    internal prop ResidentBytes VkDeviceSize { get { return residentBytes } }
    internal prop ByteBudget VkDeviceSize { get { return byteBudget } }
    internal prop LiveTargetCount int32 {
        get {
            var result int32 = 0
            var index int32 = 0
            while index < targets.Length {
                if targets[index] != nil { result++ }
                index++
            }
            return result
        }
    }
    internal prop LeasedTargetCount int32 {
        get {
            var result int32 = 0
            var index int32 = 0
            while index < leased.Length {
                if leased[index] { result++ }
                index++
            }
            return result
        }
    }

    internal init(
        nativeDevice VkDevice,
        nativeDispatch VkDeviceDispatch,
        nativeAllocator VulkanMemoryAllocator,
        nativeDescriptorLayout VkDescriptorSetLayout,
        colorFormat VkFormat,
        nativeObjectAccounting VulkanObjectAccounting?,
        maximumBytes VkDeviceSize,
        nativeDiagnostics VulkanDiagnostics?) {
        if nativeDevice == nint(0) {
            throw ArgumentException("Vulkan layer pool device is invalid")
        }
        if nativeDescriptorLayout == 0uL {
            throw ArgumentException("Vulkan layer pool descriptor layout is invalid")
        }
        if maximumBytes == 0uL {
            throw ArgumentOutOfRangeException("maximumBytes")
        }
        device = nativeDevice
        dispatch = nativeDispatch
        allocator = nativeAllocator
        descriptorLayout = nativeDescriptorLayout
        targetFormat = colorFormat
        objectAccounting = nativeObjectAccounting
        diagnostics = nativeDiagnostics
        byteBudget = maximumBytes
        residentBytes = 0uL
        lastCollectedSerial = 0uL
        disposed = false
        targets = [MaxTargetCount]VulkanOffscreenLayerTarget?
        leased = [MaxTargetCount]bool
        inFrame = [MaxTargetCount]bool
        descriptorSets = [MaxTargetCount]VkDescriptorSet
        var descriptorIndex int32 = 0
        while descriptorIndex < MaxTargetCount {
            descriptorSets[descriptorIndex] = 0uL
            descriptorIndex++
        }
        descriptorPoolAccounted = false
        samplerAccounted = false
        descriptorSetsAccounted = 0
        PublishStats()
        try {
            CreateDescriptorResources()
            sampler = CreateSampler()
        } catch (error Exception) {
            try { Dispose() } catch (cleanup Exception) { }
            throw error
        }
    }

    internal func Acquire(width uint32, height uint32, completedSerial uint64) VulkanOffscreenLayerTarget {
        EnsureOpen()
        if width == 0u || height == 0u {
            throw ArgumentOutOfRangeException("extent")
        }
        Collect(completedSerial)
        var index int32 = 0
        while index < targets.Length {
            if !leased[index] {
                if let target = targets[index] {
                    let extent = target.Extent
                    let sameCommand = inFrame[index]
                    if extent.width == width && extent.height == height
                        && (sameCommand || target.LastUseSerial <= completedSerial) {
                        leased[index] = true
                        if !sameCommand {
                            inFrame[index] = true
                            target.BeginLease()
                        }
                        RecordReuse(target, sameCommand)
                        PublishStats()
                        return target
                    }
                }
            }
            index++
        }
        if uint64(width) > uint64.MaxValue / 4uL {
            RecordFailure(uint64(width), uint64(height))
            throw OverflowException("Vulkan layer target byte size overflow")
        }
        let rowBytes = uint64(width) * 4uL
        if uint64(height) > uint64.MaxValue / rowBytes {
            RecordFailure(uint64(width), uint64(height))
            throw OverflowException("Vulkan layer target byte size overflow")
        }
        let estimatedBytes = rowBytes * uint64(height)
        let needsPressure = NeedsCapacity(estimatedBytes)
        if needsPressure {
            RecordPressure(estimatedBytes, completedSerial)
            EvictIdle(estimatedBytes, completedSerial)
        }
        if NeedsBudgetPressure(estimatedBytes) {
            RecordPressureFailure(estimatedBytes, residentBytes)
            RecordFailure(estimatedBytes, residentBytes)
            throw InvalidOperationException("Vulkan layer pool byte budget exhausted")
        }
        index = FindEmptySlot()
        if index < 0 {
            RecordPressureFailure(estimatedBytes, uint64(LiveTargetCount))
            RecordFailure(estimatedBytes, uint64(LiveTargetCount))
            throw InvalidOperationException("Vulkan layer pool target capacity exhausted")
        }
        var target VulkanOffscreenLayerTarget? = nil
        try {
            target = VulkanOffscreenLayerTarget(device, dispatch, allocator,
                VkExtent2D{ width: width, height: height }, targetFormat, descriptorSets[index],
                sampler, objectAccounting)
        } catch (error Exception) {
            RecordFailure(estimatedBytes, uint64(index))
            throw error
        }
        guard let created = target else {
            RecordFailure(estimatedBytes, uint64(index))
            throw InvalidOperationException("Vulkan layer target creation returned null")
        }
        if created.Bytes <= byteBudget && NeedsBudgetPressure(created.Bytes) {
            RecordPressure(created.Bytes, completedSerial)
            EvictIdle(created.Bytes, completedSerial)
        }
        if created.Bytes > byteBudget || NeedsBudgetPressure(created.Bytes) {
            created.Dispose()
            let available = residentBytes <= byteBudget ? byteBudget - residentBytes : 0uL
            RecordPressureFailure(uint64(created.Bytes), uint64(available))
            RecordFailure(uint64(created.Bytes), residentBytes)
            throw InvalidOperationException("Vulkan layer target exceeds byte budget")
        }
        targets[index] = created
        leased[index] = true
        inFrame[index] = true
        residentBytes = residentBytes + created.Bytes
        created.BeginLease()
        RecordCreate(created)
        PublishStats()
        return created
    }

    internal func ReleaseForReuse(target VulkanOffscreenLayerTarget) {
        EnsureOpen()
        if target == nil {
            throw ArgumentNullException("target")
        }
        var index int32 = 0
        while index < targets.Length {
            if targets[index] == target {
                if !inFrame[index] || !leased[index] {
                    throw InvalidOperationException("Vulkan layer target is not actively leased")
                }
                leased[index] = false
                PublishStats()
                return
            }
            index++
        }
        throw ArgumentException("target", "target")
    }

    internal func Collect(completedSerial uint64) {
        EnsureOpen()
        let selectedSerial = completedSerial < lastCollectedSerial
            ? lastCollectedSerial
            : completedSerial
        lastCollectedSerial = selectedSerial
        var index int32 = 0
        while index < targets.Length {
            if !leased[index] && !inFrame[index] {
                if let target = targets[index] {
                    let lastUse = target.LastUseSerial
                    let retire = lastUse == 0uL
                        || (selectedSerial >= lastUse
                            && selectedSerial - lastUse >= IdleRetirementSerials)
                    if retire {
                        RetireTarget(index, target)
                    }
                }
            }
            index++
        }
        PublishStats()
    }

    internal func MarkSubmitted(submissionSerial uint64) {
        EnsureOpen()
        if submissionSerial == 0uL {
            throw ArgumentOutOfRangeException("submissionSerial")
        }
        var index int32 = 0
        while index < targets.Length {
            if inFrame[index] {
                if let target = targets[index] {
                    target.CompleteLease(submissionSerial)
                }
                leased[index] = false
                inFrame[index] = false
            }
            index++
        }
        PublishStats()
    }

    internal func Abort() {
        if disposed {
            return
        }
        var index int32 = 0
        while index < targets.Length {
            if inFrame[index] {
                if let target = targets[index] {
                    target.RestoreLeaseLayout()
                }
                leased[index] = false
                inFrame[index] = false
            }
            index++
        }
        PublishStats()
    }

    internal func AbandonAfterDeviceLoss() {
        if disposed {
            return
        }
        var index int32 = 0
        while index < targets.Length {
            if let target = targets[index] {
                target.AbandonAfterDeviceLoss()
                targets[index] = nil
            }
            leased[index] = false
            inFrame[index] = false
            index++
        }
        residentBytes = 0uL
        PublishStats()
        if sampler != 0uL {
            let destroySampler = dispatch.vkDestroySampler
            destroySampler(device, sampler, nil)
            sampler = 0uL
            if samplerAccounted {
                if let accounting = objectAccounting {
                    try { accounting.Release() } catch (cleanup Exception) { }
                }
                samplerAccounted = false
            }
        }
        if descriptorPool != 0uL {
            let destroyPool = dispatch.vkDestroyDescriptorPool
            destroyPool(device, descriptorPool, nil)
            descriptorPool = 0uL
            if descriptorPoolAccounted {
                if let accounting = objectAccounting {
                    try { accounting.Release() } catch (cleanup Exception) { }
                }
                descriptorPoolAccounted = false
            }
        }
        if descriptorSetsAccounted > 0 {
            if let accounting = objectAccounting {
                var descriptorIndex int32 = 0
                while descriptorIndex < descriptorSetsAccounted {
                    try { accounting.Release() } catch (cleanup Exception) { }
                    descriptorIndex++
                }
            }
            descriptorSetsAccounted = 0
        }
        var abandonedDescriptorIndex int32 = 0
        while abandonedDescriptorIndex < descriptorSets.Length {
            descriptorSets[abandonedDescriptorIndex] = 0uL
            abandonedDescriptorIndex++
        }
        disposed = true
    }

    public func Dispose() {
        if disposed {
            return
        }
        Abort()
        var index int32 = 0
        while index < targets.Length {
            if let target = targets[index] {
                target.Dispose()
                targets[index] = nil
            }
            index++
        }
        residentBytes = 0uL
        if sampler != 0uL {
            let destroySampler = dispatch.vkDestroySampler
            destroySampler(device, sampler, nil)
            sampler = 0uL
            if samplerAccounted {
                if let accounting = objectAccounting { accounting.Release() }
                samplerAccounted = false
            }
        }
        if descriptorPool != 0uL {
            let destroyPool = dispatch.vkDestroyDescriptorPool
            destroyPool(device, descriptorPool, nil)
            descriptorPool = 0uL
            if descriptorPoolAccounted {
                if let accounting = objectAccounting { accounting.Release() }
                descriptorPoolAccounted = false
            }
        }
        if descriptorSetsAccounted > 0 {
            if let accounting = objectAccounting {
                var descriptorIndex int32 = 0
                while descriptorIndex < descriptorSetsAccounted {
                    accounting.Release()
                    descriptorIndex++
                }
            }
        }
        descriptorSetsAccounted = 0
        var disposedDescriptorIndex int32 = 0
        while disposedDescriptorIndex < descriptorSets.Length {
            descriptorSets[disposedDescriptorIndex] = 0uL
            disposedDescriptorIndex++
        }
        PublishStats()
        disposed = true
    }

    private func CreateDescriptorResources() {
        var poolSize = VkDescriptorPoolSize{}
        poolSize._type = VkConstants.VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER
        poolSize.descriptorCount = uint32(MaxTargetCount)
        let layouts *VkDescriptorSetLayout = stackalloc [MaxTargetCount]VkDescriptorSetLayout
        var index int32 = 0
        while index < MaxTargetCount {
            layouts[index] = descriptorLayout
            index++
        }
        let creation = VulkanDescriptorFactory.CreatePoolAndAllocate(
            device,
            dispatch,
            objectAccounting,
            &poolSize,
            1u,
            layouts,
            uint32(MaxTargetCount),
            &descriptorSets[0])
        descriptorPool = creation.Pool
        if objectAccounting != nil {
            descriptorPoolAccounted = true
            descriptorSetsAccounted = int32(creation.SetCount)
        }
    }

    private func CreateSampler() VkSampler {
        var samplerInfo = VkSamplerCreateInfo{}
        samplerInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SAMPLER_CREATE_INFO
        samplerInfo.magFilter = VkConstants.VK_FILTER_LINEAR
        samplerInfo.minFilter = VkConstants.VK_FILTER_LINEAR
        samplerInfo.mipmapMode = VkConstants.VK_SAMPLER_MIPMAP_MODE_NEAREST
        samplerInfo.addressModeU = VkConstants.VK_SAMPLER_ADDRESS_MODE_CLAMP_TO_EDGE
        samplerInfo.addressModeV = VkConstants.VK_SAMPLER_ADDRESS_MODE_CLAMP_TO_EDGE
        samplerInfo.addressModeW = VkConstants.VK_SAMPLER_ADDRESS_MODE_CLAMP_TO_EDGE
        samplerInfo.maxLod = 1.0F
        samplerInfo.borderColor = VkConstants.VK_BORDER_COLOR_FLOAT_TRANSPARENT_BLACK
        var result VkSampler = 0uL
        let createSampler = dispatch.vkCreateSampler
        let createResult = createSampler(device, &samplerInfo, nil, &result)
        if createResult != VkConstants.VK_SUCCESS || result == 0uL {
            throw InvalidOperationException("vkCreateSampler failed for Vulkan layer pool")
        }
        if let accounting = objectAccounting {
            try {
                accounting.Allocate()
                samplerAccounted = true
            } catch (error Exception) {
                let destroySampler = dispatch.vkDestroySampler
                destroySampler(device, result, nil)
                throw error
            }
        }
        return result
    }

    private func FindEmptySlot() int32 {
        var index int32 = 0
        while index < targets.Length {
            if targets[index] == nil { return index }
            index++
        }
        return -1
    }

    private func EvictIdle(required VkDeviceSize, completedSerial uint64) {
        var index int32 = 0
        while NeedsCapacity(required) {
            var evicted = false
            index = 0
        while index < targets.Length {
                if !leased[index] && !inFrame[index] {
                    if let target = targets[index] {
                        if target.LastUseSerial <= completedSerial {
                            RetireTarget(index, target)
                            evicted = true
                            break
                        }
                    }
                }
                index++
            }
            if !evicted {
                return
            }
        }
    }

    internal func RecordLayerPass(value0 uint64, value1 uint64) {
        if let current = diagnostics {
            current.AddLayerPoolPass(1uL)
            try {
                current.Record(0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL,
                    VulkanDiagnosticEventIds.LayerPass,
                    VulkanDiagnosticCategories.FramePlan, 0uL, 0, value0, value1)
            } catch (cleanup Exception) { }
        }
    }

    internal func RecordLayerComposite(value0 uint64, value1 uint64) {
        if let current = diagnostics {
            current.AddLayerPoolComposite(1uL)
            try {
                current.Record(0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL,
                    VulkanDiagnosticEventIds.LayerComposite,
                    VulkanDiagnosticCategories.FramePlan, 0uL, 0, value0, value1)
            } catch (cleanup Exception) { }
        }
    }

    private func RecordCreate(target VulkanOffscreenLayerTarget) {
        if let current = diagnostics {
            current.AddLayerPoolCreate(1uL)
            try {
                current.Record(0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL,
                    VulkanDiagnosticEventIds.LayerCreate,
                    VulkanDiagnosticCategories.Resource, 0uL, 0,
                    uint64(target.Extent.width), uint64(target.Extent.height))
            } catch (cleanup Exception) { }
        }
    }

    private func RecordReuse(target VulkanOffscreenLayerTarget, sameCommand bool) {
        if let current = diagnostics {
            current.AddLayerPoolReuse(1uL)
            let eventId = if sameCommand {
                VulkanDiagnosticEventIds.LayerCommandReuse
            } else {
                VulkanDiagnosticEventIds.LayerReuse
            }
            try {
                current.Record(0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL,
                    eventId,
                    VulkanDiagnosticCategories.Resource, 0uL, 0,
                    uint64(target.Extent.width), uint64(target.Extent.height))
            } catch (cleanup Exception) { }
        }
    }

    private func RecordPressure(required VkDeviceSize, completedSerial uint64) {
        if let current = diagnostics {
            current.AddLayerPoolPressure(1uL)
            try {
                current.Record(0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, completedSerial, 0uL, 0uL,
                    VulkanDiagnosticEventIds.LayerPressure,
                    VulkanDiagnosticCategories.Resource, 0uL, 0,
                    uint64(required), uint64(residentBytes))
            } catch (cleanup Exception) { }
        }
    }

    private func RecordPressureFailure(required VkDeviceSize, available VkDeviceSize) {
        if let current = diagnostics {
            current.AddLayerPoolPressureFailure(1uL)
            try {
                current.Record(0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL,
                    VulkanDiagnosticEventIds.LayerPressure,
                    VulkanDiagnosticCategories.Resource, 1uL, 0,
                    uint64(required), uint64(available))
            } catch (cleanup Exception) { }
        }
    }

    private func RecordFailure(value0 uint64, value1 uint64) {
        if let current = diagnostics {
            current.AddLayerPoolFailure(1uL)
            try {
                current.Record(0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL,
                    VulkanDiagnosticEventIds.LayerFailure,
                    VulkanDiagnosticCategories.Resource, 1uL, 0, value0, value1)
            } catch (cleanup Exception) { }
        }
    }

    private func RetireTarget(index int32, target VulkanOffscreenLayerTarget) {
        if residentBytes >= target.Bytes {
            residentBytes = residentBytes - target.Bytes
        } else {
            residentBytes = 0uL
        }
        target.Dispose()
        targets[index] = nil
        leased[index] = false
        inFrame[index] = false
        if let current = diagnostics {
            current.AddLayerPoolEviction(1uL)
            try {
                current.Record(0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL,
                    VulkanDiagnosticEventIds.LayerEvict,
                    VulkanDiagnosticCategories.Resource, 0uL, 0,
                    uint64(index), uint64(target.Bytes))
            } catch (cleanup Exception) { }
        }
    }

    private func PublishStats() {
        if let current = diagnostics {
            current.SetLayerPoolStats(uint64(byteBudget), uint64(residentBytes),
                uint64(LiveTargetCount), uint64(LeasedTargetCount))
        }
    }

    private func NeedsBudgetPressure(required VkDeviceSize) bool {
        if residentBytes > byteBudget {
            return true
        }
        return required > byteBudget - residentBytes
    }

    private func NeedsCapacity(required VkDeviceSize) bool {
        return NeedsBudgetPressure(required) || FindEmptySlot() < 0
    }

    private func EnsureOpen() {
        if disposed {
            throw ObjectDisposedException("VulkanOffscreenLayerPool")
        }
    }

    deinit {
        Dispose()
    }
}
