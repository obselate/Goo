package Goo

import System.Collections.Generic

internal enum HitResult { Miss; Unhandled; Handled; Blocked }

internal class Hit {
  internal func within(n Node, x float32, y float32) bool {
    let point = TransformGeometry.Unmap(n, x, y)
    if !point.Valid {
      return false
    }
    return withinMapped(n, point.X, point.Y)
  }

  internal func canTraverse(n Node, x float32, y float32) bool {
    let point = TransformGeometry.Unmap(n, x, y)
    if !point.Valid { return false }
    return canTraverseMapped(n, point.X, point.Y)
  }

  private func withinMapped(n Node, x float32, y float32) bool {
    return !n.PaintInputHidden && n.Rect.Contains(x, y)
  }

  private func canTraverseMapped(n Node, x float32, y float32) bool {
    if n.PaintInputHidden { return false }
    if n.HasClipPath && !ClipPathGeometry.Contains(n, x, y) { return false }
    if n.OverflowX != Overflow.Visible && (x < n.Rect.X || x >= n.Rect.X + n.Rect.W) {
      return false
    }
    if n.OverflowY != Overflow.Visible && (y < n.Rect.Y || y >= n.Rect.Y + n.Rect.H) {
      return false
    }
    return true
  }

  private func canTraverseChildrenMapped(n Node, x float32, y float32) bool {
    if n.Kind != NodeKind.Editor { return true }
    let left = TextLayouts.ContentLeft(n)
    let top = TextLayouts.ContentTop(n)
    return x >= left && x < left + TextLayouts.ContentWidth(n)
      && y >= top && y < top + TextLayouts.ContentHeight(n)
  }

  // Rect first, then fill contours for Shape nodes so wedges and rings hit true.
  internal func hits(n Node, x float32, y float32) bool {
    let point = TransformGeometry.Unmap(n, x, y)
    if !point.Valid { return false }
    return hitsMapped(n, point.X, point.Y)
  }

  private func hitsMapped(n Node, x float32, y float32) bool {
    if !withinMapped(n, x, y) || !n.HitTestSelf {
      return false
    }
    if n.Kind == NodeKind.Shape {
      return ShapeGeometry.HitTest(n, x, y)
    }
    return true
  }

  // Reverse order agrees with Painter's paint order: later children win.
  // A child that hits at the point is committed to, not skipped.
  internal func Topmost(root Node, x float32, y float32) Node? {
    let point = TransformGeometry.Unmap(root, x, y)
    if !point.Valid || !canTraverseMapped(root, point.X, point.Y) {
      return nil
    }
    if canTraverseChildrenMapped(root, point.X, point.Y) {
      let children = Stacking.Children(root)
      for var i = children.Count; i > 0; i-- {
        let child = children[i - 1]
        if let hit = Topmost(child, point.X, point.Y) {
          return hit
        }
      }
    }
    return hitsMapped(root, point.X, point.Y) ? root : nil
  }

  internal func DispatchClick(root Node, x float32, y float32) bool {
    return dispatch(root, x, y, nil) == HitResult.Handled
  }

  internal func Activate(root Node?, target Node) bool {
    guard let tree = root else { return false }
    if !canReceiveInput(target) {
      return false
    }
    return fire(target, findOwner(tree, target, nil))
  }

  // Append the committed path from the root to the topmost node.
  internal func ChainInto(n Node, x float32, y float32, sink List[Node]) {
    chainInto(n, x, y, sink)
  }

  internal func chainInto(n Node, x float32, y float32, sink List[Node]) bool {
    let point = TransformGeometry.Unmap(n, x, y)
    if !point.Valid || !canTraverseMapped(n, point.X, point.Y) { return false }
    let start = sink.Count
    sink.Add(n)
    if canTraverseChildrenMapped(n, point.X, point.Y) {
      let children = Stacking.Children(n)
      for var i = children.Count; i > 0; i-- {
        let child = children[i - 1]
        if chainInto(child, point.X, point.Y, sink) { return true }
      }
    }
    if hitsMapped(n, point.X, point.Y) { return true }
    sink.RemoveAt(start)
    return false
  }

  // Commit to the topmost child. Do not pass through an occluding sibling.
  // Carry the nearest cell so a fired handler can invalidate its owner.
  internal func dispatch(n Node, x float32, y float32, inherited Cell?) HitResult {
    let point = TransformGeometry.Unmap(n, x, y)
    if !point.Valid || !canTraverseMapped(n, point.X, point.Y) { return HitResult.Miss }
    if n.Disabled { return HitResult.Blocked }
    let owner = n.Fiber ?? inherited
    if canTraverseChildrenMapped(n, point.X, point.Y) {
      let children = Stacking.Children(n)
      for var i = children.Count; i > 0; i-- {
        let child = children[i - 1]
        let result = dispatch(child, point.X, point.Y, owner)
        if result == HitResult.Handled || result == HitResult.Blocked {
          return result
        }
        if result == HitResult.Unhandled {
          return fire(n, owner) ? HitResult.Handled : HitResult.Unhandled
        }
      }
    }
    if !hitsMapped(n, point.X, point.Y) { return HitResult.Miss }
    return fire(n, owner) ? HitResult.Handled : HitResult.Unhandled
  }

  // A handler presumably mutated its own cell's state; mark it dirty so
  // plain fields rebuild without Track or manual Rebuild calls.
  internal func fire(n Node, owner Cell?) bool {
    if let handler = n.OnClick {
      handler()
      if let c = owner {
        c.Rebuild()
      }
      return true
    }
    return false
  }

  private func findOwner(n Node, target Node, inherited Cell?) Cell? {
    let owner = n.Fiber ?? inherited
    if n == target { return owner }
    for child in n.Children {
      if let found = findOwner(child, target, owner) {
        return found
      }
    }
    return nil
  }
}
