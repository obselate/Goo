package Goo

import System.Threading

internal class VulkanQueueMailboxPhase {
  shared {
    internal const Idle int32 = 0
    internal const SubmitQueued int32 = 1
    internal const SubmitRunning int32 = 2
    internal const SubmitComplete int32 = 3
    internal const PresentQueued int32 = 4
    internal const PresentRunning int32 = 5
    internal const PresentComplete int32 = 6
  }
}

internal unsafe sealed class VulkanQueueMailbox {
  private let host SdlHost?
  private var phase int32
  private var submitResult VkResult = VkConstants.VK_NOT_READY
  private var presentResult VkResult = VkConstants.VK_NOT_READY
  private var syntheticDrainResult VkResult = VkConstants.VK_NOT_READY
  private var syntheticDrainPerformed bool

  internal var SubmitCommandBuffer VkCommandBuffer
  internal var SubmitWaitSemaphore VkSemaphore
  internal var SubmitSignalSemaphore VkSemaphore
  internal var SubmitFence VkFence
  internal var SubmitHasWait bool
  internal var SubmitHasSignal bool
  internal var PresentSwapchain VkSwapchainKHR
  internal var PresentImageIndex uint32
  internal var PresentWaitSemaphore VkSemaphore
  internal var PresentFence VkFence
  internal var PresentFenceEnabled bool

  internal init(nativeHost SdlHost?) {
    host = nativeHost
  }

  internal prop Phase int32{
    get -> Interlocked.CompareExchange(ref phase, 0, 0)
  }

  internal prop SubmitResult VkResult{ get -> submitResult }
  internal prop PresentResult VkResult{ get -> presentResult }
  internal prop SyntheticDrainPerformed bool{ get -> syntheticDrainPerformed }
  internal prop SyntheticDrainResult VkResult{ get -> syntheticDrainResult }

  internal func PrepareSubmit(commandBuffer VkCommandBuffer, waitSemaphore VkSemaphore,
    signalSemaphore VkSemaphore, fence VkFence) {
      SubmitCommandBuffer = commandBuffer
      SubmitWaitSemaphore = waitSemaphore
      SubmitSignalSemaphore = signalSemaphore
      SubmitFence = fence
      SubmitHasWait = waitSemaphore != 0uL
      SubmitHasSignal = signalSemaphore != 0uL
    }

  internal func PreparePresent(swapchain VkSwapchainKHR, imageIndex uint32,
    waitSemaphore VkSemaphore, fence VkFence, fenceEnabled bool) {
      PresentSwapchain = swapchain
      PresentImageIndex = imageIndex
      PresentWaitSemaphore = waitSemaphore
      PresentFence = fence
      PresentFenceEnabled = fenceEnabled
    }

  internal func BeginSubmit() bool {
    if Interlocked.CompareExchange(
      ref phase, VulkanQueueMailboxPhase.SubmitQueued, VulkanQueueMailboxPhase.Idle)
    != VulkanQueueMailboxPhase.Idle{
      return false
    }
    syntheticDrainResult = VkConstants.VK_NOT_READY
    syntheticDrainPerformed = false
    return true
  }

  internal func BeginPresent() bool -> Interlocked.CompareExchange(
    ref phase, VulkanQueueMailboxPhase.PresentQueued, VulkanQueueMailboxPhase.SubmitComplete)
  == VulkanQueueMailboxPhase.SubmitComplete

  internal func CancelSubmit() bool -> Interlocked.CompareExchange(ref phase, VulkanQueueMailboxPhase.Idle,
    VulkanQueueMailboxPhase.SubmitQueued) == VulkanQueueMailboxPhase.SubmitQueued

  internal func ResetSubmitCompletion() {
    Interlocked.CompareExchange(ref phase, VulkanQueueMailboxPhase.Idle,
      VulkanQueueMailboxPhase.SubmitComplete)
  }

  internal func CancelPresent() {
    Interlocked.CompareExchange(ref phase, VulkanQueueMailboxPhase.Idle,
      VulkanQueueMailboxPhase.PresentQueued)
  }

  internal func RetryPresent() {
    Interlocked.CompareExchange(ref phase, VulkanQueueMailboxPhase.SubmitComplete,
      VulkanQueueMailboxPhase.PresentQueued)
  }

  internal func TakeSubmitCompletion(out result VkResult) bool {
    if Interlocked.CompareExchange(
      ref phase, VulkanQueueMailboxPhase.SubmitComplete, VulkanQueueMailboxPhase.SubmitComplete)
    != VulkanQueueMailboxPhase.SubmitComplete{
      result = VkConstants.VK_NOT_READY
      return false
    }
    result = submitResult
    return true
  }

  internal func TakePresentCompletion(out result VkResult) bool {
    if Interlocked.CompareExchange(
      ref phase, VulkanQueueMailboxPhase.Idle, VulkanQueueMailboxPhase.PresentComplete)
    != VulkanQueueMailboxPhase.PresentComplete{
      result = VkConstants.VK_NOT_READY
      return false
    }
    result = presentResult
    return true
  }

