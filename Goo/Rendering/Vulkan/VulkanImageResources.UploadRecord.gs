package Goo

import System

internal unsafe partial class VulkanImageResources : IDisposable {
  private func RecordUpload(commandBuffer VkCommandBuffer, entry VulkanImageResourceEntry) {
    let subresourceRange = VulkanTransitions.ColorSubresourceRange()
    var srcStageMask VkPipelineStageFlags2
    var srcAccessMask VkAccessFlags2
    if entry.ImageLayout == VkConstants.VK_IMAGE_LAYOUT_UNDEFINED {
      srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_TOP_OF_PIPE_BIT
      srcAccessMask = VkConstants.VK_ACCESS_2_NONE
    } else if entry.ImageLayout == VkConstants.VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL {
      srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT
      srcAccessMask = VkConstants.VK_ACCESS_2_SHADER_SAMPLED_READ_BIT
    } else {
      throw InvalidOperationException("Vulkan image has an unsupported layout")
    }
    let pipelineBarrier = dispatch.vkCmdPipelineBarrier2
    VulkanTransitions.RecordImage(
      commandBuffer,
      pipelineBarrier,
      entry.Image,
      subresourceRange,
      entry.ImageLayout,
      VkConstants.VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL,
      srcStageMask,
      srcAccessMask,
      VkConstants.VK_PIPELINE_STAGE_2_COPY_BIT,
      VkConstants.VK_ACCESS_2_TRANSFER_WRITE_BIT)

    var copy = VkBufferImageCopy{}
    copy.bufferOffset = entry.Upload.Offset
    copy.bufferRowLength = 0u
    copy.bufferImageHeight = 0u
    copy.imageSubresource = VkImageSubresourceLayers{}
    copy.imageSubresource.aspectMask = uint32(VkConstants.VK_IMAGE_ASPECT_COLOR_BIT)
    copy.imageSubresource.layerCount = 1u
    copy.imageOffset = VkOffset3D{}
    copy.imageExtent = VkExtent3D{}
    copy.imageExtent.width = entry.Width
    copy.imageExtent.height = entry.Height
    copy.imageExtent.depth = 1u
    let copyBufferToImage = dispatch.vkCmdCopyBufferToImage
    copyBufferToImage(commandBuffer, stagingBuffer, entry.Image,
      VkConstants.VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL, 1u, &copy)

    VulkanTransitions.RecordImage(
      commandBuffer,
      pipelineBarrier,
      entry.Image,
      subresourceRange,
      VkConstants.VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL,
      VkConstants.VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL,
      VkConstants.VK_PIPELINE_STAGE_2_COPY_BIT,
      VkConstants.VK_ACCESS_2_TRANSFER_WRITE_BIT,
      VkConstants.VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT,
      VkConstants.VK_ACCESS_2_SHADER_SAMPLED_READ_BIT)
  }

  private func Lookup(
    index int32,
    samplerId ResourceId,
    samplerMode VulkanImageSamplerMode) VulkanImageResourceLookup{
      var entry = entries[index]
      let descriptor = DescriptorFor(entry, samplerId, samplerMode)
      let descriptorSet = if descriptor.State == VulkanImageDescriptorState.Bound
        && descriptor.Slot >= 0 && descriptor.Slot < descriptorCapacity{
          descriptorSets[descriptor.Slot]
        } else { 0uL }
      let renderable = entry.GpuPublished
        && entry.State == VulkanImageResourceState.Resident
        && entry.Image != 0uL && entry.ImageView != 0uL
        && entry.UploadedVersion == entry.Id.Version && descriptorSet != 0uL
      entry.LastTouch = TouchValue()
      entries[index] = entry
      return VulkanImageResourceLookup{
        Found: entry.State != VulkanImageResourceState.Empty,
        Renderable: renderable,
        Id: entry.Id,
        Image: entry.Image,
        ImageView: entry.ImageView,
        DescriptorSet: descriptorSet,
        Width: entry.Width,
        Height: entry.Height,
        SamplerId: samplerId,
        SamplerMode: samplerMode,
        UploadedVersion: entry.UploadedVersion,
      }
    }

  private func DestroyImage(index int32, entry VulkanImageResourceEntry) {
    if entry.ImageView != 0uL {
      let destroyView = dispatch.vkDestroyImageView
      try { destroyView(device, entry.ImageView, nil) } catch (cleanup Exception) { }
      if let accounting = objectAccounting {
        try { accounting.Release() } catch (cleanup Exception) { }
      }
    }
    if entry.Image != 0uL {
      let destroyImage = dispatch.vkDestroyImage
      try { destroyImage(device, entry.Image, nil) } catch (cleanup Exception) { }
      if let accounting = objectAccounting {
        try { accounting.Release() } catch (cleanup Exception) { }
      }
    }
    if let allocation = entry.Allocation {
      try { allocator.Release(allocation) } catch (cleanup Exception) { }
    }
  }

  private func DestroyGpuResources() {
    var index int32 = 0
    while index < entries.Length {
      let entry = entries[index]
      if entry.State != VulkanImageResourceState.Empty
        || entry.ImageView != 0uL || entry.Image != 0uL || entry.Allocation != nil {
          DestroyImage(index, entry)
          entries[index] = VulkanImageResourceEntry{}
        }
      index++
    }
    liveCount = 0
    residentBytes = 0uL
    DestroyGeneration()
  }

