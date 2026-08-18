package Goo

import System

internal enum VulkanDiagnosticTimestampStage {
    Upload;
    Main;
    Effects;
    Offscreen;
}

internal struct VulkanDiagnosticTimestampContext {
    var run uint64
    var workload uint64
    var process uint64
    var window uint64
    var frame uint64
    var sample uint64
    var queue uint64
    var submission uint64
    var fence uint64
}

internal struct VulkanDiagnosticTimestampRange {
    var firstQuery uint32
    var reset bool
    var beginRecorded bool
    var endRecorded bool
    var submitted bool
    var resolved bool
    var unavailable bool
    var result VkResult
    var run uint64
    var workload uint64
    var process uint64
    var window uint64
    var frame uint64
    var sample uint64
    var queue uint64
    var submission uint64
    var fence uint64
    var beginTicks uint64
    var endTicks uint64
    var elapsedTicks uint64
    var elapsedNanoseconds uint64
}

internal unsafe sealed class VulkanDiagnosticTimestampState {
    private const TimestampFrameSlotCount int32 = 2
    private const TimestampStageCount int32 = 4
    private const TimestampQueriesPerStage int32 = 2
    private const TimestampQueriesPerSlot int32 = TimestampStageCount * TimestampQueriesPerStage
    private const TimestampQueryCount int32 = TimestampFrameSlotCount * TimestampQueriesPerSlot

    private let timestampRanges []VulkanDiagnosticTimestampRange = [16]VulkanDiagnosticTimestampRange
    private var timestampDevice VkDevice = nint(0)
    private var timestampDispatch VkDeviceDispatch = VkDeviceDispatch{}
    private var timestampPool VkQueryPool = 0uL
    private var timestampPoolCreated bool
    private var timestampSupported bool
    private var timestampComputeAndGraphics bool
    private var timestampValidBits uint32
    private var timestampMask uint64
    private var timestampPeriod float32
    private var timestampLastResult VkResult = VkConstants.VK_SUCCESS

    private let diagnostics VulkanDiagnostics
    private let objectAccounting VulkanObjectAccounting?

    internal init(nativeDiagnostics VulkanDiagnostics,
        nativeObjectAccounting VulkanObjectAccounting?) {
        diagnostics = nativeDiagnostics
        objectAccounting = nativeObjectAccounting
    }

    internal prop TimestampFrameSlotCountValue int32 { get { return TimestampFrameSlotCount } }
    internal prop TimestampStageCountValue int32 { get { return TimestampStageCount } }
    internal prop TimestampQueryCountValue int32 { get { return TimestampQueryCount } }
    internal prop TimestampQueryPool VkQueryPool { get { return timestampPool } }
    internal prop TimestampQueriesCreated bool { get { return timestampPoolCreated } }
    internal prop TimestampQueriesSupported bool { get { return timestampSupported } }
    internal prop TimestampComputeAndGraphicsSupported bool { get { return timestampComputeAndGraphics } }
    internal prop TimestampValidBits uint32 { get { return timestampValidBits } }
    internal prop TimestampPeriod float32 { get { return timestampPeriod } }
    internal prop TimestampLastResult VkResult { get { return timestampLastResult } }

