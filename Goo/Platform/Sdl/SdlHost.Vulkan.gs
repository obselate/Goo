package Goo

import System
import System.Collections.Generic
import System.Runtime.InteropServices
import Hexa.NET.SDL3

internal unsafe data struct SdlVulkanExtensionPointer {
  var Value *int8
}

internal unsafe partial class SdlHost {
  internal func LoadVulkanLibrary() bool {
    ThrowIfDisposed()
    let path *uint8 = nil
    return SDL.VulkanLoadLibrary(path)
  }

  internal func GetVulkanGetInstanceProcAddr() nint {
    ThrowIfDisposed()
    return SDL_Vulkan_GetVkGetInstanceProcAddrRaw()
  }

  internal func UnloadVulkanLibrary() {
    ThrowIfDisposed()
    SDL.VulkanUnloadLibrary()
  }

  internal func GetVulkanInstanceExtensions() []string {
    ThrowIfDisposed()
    var count uint32 = 0u
    let raw = SDL.VulkanGetInstanceExtensions(&count)
    if raw == nil || count == 0u {
      throw InvalidOperationException("SDL_Vulkan_GetInstanceExtensions failed: " + SDL.GetErrorS())
    }
    let pointers = *SdlVulkanExtensionPointer(raw)
    let values = [int32(count)]string
    var index uint32 = 0u
    while index < count {
      values[index] = Marshal.PtrToStringUTF8(nint(pointers[index].Value)) ?? ""
      index++
    }
    return values
  }

  internal func CreateVulkanSurface(instance nint, out surface uint64) bool {
    ThrowIfDisposed()
    var nativeSurface = Hexa.NET.SDL3.VkSurfaceKHR.Null
    if !SDL.VulkanCreateSurface(
        window,
        Hexa.NET.SDL3.VkInstance(instance),
        Hexa.NET.SDL3.VkAllocationCallbacksPtr.Null,
        &nativeSurface) {
      surface = 0uL
      return false
    }
    surface = uint64(nativeSurface.Handle)
    return true
  }

  internal func DestroyVulkanSurface(instance nint, surface uint64) {
    ThrowIfDisposed()
    if surface == 0uL {
      return
    }
    SDL.VulkanDestroySurface(
      Hexa.NET.SDL3.VkInstance(instance),
      Hexa.NET.SDL3.VkSurfaceKHR(nint(surface)),
      Hexa.NET.SDL3.VkAllocationCallbacksPtr.Null)
  }

  internal func GetVulkanPresentationSupport(instance nint, physicalDevice nint,
    queueFamilyIndex uint32) bool {
    ThrowIfDisposed()
    return SDL.VulkanGetPresentationSupport(
      Hexa.NET.SDL3.VkInstance(instance),
      Hexa.NET.SDL3.VkPhysicalDevice(physicalDevice),
      queueFamilyIndex)
  }
}