  private func DestroyGeneration() {
    if nearestSampler != 0uL {
      let staleSampler = nearestSampler
      nearestSampler = 0uL
      let destroySampler = dispatch.vkDestroySampler
      try { destroySampler(device, staleSampler, nil) } catch (cleanup Exception) { }
      if let accounting = objectAccounting {
        try { accounting.Release() } catch (cleanup Exception) { }
      }
    }
    if linearSampler != 0uL {
      let staleSampler = linearSampler
      linearSampler = 0uL
      let destroySampler = dispatch.vkDestroySampler
      try { destroySampler(device, staleSampler, nil) } catch (cleanup Exception) { }
      if let accounting = objectAccounting {
        try { accounting.Release() } catch (cleanup Exception) { }
      }
    }
    if descriptorPool != 0uL {
      let stalePool = descriptorPool
      let staleSetCount = trackedDescriptorSetCount
      descriptorPool = 0uL
      trackedDescriptorSetCount = 0
      let destroyPool = dispatch.vkDestroyDescriptorPool
      try { destroyPool(device, stalePool, nil) } catch (cleanup Exception) { }
      var descriptorIndex int32 = 0
      while descriptorIndex < staleSetCount {
        if let accounting = objectAccounting {
          try { accounting.Release() } catch (cleanup Exception) { }
        }
        descriptorIndex = descriptorIndex + 1
      }
      if let accounting = objectAccounting {
        try { accounting.Release() } catch (cleanup Exception) { }
      }
    }
    if descriptorSetLayout != 0uL {
      let staleLayout = descriptorSetLayout
      descriptorSetLayout = 0uL
      let destroyLayout = dispatch.vkDestroyDescriptorSetLayout
      try { destroyLayout(device, staleLayout, nil) } catch (cleanup Exception) { }
      if let accounting = objectAccounting {
        try { accounting.Release() } catch (cleanup Exception) { }
      }
    }
    var index int32 = 0
    while index < descriptorSets.Length {
      descriptorSets[index] = 0uL
      descriptorLayouts[index] = 0uL
      index++
    }
  }

  private func DestroyStagingBuffer() {
    if stagingBuffer != 0uL {
      let staleBuffer = stagingBuffer
      stagingBuffer = 0uL
      let destroyBuffer = dispatch.vkDestroyBuffer
      try { destroyBuffer(device, staleBuffer, nil) } catch (cleanup Exception) { }
      if let accounting = objectAccounting {
        try { accounting.Release() } catch (cleanup Exception) { }
      }
    }
    if let allocation = stagingAllocation {
      stagingAllocation = nil
      try { allocator.Release(allocation) } catch (cleanup Exception) { }
    }
  }

  private func FindEmptyIndex() int32 {
    var index int32 = 0
    while index < entries.Length {
      if entries[index].State == VulkanImageResourceState.Empty {
        return index
      }
      index++
    }
    return -1
  }

  private func EnsureResidentCapacity(bytes VkDeviceSize) {
    if bytes > residentByteBudget {
      throw InvalidOperationException("Vulkan image resident byte budget exceeded")
    }
    while residentBytes > residentByteBudget - bytes || FindEmptyIndex() < 0 {
      if !EvictLeastRecentlyUsed() {
        throw InvalidOperationException("Vulkan image resident capacity reached")
      }
    }
  }

  private func EnsureRegistryPublication(bytes VkDeviceSize) {
    if registry.GpuGeneration != generation {
      throw InvalidOperationException("Vulkan image registry generation is stale")
    }
    if bytes > registry.ByteBudget {
      throw InvalidOperationException("Vulkan image registry byte budget exceeded")
    }
    let registryStats = registry.Stats
    if registryStats.ResidentBytes > registry.ByteBudget - bytes {
      throw InvalidOperationException("Vulkan image registry byte budget exceeded")
    }
  }

  private func CaptureLogical(id ResourceId) VulkanLogicalResource? {
    let count = registry.CopyLogicalResources(logicalRecords)
    var index int32 = 0
    while index < count {
      let logical = logicalRecords[index]
      if SameLogical(logical.Id, id) {
        return logical
      }
      index++
    }
    return nil
  }

  private func RollbackRegistration(
    id ResourceId,
    registration VulkanResourceRegistration,
    priorLogical VulkanLogicalResource?) bool{
      if !registration.Existing {
        return registry.DropLogical(id)
      }
      if priorLogical == nil {
        return false
      }
      if !registry.DropLogical(id) {
        return false
      }
      let prior = priorLogical!!
      let restored = registry.Register(prior.Id, prior.Bytes, prior.Source, prior.Cacheable)
      return restored.Accepted && !restored.Existing
    }

  private func EnsureExactMetadata(
    entry VulkanImageResourceEntry,
    id ResourceId,
    width uint32,
    height uint32,
    source VulkanResourceSource,
    cacheable bool,
    samplerId ResourceId,
    samplerMode VulkanImageSamplerMode) {
      if entry.Id.Version != id.Version
        || entry.Width != width
        || entry.Height != height
        || entry.Bytes != source.Bytes
        || !SameSource(entry.SamplerId, samplerId)
        || entry.Cacheable != cacheable
        || !SameSource(entry.Id, id)
        || !SameSource(entry, source) {
          throw InvalidOperationException("Vulkan image metadata changed for an unchanged version")
        }
    }

}
