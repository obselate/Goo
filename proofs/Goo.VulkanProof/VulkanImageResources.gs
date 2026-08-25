package Goo.VulkanProof

import System
import Goo.Vulkan.Generated

internal enum VulkanImageSamplerMode {
  Nearest;
  Linear;
}

internal enum VulkanImageResourceState {
  Empty;
  Resident;
  UploadPending;
  Retiring;
}

internal enum VulkanImageDescriptorState {
  Empty;
  Bound;
  Retiring;
}

internal data struct VulkanImageDescriptorBinding {
  var State VulkanImageDescriptorState
  var ImageId ResourceId
  var SamplerId ResourceId
  var SamplerMode VulkanImageSamplerMode
  var Generation uint64
  var Slot int32
  var DescriptorToken uint64
  var RetireFence uint64
}

internal data struct VulkanImageResourceEntry {
  var Id ResourceId
  var Width uint32
  var Height uint32
  var Bytes VkDeviceSize
  var SamplerId ResourceId
  var SamplerMode VulkanImageSamplerMode
  var Cacheable bool
  var State VulkanImageResourceState
  var Image VkImage
  var ImageView VkImageView
  var Allocation VulkanMemoryAllocation?
  var NearestDescriptor VulkanImageDescriptorBinding
  var LinearDescriptor VulkanImageDescriptorBinding
  var ImageLayout VkImageLayout
  var UploadedVersion uint64
  var Upload VulkanUploadReservation
  var UploadRecorded bool
  var UploadSubmitted bool
  var UploadCommandBuffer VkCommandBuffer
  var UploadFence uint64
  var PendingRetire bool
  var LastUseFence uint64
  var RetireFence uint64
  var LastTouch uint64
}

internal data struct VulkanImageResourceStats {
  var Generation uint64
  var Capacity int32
  var LiveCount int32
  var ResidentBytes VkDeviceSize
  var ResidentByteBudget VkDeviceSize
  var LiveObjectCount uint64
  var DescriptorCapacity int32
  var BoundDescriptorCount int32
  var RetiringDescriptorCount int32
  var HighestCompletedFence uint64
  var Upload VulkanUploadRingStats
  var Registry VulkanResourceRegistryStats
}

internal data struct VulkanImageResourceLookup {
  var Found bool
  var Renderable bool
  var Id ResourceId
  var Image VkImage
  var ImageView VkImageView
  var DescriptorSet VkDescriptorSet
  var Width uint32
  var Height uint32
  var SamplerId ResourceId
  var SamplerMode VulkanImageSamplerMode
  var UploadedVersion uint64
}

internal unsafe class VulkanImageResources : IDisposable {
  private const MaxCapacity int32 = 1048576
  private const MaxStagingBytes VkDeviceSize = 4294967295uL

  private let device VkDevice
  private let dispatch VkDeviceDispatch
  private let allocator VulkanMemoryAllocator
  private let registry VulkanResourceRegistry
  private let capacity int32
  private let descriptorCapacity int32
  private let residentByteBudget VkDeviceSize
  private let entries []VulkanImageResourceEntry
  private let logicalRecords []VulkanLogicalResource
  private let descriptorSets []VkDescriptorSet
  private let descriptorLayouts []VkDescriptorSetLayout
  private let poolSizes []VkDescriptorPoolSize
  private let uploadRing VulkanUploadRing
  private let stagingByteCapacity VkDeviceSize
  private var stagingBuffer VkBuffer
  private var stagingAllocation VulkanMemoryAllocation? = nil
  private var descriptorPool VkDescriptorPool
  private var descriptorSetLayout VkDescriptorSetLayout
  private var nearestSampler VkSampler
  private var linearSampler VkSampler
  private var generation uint64
  private var generationLastUseFence uint64
  private var highestCompletedFence uint64
  private var nextTouch uint64
  private var liveCount int32
  private var residentBytes VkDeviceSize
  private var flushPrepared bool
  private var disposed bool

  internal prop Generation uint64{ get { return generation } }
  internal prop DescriptorSetLayout VkDescriptorSetLayout{ get { return descriptorSetLayout } }
  internal prop Stats VulkanImageResourceStats{
    get {
      return VulkanImageResourceStats{
        Generation: generation,
        Capacity: capacity,
        LiveCount: liveCount,
        ResidentBytes: residentBytes,
        ResidentByteBudget: residentByteBudget,
        LiveObjectCount: CurrentLiveObjectHandleCount(),
        DescriptorCapacity: descriptorCapacity,
        BoundDescriptorCount: CurrentBoundDescriptorCount(),
        RetiringDescriptorCount: CurrentRetiringDescriptorCount(),
        HighestCompletedFence: highestCompletedFence,
        Upload: uploadRing.Stats,
        Registry: registry.Stats,
      }
    }
  }

  internal init(
    nativeDevice VkDevice,
    nativeDispatch VkDeviceDispatch,
    nativeAllocator VulkanMemoryAllocator,
    imageCapacity int32,
    logicalResourceCapacity int32,
    maximumResidentBytes VkDeviceSize,
    maximumLogicalSourceBytes VkDeviceSize,
    stagingBytes VkDeviceSize,
    uploadRangeCapacity int32,
    initialGeneration uint64) {
      if nativeDevice == nint(0) {
        throw ArgumentException("Vulkan device is null", "nativeDevice")
      }
      if imageCapacity <= 0 || imageCapacity > MaxCapacity {
        throw ArgumentOutOfRangeException("imageCapacity")
      }
      if logicalResourceCapacity < imageCapacity || logicalResourceCapacity > MaxCapacity {
        throw ArgumentOutOfRangeException("logicalResourceCapacity")
      }
      if maximumResidentBytes == 0uL {
        throw ArgumentOutOfRangeException("maximumResidentBytes")
      }
      if maximumLogicalSourceBytes == 0uL {
        throw ArgumentOutOfRangeException("maximumLogicalSourceBytes")
      }
      if stagingBytes == 0uL || stagingBytes > MaxStagingBytes {
        throw ArgumentOutOfRangeException("stagingBytes")
      }
      if uploadRangeCapacity <= 0 || uploadRangeCapacity > MaxCapacity {
        throw ArgumentOutOfRangeException("uploadRangeCapacity")
      }
      if initialGeneration == 0uL {
        throw ArgumentOutOfRangeException("initialGeneration")
      }
      device = nativeDevice
      dispatch = nativeDispatch
      allocator = nativeAllocator
      capacity = imageCapacity
      residentByteBudget = maximumResidentBytes
      stagingByteCapacity = stagingBytes
      entries = [imageCapacity]VulkanImageResourceEntry
      logicalRecords = [logicalResourceCapacity]VulkanLogicalResource
      descriptorCapacity = imageCapacity + imageCapacity
      descriptorSets = [descriptorCapacity]VkDescriptorSet
      descriptorLayouts = [descriptorCapacity]VkDescriptorSetLayout
      poolSizes = [1]VkDescriptorPoolSize
      generation = initialGeneration
      highestCompletedFence = 0uL
      generationLastUseFence = 0uL
      nextTouch = 1uL
      registry = VulkanResourceRegistry(logicalResourceCapacity, maximumResidentBytes,
        maximumLogicalSourceBytes)
      uploadRing = VulkanUploadRing(stagingBytes, uploadRangeCapacity, initialGeneration)
      registry.SetGpuGeneration(initialGeneration)
      flushPrepared = false
      try {
        CreateGeneration()
        CreateStagingBuffer()
      } catch (error Exception) {
        DestroyGeneration()
        DestroyStagingBuffer()
        uploadRing.Dispose()
        registry.Dispose()
        throw error
      }
    }

