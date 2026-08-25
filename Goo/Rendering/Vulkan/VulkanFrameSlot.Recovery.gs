package Goo

internal unsafe partial class VulkanFrameSlot {
  internal func DisposeAfterDeviceLoss() {
    if disposed {
      return
    }
    disposed = true
    acquirePrepared = false
    acquired = false
    submitPrepared = false
    inFlight = false
    submissionFailed = true
    if acquireSemaphore != 0uL {
      let staleSemaphore = acquireSemaphore
      acquireSemaphore = 0uL
      let destroySemaphore = dispatch.vkDestroySemaphore
      try { destroySemaphore(device, staleSemaphore, nil) } catch (cleanup Exception) { }
      if let accounting = objectAccounting {
        try { accounting.Release() } catch (cleanup Exception) { }
      }
    }
    if submissionFence != 0uL {
      let staleFence = submissionFence
      submissionFence = 0uL
      let destroyFence = dispatch.vkDestroyFence
      try { destroyFence(device, staleFence, nil) } catch (cleanup Exception) { }
      if let accounting = objectAccounting {
        try { accounting.Release() } catch (cleanup Exception) { }
      }
    }
  }
}
