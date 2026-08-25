using System;
using System.Collections.Generic;
using System.Text;
using Goo;
using Xunit;

public sealed class TextDocumentTests
{
    [Fact]
    public void TransactionsUsePreEditPositions()
    {
        var document = new TextDocument("0123456789");
        var observed = new List<TextDocumentChange>();
        document.Changed += observed.Add;

        var first = document.Apply(Change(2, 2, "AB"));
        var second = document.ApplyTransaction(
        [
            Change(1, 1, "Q"),
            Change(7, 0, "X"),
        ]);

        Assert.Equal("0QAB456X789", document.GetText(Range(0, document.Length)));
        Assert.Equal(0, first.BeforeVersion);
        Assert.Equal(1, first.AfterVersion);
        Assert.Equal(1, second.BeforeVersion);
        Assert.Equal(2, second.AfterVersion);
        Assert.Equal("0QAB456X789", document.GetText());
        Assert.Equal(2, second.Changes.Count);
        Assert.Equal(2, observed.Count);
        Assert.Equal(second, observed[1]);
    }

    [Fact]
    public void LinesPreserveMixedEndings()
    {
        var document = new TextDocument("a\r\nb\rc\nd");

        Assert.Equal(8, document.Length);
        Assert.Equal(4, document.LineCount);
        Assert.Equal("a\r\nb\rc\nd", document.GetText());
        Assert.Equal(Range(0, 1), document.GetLineRange(0));
        Assert.Equal(Range(3, 1), document.GetLineRange(1));
        Assert.Equal(Range(5, 1), document.GetLineRange(2));
        Assert.Equal(Range(7, 1), document.GetLineRange(3));
        Assert.Equal("b", document.GetLineText(1));
        Assert.Equal(0, document.GetLineIndex(0));
        Assert.Equal(0, document.GetLineIndex(2));
        Assert.Equal(1, document.GetLineIndex(3));
        Assert.Equal(2, document.GetLineIndex(5));
        Assert.Equal(3, document.GetLineIndex(8));
    }

    [Fact]
    public void CrLfEditsRecomputeLines()
    {
        var document = new TextDocument("a\r\nb");

        document.Apply(Change(2, 0, "x"));

        Assert.Equal("a\rx\nb", document.GetText());
        Assert.Equal(3, document.LineCount);
        Assert.Equal("x", document.GetLineText(1));
        Assert.True(document.Undo());
        Assert.Equal("a\r\nb", document.GetText());
        Assert.Equal(2, document.LineCount);
        Assert.Equal(Range(3, 1), document.GetLineRange(1));
    }

    [Fact]
    public void SnapshotsPreserveVersionAndText()
    {
        var document = new TextDocument("alpha");
        var snapshot = document.Snapshot();

        document.Apply(Change(5, 0, " beta"));

        Assert.Equal(0, snapshot.Version);
        Assert.Equal(5, snapshot.Length);
        Assert.Equal("alpha", snapshot.GetText());
        Assert.Equal("alpha beta", document.GetText());
        Assert.Equal(1, document.Version);
    }

    [Fact]
    public void SequentialInsertsShareOneAppendPiece()
    {
        var document = new TextDocument("prefix");
        TextSnapshot? snapshot = null;

        for (var index = 0; index < 1_000; index++)
        {
            document.Apply(Change(document.Length, 0, index % 17 == 0 ? "\n" : "x"));
            if (index == 99)
                snapshot = document.Snapshot();
        }

        Assert.Equal(2, document.PieceCount);
        Assert.Equal("prefix", snapshot!.GetText()[..6]);
        Assert.Equal(106, snapshot.Length);
        Assert.Equal(1_006, document.Length);
    }

    [Fact]
    public void UndoGroupsAndRedo()
    {
        var document = new TextDocument();

        document.BeginUndoGroup();
        document.Apply(Change(0, 0, "a"));
        document.Apply(Change(1, 0, "b"));
        document.EndUndoGroup();

        Assert.Equal("ab", document.GetText());
        Assert.True(document.CanUndo);
        Assert.True(document.Undo());
        Assert.Equal("", document.GetText());
        Assert.True(document.CanRedo);
        Assert.True(document.Redo());
        Assert.Equal("ab", document.GetText());
        Assert.True(document.Undo());

        document.Apply(Change(0, 0, "z"));

        Assert.Equal("z", document.GetText());
        Assert.False(document.CanRedo);
    }

