package Goo

internal sealed class CompiledVectorDisplayCell : Cell[CompiledVectorAsset] {
  private var asset CompiledVectorAsset?
  private var tree Container?
  private var player CompiledVectorMotionPlayer?

  override func Build(input CompiledVectorAsset) Blob {
    if let current = asset {
      if current == input {
        if let existing = tree {
          return existing
        }
      }
    }
    let nextTree = input.BuildStaticTree()
    let nextPlayer CompiledVectorMotionPlayer? = if input.HasPlaybackTracks {
      CompiledVectorMotionPlayer(this, input, nextTree)
    } else {
      nil
    }
    if let previous = player {
      previous.Dispose()
      ReleaseMotionParticle(previous)
    }
    asset = input
    tree = nextTree
    player = nextPlayer
    if let created = nextPlayer {
      OwnMotionParticle(created)
    }
    return nextTree
  }
}