  internal func SetGeneration(nextGeneration uint64, completedFence uint64) {
    EnsureOpen()
    if nextGeneration == 0uL || nextGeneration <= generation {
      throw ArgumentOutOfRangeException("nextGeneration")
    }
    Collect(completedFence)
    if highestCompletedFence < generationLastUseFence {
      throw InvalidOperationException("Vulkan image generation is still in use")
    }
    var entryIndex int32 = 0
    while entryIndex < entries.Length {
      let entry = entries[entryIndex]
      if entry.State == VulkanImageResourceState.Retiring
        && entry.RetireFence > highestCompletedFence{
          throw InvalidOperationException("Vulkan image retirement is still in flight")
        }
      entryIndex++
    }
    let uploadStats = uploadRing.Stats
    if uploadStats.ActiveRanges != 0 || uploadStats.SubmittedRanges != 0 {
      throw InvalidOperationException("Vulkan image uploads are still in flight")
    }
    try {
      DestroyGpuResources()
      registry.SetGpuGeneration(nextGeneration)
      uploadRing.SetGeneration(nextGeneration)
      generation = nextGeneration
      generationLastUseFence = 0uL
      highestCompletedFence = 0uL
      flushPrepared = false
      CreateGeneration()
    } catch (error Exception) {
      DestroyGeneration()
      DestroyStagingBuffer()
      uploadRing.Dispose()
      registry.Dispose()
      disposed = true
      throw error
    }
  }

  internal func RegisterImage(
    id ResourceId,
    width uint32,
    height uint32,
    source VulkanResourceSource,
    cacheable bool,
    samplerId ResourceId,
    samplerMode VulkanImageSamplerMode) VulkanImageResourceLookup{
      EnsureOpen()
      ValidateImageId(id)
      ValidateSamplerId(samplerId)
      let bytes = ImageBytes(width, height)
      if bytes > VkDeviceSize(Int32.MaxValue) {
        throw ArgumentOutOfRangeException("width")
      }
      if source.Bytes != bytes || source.Version != id.Version {
        throw ArgumentException("Vulkan image source does not match image extent", "source")
      }
      let existingIndex = FindLogicalIndex(id)
      if existingIndex >= 0 {
        var existing = entries[existingIndex]
        if existing.State == VulkanImageResourceState.Resident
          || existing.State == VulkanImageResourceState.UploadPending{
            if existing.Id.Version == id.Version {
              EnsureExactMetadata(existing, id, width, height, source, cacheable, samplerId, samplerMode)
              registry.Register(id, bytes, source, cacheable)
              existing.SamplerMode = samplerMode
              existing.LastTouch = TouchValue()
              entries[existingIndex] = existing
              return Lookup(existingIndex, samplerId, samplerMode)
            }
            throw InvalidOperationException("Vulkan image version is still resident")
          }
        if existing.State == VulkanImageResourceState.Retiring {
          throw InvalidOperationException("Vulkan image version is retiring")
        }
      }
      EnsureResidentCapacity(bytes)
      let index = if existingIndex >= 0 { existingIndex } else { FindEmptyIndex() }
      let priorLogical = if existingIndex < 0 { CaptureLogical(id) } else { nil }
      CreateImage(index, id, width, height, bytes, source, cacheable, samplerId, samplerMode, priorLogical)
      return Lookup(index, samplerId, samplerMode)
    }

  internal func QueueUpload(id ResourceId, premultipliedSourceBytes * uint8,
    byteCount VkDeviceSize, expectedGeneration uint64) bool{
      EnsureOpen()
      ValidateGeneration(expectedGeneration)
      ValidateImageId(id)
      if premultipliedSourceBytes == nil {
        throw ArgumentNullException("premultipliedSourceBytes")
      }
      let index = FindExactIndex(id)
      if index < 0 {
        throw InvalidOperationException("Vulkan image is not registered")
      }
      var entry = entries[index]
      if entry.PendingRetire {
        throw InvalidOperationException("Vulkan image is pending retirement")
      }
      if entry.State == VulkanImageResourceState.Retiring {
        throw InvalidOperationException("Vulkan image is retiring")
      }
      if entry.State == VulkanImageResourceState.Empty || entry.Image == 0uL {
        throw InvalidOperationException("Vulkan image is not resident")
      }
      if byteCount != entry.Bytes || byteCount > VkDeviceSize(Int32.MaxValue) {
        throw ArgumentOutOfRangeException("byteCount")
      }
      if (byteCount % 4uL) != 0uL {
        throw ArgumentOutOfRangeException("byteCount")
      }
      if entry.UploadedVersion == id.Version || entry.Upload.Succeeded {
        return false
      }
      let reservation = uploadRing.Reserve(id, id.Version, byteCount, 4uL)
      if !reservation.Succeeded {
        throw InvalidOperationException("Vulkan upload ring has no available range")
      }
      let destination = *uint8(nint(stagingAllocation!!.mapped) + nint(reservation.Offset))
      try {
        var byteIndex int32 = 0
        while byteIndex < int32(byteCount) {
          let alpha = premultipliedSourceBytes[byteIndex + 3]
          if alpha == uint8(255) {
            destination[byteIndex] = premultipliedSourceBytes[byteIndex]
            destination[byteIndex + 1] = premultipliedSourceBytes[byteIndex + 1]
            destination[byteIndex + 2] = premultipliedSourceBytes[byteIndex + 2]
          } else if alpha == uint8(0) {
            destination[byteIndex] = uint8(0)
            destination[byteIndex + 1] = uint8(0)
            destination[byteIndex + 2] = uint8(0)
          } else {
            destination[byteIndex] = Unpremultiply(premultipliedSourceBytes[byteIndex], alpha)
            destination[byteIndex + 1] = Unpremultiply(premultipliedSourceBytes[byteIndex + 1], alpha)
            destination[byteIndex + 2] = Unpremultiply(premultipliedSourceBytes[byteIndex + 2], alpha)
          }
          destination[byteIndex + 3] = alpha
          byteIndex += 4
        }
      } catch (error Exception) {
        if !uploadRing.Cancel(reservation) {
          throw InvalidOperationException("Vulkan image upload reservation rollback failed")
        }
        uploadRing.Collect(highestCompletedFence)
        throw error
      }
      entry.State = VulkanImageResourceState.UploadPending
      entry.Upload = reservation
      entry.UploadRecorded = false
      entry.UploadSubmitted = false
      entry.UploadCommandBuffer = 0uL
      entry.UploadFence = 0uL
      entry.PendingRetire = false
      flushPrepared = false
      entries[index] = entry
      return true
    }

  internal func RecordUploads(commandBuffer VkCommandBuffer, expectedGeneration uint64) int32 {
    EnsureOpen()
    ValidateGeneration(expectedGeneration)
    if commandBuffer == nint(0) {
      throw ArgumentException("Command buffer is null", "commandBuffer")
    }
    var recorded int32 = 0
    var index int32 = 0
    while index < entries.Length {
      var entry = entries[index]
      if entry.State == VulkanImageResourceState.UploadPending
        && entry.Upload.Succeeded && !entry.UploadSubmitted{
          if entry.UploadRecorded {
            if entry.UploadCommandBuffer != commandBuffer {
              throw InvalidOperationException("Vulkan image upload is recorded into another command buffer")
            }
            index++
            continue
          }
          if entry.UploadCommandBuffer != 0uL {
            throw InvalidOperationException("Vulkan image upload must be aborted before recording again")
          }
          try {
            RecordUpload(commandBuffer, entry)
          } catch (error Exception) {
            if !uploadRing.Cancel(entry.Upload) {
              throw InvalidOperationException("Vulkan image upload reservation rollback failed")
            }
            entry.State = VulkanImageResourceState.Resident
            entry.Upload = VulkanUploadReservation{}
            entry.UploadRecorded = false
            entry.UploadSubmitted = false
            entry.UploadCommandBuffer = 0uL
            entry.UploadFence = 0uL
            entry.PendingRetire = false
            entries[index] = entry
            uploadRing.Collect(highestCompletedFence)
            flushPrepared = false
            throw error
          }
          entry.UploadCommandBuffer = commandBuffer
          entry.UploadRecorded = true
          entries[index] = entry
          recorded++
        }
      index++
    }
    return recorded
  }

