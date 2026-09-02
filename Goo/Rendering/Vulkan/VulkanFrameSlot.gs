package Goo

import System

internal unsafe partial class VulkanFrameSlot : IDisposable {
  private let device VkDevice
  private let dispatch VkDeviceDispatch
  private let commandBuffer VkCommandBuffer
  private let objectAccounting VulkanObjectAccounting?
  private var acquireSemaphore VkSemaphore
  private var submissionFence VkFence
  private var acquirePrepared bool
  private var acquired bool
  private var submitPrepared bool
  private var inFlight bool
  private var submissionFailed bool
  private var submissionSerial uint64
  private var lastCompletedSerial uint64
  private var globalSubmissionSerial uint64
  private var lastCompletedGlobalSubmissionSerial uint64
  private var disposed bool

  internal prop CommandBuffer VkCommandBuffer{ get -> commandBuffer }
  internal prop AcquireSemaphore VkSemaphore{ get -> acquireSemaphore }
  internal prop SubmissionFence VkFence{ get -> submissionFence }
  internal prop InFlight bool{ get -> inFlight }
  internal prop SubmissionSerial uint64{ get -> submissionSerial }
  internal prop NextSubmissionSerial uint64{ get -> submissionSerial + 1uL }
  internal prop LastCompletedSerial uint64{ get -> lastCompletedSerial }
  internal prop GlobalSubmissionSerial uint64{ get -> globalSubmissionSerial }
  internal prop HasAbandonableAcquiredWork bool{
    get -> acquired && !inFlight && !submissionFailed
  }
  internal prop LastCompletedGlobalSubmissionSerial uint64{
    get -> lastCompletedGlobalSubmissionSerial
  }

  internal init(nativeDevice VkDevice, nativeDispatch VkDeviceDispatch,
    suppliedCommandBuffer VkCommandBuffer, nativeObjectAccounting VulkanObjectAccounting?) {
      if nativeDevice == nint(0) {
        throw ArgumentException("Vulkan device is null", "nativeDevice")
      }
      if suppliedCommandBuffer == nint(0) {
        throw ArgumentException("Vulkan command buffer is null", "suppliedCommandBuffer")
      }
      this.device = nativeDevice
      this.dispatch = nativeDispatch
      this.commandBuffer = suppliedCommandBuffer
      objectAccounting = nativeObjectAccounting
      Create()
    }

  private func Create() {
    try {
      acquireSemaphore = VulkanSynchronizationFactory.CreateSemaphore(
        device,
        dispatch,
        objectAccounting)
      submissionFence = VulkanSynchronizationFactory.CreateFence(
        device,
        dispatch,
        objectAccounting,
        uint32(VkConstants.VK_FENCE_CREATE_SIGNALED_BIT))
    } catch (error Exception) {
      if submissionFence != 0uL {
        let destroyFence = dispatch.vkDestroyFence
        destroyFence(device, submissionFence, nil)
        if let accounting = objectAccounting {
          accounting.Release()
        }
        submissionFence = 0uL
      }
      if acquireSemaphore != 0uL {
        let destroySemaphore = dispatch.vkDestroySemaphore
        destroySemaphore(device, acquireSemaphore, nil)
        if let accounting = objectAccounting {
          accounting.Release()
        }
        acquireSemaphore = 0uL
      }
      throw error
    }
  }

  internal func PrepareAcquire() VkResult {
    if disposed {
      throw ObjectDisposedException("VulkanFrameSlot")
    }
    if submissionFailed {
      throw InvalidOperationException("VulkanFrameSlot submission failed")
    }
    if acquirePrepared || acquired || submitPrepared {
      throw InvalidOperationException("VulkanFrameSlot has prepared work")
    }
    if inFlight {
      let status = PollForCompletion()
      if status != VkConstants.VK_SUCCESS {
        return status
      }
    }
    let resetCommandBuffer = dispatch.vkResetCommandBuffer
    let resetResult = resetCommandBuffer(commandBuffer, VkCommandBufferResetFlags(0u))
    if resetResult == VkConstants.VK_SUCCESS {
      acquirePrepared = true
    }
    return resetResult
  }

  internal func PollForCompletion() VkResult {
    if disposed {
      throw ObjectDisposedException("VulkanFrameSlot")
    }
    if acquired || submitPrepared {
      throw InvalidOperationException("VulkanFrameSlot has unconsumed acquired work")
    }
    if !inFlight {
      return VkConstants.VK_SUCCESS
    }
    let getFenceStatus = dispatch.vkGetFenceStatus
    let result = getFenceStatus(device, submissionFence)
    if result == VkConstants.VK_SUCCESS {
      lastCompletedSerial = submissionSerial
      lastCompletedGlobalSubmissionSerial = globalSubmissionSerial
      inFlight = false
    }
    return result
  }