    internal func CreateTimestampQueryPool(nativeDevice VkDevice, nativeDispatch VkDeviceDispatch,
        validBits uint32, period float32, computeAndGraphics VkBool32) VkResult {
        if timestampPoolCreated {
            if nativeDevice == timestampDevice {
                return VkConstants.VK_SUCCESS
            }
            return VkConstants.VK_ERROR_INITIALIZATION_FAILED
        }

        timestampDevice = nativeDevice
        timestampDispatch = nativeDispatch
        timestampValidBits = validBits
        timestampPeriod = period
        timestampComputeAndGraphics = computeAndGraphics != VkConstants.VK_FALSE
        timestampMask = BuildTimestampMask(validBits)
        timestampSupported = nativeDevice != nint(0) && validBits != 0u && validBits <= 64u
            && period > 0.0F
        timestampLastResult = VkConstants.VK_SUCCESS
        ResetTimestampRangeState()

        if !timestampSupported || timestampDispatch.vkCreateQueryPool == nil
            || timestampDispatch.vkDestroyQueryPool == nil
            || timestampDispatch.vkGetQueryPoolResults == nil
            || timestampDispatch.vkCmdResetQueryPool == nil
            || timestampDispatch.vkCmdWriteTimestamp2 == nil {
            timestampSupported = false
            timestampComputeAndGraphics = false
            MarkAllTimestampRangesUnavailable()
            timestampLastResult = VkConstants.VK_ERROR_FEATURE_NOT_PRESENT
            return VkConstants.VK_NOT_READY
        }

        var createInfo = VkQueryPoolCreateInfo{}
        createInfo.sType = VkConstants.VK_STRUCTURE_TYPE_QUERY_POOL_CREATE_INFO
        createInfo.queryType = VkConstants.VK_QUERY_TYPE_TIMESTAMP
        createInfo.queryCount = uint32(TimestampQueryCount)
        let createQueryPool = timestampDispatch.vkCreateQueryPool
        let result = createQueryPool(timestampDevice, &createInfo, nil, &timestampPool)
        timestampLastResult = result
        if result != VkConstants.VK_SUCCESS || timestampPool == 0uL {
            timestampPool = 0uL
            timestampPoolCreated = false
            timestampSupported = false
            timestampComputeAndGraphics = false
            if result == VkConstants.VK_SUCCESS {
                timestampLastResult = VkConstants.VK_ERROR_INITIALIZATION_FAILED
            }
            MarkAllTimestampRangesUnavailable()
            diagnostics.RecordResult(VulkanDiagnosticEventIds.GpuTimestamp, int32(timestampLastResult))
            return timestampLastResult
        }
        try {
            if let accounting = objectAccounting {
                accounting.Allocate()
            }
        } catch (error Exception) {
            let destroyQueryPool = timestampDispatch.vkDestroyQueryPool
            destroyQueryPool(timestampDevice, timestampPool, nil)
            timestampPool = 0uL
            timestampPoolCreated = false
            throw error
        }
        timestampPoolCreated = true
        diagnostics.RecordResult(VulkanDiagnosticEventIds.GpuTimestamp, int32(result))
        return result
    }

    internal func DestroyTimestampQueryPool() {
        if !timestampPoolCreated {
            return
        }
        if !TimestampPoolComplete() {
            return
        }
        if timestampPool == 0uL || timestampDispatch.vkDestroyQueryPool == nil {
            return
        }
        let destroyQueryPool = timestampDispatch.vkDestroyQueryPool
        destroyQueryPool(timestampDevice, timestampPool, nil)
        if let accounting = objectAccounting {
            accounting.Release()
        }
        timestampPool = 0uL
        timestampPoolCreated = false
        timestampSupported = false
        timestampComputeAndGraphics = false
        timestampDevice = nint(0)
        timestampDispatch = VkDeviceDispatch{}
        timestampLastResult = VkConstants.VK_SUCCESS
        ResetTimestampRangeState()
    }

    internal func ForceDestroyTimestampQueryPool() bool {
        if !timestampPoolCreated {
            return true
        }
        if timestampPool == 0uL {
            timestampPoolCreated = false
            timestampSupported = false
            timestampComputeAndGraphics = false
            timestampValidBits = 0u
            timestampMask = 0uL
            timestampPeriod = 0.0F
            timestampDevice = nint(0)
            timestampDispatch = VkDeviceDispatch{}
            timestampLastResult = VkConstants.VK_ERROR_DEVICE_LOST
            ResetTimestampRangeState()
            return true
        }
        if timestampDevice == nint(0) || timestampDispatch.vkDestroyQueryPool == nil {
            return false
        }
        let destroyQueryPool = timestampDispatch.vkDestroyQueryPool
        destroyQueryPool(timestampDevice, timestampPool, nil)
        if let accounting = objectAccounting {
            accounting.Release()
        }
        timestampPool = 0uL
        timestampPoolCreated = false
        timestampSupported = false
        timestampComputeAndGraphics = false
        timestampValidBits = 0u
        timestampMask = 0uL
        timestampPeriod = 0.0F
        timestampDevice = nint(0)
        timestampDispatch = VkDeviceDispatch{}
        timestampLastResult = VkConstants.VK_ERROR_DEVICE_LOST
        ResetTimestampRangeState()
        return true
    }

    internal func AbandonTimestampQueryPool() {
        timestampPool = 0uL
        timestampPoolCreated = false
        timestampSupported = false
        timestampComputeAndGraphics = false
        timestampValidBits = 0u
        timestampMask = 0uL
        timestampPeriod = 0.0F
        timestampDevice = nint(0)
        timestampDispatch = VkDeviceDispatch{}
        timestampLastResult = VkConstants.VK_ERROR_DEVICE_LOST
        ResetTimestampRangeState()
    }

