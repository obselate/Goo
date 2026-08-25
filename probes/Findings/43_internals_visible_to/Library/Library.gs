package FindingInternalsVisibleTo

@assembly: InternalsVisibleTo("App")

public class Secret {
  internal var Value int32 = 42
}