  internal func FlushBeforeSubmit() VkResult {
    EnsureOpen()
    if stagingAllocation == nil {
      return VkConstants.VK_SUCCESS
    }
    var flushed bool = false
    var index int32 = 0
    while index < entries.Length {
      let entry = entries[index]
      if entry.State == VulkanImageResourceState.UploadPending
        && entry.Upload.Succeeded && !entry.UploadSubmitted{
          let result = allocator.FlushBeforeSubmit(stagingAllocation!!,
            entry.Upload.Offset, entry.Upload.Size)
          if result != VkConstants.VK_SUCCESS {
            flushPrepared = false
            return result
          }
          flushed = true
        }
      index = index + 1
    }
    flushPrepared = flushed
    return VkConstants.VK_SUCCESS
  }

  internal func AbortUploads(commandBuffer VkCommandBuffer, expectedGeneration uint64) int32 {
    EnsureOpen()
    ValidateGeneration(expectedGeneration)
    if commandBuffer == nint(0) {
      throw ArgumentException("Command buffer is null", "commandBuffer")
    }
    var aborted int32 = 0
    var index int32 = 0
    while index < entries.Length {
      let entry = entries[index]
      if entry.State == VulkanImageResourceState.UploadPending
        && entry.Upload.Succeeded && !entry.UploadSubmitted
        && entry.UploadCommandBuffer != 0uL
        && entry.UploadCommandBuffer != commandBuffer{
          throw InvalidOperationException("Vulkan image upload belongs to another command buffer")
        }
      index++
    }
    index = 0
    while index < entries.Length {
      var entry = entries[index]
      if entry.State == VulkanImageResourceState.UploadPending
        && entry.Upload.Succeeded && !entry.UploadSubmitted
        && entry.UploadCommandBuffer == commandBuffer{
          if !uploadRing.Cancel(entry.Upload) {
            throw InvalidOperationException("Vulkan image upload reservation is stale")
          }
          entry.State = VulkanImageResourceState.Resident
          entry.Upload = VulkanUploadReservation{}
          entry.UploadRecorded = false
          entry.UploadSubmitted = false
          entry.UploadCommandBuffer = 0uL
          entry.UploadFence = 0uL
          entry.PendingRetire = false
          entries[index] = entry
          aborted++
        }
      index++
    }
    uploadRing.Collect(highestCompletedFence)
    flushPrepared = false
    return aborted
  }

  internal func AbortUnrecordedUploads(expectedGeneration uint64) int32 {
    EnsureOpen()
    ValidateGeneration(expectedGeneration)
    var index int32 = 0
    while index < entries.Length {
      let entry = entries[index]
      if entry.State == VulkanImageResourceState.UploadPending
        && entry.Upload.Succeeded && !entry.UploadSubmitted
        && (entry.UploadRecorded || entry.UploadCommandBuffer != 0uL) {
          throw InvalidOperationException("Vulkan image upload commands are recorded")
        }
      index++
    }
    var aborted int32 = 0
    index = 0
    while index < entries.Length {
      var entry = entries[index]
      if entry.State == VulkanImageResourceState.UploadPending
        && entry.Upload.Succeeded && !entry.UploadSubmitted
        && !entry.UploadRecorded && entry.UploadCommandBuffer == 0uL {
          if !uploadRing.Cancel(entry.Upload) {
            throw InvalidOperationException("Vulkan image upload reservation is stale")
          }
          entry.State = VulkanImageResourceState.Resident
          entry.Upload = VulkanUploadReservation{}
          entry.UploadRecorded = false
          entry.UploadSubmitted = false
          entry.UploadCommandBuffer = 0uL
          entry.UploadFence = 0uL
          entry.PendingRetire = false
          entries[index] = entry
          aborted++
        }
      index++
    }
    uploadRing.Collect(highestCompletedFence)
    flushPrepared = false
    return aborted
  }

  internal func ValidateUploadSubmission(
    commandBuffer VkCommandBuffer,
    fence uint64,
    expectedGeneration uint64) int32{
      EnsureOpen()
      ValidateGeneration(expectedGeneration)
      if commandBuffer == nint(0) {
        throw ArgumentException("Command buffer is null", "commandBuffer")
      }
      if fence == 0uL {
        throw ArgumentOutOfRangeException("fence")
      }
      var index int32 = 0
      var tracked int32 = 0
      while index < entries.Length {
        let entry = entries[index]
        if entry.State == VulkanImageResourceState.UploadPending
          && entry.Upload.Succeeded{
            if entry.UploadSubmitted {
              if entry.UploadCommandBuffer != commandBuffer {
                index++
                continue
              }
              if !entry.UploadRecorded
                || entry.UploadFence != fence
                || !uploadRing.IsSubmitted(entry.Upload, fence) {
                  throw InvalidOperationException("Vulkan image upload submission identity is invalid")
                }
            } else {
              if !entry.UploadRecorded || entry.UploadCommandBuffer == 0uL {
                throw InvalidOperationException("Vulkan image upload is not recorded")
              }
              if entry.UploadCommandBuffer != commandBuffer || entry.UploadFence != 0uL {
                throw InvalidOperationException("Vulkan image upload is recorded into another submission")
              }
              if !uploadRing.CanMarkSubmitted(entry.Upload, fence) {
                throw InvalidOperationException("Vulkan image upload range is not submit-ready")
              }
            }
            tracked++
          }
        index++
      }
      return tracked
    }

  internal func MarkSubmitted(
    commandBuffer VkCommandBuffer,
    fence uint64,
    expectedGeneration uint64) int32{
      let tracked = ValidateUploadSubmission(commandBuffer, fence, expectedGeneration)
      if tracked == 0 {
        return 0
      }
      var pending int32 = 0
      var index int32 = 0
      while index < entries.Length {
        let entry = entries[index]
        if entry.State == VulkanImageResourceState.UploadPending
          && entry.Upload.Succeeded{
            if entry.UploadSubmitted {
              if entry.UploadCommandBuffer != commandBuffer {
                index++
                continue
              }
              if !uploadRing.IsSubmitted(entry.Upload, fence) {
                throw InvalidOperationException("Vulkan image upload submission identity is invalid")
              }
            } else {
              if !uploadRing.CanMarkSubmitted(entry.Upload, fence) {
                throw InvalidOperationException("Vulkan image upload range is not submit-ready")
              }
              pending++
            }
          }
        index++
      }
      if pending != 0 && !flushPrepared {
        throw InvalidOperationException("Vulkan image uploads must be flushed before submit")
      }
      index = 0
      while index < entries.Length {
        var entry = entries[index]
        if entry.State == VulkanImageResourceState.UploadPending
          && entry.Upload.Succeeded && !entry.UploadSubmitted
          && entry.UploadRecorded && entry.UploadCommandBuffer == commandBuffer{
            if !uploadRing.MarkSubmitted(entry.Upload, fence) {
              throw InvalidOperationException("Vulkan upload reservation is stale")
            }
            entry.UploadSubmitted = true
            entry.UploadFence = fence
            entry.ImageLayout = VkConstants.VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL
            entries[index] = entry
          }
        index++
      }
      if pending != 0 {
        flushPrepared = false
      }
      return tracked
    }

