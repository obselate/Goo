package Goo

import System.Threading

internal class VulkanDiagnosticCounters {
    private var rebuildCount uint64
    private var layoutCount uint64
    private var planCompileCount uint64
    private var uploadCount uint64
    private var recordCount uint64
    private var submitCount uint64
    private var presentCount uint64
    private var readbackCount uint64
    private var managedAllocatedBytes uint64
    private var heapBudgetAvailable uint32
    private var heapBudgetSampleCurrent uint32
    private var heapBudget uint64
    private var driverHeapUsage uint64
    private var vulkanObjectCount uint64
    private var vulkanObjectAllocationCount uint64
    private var vulkanDeviceMemoryAllocationCount uint64
    private var vulkanDeviceMemoryBytes uint64
    private var cacheBytes uint64
    private var imageByteBudget uint64
    private var imageResidentBytes uint64
    private var imageLiveObjectCount uint64
    private var imagePeakResidentBytes uint64
    private var imagePeakLiveObjectCount uint64
    private var textAtlasCount uint64
    private var textAtlasByteBudget uint64
    private var textAtlasResidentBytes uint64
    private var textAtlasLiveObjectCount uint64
    private var textAtlasPeakCount uint64
    private var textAtlasPeakByteBudget uint64
    private var textAtlasPeakResidentBytes uint64
    private var textAtlasPeakLiveObjectCount uint64
    private var textAtlasRecordedUploadBytes uint64
    private var textAtlasEvictionCount uint64
    private var textAtlasRetirementCount uint64
    private var imageEvictionCount uint64
    private var imageRetirementCount uint64
    private var allocatorBytes uint64
    private var dirtyChunkCount uint64
    private var reusedChunkCount uint64
    private var uploadBytes uint64
    private var drawCount uint64
    private var pipelineChangeCount uint64
    private var descriptorChangeCount uint64
    private var passCount uint64
    private var barrierCount uint64
    private var damageCount uint64
    private var damageArea uint64
    private var surfaceRecoveryCount uint64
    private var deviceRecoveryCount uint64
    private var validationErrorCount uint64
    private var resultCount uint64
    private var resultFailureCount uint64

    internal prop Snapshot VulkanDiagnosticCounterSnapshot {
        get {
            return VulkanDiagnosticCounterSnapshot{
                rebuildCount: Interlocked.Read(ref rebuildCount),
                layoutCount: Interlocked.Read(ref layoutCount),
                planCompileCount: Interlocked.Read(ref planCompileCount),
                uploadCount: Interlocked.Read(ref uploadCount),
                recordCount: Interlocked.Read(ref recordCount),
                submitCount: Interlocked.Read(ref submitCount),
                presentCount: Interlocked.Read(ref presentCount),
                readbackCount: Interlocked.Read(ref readbackCount),
                managedAllocatedBytes: Interlocked.Read(ref managedAllocatedBytes),
                heapBudgetAvailable: Interlocked.CompareExchange(ref heapBudgetAvailable, 0u, 0u),
                heapBudgetSampleCurrent: Interlocked.CompareExchange(ref heapBudgetSampleCurrent, 0u, 0u),
                heapBudget: Interlocked.Read(ref heapBudget),
                driverHeapUsage: Interlocked.Read(ref driverHeapUsage),
                vulkanObjectCount: Interlocked.Read(ref vulkanObjectCount),
                vulkanObjectAllocationCount: Interlocked.Read(ref vulkanObjectAllocationCount),
                vulkanDeviceMemoryAllocationCount: Interlocked.Read(ref vulkanDeviceMemoryAllocationCount),
                vulkanDeviceMemoryBytes: Interlocked.Read(ref vulkanDeviceMemoryBytes),
                cacheBytes: Interlocked.Read(ref cacheBytes),
                imageByteBudget: Interlocked.Read(ref imageByteBudget),
                imageResidentBytes: Interlocked.Read(ref imageResidentBytes),
                imageLiveObjectCount: Interlocked.Read(ref imageLiveObjectCount),
                imagePeakResidentBytes: Interlocked.Read(ref imagePeakResidentBytes),
                imagePeakLiveObjectCount: Interlocked.Read(ref imagePeakLiveObjectCount),
                textAtlasCount: Interlocked.Read(ref textAtlasCount),
                textAtlasByteBudget: Interlocked.Read(ref textAtlasByteBudget),
                textAtlasResidentBytes: Interlocked.Read(ref textAtlasResidentBytes),
                textAtlasLiveObjectCount: Interlocked.Read(ref textAtlasLiveObjectCount),
                textAtlasPeakCount: Interlocked.Read(ref textAtlasPeakCount),
                textAtlasPeakByteBudget: Interlocked.Read(ref textAtlasPeakByteBudget),
                textAtlasPeakResidentBytes: Interlocked.Read(ref textAtlasPeakResidentBytes),
                textAtlasPeakLiveObjectCount: Interlocked.Read(ref textAtlasPeakLiveObjectCount),
                textAtlasRecordedUploadBytes: Interlocked.Read(ref textAtlasRecordedUploadBytes),
                textAtlasEvictionCount: Interlocked.Read(ref textAtlasEvictionCount),
                textAtlasRetirementCount: Interlocked.Read(ref textAtlasRetirementCount),
                imageEvictionCount: Interlocked.Read(ref imageEvictionCount),
                imageRetirementCount: Interlocked.Read(ref imageRetirementCount),
                allocatorBytes: Interlocked.Read(ref allocatorBytes),
                dirtyChunkCount: Interlocked.Read(ref dirtyChunkCount),
                reusedChunkCount: Interlocked.Read(ref reusedChunkCount),
                uploadBytes: Interlocked.Read(ref uploadBytes),
                drawCount: Interlocked.Read(ref drawCount),
                pipelineChangeCount: Interlocked.Read(ref pipelineChangeCount),
                descriptorChangeCount: Interlocked.Read(ref descriptorChangeCount),
                passCount: Interlocked.Read(ref passCount),
                barrierCount: Interlocked.Read(ref barrierCount),
                damageCount: Interlocked.Read(ref damageCount),
                damageArea: Interlocked.Read(ref damageArea),
                surfaceRecoveryCount: Interlocked.Read(ref surfaceRecoveryCount),
                deviceRecoveryCount: Interlocked.Read(ref deviceRecoveryCount),
                validationErrorCount: Interlocked.Read(ref validationErrorCount),
                resultCount: Interlocked.Read(ref resultCount),
                resultFailureCount: Interlocked.Read(ref resultFailureCount),
            }
        }
    }

