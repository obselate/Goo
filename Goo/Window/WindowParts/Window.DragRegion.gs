package Goo

/// Hosts a Goo tree in an SDL window.
public partial class Window {
  shared {
    /// Marks a container subtree as a native drag region for undecorated windows.
    /// Clickable or focusable descendants still win their own pointer input.
    /// @param region container to mark
    /// @returns the same container
    public func DragRegion(region Container) Container {
      region.DragsWindow = true
      return region
    }
  }
}