  internal func MarkUsed(id ResourceId, expectedGeneration uint64, fence uint64) {
    EnsureOpen()
    ValidateGeneration(expectedGeneration)
    if fence == 0uL {
      throw ArgumentOutOfRangeException("fence")
    }
    let index = FindExactIndex(id)
    if index < 0 {
      throw InvalidOperationException("Vulkan image is not registered")
    }
    if entries[index].PendingRetire {
      throw InvalidOperationException("Vulkan image is pending retirement")
    }
    registry.MarkUsed(id, expectedGeneration, fence)
    var entry = entries[index]
    if fence > entry.LastUseFence {
      entry.LastUseFence = fence
    }
    if fence > generationLastUseFence {
      generationLastUseFence = fence
    }
    entry.LastTouch = TouchValue()
    entries[index] = entry
  }

  internal func Retire(id ResourceId, expectedGeneration uint64, fence uint64) bool {
    EnsureOpen()
    ValidateGeneration(expectedGeneration)
    let index = FindExactIndex(id)
    if index < 0 {
      return false
    }
    var entry = entries[index]
    if entry.PendingRetire {
      if entry.State == VulkanImageResourceState.UploadPending
        && entry.UploadSubmitted{
          let safeFence = RetireFence(entry, fence)
          if safeFence > entry.RetireFence {
            entry.RetireFence = safeFence
            entries[index] = entry
            if safeFence > generationLastUseFence {
              generationLastUseFence = safeFence
            }
          }
          return true
        }
      throw InvalidOperationException("Vulkan image is pending retirement")
    }
    if entry.State == VulkanImageResourceState.UploadPending
      && entry.UploadSubmitted{
        let safeFence = RetireFence(entry, fence)
        entry.PendingRetire = true
        entry.RetireFence = safeFence
        entries[index] = entry
        if safeFence > generationLastUseFence {
          generationLastUseFence = safeFence
        }
        return true
      }
    if entry.State == VulkanImageResourceState.Retiring {
      let safeFence = RetireFence(entry, fence)
      if safeFence > entry.RetireFence {
        let retiredEntry = RetireDescriptors(entry, safeFence)
        if !registry.Retire(id, safeFence) {
          throw InvalidOperationException("Vulkan image registry entry is not resident")
        }
        entry = retiredEntry
        entry.RetireFence = safeFence
        entries[index] = entry
        if safeFence > generationLastUseFence {
          generationLastUseFence = safeFence
        }
      }
      return true
    }
    if entry.Upload.Succeeded && entry.UploadRecorded && !entry.UploadSubmitted {
      throw InvalidOperationException("Vulkan image upload commands are recorded")
    }
    let cancelUpload = entry.Upload.Succeeded && !entry.UploadSubmitted
    let safeFence = RetireFence(entry, fence)
    let registryLookup = registry.Lookup(id, generation)
    if !registryLookup.Found {
      throw InvalidOperationException("Vulkan image registry entry is stale")
    }
    let retiredEntry = RetireDescriptors(entry, safeFence)
    if cancelUpload {
      if !uploadRing.Cancel(entry.Upload) {
        throw InvalidOperationException("Vulkan image upload reservation is stale")
      }
    }
    if !registry.Retire(id, safeFence) {
      throw InvalidOperationException("Vulkan image registry entry is not resident")
    }
    entry = retiredEntry
    if cancelUpload {
      entry.Upload = VulkanUploadReservation{}
      entry.UploadRecorded = false
      entry.UploadSubmitted = false
      entry.UploadCommandBuffer = 0uL
      entry.UploadFence = 0uL
    }
    entry.RetireFence = safeFence
    entry.State = VulkanImageResourceState.Retiring
    entries[index] = entry
    if entry.RetireFence > generationLastUseFence {
      generationLastUseFence = entry.RetireFence
    }
    return true
  }

  internal func Collect(completedFence uint64) int32 {
    EnsureOpen()
    if completedFence > highestCompletedFence {
      highestCompletedFence = completedFence
    }
    let effectiveCompletedFence = highestCompletedFence
    var completedUploads int32 = 0
    var index int32 = 0
    while index < entries.Length {
      var entry = entries[index]
      if entry.State == VulkanImageResourceState.UploadPending
        && entry.UploadSubmitted && entry.UploadFence <= effectiveCompletedFence{
          let pendingRetire = entry.PendingRetire
          var retiredEntry = entry
          if pendingRetire {
            retiredEntry = RetireDescriptors(entry, entry.RetireFence)
          }
          let registryLookup = registry.Lookup(entry.Id, generation)
          if !registryLookup.Found {
            throw InvalidOperationException("Vulkan image registry entry is stale")
          }
          registry.MarkUploaded(entry.Id, generation)
          if pendingRetire {
            if !registry.Retire(entry.Id, entry.RetireFence) {
              throw InvalidOperationException("Vulkan image registry entry is not resident")
            }
            entry = retiredEntry
          }
          entry.UploadedVersion = entry.Id.Version
          entry.Upload = VulkanUploadReservation{}
          entry.UploadRecorded = false
          entry.UploadSubmitted = false
          entry.UploadCommandBuffer = 0uL
          entry.UploadFence = 0uL
          entry.State = VulkanImageResourceState.Resident
          entry.LastTouch = TouchValue()
          if pendingRetire {
            entry.PendingRetire = false
            entry.State = VulkanImageResourceState.Retiring
          }
          entries[index] = entry
          completedUploads++
        }
      index++
    }
    uploadRing.Collect(effectiveCompletedFence)
    var retired int32 = 0
    index = 0
    while index < entries.Length {
      let entry = entries[index]
      if entry.State == VulkanImageResourceState.Retiring && entry.RetireFence <= effectiveCompletedFence {
        DestroyImage(index, entry)
        entries[index] = VulkanImageResourceEntry{}
        liveCount--
        residentBytes -= entry.Bytes
        retired++
      }
      index++
    }
    registry.Collect(effectiveCompletedFence)
    return completedUploads + retired
  }

  internal func CopyLogicalResources(destination []VulkanLogicalResource) int32 {
    EnsureOpen()
    return registry.CopyLogicalResources(destination)
  }

  internal func EvictLeastRecentlyUsed() bool {
    EnsureOpen()
    var candidate int32 = -1
    var candidateTouch uint64 = uint64.MaxValue
    var index int32 = 0
    while index < entries.Length {
      let entry = entries[index]
      if entry.State == VulkanImageResourceState.Resident
        && entry.Cacheable
        && entry.LastUseFence <= highestCompletedFence
        && entry.LastTouch < candidateTouch{
          candidate = index
          candidateTouch = entry.LastTouch
        }
      index++
    }
    if candidate < 0 {
      return false
    }
    let id = entries[candidate].Id
    if !Retire(id, generation, highestCompletedFence) {
      return false
    }
    Collect(highestCompletedFence)
    return true
  }

