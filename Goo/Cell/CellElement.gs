package Goo

import System
import System.Diagnostics.CodeAnalysis

// Describes a cell mount. The retained Cell instance lives on the fiber Node.
internal open class CellElement : Blob {
  internal override func coreBlob() {
  }

  @DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicParameterlessConstructor)
  private var cellType Type

  @DynamicallyAccessedMembers(DynamicallyAccessedMemberTypes.PublicParameterlessConstructor)
  internal prop CellType Type {
    get -> cellType
    init -> cellType = value
  }
  internal prop Factory (() -> Cell)? { get; init; }
  internal prop UseActivator bool { get; init; }
  internal prop Seed Action[Cell]? { get; init; }
  internal prop Configure Action[Cell]? { get; init; }

  internal open func ApplyInput(cell Cell) {
  }
}

internal class CellInputElement[TInput any] : CellElement {
  internal prop Input TInput { get; init; }

  internal override func ApplyInput(cell Cell) {
    if cell is Cell[TInput] {
      cell.SetInput(Input)
    }
  }
}
