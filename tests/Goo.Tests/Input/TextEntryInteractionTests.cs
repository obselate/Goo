using Goo;
using Xunit;

public sealed class TextEntryInteractionTests
{
    [Fact]
    public void CommandsEditSelectionsWordsEdgesAndSanitizeInput()
    {
        Assert.True(new InputFixtures().TextEntryCommandsAndSanitization());
    }

    [Fact]
    public void BufferShapeIsRetainedAcrossReadsAndInvalidatedByEdit()
    {
        Assert.True(new InputFixtures().EntryBufferShapeIsRetainedAcrossReads());
    }

    [Fact]
    public void EditRespectsExtendedGraphemeBoundaries()
    {
        Assert.True(new InputFixtures().EditHandlesGraphemeClustersAndWordBoundaries());
    }

    [Fact]
    public void ControlledRebuildPreservesFocusedEntryValue()
    {
        Assert.True(new InputFixtures().ControlledTextEntryKeepsFocus());
    }

    [Fact]
    public void PointerSelectionHandlesClickDragAndReplace()
    {
        Assert.True(new InputFixtures().TextEntryPointerSelectionLifecycle());
    }

    [Fact]
    public void MacShortcutsUseCommandPrimaryAndOptionWordNavigation()
    {
        Assert.True(new InputFixtures().MacShortcutPolicyRoutesCommandAndOptionWord());
    }
}
