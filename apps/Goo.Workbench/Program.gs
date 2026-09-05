package GooWorkbench

import System
import System.IO
import Goo
import GooWorkbench.Services
import GooWorkbench.Views
import GooWorkbench.Components

func Main() {
  Window.ConfigureApplication("Workbench", "1.0.0", "io.github.obselate.goo.workbench")
  using let regular = FontSource("IBM Plex Sans", 400, false, File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "Assets", "IBMPlexSans-Regular.ttf")))
  using let semibold = FontSource("IBM Plex Sans", 600, false, File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "Assets", "IBMPlexSans-SemiBold.ttf")))
  using let mono = FontSource("IBM Plex Mono", 400, false, File.ReadAllBytes(Path.Combine(AppContext.BaseDirectory, "Assets", "IBMPlexMono-Regular.ttf")))
  mono.Register()
  regular.Register()
  semibold.Register()
  let width = if Int32.TryParse(Environment.GetEnvironmentVariable("WORKBENCH_WIDTH"), out var parsed) { Math.Max(480, parsed) } else { 1280 }
  let height = if Int32.TryParse(Environment.GetEnvironmentVariable("WORKBENCH_HEIGHT"), out var parsedHeight) { Math.Max(480, parsedHeight) } else { 800 }
  let service = WorkspaceService()
  using let root = WorkbenchView(service, width)
  let window = Window{ Title: "Workbench", Width: width, Height: height, Root: root, Background: Theme(0).Canvas, Resizable: true, VSync: true }
  if Environment.GetEnvironmentVariable("WORKBENCH_SMOKE") == "1" {
    RunSmoke(window)
  } else {
    window.Run()
  }
}