    private func TimestampPoolComplete() bool {
        if timestampDispatch.vkGetFenceStatus == nil {
            return false
        }
        let getFenceStatus = timestampDispatch.vkGetFenceStatus
        var slot int32 = 0
        while slot < TimestampFrameSlotCount {
            var stageIndex int32 = 0
            while stageIndex < TimestampStageCount {
                let state = timestampRanges[slot * TimestampStageCount + stageIndex]
                if state.submitted && !state.resolved && !state.unavailable {
                    if state.fence == 0uL
                        || getFenceStatus(timestampDevice, VkFence(state.fence)) != VkConstants.VK_SUCCESS {
                        return false
                    }
                }
                stageIndex++
            }
            slot++
        }
        return true
    }

    internal func ResetTimestampQueries(commandBuffer VkCommandBuffer, slot int32,
        context VulkanDiagnosticTimestampContext) bool {
        if !ValidTimestampSlot(slot) || commandBuffer == nint(0) {
            MarkTimestampSlotUnavailable(slot)
            return false
        }
        if !timestampPoolCreated || !timestampSupported
            || timestampDispatch.vkCmdResetQueryPool == nil {
            MarkTimestampSlotUnavailable(slot)
            RecordTimestampControl(context, VkConstants.VK_NOT_READY, 0uL, 0uL)
            return false
        }

        if TimestampSlotPending(slot) {
            return false
        }

        ClearTimestampSlot(slot)
        let firstQuery = FirstTimestampQuery(slot, 0)
        let resetQueryPool = timestampDispatch.vkCmdResetQueryPool
        resetQueryPool(commandBuffer, timestampPool, firstQuery, uint32(TimestampQueriesPerSlot))
        RecordTimestampControl(context, VkConstants.VK_SUCCESS, uint64(firstQuery), uint64(TimestampQueriesPerSlot))
        return true
    }

    internal func BeginTimestampStage(commandBuffer VkCommandBuffer, slot int32,
        stage VulkanDiagnosticTimestampStage, context VulkanDiagnosticTimestampContext) bool {
        if !ValidTimestampSlot(slot) || !ValidTimestampStage(stage)
            || commandBuffer == nint(0) || !timestampPoolCreated || !timestampSupported
            || timestampDispatch.vkCmdWriteTimestamp2 == nil {
            MarkTimestampStageUnavailable(slot, stage)
            return false
        }
        let rangeIndex = TimestampRangeIndex(slot, stage)
        if !timestampRanges[rangeIndex].reset || timestampRanges[rangeIndex].beginRecorded {
            MarkTimestampStageUnavailable(slot, stage)
            return false
        }
        let query = timestampRanges[rangeIndex].firstQuery
        let writeTimestamp = timestampDispatch.vkCmdWriteTimestamp2
        writeTimestamp(commandBuffer, VkConstants.VK_PIPELINE_STAGE_2_TOP_OF_PIPE_BIT, timestampPool, query)
        var state = timestampRanges[rangeIndex]
        state.beginRecorded = true
        state.run = context.run
        state.workload = context.workload
        state.process = context.process
        state.window = context.window
        state.frame = context.frame
        state.sample = context.sample
        state.queue = context.queue
        state.submission = context.submission
        state.fence = context.fence
        state.result = VkConstants.VK_SUCCESS
        timestampRanges[rangeIndex] = state
        return true
    }

    internal func EndTimestampStage(commandBuffer VkCommandBuffer, slot int32,
        stage VulkanDiagnosticTimestampStage, context VulkanDiagnosticTimestampContext) bool {
        if !ValidTimestampSlot(slot) || !ValidTimestampStage(stage)
            || commandBuffer == nint(0) || !timestampPoolCreated || !timestampSupported
            || timestampDispatch.vkCmdWriteTimestamp2 == nil {
            MarkTimestampStageUnavailable(slot, stage)
            return false
        }
        let rangeIndex = TimestampRangeIndex(slot, stage)
        if !timestampRanges[rangeIndex].beginRecorded || timestampRanges[rangeIndex].endRecorded {
            MarkTimestampStageUnavailable(slot, stage)
            return false
        }
        let query = timestampRanges[rangeIndex].firstQuery + 1u
        let writeTimestamp = timestampDispatch.vkCmdWriteTimestamp2
        writeTimestamp(commandBuffer, VkConstants.VK_PIPELINE_STAGE_2_BOTTOM_OF_PIPE_BIT, timestampPool, query)
        var state = timestampRanges[rangeIndex]
        state.endRecorded = true
        state.run = context.run
        state.workload = context.workload
        state.process = context.process
        state.window = context.window
        state.frame = context.frame
        state.sample = context.sample
        state.queue = context.queue
        state.submission = context.submission
        state.fence = context.fence
        state.result = VkConstants.VK_SUCCESS
        timestampRanges[rangeIndex] = state
        return true
    }

