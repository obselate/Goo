package Goo

import System
import System.Threading

internal unsafe sealed class VulkanQueueWorker : IDisposable {
  private const MailboxCapacity int32 = 64
  private let queue VkQueue
  private let dispatch VkDeviceDispatch
  private let gate object
  private let signal AutoResetEvent
  private let pending []VulkanQueueMailbox?
  private let thread Thread
  private var head int32
  private var tail int32
  private var count int32
  private var stopping bool
  private var faulted int32
  private var running int32
  private var disposed bool

  shared {
    private var holdSubmit int32
    private var holdPresent int32
    private var deferEnqueue int32
    private var holdSubmitMailbox VulkanQueueMailbox?
    private var holdPresentMailbox VulkanQueueMailbox?
    private let holdGate object = Object()
    private let holdReleased ManualResetEventSlim = ManualResetEventSlim(true)
    private let holdEntered ManualResetEventSlim = ManualResetEventSlim(false)
    private var enqueueDeferralCount int64

    internal func HoldNextSubmitForTest() {
      holdEntered.Reset()
      holdReleased.Reset()
      Interlocked.Exchange(ref holdSubmit, 1)
    }

    internal func HoldNextPresentForTest() {
      holdEntered.Reset()
      holdReleased.Reset()
      Interlocked.Exchange(ref holdPresent, 1)
    }

    internal func HoldSubmitForMailboxForTest(mailbox VulkanQueueMailbox) {
      lock holdGate {
        holdEntered.Reset()
        holdSubmitMailbox = mailbox
        holdReleased.Reset()
      }
    }

    internal func HoldPresentForMailboxForTest(mailbox VulkanQueueMailbox) {
      lock holdGate {
        holdEntered.Reset()
        holdPresentMailbox = mailbox
        holdReleased.Reset()
      }
    }

    internal func ReleaseHeldQueueCallForTest() {
      holdReleased.Set()
    }

    private func ClearTestHoldsForShutdown() {
      lock holdGate {
        holdSubmitMailbox = nil
        holdPresentMailbox = nil
        Interlocked.Exchange(ref holdSubmit, 0)
        Interlocked.Exchange(ref holdPresent, 0)
      }
    }

    internal func WaitForHeldQueueCallForTest(timeoutMs int32) bool -> holdEntered.Wait(timeoutMs)

    internal func DeferNextEnqueueForTest() {
      Interlocked.Exchange(ref deferEnqueue, 1)
    }

    internal prop EnqueueDeferralCountForTest int64{
      get { return Interlocked.Read(ref enqueueDeferralCount) }
    }

    private func TakeHold(kind int32, mailbox VulkanQueueMailbox) bool {
      lock holdGate {
        return if kind == 0 {
          if let armed = holdSubmitMailbox {
            if Object.ReferenceEquals(armed, mailbox) {
              holdSubmitMailbox = nil
              true
            } else { false }
          } else {
            Interlocked.Exchange(ref holdSubmit, 0) != 0
          }
        } else {
          if let armed = holdPresentMailbox {
            if Object.ReferenceEquals(armed, mailbox) {
              holdPresentMailbox = nil
              true
            } else { false }
          } else {
            Interlocked.Exchange(ref holdPresent, 0) != 0
          }
        }
      }
    }
  }

  internal init(nativeQueue VkQueue, nativeDispatch VkDeviceDispatch) {
    if nativeQueue == nint(0) {
      throw ArgumentException("nativeQueue")
    }
    queue = nativeQueue
    dispatch = nativeDispatch
    gate = Object()
    signal = AutoResetEvent(false)
    pending = [MailboxCapacity]VulkanQueueMailbox?
    thread = Thread(func() { Run() })
    thread.IsBackground = true
    thread.Start()
  }

  internal func CreateMailbox(host SdlHost) VulkanQueueMailbox -> VulkanQueueMailbox(host)

