package Goo.VulkanProof

import System
import System.IO
import System.Text
import System.Threading
import Goo.Vulkan.Generated

internal data struct VulkanTraceRecord {
    var run uint64
    var workload uint64
    var process uint64
    var window uint64
    var frame uint64
    var sample uint64
    var queue uint64
    var submission uint64
    var fence uint64
    var query uint64
    var eventId uint64
    var category uint64
    var severity uint64
    var result int32
    var value0 uint64
    var value1 uint64
}

internal data struct VulkanValidationRecord {
    var severity uint32
    var types uint32
    var messageId int32
    var messageHash uint32
    var messageLength uint32
    var messageOffset uint32
    var messageTruncated uint32
}

internal unsafe class VulkanDiagnostics {
    private const TraceCapacity int32 = 1024
    private const ValidationCapacity int32 = 64
    private const ValidationTextCapacity int32 = 512

    private let trace []?VulkanTraceRecord
    private let validation []?VulkanValidationRecord
    private let validationText []?uint8
    private var traceWrite int32
    private var traceDropped int32
    private var validationWrite int32
    private var validationDropped int32
    private var validationErrors int32
    private var fatalCode int32
    private var fatalValue uint64

    internal prop TraceCapacityValue int32 { get { return TraceCapacity } }
    internal prop ValidationCapacityValue int32 { get { return ValidationCapacity } }
    internal prop ValidationErrorCount int32 { get { return validationErrors } }
    internal prop TraceDroppedCount int32 { get { return traceDropped } }
    internal prop ValidationDroppedCount int32 { get { return validationDropped } }

    internal init() {
        trace = [TraceCapacity]VulkanTraceRecord
        validation = [ValidationCapacity]VulkanValidationRecord
        validationText = [ValidationCapacity * ValidationTextCapacity]uint8
    }

    internal func Record(run uint64, workload uint64, process uint64, window uint64,
        frame uint64, sample uint64, queue uint64, submission uint64, fence uint64,
        query uint64, eventId uint64, category uint64, severity uint64, result int32,
        value0 uint64, value1 uint64) {
        let writeIndex = Interlocked.Increment(ref traceWrite) - 1
        if writeIndex < 0 { return }
        if let storage = trace {
            let slot = writeIndex % storage.Length
            if writeIndex >= storage.Length {
                Interlocked.Increment(ref traceDropped)
            }
            storage[slot] = VulkanTraceRecord{
                run: run,
                workload: workload,
                process: process,
                window: window,
                frame: frame,
                sample: sample,
                queue: queue,
                submission: submission,
                fence: fence,
                query: query,
                eventId: eventId,
                category: category,
                severity: severity,
                result: result,
                value0: value0,
                value1: value1,
            }
        }
    }

    internal func RecordResult(eventId uint64, result int32) {
        Record(0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL, 0uL,
            eventId, 2uL, 0uL, result, 0uL, 0uL)
    }

    internal func CaptureValidation(severity uint32, types uint32, messageId int32, message *int8) {
        if let records = validation {
            if let bytes = validationText {
                let writeIndex = Interlocked.Increment(ref validationWrite) - 1
                if writeIndex < 0 { return }
                let slot = writeIndex % records.Length
                if writeIndex >= records.Length {
                    Interlocked.Increment(ref validationDropped)
                }
                var length uint32 = 0u
                var hash uint32 = 2166136261u
                while message != nil && length < uint32(ValidationTextCapacity) {
                    let current = message[length]
                    if current == int8(0) { break }
                    let value = uint8(current)
                    bytes[slot * ValidationTextCapacity + int32(length)] = value
                    hash = (hash ^ uint32(value)) * 16777619u
                    length++
                }
                var truncated uint32 = 0u
                if message != nil && length == uint32(ValidationTextCapacity) && message[length] != int8(0) {
                    truncated = 1u
                }
                let messageLength = length
                let record = VulkanValidationRecord{
                    severity: severity,
                    types: types,
                    messageId: messageId,
                    messageHash: hash,
                    messageLength: messageLength,
                    messageOffset: uint32(slot * ValidationTextCapacity),
                    messageTruncated: truncated,
                }
                records[slot] = record
                if (severity & uint32(VkConstants.VK_DEBUG_UTILS_MESSAGE_SEVERITY_ERROR_BIT_EXT)) != 0u {
                    Interlocked.Increment(ref validationErrors)
                }
            }
        }
    }

    internal func CaptureFatal(code int32, value uint64) {
        if fatalCode == 0 {
            fatalCode = code
            fatalValue = value
        }
        RecordResult(0xFFFFuL, code)
    }

    internal func FlushNdjson(writer TextWriter) {
        if let storage = trace {
            let total = traceWrite
            let start = total > storage.Length ? total - storage.Length : 0
            var index = start
            while index < total {
                let record = storage[index % storage.Length]
                writer.WriteLine("{\"kind\":\"trace\",\"run\":${record.run},\"workload\":${record.workload},\"process\":${record.process},\"window\":${record.window},\"frame\":${record.frame},\"sample\":${record.sample},\"queue\":${record.queue},\"submission\":${record.submission},\"fence\":${record.fence},\"query\":${record.query},\"event\":${record.eventId},\"category\":${record.category},\"severity\":${record.severity},\"result\":${record.result},\"value0\":${record.value0},\"value1\":${record.value1}}")
                index++
            }
        }
        if let records = validation {
            if let bytes = validationText {
                let total = validationWrite
                let start = total > records.Length ? total - records.Length : 0
                var index = start
                while index < total {
                    let record = records[index % records.Length]
                    let text = StringBuilder()
                    var byteIndex int32 = 0
                    while byteIndex < int32(record.messageLength) && byteIndex < ValidationTextCapacity {
                        text.Append(bytes[int32(record.messageOffset) + byteIndex].ToString("x2"))
                        byteIndex++
                    }
                    writer.WriteLine("{\"kind\":\"validation\",\"severity\":${record.severity},\"types\":${record.types},\"messageId\":${record.messageId},\"messageHash\":${record.messageHash},\"messageLength\":${record.messageLength},\"messageTruncated\":${record.messageTruncated},\"messageHex\":\"${text}\"}")
                    index++
                }
            }
        }
        writer.WriteLine("{\"kind\":\"summary\",\"traceDropped\":${traceDropped},\"validationDropped\":${validationDropped},\"validationErrors\":${validationErrors},\"fatalCode\":${fatalCode},\"fatalValue\":${fatalValue}}")
    }
}