    internal func SubmitTimestampSlot(slot int32, context VulkanDiagnosticTimestampContext) bool {
        if !ValidTimestampSlot(slot) {
            return false
        }
        var submittedStageIndex int32 = 0
        while submittedStageIndex < TimestampStageCount {
            if timestampRanges[slot * TimestampStageCount + submittedStageIndex].submitted {
                return false
            }
            submittedStageIndex++
        }
        var submitted = false
        var stageIndex int32 = 0
        while stageIndex < TimestampStageCount {
            let rangeIndex = slot * TimestampStageCount + stageIndex
            var state = timestampRanges[rangeIndex]
            if !state.unavailable && state.beginRecorded && state.endRecorded {
                state.submitted = true
                state.resolved = false
                state.run = context.run
                state.workload = context.workload
                state.process = context.process
                state.window = context.window
                state.frame = context.frame
                state.sample = context.sample
                state.queue = context.queue
                state.submission = context.submission
                state.fence = context.fence
                state.result = VkConstants.VK_SUCCESS
                submitted = true
            } else {
                state.unavailable = true
                state.resolved = true
                state.result = VkConstants.VK_NOT_READY
            }
            timestampRanges[rangeIndex] = state
            stageIndex++
        }
        return submitted
    }

    internal func ResolveTimestampSlot(slot int32, context VulkanDiagnosticTimestampContext) VkResult {
        if !ValidTimestampSlot(slot) || !timestampPoolCreated || !timestampSupported {
            return VkConstants.VK_NOT_READY
        }
        if timestampDispatch.vkGetFenceStatus == nil || timestampDispatch.vkGetQueryPoolResults == nil {
            return VkConstants.VK_NOT_READY
        }

        var hasPendingStage = false
        var fenceValue uint64 = 0uL
        var stageIndex int32 = 0
        while stageIndex < TimestampStageCount {
            let state = timestampRanges[slot * TimestampStageCount + stageIndex]
            if state.submitted && !state.resolved && !state.unavailable {
                hasPendingStage = true
                if fenceValue == 0uL {
                    fenceValue = state.fence
                }
            }
            stageIndex++
        }
        if !hasPendingStage {
            return VkConstants.VK_SUCCESS
        }

        if fenceValue == 0uL {
            return VkConstants.VK_NOT_READY
        }
        let getFenceStatus = timestampDispatch.vkGetFenceStatus
        let fenceResult = getFenceStatus(timestampDevice, VkFence(fenceValue))
        if fenceResult != VkConstants.VK_SUCCESS {
            if fenceResult != VkConstants.VK_NOT_READY {
                timestampLastResult = fenceResult
                diagnostics.RecordResult(VulkanDiagnosticEventIds.GpuTimestamp, int32(fenceResult),
                    context.frame, context.queue, context.submission, fenceValue)
            }
            return fenceResult
        }

        let values *uint64 = stackalloc [TimestampQueriesPerStage]uint64
        let getQueryPoolResults = timestampDispatch.vkGetQueryPoolResults
        var overallResult VkResult = VkConstants.VK_SUCCESS
        stageIndex = 0
        while stageIndex < TimestampStageCount {
            let rangeIndex = slot * TimestampStageCount + stageIndex
            var state = timestampRanges[rangeIndex]
            if state.submitted && !state.resolved && !state.unavailable {
                let result = getQueryPoolResults(
                    timestampDevice,
                    timestampPool,
                    state.firstQuery,
                    uint32(TimestampQueriesPerStage),
                    nuint(TimestampQueriesPerStage * 8),
                    *void(values),
                    VkDeviceSize(8),
                    VkQueryResultFlags(uint32(VkConstants.VK_QUERY_RESULT_64_BIT)))
                timestampLastResult = result
                if result == VkConstants.VK_NOT_READY {
                    overallResult = result
                } else if result != VkConstants.VK_SUCCESS {
                    state.unavailable = true
                    state.resolved = true
                    state.result = result
                    timestampRanges[rangeIndex] = state
                    overallResult = result
                    diagnostics.RecordResult(VulkanDiagnosticEventIds.GpuTimestamp, int32(result),
                        context.frame, context.queue, context.submission, fenceValue)
                } else {
                    state.beginTicks = values[0]
                    state.endTicks = values[1]
                    state.elapsedTicks = ElapsedTimestampTicks(state.beginTicks, state.endTicks)
                    state.elapsedNanoseconds = ElapsedTimestampNanoseconds(state.elapsedTicks)
                    state.resolved = true
                    state.result = result
                    timestampRanges[rangeIndex] = state
                    RecordTimestampStage(state, TimestampStageFromIndex(stageIndex))
                }
            }
            stageIndex++
        }
        diagnostics.RecordResult(VulkanDiagnosticEventIds.GpuTimestamp, int32(overallResult),
            context.frame, context.queue, context.submission, fenceValue)
        return overallResult
    }