  internal func Lookup(id ResourceId, expectedGeneration uint64) VulkanImageResourceLookup {
    if disposed || !id.IsValid || id.Kind != SceneResourceKind.Image
      || expectedGeneration == 0uL || expectedGeneration != generation{
        return VulkanImageResourceLookup{ Found: false }
      }
    let index = FindExactIndex(id)
    if index < 0 {
      return VulkanImageResourceLookup{ Found: false }
    }
    let entry = entries[index]
    return Lookup(index, entry.SamplerId, entry.SamplerMode)
  }

  internal func Lookup(
    id ResourceId,
    samplerId ResourceId,
    samplerMode VulkanImageSamplerMode,
    expectedGeneration uint64) VulkanImageResourceLookup{
      if disposed || !id.IsValid || id.Kind != SceneResourceKind.Image
        || !samplerId.IsValid || samplerId.Kind != SceneResourceKind.Sampler
        || expectedGeneration == 0uL || expectedGeneration != generation{
          return VulkanImageResourceLookup{ Found: false }
        }
      let index = FindExactIndex(id)
      if index < 0 {
        return VulkanImageResourceLookup{ Found: false }
      }
      return Lookup(index, samplerId, samplerMode)
    }

  internal func BindDescriptor(
    commandBuffer VkCommandBuffer,
    pipelineLayout VkPipelineLayout,
    id ResourceId,
    expectedGeneration uint64) {
      EnsureOpen()
      ValidateGeneration(expectedGeneration)
      let index = FindExactIndex(id)
      if index < 0 {
        throw InvalidOperationException("Vulkan image is not registered")
      }
      let entry = entries[index]
      BindDescriptor(commandBuffer, pipelineLayout, id, entry.SamplerId, entry.SamplerMode,
        expectedGeneration)
    }

  internal func BindDescriptor(
    commandBuffer VkCommandBuffer,
    pipelineLayout VkPipelineLayout,
    id ResourceId,
    samplerId ResourceId,
    samplerMode VulkanImageSamplerMode,
    expectedGeneration uint64) {
      EnsureOpen()
      ValidateGeneration(expectedGeneration)
      ValidateSamplerId(samplerId)
      let index = FindExactIndex(id)
      if index < 0 {
        throw InvalidOperationException("Vulkan image is not registered")
      }
      let lookup = Lookup(index, samplerId, samplerMode)
      let entry = entries[index]
      let uploadCanBeConsumed = entry.State == VulkanImageResourceState.UploadPending
        && entry.Upload.Succeeded
        && entry.UploadRecorded
        && entry.UploadCommandBuffer == commandBuffer
      if !lookup.Renderable && !uploadCanBeConsumed {
        throw InvalidOperationException("Vulkan image upload is not complete")
      }
      if lookup.DescriptorSet == 0uL {
        throw InvalidOperationException("Vulkan image descriptor is stale")
      }
      var descriptorSet = lookup.DescriptorSet
      let bindDescriptorSets = dispatch.vkCmdBindDescriptorSets
      bindDescriptorSets(commandBuffer, VkConstants.VK_PIPELINE_BIND_POINT_GRAPHICS,
        pipelineLayout, 0u, 1u, &descriptorSet, 0u, nil)
    }

  public func Dispose() {
    if disposed {
      return
    }
    Collect(highestCompletedFence)
    if highestCompletedFence < generationLastUseFence {
      throw InvalidOperationException("Vulkan image resources still have in-flight work")
    }
    var index int32 = 0
    while index < entries.Length {
      let entry = entries[index]
      if entry.State == VulkanImageResourceState.UploadPending
        || entry.State == VulkanImageResourceState.Retiring
        || entry.LastUseFence > highestCompletedFence
        || entry.RetireFence > highestCompletedFence
        || (entry.UploadSubmitted && entry.UploadFence > highestCompletedFence) {
          throw InvalidOperationException("Vulkan image resources still have in-flight work")
        }
      index++
    }
    disposed = true
    DestroyGpuResources()
    DestroyStagingBuffer()
    uploadRing.Dispose()
    registry.Dispose()
    index = 0
    while index < entries.Length {
      entries[index] = VulkanImageResourceEntry{}
      index++
    }
    liveCount = 0
    residentBytes = 0uL
  }

  deinit{
    Dispose()
  }

  private func CreateGeneration() {
    var layoutBinding = VkDescriptorSetLayoutBinding{}
    layoutBinding.binding = 0u
    layoutBinding.descriptorType = VkConstants.VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER
    layoutBinding.descriptorCount = 1u
    layoutBinding.stageFlags = uint32(VkConstants.VK_SHADER_STAGE_FRAGMENT_BIT)
    var layoutInfo = VkDescriptorSetLayoutCreateInfo{}
    layoutInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DESCRIPTOR_SET_LAYOUT_CREATE_INFO
    layoutInfo.bindingCount = 1u
    layoutInfo.pBindings = &layoutBinding
    let createLayout = dispatch.vkCreateDescriptorSetLayout
    if createLayout(device, &layoutInfo, nil, &descriptorSetLayout) != VkConstants.VK_SUCCESS
      || descriptorSetLayout == 0uL {
        throw InvalidOperationException("vkCreateDescriptorSetLayout failed")
      }
    poolSizes[0] = VkDescriptorPoolSize{}
    poolSizes[0]._type = VkConstants.VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER
    poolSizes[0].descriptorCount = uint32(descriptorCapacity)
    var poolInfo = VkDescriptorPoolCreateInfo{}
    poolInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DESCRIPTOR_POOL_CREATE_INFO
    poolInfo.maxSets = uint32(descriptorCapacity)
    poolInfo.poolSizeCount = 1u
    poolInfo.pPoolSizes = &poolSizes[0]
    let createPool = dispatch.vkCreateDescriptorPool
    if createPool(device, &poolInfo, nil, &descriptorPool) != VkConstants.VK_SUCCESS
      || descriptorPool == 0uL {
        DestroyGeneration()
        throw InvalidOperationException("vkCreateDescriptorPool failed")
      }
    var descriptorIndex int32 = 0
    while descriptorIndex < descriptorCapacity {
      descriptorLayouts[descriptorIndex] = descriptorSetLayout
      descriptorIndex++
    }
    var allocateInfo = VkDescriptorSetAllocateInfo{}
    allocateInfo.sType = VkConstants.VK_STRUCTURE_TYPE_DESCRIPTOR_SET_ALLOCATE_INFO
    allocateInfo.descriptorPool = descriptorPool
    allocateInfo.descriptorSetCount = uint32(descriptorCapacity)
    allocateInfo.pSetLayouts = &descriptorLayouts[0]
    let allocateSets = dispatch.vkAllocateDescriptorSets
    if allocateSets(device, &allocateInfo, &descriptorSets[0]) != VkConstants.VK_SUCCESS {
      DestroyGeneration()
      throw InvalidOperationException("vkAllocateDescriptorSets failed")
    }
    nearestSampler = CreateSampler(VkConstants.VK_FILTER_NEAREST)
    linearSampler = CreateSampler(VkConstants.VK_FILTER_LINEAR)
  }

