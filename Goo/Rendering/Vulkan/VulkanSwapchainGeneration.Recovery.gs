package Goo

internal unsafe partial class VulkanSwapchainGeneration {
    internal func DisposeAfterDeviceLoss() {
        if disposed {
            return
        }
        disposed = true
        if let storage = renderSemaphores {
            let destroySemaphore = dispatch.vkDestroySemaphore
            var index int32 = 0
            while index < storage.Length {
                if storage[index] != 0uL {
                    let staleSemaphore = storage[index]
                    storage[index] = 0uL
                    try { destroySemaphore(device, staleSemaphore, nil) } catch (cleanup Exception) { }
                    if let accounting = objectAccounting {
                        try { accounting.Release() } catch (cleanup Exception) { }
                    }
                }
                index++
            }
        }
        if let storage = presentFences {
            let destroyFence = dispatch.vkDestroyFence
            var index int32 = 0
            while index < storage.Length {
                if storage[index] != 0uL {
                    let staleFence = storage[index]
                    storage[index] = 0uL
                    try { destroyFence(device, staleFence, nil) } catch (cleanup Exception) { }
                    if let accounting = objectAccounting {
                        try { accounting.Release() } catch (cleanup Exception) { }
                    }
                }
                index++
            }
        }
        if let storage = imageViews {
            let destroyImageView = dispatch.vkDestroyImageView
            var index int32 = 0
            while index < storage.Length {
                if storage[index] != 0uL {
                    let staleImageView = storage[index]
                    storage[index] = 0uL
                    try { destroyImageView(device, staleImageView, nil) } catch (cleanup Exception) { }
                    if let accounting = objectAccounting {
                        try { accounting.Release() } catch (cleanup Exception) { }
                    }
                }
                index++
            }
        }
        if swapchain != 0uL {
            let staleSwapchain = swapchain
            let staleImageCount = trackedImageCount
            swapchain = 0uL
            trackedImageCount = 0
            let destroySwapchain = dispatch.vkDestroySwapchainKHR
            try { destroySwapchain(device, staleSwapchain, nil) } catch (cleanup Exception) { }
            var index int32 = 0
            while index < staleImageCount {
                if let accounting = objectAccounting {
                    try { accounting.Release() } catch (cleanup Exception) { }
                }
                index++
            }
            if let accounting = objectAccounting {
                try { accounting.Release() } catch (cleanup Exception) { }
            }
        }
        images = nil
        imageViews = nil
        renderSemaphores = nil
        presentFences = nil
        presentFencePrepared = nil
        presentFencePending = nil
        presentIds = nil
        imageLayouts = nil
    }
}