    internal func IsTimestampStageUnavailable(slot int32, stage VulkanDiagnosticTimestampStage) bool {
        if !ValidTimestampSlot(slot) || !ValidTimestampStage(stage) {
            return true
        }
        return timestampRanges[TimestampRangeIndex(slot, stage)].unavailable
    }

    internal func IsTimestampStageResolved(slot int32, stage VulkanDiagnosticTimestampStage) bool {
        if !ValidTimestampSlot(slot) || !ValidTimestampStage(stage) {
            return false
        }
        let state = timestampRanges[TimestampRangeIndex(slot, stage)]
        return state.resolved && !state.unavailable
    }

    internal func TimestampStageTicks(slot int32, stage VulkanDiagnosticTimestampStage) uint64 {
        if !ValidTimestampSlot(slot) || !ValidTimestampStage(stage) {
            return 0uL
        }
        return timestampRanges[TimestampRangeIndex(slot, stage)].elapsedTicks
    }

    internal func TimestampStageNanoseconds(slot int32, stage VulkanDiagnosticTimestampStage) uint64 {
        if !ValidTimestampSlot(slot) || !ValidTimestampStage(stage) {
            return 0uL
        }
        return timestampRanges[TimestampRangeIndex(slot, stage)].elapsedNanoseconds
    }

    internal func TimestampStageResult(slot int32, stage VulkanDiagnosticTimestampStage) VkResult {
        if !ValidTimestampSlot(slot) || !ValidTimestampStage(stage) {
            return VkConstants.VK_NOT_READY
        }
        return timestampRanges[TimestampRangeIndex(slot, stage)].result
    }

    private func ValidTimestampSlot(slot int32) bool {
        return slot >= 0 && slot < TimestampFrameSlotCount
    }

    private func ValidTimestampStage(stage VulkanDiagnosticTimestampStage) bool {
        let index = int32(stage)
        return index >= 0 && index < TimestampStageCount
    }

    private func TimestampSlotPending(slot int32) bool {
        if !ValidTimestampSlot(slot) {
            return false
        }
        var stageIndex int32 = 0
        while stageIndex < TimestampStageCount {
            let state = timestampRanges[slot * TimestampStageCount + stageIndex]
            if state.submitted && !state.resolved && !state.unavailable {
                return true
            }
            stageIndex++
        }
        return false
    }

    private func TimestampRangeIndex(slot int32, stage VulkanDiagnosticTimestampStage) int32 {
        return slot * TimestampStageCount + int32(stage)
    }

    private func FirstTimestampQuery(slot int32, stageIndex int32) uint32 {
        return uint32(slot * TimestampQueriesPerSlot + stageIndex * TimestampQueriesPerStage)
    }

    private func TimestampStageFromIndex(stageIndex int32) VulkanDiagnosticTimestampStage {
        if stageIndex == int32(VulkanDiagnosticTimestampStage.Upload) {
            return VulkanDiagnosticTimestampStage.Upload
        }
        if stageIndex == int32(VulkanDiagnosticTimestampStage.Main) {
            return VulkanDiagnosticTimestampStage.Main
        }
        if stageIndex == int32(VulkanDiagnosticTimestampStage.Effects) {
            return VulkanDiagnosticTimestampStage.Effects
        }
        return VulkanDiagnosticTimestampStage.Offscreen
    }

    private func BuildTimestampMask(validBits uint32) uint64 {
        if validBits >= 64u {
            return uint64.MaxValue
        }
        if validBits == 0u {
            return 0uL
        }
        return (1uL << int32(validBits)) - 1uL
    }