  private func CreateSampler(filter VkFilter) VkSampler {
    var samplerInfo = VkSamplerCreateInfo{}
    samplerInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SAMPLER_CREATE_INFO
    samplerInfo.magFilter = filter
    samplerInfo.minFilter = filter
    samplerInfo.mipmapMode = VkConstants.VK_SAMPLER_MIPMAP_MODE_NEAREST
    samplerInfo.addressModeU = VkConstants.VK_SAMPLER_ADDRESS_MODE_CLAMP_TO_EDGE
    samplerInfo.addressModeV = VkConstants.VK_SAMPLER_ADDRESS_MODE_CLAMP_TO_EDGE
    samplerInfo.addressModeW = VkConstants.VK_SAMPLER_ADDRESS_MODE_CLAMP_TO_EDGE
    samplerInfo.maxLod = 1.0F
    samplerInfo.borderColor = VkConstants.VK_BORDER_COLOR_FLOAT_TRANSPARENT_BLACK
    let createSampler = dispatch.vkCreateSampler
    var sampler VkSampler = 0uL
    if createSampler(device, &samplerInfo, nil, &sampler) != VkConstants.VK_SUCCESS || sampler == 0uL {
      throw InvalidOperationException("vkCreateSampler failed")
    }
    return sampler
  }

