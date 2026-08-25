package Goo

import System
import System.IO
import System.Threading
import System.Threading.Tasks

internal sealed class DecodedImage {
  shared {
    private let failed DecodedImage = DecodedImage()

    internal prop Failed DecodedImage{ get { return failed } }

    internal func FromRgba(width int32, height int32, source []uint8) DecodedImage {
      if width <= 0 || height <= 0 {
        return Failed
      }
      if int64(width) > Int64.MaxValue / int64(height) / int64(4) {
        return Failed
      }
      let required = int64(width) * int64(height) * int64(4)
      if required != int64(source.Length) || required > int64(Int32.MaxValue) {
        return Failed
      }
      let owned = [source.Length]uint8
      Array.Copy(source, owned, source.Length)
      return DecodedImage(width, height, owned)
    }
  }

  private let gate object
  private var pixels([]uint8)?
  private var references int32
  private var disposed bool

  private init() {
    gate = Object()
    pixels = nil
  }

  private init(width int32, height int32, owned []uint8) {
    gate = Object()
    Width = width
    Height = height
    pixels = owned
    references = 1
  }

  internal prop Width int32{ get; private set; }
  internal prop Height int32{ get; private set; }
  internal prop IsValid bool{ get { return pixels != nil && !disposed } }

  internal func Retain() {
    lock gate {
      if pixels == nil || disposed {
        return
      }
      references++
    }
  }

  internal func Release() {
    lock gate {
      if pixels == nil || disposed {
        return
      }
      references--
      if references == 0 {
        disposed = true
        pixels = nil
      }
    }
  }

  internal func Pixels()([]uint8)? {
    lock gate { return pixels }
  }
}

internal sealed class ImageCompletionRegistration : IDisposable {
  private let gate object
  private let completed ManualResetEventSlim
  private var callback Action?

  internal init(value Action) {
    gate = Object()
    completed = ManualResetEventSlim(false)
    callback = value
  }

  internal func Invoke() {
    var current Action?
    lock gate {
      current = callback
      callback = nil
    }
    try {
      current?.Invoke()
    } finally {
      completed.Set()
    }
  }

  public func Dispose() {
    lock gate { callback = nil }
    completed.Set()
  }

  internal func Wait() { completed.Wait() }
}

internal sealed class ImageRequest {
  private let gate object
  private var result DecodedImage
  private var references int32

  internal init(path string, decoded DecodedImage) {
    gate = Object()
    Path = path
    result = decoded
    references = 1
  }

  internal prop Path string{ get; private set; }
  internal prop IsComplete bool{ get { return true } }
  internal prop Result DecodedImage{ get { return result } }

  internal func Wait() DecodedImage -> result

  internal func OnCompleted(callback Action) ImageCompletionRegistration {
    let registration = ImageCompletionRegistration(callback)
    registration.Invoke()
    return registration
  }

  internal func Retain() {
    lock gate {
      if references <= 0 { throw ObjectDisposedException("ImageRequest") }
      references++
      result.Retain()
    }
  }

  internal func Release() {
    var release bool
    lock gate {
      if references <= 0 { return }
      references--
      release = true
    }
    if release { result.Release() }
  }
}

internal class ImageDecoding {
  shared {
    private var synthetic bool

    internal func Request(path string) ImageRequest {
      let canonical = Canonicalize(path)
      let image = synthetic ? SyntheticImage(20, 10) : DecodedImage.Failed
      return ImageRequest(canonical, image)
    }

    internal func MatchesPath(request ImageRequest?, path string) bool {
      if request == nil { return path.Length == 0 }
      return StringComparerForPlatform().Equals(request?.Path, Canonicalize(path))
    }

    internal func SetDecodeGateForTests(gate Task?) { }
    internal func ClearDecodeGateForTests() { }
    internal func UseSyntheticDecoderForTests(enabled bool) { synthetic = enabled }
    internal func SetCacheByteBudgetForTests(bytes int64) {
      if bytes < -1 { throw ArgumentOutOfRangeException("bytes") }
    }
    internal func CacheCountForTests() int32 -> 0
    internal func DecodeWorkerCountForTests() int32 -> 0
    internal func PendingDecodeCountForTests() int32 -> 0
    internal func CachedDecodedBytesForTests() int64 -> 0L
    internal func ResetForTests() { synthetic = false }

    private func Canonicalize(path string) string {
      if String.IsNullOrWhiteSpace(path) { return "<empty>" }
      try {
        return Path.GetFullPath(path)
      } catch (error Exception) {
        return "<invalid>" + path
      }
    }

    private func StringComparerForPlatform() StringComparer -> OperatingSystem.IsWindows() ? StringComparer.OrdinalIgnoreCase : StringComparer.Ordinal

    private func SyntheticImage(width int32, height int32) DecodedImage {
      let pixels = [width * height * 4]uint8
      let split = width / 2
      for y in 0 ... height {
        for x in 0 ... width {
          let offset = (y * width + x) * 4
          pixels[offset] = uint8(x < split ? 255 : 0)
          pixels[offset + 1] = 0
          pixels[offset + 2] = uint8(x < split ? 0 : 255)
          pixels[offset + 3] = uint8(255)
        }
      }
      return DecodedImage.FromRgba(width, height, pixels)
    }
  }
}
