package Goo

import System
import System.Diagnostics
import System.IO
import System.Runtime.CompilerServices
import System.Text
import System.Threading

@assembly: InternalsVisibleTo("Goo.Showcase")

public class LavaShowcaseFactory {
  shared {
    public func Surface(
      flow float64,
      form float64,
      blend float64,
      light float64,
      hue float64,
      rainbow bool,
      rotation Point,
      seed uint32,
      handle ElementHandle,
      pointerDown((PointerEvent) -> void),
      pointerMove((PointerEvent) -> void),
      pointerUp((PointerEvent) -> void),
      pointerCancel((PointerEvent) -> void)) Blob -> LavaSurface{
        Key: "lava-surface",
        Width: Length.Percent(100),
        Height: Length.Percent(100),
        MinWidth: 0,
        MinHeight: 0,
        Handle: handle,
        Cursor: Cursor.Move,
        Flow: flow,
        Form: form,
        Blend: blend,
        Light: light,
        Hue: hue,
        Rainbow: rainbow,
        Rotation: rotation,
        Seed: seed,
        OnPointerDown: pointerDown,
        OnPointerMove: pointerMove,
        OnPointerUp: pointerUp,
        OnPointerCancel: pointerCancel,
      }
  }
}

public partial class Window {
  public func LavaHitProbe(x float64, y float64) string {
    guard let tree = node else { return "no-root" }
    guard let target = Hit().Topmost(tree, float32(x), float32(y)) else { return "miss" }
    return target.Kind.ToString() + ":" + (target.Key ?? "")
    +":" + (target.OnPointerDown != nil ? "pointer" : "no-pointer")
    +":" + target.Rect.X.ToString() + "," + target.Rect.Y.ToString()
    +"," + target.Rect.W.ToString() + "," + target.Rect.H.ToString()
  }

  public func LavaPointerMove(x float64, y float64) {
    input.QueuePointerMove(float32(x), float32(y))
  }

  public func LavaPointerPress(x float64, y float64) {
    input.QueuePointerPress(float32(x), float32(y), PointerButton.Primary, KeyModifiers{})
  }

  public func LavaPointerRelease(x float64, y float64) {
    input.QueuePointerRelease(float32(x), float32(y), PointerButton.Primary, KeyModifiers{})
  }

  public func CaptureLava(path string) {
    guard let target = windowTarget else {
      throw InvalidOperationException("Lava capture target is unavailable")
    }
    let metrics = CurrentWindowMetrics()
    if metrics.FramebufferWidth <= 0 || metrics.FramebufferHeight <= 0 {
      throw InvalidOperationException("Lava capture framebuffer is unavailable")
    }
    let region = VulkanReadbackRegion{
      X: 0u,
      Y: 0u,
      Width: uint32(metrics.FramebufferWidth),
      Height: uint32(metrics.FramebufferHeight),
    }
    let requestDeadline = Stopwatch.GetTimestamp()
    +int64(float64(Stopwatch.Frequency) * 2.0)
    var status = target.RequestReadback(node, background, dpi, region)
    while status == VulkanReadbackRequestStatus.Busy
      || status == VulkanReadbackRequestStatus.NotReady{
        if Stopwatch.GetTimestamp() >= requestDeadline {
          throw InvalidOperationException("Lava capture request timed out")
        }
        PumpScheduled(0.0)
        Thread.Yield()
        status = target.RequestReadback(node, background, dpi, region)
      }
    if status != VulkanReadbackRequestStatus.Accepted {
      throw InvalidOperationException("Lava capture request failed: " + status.ToString())
    }
    let completionDeadline = Stopwatch.GetTimestamp()
    +int64(float64(Stopwatch.Frequency) * 10.0)
    var completion = target.PollReadback()
    while completion == VkConstants.VK_NOT_READY {
      if Stopwatch.GetTimestamp() >= completionDeadline {
        throw InvalidOperationException("Lava capture completion timed out")
      }
      Thread.Yield()
      completion = target.PollReadback()
    }
    if completion != VkConstants.VK_SUCCESS {
      throw InvalidOperationException("Lava capture completion failed: " + completion.ToString())
    }
    guard let result = target.TakeReadbackResult() else {
      throw InvalidOperationException("Lava capture result is unavailable")
    }
    if int32(result.Format) != 43 || result.RowBytes != result.Width * 4u {
      throw InvalidOperationException("Lava capture format is unsupported")
    }
    let header = Encoding.ASCII.GetBytes("P6\n" + result.Width.ToString()
      +" " + result.Height.ToString() + "\n255\n")
    let pixels = result.Pixels
    let output = [header.Length + int32(result.Width * result.Height * 3u)]uint8
    Array.Copy(header, output, header.Length)
    var sourceIndex int32 = 0
    var outputIndex = header.Length
    while sourceIndex < pixels.Length {
      output[outputIndex] = pixels[sourceIndex]
      output[outputIndex + 1] = pixels[sourceIndex + 1]
      output[outputIndex + 2] = pixels[sourceIndex + 2]
      sourceIndex += 4
      outputIndex += 3
    }
    File.WriteAllBytes(path, output)
  }
}