    private func ElapsedTimestampTicks(begin uint64, end uint64) uint64 {
        let maskedBegin = begin & timestampMask
        let maskedEnd = end & timestampMask
        if maskedEnd >= maskedBegin {
            return maskedEnd - maskedBegin
        }
        return (timestampMask - maskedBegin + 1uL) + maskedEnd
    }

    private func ElapsedTimestampNanoseconds(ticks uint64) uint64 {
        if timestampPeriod <= 0.0F {
            return 0uL
        }
        return uint64(float64(ticks) * float64(timestampPeriod))
    }

    private func ResetTimestampRangeState() {
        var slot int32 = 0
        while slot < TimestampFrameSlotCount {
            ClearTimestampSlot(slot)
            slot++
        }
    }

    private func ClearTimestampSlot(slot int32) {
        var stageIndex int32 = 0
        while stageIndex < TimestampStageCount {
            let rangeIndex = slot * TimestampStageCount + stageIndex
            timestampRanges[rangeIndex] = VulkanDiagnosticTimestampRange{
                firstQuery: FirstTimestampQuery(slot, stageIndex),
                reset: true,
                beginRecorded: false,
                endRecorded: false,
                submitted: false,
                resolved: false,
                unavailable: false,
                result: VkConstants.VK_SUCCESS,
                run: 0uL,
                workload: 0uL,
                process: 0uL,
                window: 0uL,
                frame: 0uL,
                sample: 0uL,
                queue: 0uL,
                submission: 0uL,
                fence: 0uL,
                beginTicks: 0uL,
                endTicks: 0uL,
                elapsedTicks: 0uL,
                elapsedNanoseconds: 0uL,
            }
            stageIndex++
        }
    }

    private func MarkAllTimestampRangesUnavailable() {
        var slot int32 = 0
        while slot < TimestampFrameSlotCount {
            MarkTimestampSlotUnavailable(slot)
            slot++
        }
    }

    private func MarkTimestampSlotUnavailable(slot int32) {
        if !ValidTimestampSlot(slot) {
            return
        }
        var stageIndex int32 = 0
        while stageIndex < TimestampStageCount {
            let rangeIndex = slot * TimestampStageCount + stageIndex
            var state = timestampRanges[rangeIndex]
            if state.submitted && !state.resolved {
                stageIndex++
                continue
            }
            state.unavailable = true
            state.resolved = true
            state.result = VkConstants.VK_NOT_READY
            timestampRanges[rangeIndex] = state
            stageIndex++
        }
    }

    private func MarkTimestampStageUnavailable(slot int32, stage VulkanDiagnosticTimestampStage) {
        if !ValidTimestampSlot(slot) || !ValidTimestampStage(stage) {
            return
        }
        let rangeIndex = TimestampRangeIndex(slot, stage)
        var state = timestampRanges[rangeIndex]
        if state.submitted && !state.resolved {
            return
        }
        state.unavailable = true
        state.resolved = true
        state.result = VkConstants.VK_NOT_READY
        timestampRanges[rangeIndex] = state
    }

    private func RecordTimestampControl(context VulkanDiagnosticTimestampContext,
        result VkResult, value0 uint64, value1 uint64) {
        diagnostics.Record(context.run, context.workload, context.process, context.window,
            context.frame, context.sample, context.queue, context.submission, context.fence,
            0uL, VulkanDiagnosticEventIds.GpuTimestamp, VulkanDiagnosticCategories.Timing,
            0uL, result, value0, value1)
    }

    private func RecordTimestampStage(state VulkanDiagnosticTimestampRange,
        stage VulkanDiagnosticTimestampStage) {
        let eventId = if stage == VulkanDiagnosticTimestampStage.Upload {
            VulkanDiagnosticEventIds.UploadStage
        } else if stage == VulkanDiagnosticTimestampStage.Main {
            VulkanDiagnosticEventIds.MainPass
        } else if stage == VulkanDiagnosticTimestampStage.Effects {
            VulkanDiagnosticEventIds.EffectsPass
        } else {
            VulkanDiagnosticEventIds.OffscreenPass
        }
        diagnostics.Record(state.run, state.workload, state.process, state.window, state.frame, state.sample, state.queue,
            state.submission, state.fence, uint64(state.firstQuery), eventId,
            VulkanDiagnosticCategories.Timing, 0uL, state.result,
            state.elapsedTicks, state.elapsedNanoseconds)
    }
}