    internal func AddRebuild(value uint64) { Interlocked.Add(ref rebuildCount, value) }
    internal func AddLayout(value uint64) { Interlocked.Add(ref layoutCount, value) }
    internal func AddPlanCompile(value uint64) { Interlocked.Add(ref planCompileCount, value) }
    internal func AddUpload(value uint64) { Interlocked.Add(ref uploadCount, value) }
    internal func AddRecord(value uint64) { Interlocked.Add(ref recordCount, value) }
    internal func AddSubmit(value uint64) { Interlocked.Add(ref submitCount, value) }
    internal func AddPresent(value uint64) { Interlocked.Add(ref presentCount, value) }
    internal func AddReadback(value uint64) { Interlocked.Add(ref readbackCount, value) }
    internal func AddManagedAllocatedBytes(value uint64) { Interlocked.Add(ref managedAllocatedBytes, value) }
    internal func SetHeapBudgetAvailable(value uint32) {
        Interlocked.Exchange(ref heapBudgetAvailable, value)
    }
    internal func SetHeapBudgetSampleCurrent(value uint32) {
        Interlocked.Exchange(ref heapBudgetSampleCurrent, value)
    }
    internal func SetHeapBudget(value uint64) { Interlocked.Exchange(ref heapBudget, value) }
    internal func SetDriverHeapUsage(value uint64) {
        Interlocked.Exchange(ref driverHeapUsage, value)
    }
    internal func AddVulkanObjectAllocation(value uint64) { Interlocked.Add(ref vulkanObjectAllocationCount, value) }
    internal func AddVulkanDeviceMemoryAllocation(value uint64) { Interlocked.Add(ref vulkanDeviceMemoryAllocationCount, value) }
    internal func AddUploadBytes(value uint64) { Interlocked.Add(ref uploadBytes, value) }
    internal func SetImageByteBudget(value uint64) {
        Interlocked.Exchange(ref imageByteBudget, value)
    }
    internal func SetImageResidentBytes(value uint64) {
        Interlocked.Exchange(ref imageResidentBytes, value)
    }
    internal func SetImageLiveObjectCount(value uint64) {
        Interlocked.Exchange(ref imageLiveObjectCount, value)
    }
    internal func SetImagePeakResidentBytes(value uint64) {
        while true {
            let current = Interlocked.Read(ref imagePeakResidentBytes)
            if value <= current || Interlocked.CompareExchange(ref imagePeakResidentBytes, value, current) == current {
                return
            }
        }
    }
    internal func SetImagePeakLiveObjectCount(value uint64) {
        while true {
            let current = Interlocked.Read(ref imagePeakLiveObjectCount)
            if value <= current || Interlocked.CompareExchange(ref imagePeakLiveObjectCount, value, current) == current {
                return
            }
        }
    }
    internal func SetTextAtlasCount(value uint64) {
        Interlocked.Exchange(ref textAtlasCount, value)
    }
    internal func SetTextAtlasByteBudget(value uint64) {
        Interlocked.Exchange(ref textAtlasByteBudget, value)
    }
    internal func SetTextAtlasResidentBytes(value uint64) {
        Interlocked.Exchange(ref textAtlasResidentBytes, value)
    }
    internal func SetTextAtlasLiveObjectCount(value uint64) {
        Interlocked.Exchange(ref textAtlasLiveObjectCount, value)
    }
    internal func SetTextAtlasPeakCount(value uint64) {
        while true {
            let current = Interlocked.Read(ref textAtlasPeakCount)
            if value <= current || Interlocked.CompareExchange(ref textAtlasPeakCount, value, current) == current {
                return
            }
        }
    }
    internal func SetTextAtlasPeakByteBudget(value uint64) {
        while true {
            let current = Interlocked.Read(ref textAtlasPeakByteBudget)
            if value <= current || Interlocked.CompareExchange(ref textAtlasPeakByteBudget, value, current) == current {
                return
            }
        }
    }
    internal func SetTextAtlasPeakResidentBytes(value uint64) {
        while true {
            let current = Interlocked.Read(ref textAtlasPeakResidentBytes)
            if value <= current || Interlocked.CompareExchange(ref textAtlasPeakResidentBytes, value, current) == current {
                return
            }
        }
    }
    internal func SetTextAtlasPeakLiveObjectCount(value uint64) {
        while true {
            let current = Interlocked.Read(ref textAtlasPeakLiveObjectCount)
            if value <= current || Interlocked.CompareExchange(ref textAtlasPeakLiveObjectCount, value, current) == current {
                return
            }
        }
    }
    internal func AddTextAtlasRecordedUploadBytes(value uint64) {
        Interlocked.Add(ref textAtlasRecordedUploadBytes, value)
    }
    internal func AddTextAtlasEviction(value uint64) { Interlocked.Add(ref textAtlasEvictionCount, value) }
    internal func AddTextAtlasRetirement(value uint64) { Interlocked.Add(ref textAtlasRetirementCount, value) }
    internal func AddImageEviction(value uint64) { Interlocked.Add(ref imageEvictionCount, value) }
    internal func AddImageRetirement(value uint64) { Interlocked.Add(ref imageRetirementCount, value) }
    internal func AddDraw(value uint64) { Interlocked.Add(ref drawCount, value) }
    internal func AddPipelineChange(value uint64) { Interlocked.Add(ref pipelineChangeCount, value) }
    internal func AddDescriptorChange(value uint64) { Interlocked.Add(ref descriptorChangeCount, value) }
    internal func AddPass(value uint64) { Interlocked.Add(ref passCount, value) }
    internal func AddBarrier(value uint64) { Interlocked.Add(ref barrierCount, value) }
    internal func AddDamage(count uint64, area uint64) {
        Interlocked.Add(ref damageCount, count)
        Interlocked.Add(ref damageArea, area)
    }
    internal func AddSurfaceRecovery(value uint64) { Interlocked.Add(ref surfaceRecoveryCount, value) }
    internal func AddDeviceRecovery(value uint64) { Interlocked.Add(ref deviceRecoveryCount, value) }
    internal func AddValidationError(value uint64) {
        Interlocked.Add(ref validationErrorCount, value)
    }
    internal func AddResult(failure bool) {
        Interlocked.Increment(ref resultCount)
        if failure {
            Interlocked.Increment(ref resultFailureCount)
        }
    }
    internal func SetManagedAllocatedBytes(value uint64) { Interlocked.Exchange(ref managedAllocatedBytes, value) }
    internal func SetVulkanObjectCount(value uint64) { Interlocked.Exchange(ref vulkanObjectCount, value) }
    internal func SetVulkanObjectAllocationCount(value uint64) {
        Interlocked.Exchange(ref vulkanObjectAllocationCount, value)
    }
    internal func SetVulkanDeviceMemoryAllocationCount(value uint64) {
        Interlocked.Exchange(ref vulkanDeviceMemoryAllocationCount, value)
    }
    internal func SetVulkanDeviceMemoryBytes(value uint64) { Interlocked.Exchange(ref vulkanDeviceMemoryBytes, value) }
    internal func SetCacheBytes(value uint64) { Interlocked.Exchange(ref cacheBytes, value) }
    internal func SetAllocatorBytes(value uint64) { Interlocked.Exchange(ref allocatorBytes, value) }
    internal func SetDirtyChunkCount(value uint64) { Interlocked.Exchange(ref dirtyChunkCount, value) }
    internal func SetReusedChunkCount(value uint64) { Interlocked.Exchange(ref reusedChunkCount, value) }

    internal func AddVulkanObjects(value uint64) {
        Interlocked.Add(ref vulkanObjectCount, value)
    }

    internal func RemoveVulkanObjects(value uint64) {
        while true {
            let current = Interlocked.Read(ref vulkanObjectCount)
            let next = if value >= current { 0uL } else { current - value }
            if Interlocked.CompareExchange(ref vulkanObjectCount, next, current) == current {
                return
            }
        }
    }

    internal func AddVulkanDeviceMemoryBytes(value uint64) {
        Interlocked.Add(ref vulkanDeviceMemoryBytes, value)
    }

    internal func RemoveVulkanDeviceMemoryBytes(value uint64) {
        while true {
            let current = Interlocked.Read(ref vulkanDeviceMemoryBytes)
            let next = if value >= current { 0uL } else { current - value }
            if Interlocked.CompareExchange(ref vulkanDeviceMemoryBytes, next, current) == current {
                return
            }
        }
    }
}