    [Fact]
    public void InvalidChangesFail()
    {
        var document = new TextDocument("a😀b");

        Assert.Throws<ArgumentOutOfRangeException>(() => document.Apply(Change(2, 0, "x")));
        Assert.Throws<ArgumentException>(() => document.ApplyTransaction(
        [
            Change(0, 1, "x"),
            Change(0, 1, "y"),
        ]));
        Assert.Throws<ArgumentException>(() => new TextDocument("\ud800"));
        Assert.Throws<ArgumentException>(() => document.Apply(Change(0, 0, "\udc00")));
    }

    [Fact]
    public void ChangesAreReadOnly()
    {
        var document = new TextDocument();
        var committed = document.Apply(Change(0, 0, "x"));

        var list = Assert.IsAssignableFrom<IList<TextChange>>(committed.Changes);
        Assert.True(list.IsReadOnly);
        Assert.Throws<NotSupportedException>(() => list.Add(Change(1, 0, "y")));
    }

    [Fact]
    public void EditsMatchFlatModel()
    {
        var random = new Random(0x5EED);
        var expected = new StringBuilder("start\r\nend");
        var document = new TextDocument(expected.ToString());
        var snapshots = new List<(TextSnapshot Snapshot, string Text)>();
        string[] insertions = ["", "a", "bc", "\r", "\n", "\r\n", "中", "😀"];

        for (var operation = 0; operation < 750; operation++)
        {
            var start = RandomScalarBoundary(expected.ToString(), random);
            var end = RandomScalarBoundary(expected.ToString(), random);
            if (end < start)
                (start, end) = (end, start);
            var inserted = insertions[random.Next(insertions.Length)];

            document.Apply(Change(start, end - start, inserted));
            expected.Remove(start, end - start).Insert(start, inserted);

            Assert.Equal(expected.ToString(), document.GetText());
            AssertLineModel(document, expected.ToString());
            if (operation % 97 == 0)
                snapshots.Add((document.Snapshot(), expected.ToString()));
        }

        foreach (var (snapshot, text) in snapshots)
        {
            Assert.Equal(text, snapshot.GetText());
            Assert.Equal(text.Length, snapshot.Length);
        }
    }

    [Fact]
    public void MultiChangeGroupsUndoAndRedo()
    {
        var document = new TextDocument("abcdefghi");
        var notifications = 0;
        document.Changed += _ => notifications++;

        document.BeginUndoGroup();
        document.ApplyTransaction(
        [
            Change(1, 2, "XY"),
            Change(7, 1, "Z"),
        ]);
        document.ApplyTransaction(
        [
            Change(0, 0, "!"),
            Change(document.Length, 0, "?"),
        ]);
        document.EndUndoGroup();
        var edited = document.GetText();

        Assert.Equal("!aXYdefgZi?", edited);
        Assert.True(document.Undo());
        Assert.Equal("abcdefghi", document.GetText());
        Assert.True(document.Redo());
        Assert.Equal(edited, document.GetText());
        Assert.Equal(6, notifications);
    }

    private static void AssertLineModel(TextDocument document, string text)
    {
        var ranges = new List<TextRange>();
        var lineStart = 0;
        for (var i = 0; i < text.Length; i++)
        {
            if (text[i] != '\r' && text[i] != '\n')
                continue;
            ranges.Add(Range(lineStart, i - lineStart));
            if (text[i] == '\r' && i + 1 < text.Length && text[i + 1] == '\n')
                i++;
            lineStart = i + 1;
        }
        ranges.Add(Range(lineStart, text.Length - lineStart));

        Assert.Equal(ranges.Count, document.LineCount);
        for (var line = 0; line < ranges.Count; line++)
        {
            Assert.Equal(ranges[line], document.GetLineRange(line));
            Assert.Equal(text.Substring(ranges[line].Start, ranges[line].Length), document.GetLineText(line));
            Assert.Equal(line, document.GetLineIndex(ranges[line].Start));
        }
        Assert.Equal(ranges.Count - 1, document.GetLineIndex(text.Length));
    }

    private static int RandomScalarBoundary(string text, Random random)
    {
        var boundaries = new List<int> { 0 };
        for (var i = 0; i < text.Length; i++)
        {
            if (char.IsHighSurrogate(text[i]))
                i++;
            boundaries.Add(i + 1);
        }
        return boundaries[random.Next(boundaries.Count)];
    }

    private static TextRange Range(int start, int length) => new()
    {
        Start = start,
        Length = length,
    };

    private static TextChange Change(int start, int length, string text) => new()
    {
        Range = Range(start, length),
        InsertedText = text,
    };
}