  private func CreateStagingBuffer() {
    var bufferInfo = VkBufferCreateInfo{}
    bufferInfo.sType = VkConstants.VK_STRUCTURE_TYPE_BUFFER_CREATE_INFO
    bufferInfo.size = stagingByteCapacity
    bufferInfo.usage = uint32(VkConstants.VK_BUFFER_USAGE_TRANSFER_SRC_BIT)
    bufferInfo.sharingMode = VkConstants.VK_SHARING_MODE_EXCLUSIVE
    let createBuffer = dispatch.vkCreateBuffer
    if createBuffer(device, &bufferInfo, nil, &stagingBuffer) != VkConstants.VK_SUCCESS
      || stagingBuffer == 0uL {
        throw InvalidOperationException("vkCreateBuffer failed")
      }
    stagingAllocation = allocator.AllocateBuffer(stagingBuffer,
      uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT),
      uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_COHERENT_BIT)
      | uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_CACHED_BIT))
    if allocator.Map(stagingAllocation!!) != VkConstants.VK_SUCCESS {
      throw InvalidOperationException("vkMapMemory failed")
    }
  }

  private func CreateImage(
    index int32,
    id ResourceId,
    width uint32,
    height uint32,
    bytes VkDeviceSize,
    source VulkanResourceSource,
    cacheable bool,
    samplerId ResourceId,
    samplerMode VulkanImageSamplerMode,
    priorLogical VulkanLogicalResource?) {
      EnsureDescriptorSlots(index)
      var imageInfo = VkImageCreateInfo{}
      imageInfo.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_CREATE_INFO
      imageInfo.imageType = VkConstants.VK_IMAGE_TYPE_2D
      imageInfo.format = VkConstants.VK_FORMAT_R8G8B8A8_SRGB
      imageInfo.extent = VkExtent3D{}
      imageInfo.extent.width = width
      imageInfo.extent.height = height
      imageInfo.extent.depth = 1u
      imageInfo.mipLevels = 1u
      imageInfo.arrayLayers = 1u
      imageInfo.samples = VkConstants.VK_SAMPLE_COUNT_1_BIT
      imageInfo.tiling = VkConstants.VK_IMAGE_TILING_OPTIMAL
      imageInfo.usage = uint32(VkConstants.VK_IMAGE_USAGE_TRANSFER_DST_BIT)
      | uint32(VkConstants.VK_IMAGE_USAGE_SAMPLED_BIT)
      imageInfo.sharingMode = VkConstants.VK_SHARING_MODE_EXCLUSIVE
      imageInfo.initialLayout = VkConstants.VK_IMAGE_LAYOUT_UNDEFINED
      var image VkImage = 0uL
      let createImage = dispatch.vkCreateImage
      if createImage(device, &imageInfo, nil, &image) != VkConstants.VK_SUCCESS || image == 0uL {
        throw InvalidOperationException("vkCreateImage failed")
      }
      var allocation VulkanMemoryAllocation? = nil
      var view VkImageView = 0uL
      var nearestDescriptor VulkanImageDescriptorBinding{}
      var linearDescriptor VulkanImageDescriptorBinding{}
      var registration VulkanResourceRegistration{}
      try {
        allocation = allocator.AllocateImage(image,
          uint32(VkConstants.VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT), 0u)
        var viewInfo = VkImageViewCreateInfo{}
        viewInfo.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_VIEW_CREATE_INFO
        viewInfo.image = image
        viewInfo.viewType = VkConstants.VK_IMAGE_VIEW_TYPE_2D
        viewInfo.format = VkConstants.VK_FORMAT_R8G8B8A8_SRGB
        viewInfo.components = VkComponentMapping{}
        viewInfo.components.r = VkConstants.VK_COMPONENT_SWIZZLE_IDENTITY
        viewInfo.components.g = VkConstants.VK_COMPONENT_SWIZZLE_IDENTITY
        viewInfo.components.b = VkConstants.VK_COMPONENT_SWIZZLE_IDENTITY
        viewInfo.components.a = VkConstants.VK_COMPONENT_SWIZZLE_IDENTITY
        viewInfo.subresourceRange = VkImageSubresourceRange{}
        viewInfo.subresourceRange.aspectMask = uint32(VkConstants.VK_IMAGE_ASPECT_COLOR_BIT)
        viewInfo.subresourceRange.levelCount = 1u
        viewInfo.subresourceRange.layerCount = 1u
        let createView = dispatch.vkCreateImageView
        if createView(device, &viewInfo, nil, &view) != VkConstants.VK_SUCCESS || view == 0uL {
          throw InvalidOperationException("vkCreateImageView failed")
        }
        EnsureRegistryPublication(bytes)
        registration = registry.Register(id, bytes, source, cacheable)
        nearestDescriptor = BindDescriptorSet(index, id, samplerId, view,
          VulkanImageSamplerMode.Nearest)
        linearDescriptor = BindDescriptorSet(index, id, samplerId, view,
          VulkanImageSamplerMode.Linear)
        registry.PublishGpu(id, generation, image, nearestDescriptor.Slot)
        entries[index] = VulkanImageResourceEntry{
          Id: id,
          Width: width,
          Height: height,
          Bytes: bytes,
          SamplerId: samplerId,
          SamplerMode: samplerMode,
          Cacheable: cacheable,
          State: VulkanImageResourceState.Resident,
          Image: image,
          ImageView: view,
          Allocation: allocation,
          NearestDescriptor: nearestDescriptor,
          LinearDescriptor: linearDescriptor,
          ImageLayout: VkConstants.VK_IMAGE_LAYOUT_UNDEFINED,
          UploadedVersion: 0uL,
          Upload: VulkanUploadReservation{},
          UploadRecorded: false,
          UploadSubmitted: false,
          UploadCommandBuffer: 0uL,
          UploadFence: 0uL,
          PendingRetire: false,
          LastUseFence: 0uL,
          RetireFence: 0uL,
          LastTouch: TouchValue(),
        }
        liveCount++
        residentBytes += bytes
      } catch (error Exception) {
        var rollbackSucceeded = true
        if registration.Accepted {
          rollbackSucceeded = RollbackRegistration(id, registration, priorLogical)
        }
        if view != 0uL {
          let destroyView = dispatch.vkDestroyImageView
          destroyView(device, view, nil)
        }
        let destroyImage = dispatch.vkDestroyImage
        destroyImage(device, image, nil)
        if allocation != nil {
          allocator.Release(allocation!!)
        }
        if !rollbackSucceeded {
          throw InvalidOperationException("Vulkan image registry rollback failed")
        }
        throw error
      }
    }

  private func BindDescriptorSet(
    index int32,
    id ResourceId,
    samplerId ResourceId,
    view VkImageView,
    samplerMode VulkanImageSamplerMode) VulkanImageDescriptorBinding{
      let sampler = if samplerMode == VulkanImageSamplerMode.Nearest { nearestSampler } else { linearSampler }
      let slot = DescriptorSlot(index, samplerMode)
      if slot < 0 || slot >= descriptorCapacity || descriptorSets[slot] == 0uL {
        throw InvalidOperationException("Vulkan image descriptor capacity reached")
      }
      let token = uint64(view)
      var imageInfo = VkDescriptorImageInfo{}
      imageInfo.sampler = sampler
      imageInfo.imageView = view
      imageInfo.imageLayout = VkConstants.VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL
      var write = VkWriteDescriptorSet{}
      write.sType = VkConstants.VK_STRUCTURE_TYPE_WRITE_DESCRIPTOR_SET
      write.dstSet = descriptorSets[slot]
      write.dstBinding = 0u
      write.descriptorCount = 1u
      write.descriptorType = VkConstants.VK_DESCRIPTOR_TYPE_COMBINED_IMAGE_SAMPLER
      write.pImageInfo = &imageInfo
      let update = dispatch.vkUpdateDescriptorSets
      update(device, 1u, &write, 0u, nil)
      return VulkanImageDescriptorBinding{
        State: VulkanImageDescriptorState.Bound,
        ImageId: id,
        SamplerId: samplerId,
        SamplerMode: samplerMode,
        Generation: generation,
        Slot: slot,
        DescriptorToken: token,
        RetireFence: 0uL,
      }
    }

  private func RecordUpload(commandBuffer VkCommandBuffer, entry VulkanImageResourceEntry) {
    var subresourceRange = VkImageSubresourceRange{}
    subresourceRange.aspectMask = uint32(VkConstants.VK_IMAGE_ASPECT_COLOR_BIT)
    subresourceRange.levelCount = 1u
    subresourceRange.layerCount = 1u
    var before = VkImageMemoryBarrier2{}
    before.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER_2
    if entry.ImageLayout == VkConstants.VK_IMAGE_LAYOUT_UNDEFINED {
      before.srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_TOP_OF_PIPE_BIT
      before.srcAccessMask = VkConstants.VK_ACCESS_2_NONE
    } else if entry.ImageLayout == VkConstants.VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL {
      before.srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT
      before.srcAccessMask = VkConstants.VK_ACCESS_2_SHADER_SAMPLED_READ_BIT
    } else {
      throw InvalidOperationException("Vulkan image has an unsupported layout")
    }
    before.dstStageMask = VkConstants.VK_PIPELINE_STAGE_2_COPY_BIT
    before.dstAccessMask = VkConstants.VK_ACCESS_2_TRANSFER_WRITE_BIT
    before.oldLayout = entry.ImageLayout
    before.newLayout = VkConstants.VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL
    before.srcQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
    before.dstQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
    before.image = entry.Image
    before.subresourceRange = subresourceRange
    var firstDependency = VkDependencyInfo{}
    firstDependency.sType = VkConstants.VK_STRUCTURE_TYPE_DEPENDENCY_INFO
    firstDependency.imageMemoryBarrierCount = 1u
    firstDependency.pImageMemoryBarriers = &before
    let pipelineBarrier = dispatch.vkCmdPipelineBarrier2
    pipelineBarrier(commandBuffer, &firstDependency)

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

    var after = VkImageMemoryBarrier2{}
    after.sType = VkConstants.VK_STRUCTURE_TYPE_IMAGE_MEMORY_BARRIER_2
    after.srcStageMask = VkConstants.VK_PIPELINE_STAGE_2_COPY_BIT
    after.srcAccessMask = VkConstants.VK_ACCESS_2_TRANSFER_WRITE_BIT
    after.dstStageMask = VkConstants.VK_PIPELINE_STAGE_2_FRAGMENT_SHADER_BIT
    after.dstAccessMask = VkConstants.VK_ACCESS_2_SHADER_SAMPLED_READ_BIT
    after.oldLayout = VkConstants.VK_IMAGE_LAYOUT_TRANSFER_DST_OPTIMAL
    after.newLayout = VkConstants.VK_IMAGE_LAYOUT_SHADER_READ_ONLY_OPTIMAL
    after.srcQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
    after.dstQueueFamilyIndex = VkConstants.VK_QUEUE_FAMILY_IGNORED
    after.image = entry.Image
    after.subresourceRange = subresourceRange
    var secondDependency = VkDependencyInfo{}
    secondDependency.sType = VkConstants.VK_STRUCTURE_TYPE_DEPENDENCY_INFO
    secondDependency.imageMemoryBarrierCount = 1u
    secondDependency.pImageMemoryBarriers = &after
    pipelineBarrier(commandBuffer, &secondDependency)
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
      let renderable = entry.State == VulkanImageResourceState.Resident
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
      destroyView(device, entry.ImageView, nil)
    }
    if entry.Image != 0uL {
      let destroyImage = dispatch.vkDestroyImage
      destroyImage(device, entry.Image, nil)
    }
    if entry.Allocation != nil {
      allocator.Release(entry.Allocation!!)
    }
  }

  private func DestroyGpuResources() {
    var index int32 = 0
    while index < entries.Length {
      let entry = entries[index]
      if entry.State != VulkanImageResourceState.Empty {
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
      let destroySampler = dispatch.vkDestroySampler
      destroySampler(device, nearestSampler, nil)
      nearestSampler = 0uL
    }
    if linearSampler != 0uL {
      let destroySampler = dispatch.vkDestroySampler
      destroySampler(device, linearSampler, nil)
      linearSampler = 0uL
    }
    if descriptorPool != 0uL {
      let destroyPool = dispatch.vkDestroyDescriptorPool
      destroyPool(device, descriptorPool, nil)
      descriptorPool = 0uL
    }
    if descriptorSetLayout != 0uL {
      let destroyLayout = dispatch.vkDestroyDescriptorSetLayout
      destroyLayout(device, descriptorSetLayout, nil)
      descriptorSetLayout = 0uL
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
      let destroyBuffer = dispatch.vkDestroyBuffer
      destroyBuffer(device, stagingBuffer, nil)
      stagingBuffer = 0uL
    }
    if stagingAllocation != nil {
      allocator.Release(stagingAllocation!!)
      stagingAllocation = nil
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

  private func DescriptorSlot(index int32, samplerMode VulkanImageSamplerMode) int32 {
    if index < 0 || index >= capacity {
      return -1
    }
    let modeOffset = if samplerMode == VulkanImageSamplerMode.Nearest { 0 } else { 1 }
    return index + index + modeOffset
  }

  private func EnsureDescriptorSlots(index int32) {
    let nearestSlot = DescriptorSlot(index, VulkanImageSamplerMode.Nearest)
    let linearSlot = DescriptorSlot(index, VulkanImageSamplerMode.Linear)
    if nearestSlot < 0 || nearestSlot >= descriptorCapacity
      || linearSlot < 0 || linearSlot >= descriptorCapacity
      || descriptorSets[nearestSlot] == 0uL
      || descriptorSets[linearSlot] == 0uL {
        throw InvalidOperationException("Vulkan image descriptor capacity reached")
      }
  }

  private func DescriptorFor(
    entry VulkanImageResourceEntry,
    samplerId ResourceId,
    samplerMode VulkanImageSamplerMode) VulkanImageDescriptorBinding{
      let binding = if samplerMode == VulkanImageSamplerMode.Nearest {
        entry.NearestDescriptor
      } else {
        entry.LinearDescriptor
      }
      if binding.State == VulkanImageDescriptorState.Empty
        || binding.Generation != generation
        || !SameSource(binding.ImageId, entry.Id)
        || !SameSource(binding.SamplerId, samplerId)
        || binding.SamplerMode != samplerMode
        || binding.DescriptorToken != uint64(entry.ImageView)
        || binding.Slot < 0 || binding.Slot >= descriptorCapacity
        || descriptorSets[binding.Slot] == 0uL {
          return VulkanImageDescriptorBinding{}
        }
      return binding
    }

  private func EnsureDescriptorsBound(entry VulkanImageResourceEntry) {
    let nearest = DescriptorFor(entry, entry.SamplerId, VulkanImageSamplerMode.Nearest)
    let linear = DescriptorFor(entry, entry.SamplerId, VulkanImageSamplerMode.Linear)
    if nearest.State != VulkanImageDescriptorState.Bound
      || linear.State != VulkanImageDescriptorState.Bound{
        throw InvalidOperationException("Vulkan image descriptor is stale")
      }
  }

  private func RetireDescriptors(
    entry VulkanImageResourceEntry,
    fence uint64) VulkanImageResourceEntry{
      var updated = entry
      updated.NearestDescriptor = RetireDescriptor(
        entry.NearestDescriptor, entry.Id, entry.SamplerId,
        VulkanImageSamplerMode.Nearest, entry.ImageView, fence)
      updated.LinearDescriptor = RetireDescriptor(
        entry.LinearDescriptor, entry.Id, entry.SamplerId,
        VulkanImageSamplerMode.Linear, entry.ImageView, fence)
      return updated
    }

  private func RetireDescriptor(
    binding VulkanImageDescriptorBinding,
    imageId ResourceId,
    samplerId ResourceId,
    samplerMode VulkanImageSamplerMode,
    imageView VkImageView,
    fence uint64) VulkanImageDescriptorBinding{
      if binding.State == VulkanImageDescriptorState.Empty
        || binding.Generation != generation
        || !SameSource(binding.ImageId, imageId)
        || !SameSource(binding.SamplerId, samplerId)
        || binding.SamplerMode != samplerMode
        || binding.DescriptorToken != uint64(imageView)
        || binding.Slot < 0 || binding.Slot >= descriptorCapacity
        || descriptorSets[binding.Slot] == 0uL {
          throw InvalidOperationException("Vulkan image descriptor is stale")
        }
      var updated = binding
      if binding.State == VulkanImageDescriptorState.Retiring {
        if fence > updated.RetireFence {
          updated.RetireFence = fence
        }
        return updated
      }
      if binding.State != VulkanImageDescriptorState.Bound {
        throw InvalidOperationException("Vulkan image descriptor is not bound")
      }
      updated.State = VulkanImageDescriptorState.Retiring
      updated.RetireFence = fence
      return updated
    }

  private func CurrentBoundDescriptorCount() int32 {
    var count int32 = 0
    var index int32 = 0
    while index < entries.Length {
      let entry = entries[index]
      if entry.NearestDescriptor.State == VulkanImageDescriptorState.Bound {
        count++
      }
      if entry.LinearDescriptor.State == VulkanImageDescriptorState.Bound {
        count++
      }
      index++
    }
    return count
  }

  private func CurrentRetiringDescriptorCount() int32 {
    var count int32 = 0
    var index int32 = 0
    while index < entries.Length {
      let entry = entries[index]
      if entry.NearestDescriptor.State == VulkanImageDescriptorState.Retiring {
        count++
      }
      if entry.LinearDescriptor.State == VulkanImageDescriptorState.Retiring {
        count++
      }
      index++
    }
    return count
  }

  private func SameSource(left ResourceId, right ResourceId) bool -> left.Kind == right.Kind
    && left.LogicalId == right.LogicalId
    && left.Version == right.Version

  private func SameLogical(left ResourceId, right ResourceId) bool -> left.Kind == right.Kind && left.LogicalId == right.LogicalId

  private func SameSource(entry VulkanImageResourceEntry, source VulkanResourceSource) bool {
    let registered = registry.Lookup(entry.Id, generation)
    return registered.Found
      && registered.Source.ProviderId == source.ProviderId
      && registered.Source.SourceId == source.SourceId
      && registered.Source.Version == source.Version
      && registered.Source.Bytes == source.Bytes
  }

  private func RetireFence(entry VulkanImageResourceEntry, fence uint64) uint64 {
    var safeFence = fence
    if entry.LastUseFence > safeFence {
      safeFence = entry.LastUseFence
    }
    if entry.UploadSubmitted && entry.UploadFence > safeFence {
      safeFence = entry.UploadFence
    }
    if entry.RetireFence > safeFence {
      safeFence = entry.RetireFence
    }
    return safeFence
  }

  private func TouchValue() uint64 {
    let value = nextTouch
    if nextTouch == uint64.MaxValue {
      nextTouch = 1uL
    } else {
      nextTouch++
    }
    return value
  }

  private func CurrentLiveObjectHandleCount() uint64 {
    var count uint64 = uint64(liveCount) * 2uL
    if stagingBuffer != 0uL {
      count++
    }
    if descriptorPool != 0uL {
      count += 1uL + uint64(descriptorCapacity)
    }
    if descriptorSetLayout != 0uL {
      count++
    }
    if nearestSampler != 0uL {
      count++
    }
    if linearSampler != 0uL {
      count++
    }
    return count
  }

  private func Unpremultiply(value uint8, alpha uint8) uint8 {
    let numerator = uint32(value) * 255u + uint32(alpha) / 2u
    let result = numerator / uint32(alpha)
    if result > 255u {
      return uint8(255)
    }
    return uint8(result)
  }

  private func FindLogicalIndex(id ResourceId) int32 {
    var index int32 = 0
    while index < entries.Length {
      let entry = entries[index]
      if entry.State != VulkanImageResourceState.Empty
        && entry.Id.Kind == id.Kind && entry.Id.LogicalId == id.LogicalId{
          return index
        }
      index++
    }
    return -1
  }

  private func FindExactIndex(id ResourceId) int32 {
    var index int32 = 0
    while index < entries.Length {
      let entry = entries[index]
      if entry.State != VulkanImageResourceState.Empty
        && entry.Id.Kind == id.Kind && entry.Id.LogicalId == id.LogicalId
        && entry.Id.Version == id.Version{
          return index
        }
      index++
    }
    return -1
  }

  private func ImageBytes(width uint32, height uint32) VkDeviceSize {
    if width == 0u || height == 0u {
      throw ArgumentOutOfRangeException("width")
    }
    let widthBytes = uint64(width) * 4uL
    if uint64(height) > uint64.MaxValue / widthBytes {
      throw OverflowException("Vulkan image byte size overflow")
    }
    let bytes = widthBytes * uint64(height)
    if bytes > MaxStagingBytes {
      throw ArgumentOutOfRangeException("height")
    }
    return VkDeviceSize(bytes)
  }

  private func ValidateImageId(id ResourceId) {
    if !id.IsValid || id.Kind != SceneResourceKind.Image {
      throw ArgumentException("ResourceId is not an image", "id")
    }
  }

  private func ValidateSamplerId(id ResourceId) {
    if !id.IsValid || id.Kind != SceneResourceKind.Sampler {
      throw ArgumentException("ResourceId is not a sampler", "samplerId")
    }
  }

  private func ValidateGeneration(expectedGeneration uint64) {
    if expectedGeneration == 0uL || expectedGeneration != generation {
      throw InvalidOperationException("Vulkan image generation is stale")
    }
  }

  private func EnsureOpen() {
    if disposed {
      throw ObjectDisposedException("VulkanImageResources")
    }
  }
}
