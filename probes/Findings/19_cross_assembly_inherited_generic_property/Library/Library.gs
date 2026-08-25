package FindingPackageBoundaryGeneric

public open class GenericBase[TInput any] {
  private var input TInput = default (TInput)

  protected prop Input TInput{ get -> input }

  protected open func ShouldRebuild(previous TInput, next TInput) bool {
    return true
  }

  public func Update(value TInput) {
    input = value
  }

  public func Matches(previous TInput, next TInput) bool {
    return ShouldRebuild(previous, next)
  }
}
