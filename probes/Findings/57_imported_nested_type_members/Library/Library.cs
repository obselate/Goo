namespace FindingNestedTypeLibrary;

public sealed class Shaper
{
    public readonly struct Result
    {
        public Result(float width)
        {
            Width = width;
        }

        public float Width { get; }
    }

    public Result Shape()
    {
        return new Result(12.5f);
    }
}