  internal func MarkAcquired(acquireResult VkResult) VkResult {
    if disposed {
      throw ObjectDisposedException("VulkanFrameSlot")
    }
    if submissionFailed {
      throw InvalidOperationException("VulkanFrameSlot submission failed")
    }
    if !acquirePrepared || acquired || submitPrepared || inFlight {
      throw InvalidOperationException("VulkanFrameSlot is not ready to mark image acquisition")
    }
    acquirePrepared = false
    if acquireResult == VkConstants.VK_SUCCESS || acquireResult == VkConstants.VK_SUBOPTIMAL_KHR {
      acquired = true
    }
    return acquireResult
  }

  internal func PrepareSubmit() VkResult {
    if disposed {
      throw ObjectDisposedException("VulkanFrameSlot")
    }
    if submissionFailed {
      throw InvalidOperationException("VulkanFrameSlot submission failed")
    }
    if !acquired || submitPrepared || inFlight {
      throw InvalidOperationException("VulkanFrameSlot is not ready to prepare submission")
    }
    let resetFences = dispatch.vkResetFences
    let resetResult = resetFences(device, 1u, &submissionFence)
    if resetResult == VkConstants.VK_SUCCESS {
      submitPrepared = true
    }
    return resetResult
  }

  internal func MarkSubmitted(submitResult VkResult, submittedGlobalSerial uint64) VkResult {
    if disposed {
      throw ObjectDisposedException("VulkanFrameSlot")
    }
    if submissionFailed {
      throw InvalidOperationException("VulkanFrameSlot submission failed")
    }
    if !submitPrepared || acquirePrepared || !acquired || inFlight {
      throw InvalidOperationException("VulkanFrameSlot has no prepared submission")
    }
    if submitResult == VkConstants.VK_SUCCESS {
      if submittedGlobalSerial == 0uL {
        throw ArgumentOutOfRangeException("submittedGlobalSerial")
      }
      acquired = false
      submitPrepared = false
      submissionSerial++
      globalSubmissionSerial = submittedGlobalSerial
      inFlight = true
    } else {
      acquired = false
      submitPrepared = false
      submissionFailed = true
    }
    return submitResult
  }

  internal func AbortPrepared() {
    if disposed {
      throw ObjectDisposedException("VulkanFrameSlot")
    }
    if submissionFailed || acquired || submitPrepared || inFlight {
      throw InvalidOperationException("VulkanFrameSlot submission is in flight")
    }
    acquirePrepared = false
  }

  internal func AbandonAcquiredForSwapchainRetirement() {
    if disposed {
      throw ObjectDisposedException("VulkanFrameSlot")
    }
    if submissionFailed || !acquired || inFlight {
      throw InvalidOperationException("VulkanFrameSlot has no abandonable acquired work")
    }
    acquired = false
    acquirePrepared = false
    submitPrepared = false
    if acquireSemaphore != 0uL {
      let destroySemaphore = dispatch.vkDestroySemaphore
      destroySemaphore(device, acquireSemaphore, nil)
      if let accounting = objectAccounting {
        accounting.Release()
      }
      acquireSemaphore = 0uL
    }
    if submissionFence != 0uL {
      let destroyFence = dispatch.vkDestroyFence
      destroyFence(device, submissionFence, nil)
      if let accounting = objectAccounting {
        accounting.Release()
      }
      submissionFence = 0uL
    }
    Create()
  }

  internal func WaitForCompletion() VkResult {
    if disposed {
      throw ObjectDisposedException("VulkanFrameSlot")
    }
    if acquired || submitPrepared {
      throw InvalidOperationException("VulkanFrameSlot has unconsumed acquired work")
    }
    if !inFlight {
      return VkConstants.VK_SUCCESS
    }
    let waitForFences = dispatch.vkWaitForFences
    let result = waitForFences(
      device, 1u, &submissionFence, VkConstants.VK_TRUE, VkConstants.VK_WHOLE_SIZE)
    if result == VkConstants.VK_SUCCESS {
      lastCompletedSerial = submissionSerial
      lastCompletedGlobalSubmissionSerial = globalSubmissionSerial
      inFlight = false
    }
    return result
  }

  public func Dispose() {
    if disposed {
      return
    }
    if acquired || submitPrepared {
      throw InvalidOperationException("VulkanFrameSlot has unconsumed acquired work")
    }
    if inFlight {
      let getFenceStatus = dispatch.vkGetFenceStatus
      let status = getFenceStatus(device, submissionFence)
      if status != VkConstants.VK_SUCCESS {
        throw InvalidOperationException("VulkanFrameSlot submission is still in flight")
      }
      lastCompletedSerial = submissionSerial
      lastCompletedGlobalSubmissionSerial = globalSubmissionSerial
      inFlight = false
    }
    disposed = true
    if acquireSemaphore != 0uL {
      let destroySemaphore = dispatch.vkDestroySemaphore
      destroySemaphore(device, acquireSemaphore, nil)
      if let accounting = objectAccounting {
        accounting.Release()
      }
      acquireSemaphore = 0uL
    }
    if submissionFence != 0uL {
      let destroyFence = dispatch.vkDestroyFence
      destroyFence(device, submissionFence, nil)
      if let accounting = objectAccounting {
        accounting.Release()
      }
      submissionFence = 0uL
    }
  }
}
