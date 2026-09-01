package GooGallery

import System
import System.Diagnostics
import Goo

class GallerySmokeAccessibility : AccessibilityAdapter {
  private var tree AccessibilityTree?

  /// Retains the latest accessibility tree for smoke assertions.
  public func Update(next AccessibilityTree) {
    tree = next
  }

  internal func Contains(name string) bool {
    guard let current = tree else {
      return false
    }
    guard let root = current.Root else {
      return false
    }
    return contains(root, name)
  }

  private func contains(node AccessibilityNode, name string) bool {
    if node.Name.IndexOf(name, StringComparison.OrdinalIgnoreCase) >= 0 {
      return true
    }
    for child in node.Children {
      if contains(child, name) {
        return true
      }
    }
    return false
  }
}

func Main() {
  Window.ConfigureApplication("Goo Gallery", "0.4.0", "io.github.obselate.goo.gallery")
  let smoke = Environment.GetEnvironmentVariable("GOO_GALLERY_SMOKE") == "1"
  let bench = Environment.GetEnvironmentVariable("GOO_GALLERY_BENCH") == "1"
  if smoke {
    RunSmoke()
    return
  }
  if bench {
    RunBench()
    return
  }
  let section = Environment.GetEnvironmentVariable("GOO_GALLERY_SECTION")
  let root = GalleryCell{}
  let window = Window{
    Title: "Goo Gallery",
    Width: 1440,
    Height: 900,
    Resizable: true,
    VSync: true,
    Background: GalleryTheme.Background,
    Root: root,
  }
  window.Open()
  PumpFrames(window, 8)
  if let name = section {
    root.OpenSection(name)
  }
  window.Run()
}

func PumpFrames(window Window, count int32) {
  var index int32 = 0
  while index < count {
    window.Pump(1.0 / 60.0)
    index = index + 1
  }
}

func CloseCleanly(window Window) {
  window.RequestClose()
  var attempts int32 = 0
  while window.IsOpen && attempts < 600 {
    window.Pump(1.0 / 60.0)
    attempts = attempts + 1
  }
  if window.IsOpen {
    throw InvalidOperationException("Goo Gallery window did not close")
  }
}

