package Goo

internal unsafe sealed partial class VulkanTextAtlasSet {
    internal func DisposeAfterDeviceLoss() {
        if disposed {
            return
        }
        disposed = true
        var index int32 = 0
        while index < atlases.Length {
            if let atlas = atlases[index] {
                try { atlas.DisposeAfterDeviceLoss() } catch (cleanup Exception) { }
                atlases[index] = nil
            }
            active[index] = false
            identities[index] = ResourceId{}
            lastUseSerial[index] = 0uL
            lastTouch[index] = 0uL
            index++
        }
        atlasCount = 0
        currentAtlasIndex = -1
        residentByteSize = 0uL
        publishedVersion = 0uL
    }
}
