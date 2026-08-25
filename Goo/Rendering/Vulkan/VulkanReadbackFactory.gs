package Goo

import System

internal data struct VulkanReadbackResources {
  internal let Request VulkanAsyncReadback
  internal let Pool VulkanReadbackPool
}

internal class VulkanReadbackFactory {
  shared {
    internal func Create(target VulkanOffscreenTarget,
      lease VulkanSharedLease,
      generation uint64,
      resourceByteBudget VkDeviceSize) VulkanReadbackResources{
        if target == nil {
          throw ArgumentNullException("target")
        }
        if lease == nil {
          try { target.Dispose() } catch (cleanup Exception) { }
          throw ArgumentNullException("lease")
        }
        var request VulkanAsyncReadback? = nil
        var pool VulkanReadbackPool? = nil
        var adopted = false
        try {
          let createdRequest = VulkanAsyncReadback(target, lease, generation)
          request = createdRequest
          let createdPool = VulkanReadbackPool(
            target.ResourceByteSize, resourceByteBudget, nil)
          pool = createdPool
          if !createdPool.Adopt(createdRequest) {
            throw InvalidOperationException("Vulkan readback pool rejected its initial target")
          }
          adopted = true
          return VulkanReadbackResources{
            Request: createdRequest,
            Pool: createdPool,
          }
        } catch (error Exception) {
          if adopted {
            if let currentPool = pool {
              try { currentPool.Dispose() } catch (cleanup Exception) { }
            }
          } else if let currentRequest = request {
            try { currentRequest.Dispose() } catch (cleanup Exception) { }
            if let currentPool = pool {
              try { currentPool.Dispose() } catch (cleanup Exception) { }
            }
          } else {
            try { target.Dispose() } catch (cleanup Exception) { }
            try { lease.Release() } catch (cleanup Exception) { }
          }
          throw error
        }
      }
  }
}
