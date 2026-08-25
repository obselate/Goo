package Goo

internal data struct VulkanMemoryPolicy(Required VkMemoryPropertyFlags, Preferred VkMemoryPropertyFlags) {
  shared {
    internal let DeviceLocalRequired VulkanMemoryPolicy = VulkanMemoryPolicy(
      uint32(VkConstants.VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT),
      0u)

    internal let DeviceLocalRequiredPreferred VulkanMemoryPolicy = VulkanMemoryPolicy(
      uint32(VkConstants.VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT),
      uint32(VkConstants.VK_MEMORY_PROPERTY_DEVICE_LOCAL_BIT))

    internal let HostVisibleCoherentCached VulkanMemoryPolicy = VulkanMemoryPolicy(
      uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_VISIBLE_BIT),
      uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_COHERENT_BIT)
      | uint32(VkConstants.VK_MEMORY_PROPERTY_HOST_CACHED_BIT))
  }
}
