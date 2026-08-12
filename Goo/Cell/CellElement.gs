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
    get { return cellType }
    init { cellType = value }
  }
  internal prop Factory (() -> Cell)? { get; init; }
  internal prop UseActivator bool { get; init; }
  internal prop Seed Action[Cell]? { get; init; }
  internal prop Configure Action[Cell]? { get; init; }
  internal prop HasInput bool { get; init; }
  internal prop Input object? { get; init; }
}