  internal func Enqueue(mailbox VulkanQueueMailbox) bool {
    if Interlocked.Exchange(ref deferEnqueue, 0) != 0 {
      Interlocked.Increment(ref VulkanQueueWorker.enqueueDeferralCount)
      return false
    }
    lock gate {
      if stopping || count >= MailboxCapacity {
        return false
      }
      pending[tail] = mailbox
      tail = (tail + 1) % MailboxCapacity
      count = count + 1
    }
    signal.Set()
    return true
  }

  private func Dequeue() VulkanQueueMailbox? {
    lock gate {
      if count == 0 {
        return nil
      }
      let mailbox = pending[head]
      pending[head] = nil
      head = (head + 1) % MailboxCapacity
      count = count - 1
      if mailbox != nil {
        running = running + 1
      }
      return mailbox
    }
  }

  private func Run() {
    while true {
      signal.WaitOne()
      while true {
        let mailbox = Dequeue()
        if mailbox == nil {
          break
        }
        try {
          let current = mailbox!!
          let phase = current.Phase
          if phase == VulkanQueueMailboxPhase.SubmitQueued {
            if Interlocked.CompareExchange(ref faulted, 0, 0) != 0 {
              current.FailSubmit(VkConstants.VK_ERROR_DEVICE_LOST)
            } else {
              try {
                if VulkanQueueWorker.TakeHold(0, current) {
                  VulkanQueueWorker.holdEntered.Set()
                  VulkanQueueWorker.holdReleased.Wait()
                }
                current.RunSubmit(dispatch, queue)
                if current.SubmitResult != VkConstants.VK_SUCCESS {
                  Interlocked.Exchange(ref faulted, 1)
                }
              } catch (error Exception) {
                Interlocked.Exchange(ref faulted, 1)
                current.FailSubmit(VkConstants.VK_ERROR_DEVICE_LOST)
              }
            }
          } else if phase == VulkanQueueMailboxPhase.PresentQueued {
            if Interlocked.CompareExchange(ref faulted, 0, 0) != 0 {
              current.FailPresent(VkConstants.VK_ERROR_DEVICE_LOST)
            } else {
              try {
                if VulkanQueueWorker.TakeHold(1, current) {
                  VulkanQueueWorker.holdEntered.Set()
                  VulkanQueueWorker.holdReleased.Wait()
                }
                current.RunPresent(dispatch, queue)
                if current.PresentResult == VkConstants.VK_ERROR_DEVICE_LOST {
                  Interlocked.Exchange(ref faulted, 1)
                }
              } catch (error Exception) {
                Interlocked.Exchange(ref faulted, 1)
                current.FailPresent(VkConstants.VK_ERROR_DEVICE_LOST)
              }
            }
          }
        } finally {
          Interlocked.Decrement(ref running)
        }
      }
      lock gate {
        if stopping && count == 0 {
          break
        }
      }
    }
  }

  internal prop HasOutstandingWork bool{
    get {
      lock gate { return count != 0 || Interlocked.CompareExchange(ref running, 0, 0) != 0 }
    }
  }

  internal func QuiesceAfterDeviceLoss() {
    Interlocked.Exchange(ref faulted, 1)
    VulkanQueueWorker.ReleaseHeldQueueCallForTest()
    VulkanQueueWorker.ClearTestHoldsForShutdown()
    signal.Set()
    while true {
      lock gate {
        if count == 0 && running == 0 {
          return
        }
      }
      Thread.Yield()
    }
  }

  internal func MarkFaulted() {
    Interlocked.Exchange(ref faulted, 1)
  }

  public func Dispose() {
    lock gate {
      if disposed {
        return
      }
      disposed = true
      stopping = true
    }
    VulkanQueueWorker.ReleaseHeldQueueCallForTest()
    VulkanQueueWorker.ClearTestHoldsForShutdown()
    signal.Set()
    thread.Join()
    signal.Dispose()
  }
}