  internal func RunSubmit(dispatch VkDeviceDispatch, queue VkQueue) {
    if Interlocked.CompareExchange(
      ref phase, VulkanQueueMailboxPhase.SubmitRunning, VulkanQueueMailboxPhase.SubmitQueued)
    != VulkanQueueMailboxPhase.SubmitQueued{
      return
    }
    if VulkanSharedRuntime.TakeTestGraphicsSubmissionFailure() {
      syntheticDrainResult = VulkanSharedRuntime.DrainTestGraphicsSubmissionFailure()
      syntheticDrainPerformed = true
      submitResult = if syntheticDrainResult == VkConstants.VK_SUCCESS {
        VkConstants.VK_ERROR_DEVICE_LOST
      } else {
        syntheticDrainResult
      }
      Interlocked.Exchange(ref phase, VulkanQueueMailboxPhase.SubmitComplete)
      host?.Wake()
      return
    }
    var waitInfo = VkSemaphoreSubmitInfo{}
    waitInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SEMAPHORE_SUBMIT_INFO
    waitInfo.semaphore = SubmitWaitSemaphore
    waitInfo.stageMask = VkConstants.VK_PIPELINE_STAGE_2_ALL_COMMANDS_BIT
    var signalInfo = VkSemaphoreSubmitInfo{}
    signalInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SEMAPHORE_SUBMIT_INFO
    signalInfo.semaphore = SubmitSignalSemaphore
    signalInfo.stageMask = VkConstants.VK_PIPELINE_STAGE_2_ALL_COMMANDS_BIT
    var commandInfo = VkCommandBufferSubmitInfo{}
    commandInfo.sType = VkConstants.VK_STRUCTURE_TYPE_COMMAND_BUFFER_SUBMIT_INFO
    commandInfo.commandBuffer = SubmitCommandBuffer
    var submitInfo = VkSubmitInfo2{}
    submitInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SUBMIT_INFO_2
    submitInfo.waitSemaphoreInfoCount = if SubmitHasWait { 1u } else { 0u }
    submitInfo.pWaitSemaphoreInfos = if SubmitHasWait { &waitInfo } else { nil }
    submitInfo.commandBufferInfoCount = 1u
    submitInfo.pCommandBufferInfos = &commandInfo
    submitInfo.signalSemaphoreInfoCount = if SubmitHasSignal { 1u } else { 0u }
    submitInfo.pSignalSemaphoreInfos = if SubmitHasSignal { &signalInfo } else { nil }
    let queueSubmit = dispatch.vkQueueSubmit2
    submitResult = queueSubmit(queue, 1u, &submitInfo, SubmitFence)
    Interlocked.Exchange(ref phase, VulkanQueueMailboxPhase.SubmitComplete)
    host?.Wake()
  }

  internal func RunPresent(dispatch VkDeviceDispatch, queue VkQueue) {
    if Interlocked.CompareExchange(
      ref phase, VulkanQueueMailboxPhase.PresentRunning, VulkanQueueMailboxPhase.PresentQueued)
    != VulkanQueueMailboxPhase.PresentQueued{
      return
    }
    var fenceInfo = VkSwapchainPresentFenceInfoEXT{}
    var swapchain = PresentSwapchain
    var imageIndex = PresentImageIndex
    var presentInfo = VkPresentInfoKHR{}
    presentInfo.sType = VkConstants.VK_STRUCTURE_TYPE_PRESENT_INFO_KHR
    if PresentFenceEnabled {
      fenceInfo.sType = VkConstants.VK_STRUCTURE_TYPE_SWAPCHAIN_PRESENT_FENCE_INFO_EXT
      fenceInfo.swapchainCount = 1u
      fenceInfo.pFences = &PresentFence
      presentInfo.pNext = *void(&fenceInfo)
    }
    presentInfo.waitSemaphoreCount = 1u
    presentInfo.pWaitSemaphores = &PresentWaitSemaphore
    presentInfo.swapchainCount = 1u
    presentInfo.pSwapchains = &swapchain
    presentInfo.pImageIndices = &imageIndex
    let queuePresent = dispatch.vkQueuePresentKHR
    presentResult = queuePresent(queue, &presentInfo)
    Interlocked.Exchange(ref phase, VulkanQueueMailboxPhase.PresentComplete)
    host?.Wake()
  }

  internal func FailSubmit(result VkResult) {
    submitResult = result
    Interlocked.Exchange(ref phase, VulkanQueueMailboxPhase.SubmitComplete)
    host?.Wake()
  }

  internal func FailPresent(result VkResult) {
    presentResult = result
    Interlocked.Exchange(ref phase, VulkanQueueMailboxPhase.PresentComplete)
    host?.Wake()
  }
}