func RunSmoke() {
  let root = GalleryCell{}
  let accessibility = GallerySmokeAccessibility{}
  let window = Window{
    Title: "Goo Gallery",
    Width: 1440,
    Height: 900,
    Resizable: true,
    VSync: false,
    Background: GalleryTheme.Background,
    Root: root,
  }
  window.AccessibilityAdapter = accessibility
  window.Open()
  PumpFrames(window, 8)

  if root.ShowcaseCount() != 15 {
    throw InvalidOperationException("Goo Gallery showcase count changed")
  }
  let sizes = []int32{ 1440, 900, 960, 720 }
  var sizeIndex int32 = 0
  while sizeIndex < 4 {
    window.Width = sizes[sizeIndex]
    window.Height = sizes[sizeIndex + 1]
    PumpFrames(window, 12)
    let rootView = root.RootView()
    let showcase = root.ShowcaseView()
    let rootBox = rootView.BorderBox
    let showcaseBox = showcase.BorderBox
    let expectedWidth = float64(sizes[sizeIndex])
    let expectedHeight = float64(sizes[sizeIndex + 1])
    if !rootView.IsMounted || rootBox.Width < expectedWidth - 2.0
      || rootBox.Height < expectedHeight - 2.0 {
        throw InvalidOperationException("Goo Gallery root does not fit window "
          +sizes[sizeIndex].ToString())
      }
    if !showcase.IsMounted || showcaseBox.Width < rootBox.Width - 2.0
      || showcaseBox.Height <= 0.0
      || showcaseBox.Y < rootBox.Y
      || showcaseBox.Y + showcaseBox.Height > rootBox.Y + rootBox.Height + 1.0 {
        throw InvalidOperationException("Goo Gallery showcase does not fit at "
          +sizes[sizeIndex].ToString())
      }
    sizeIndex = sizeIndex + 2
  }

  root.OpenShowcase(0)
  var index int32 = 0
  while index < root.ShowcaseCount() {
    if root.CurrentShowcase() != index {
      throw InvalidOperationException("Goo Gallery pager skipped showcase "
        +index.ToString())
    }
    PumpFrames(window, 24)
    if index == 1 && !accessibility.Contains("Orientation:") {
      throw InvalidOperationException("Goo Gallery pager did not render the first Compose showcase")
    }
    if index == 2 && !accessibility.Contains("Poster width") {
      throw InvalidOperationException("Goo Gallery pager did not render the next Compose showcase")
    }
    if index == 3 && !accessibility.Contains("Letter S") {
      throw InvalidOperationException("Goo Gallery did not render the retained phrase surface")
    }
    if index + 1 < root.ShowcaseCount() && !root.NextShowcase() {
      throw InvalidOperationException("Goo Gallery pager cannot move forward")
    }
    index = index + 1
  }
  index = root.ShowcaseCount() - 1
  while index > 0 {
    if !root.PreviousShowcase() {
      throw InvalidOperationException("Goo Gallery pager cannot move backward")
    }
    PumpFrames(window, 2)
    index = index - 1
  }
  if root.CurrentShowcase() != 0 {
    throw InvalidOperationException("Goo Gallery pager did not return to opening")
  }

  let names = []string{ "compose", "surfaces", "motion", "shaders", "studio" }
  let starts = []int32{ 1, 3, 4, 6, 14 }
  var chapter int32 = 0
  while chapter < names.Length {
    if !root.OpenSection(names[chapter]) || root.CurrentShowcase() != starts[chapter] {
      throw InvalidOperationException("Goo Gallery cannot route chapter " + names[chapter])
    }
    PumpFrames(window, 8)
    chapter = chapter + 1
  }

  index = 6
  while index < 14 {
    root.OpenShowcase(index)
    PumpFrames(window, 60)
    index = index + 1
  }
  root.OpenShowcase(14)
  PumpFrames(window, 240)

  CloseCleanly(window)
  Console.WriteLine("gallery-smoke: sizes=2 layout=fit showcases=15 pager=forward-back routes=5 shaderFrames=480 close=1")
}

func RunBench() {
  let root = GalleryCell{}
  let window = Window{
    Title: "Goo Gallery",
    Width: 1440,
    Height: 900,
    Resizable: true,
    VSync: false,
    Background: GalleryTheme.Background,
    Root: root,
  }
  window.Open()
  PumpFrames(window, 8)

  let samples = [600]float64{}
  var failures int32 = 0

  root.OpenShowcase(6)
  PumpFrames(window, 24)
  failures = failures + MeasureRun(window, samples, "shader-wolfenstein")

  root.OpenShowcase(11)
  PumpFrames(window, 24)
  failures = failures + MeasureRun(window, samples, "shader-glass")

  root.OpenShowcase(14)
  PumpFrames(window, 24)
  failures = failures + MeasureRun(window, samples, "studio")

  CloseCleanly(window)
  if failures > 0 {
    Console.WriteLine("gallery-bench: failed=" + failures.ToString())
    Environment.Exit(1)
  }
  Console.WriteLine("gallery-bench: passed=3")
}

func MeasureRun(window Window, samples[600]float64, spot string) int32 {
  PumpFrames(window, 120)
  let clock = Stopwatch()
  var index int32 = 0
  while index < 600 {
    clock.Restart()
    window.Pump(1.0 / 60.0)
    samples[index] = float64(clock.ElapsedTicks) * 1000.0
    / float64(Stopwatch.Frequency)
    index = index + 1
  }
  Array.Sort(samples)
  let median = samples[300]
  let p95 = samples[569]
  Console.WriteLine("gallery-bench " + spot + ": median="
    +median.ToString("F2") + "ms p95=" + p95.ToString("F2") + "ms")
  if median > 17.5 || p95 > 20.0 {
    return 1
  }
  return 0
}
