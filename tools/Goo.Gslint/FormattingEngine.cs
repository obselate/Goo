
using System;
using System.Collections.Generic;
using System.Text;
using GSharp.Core.CodeAnalysis.Syntax;

namespace Goo.Gslint;

public static class FormattingEngine
{
    private const string DefaultIndent = "  ";

    public static string Format(string source) => Format(source, DefaultIndent);

    public static string Format(string source, string indent)
    {
        if (string.IsNullOrEmpty(indent))
        {
            indent = DefaultIndent;
        }

        var tokens = Collect(source);
        if (tokens.Count == 0)
        {
            return string.Empty;
        }

        var sb = new StringBuilder();

        var openerLineIndent = new Stack<int>();
        var ternaryStack = new Stack<int>();
        var currentLineIndent = 0;

        var declKind = SyntaxKind.BadToken;
        var declWord = string.Empty;
        var ternaryDepth = 0;
        var suppressSpace = false;

        for (var i = 0; i < tokens.Count; i++)
        {
            var t = tokens[i];
            var prev = i > 0 ? tokens[i - 1] : default;
            var next = i + 1 < tokens.Count ? tokens[i + 1] : default;

            var hasNext = i + 1 < tokens.Count;
            var first = sb.Length == 0;

            var afterLineComment = IsComment(prev.Kind) &&
                (prev.Kind == SyntaxKind.DocumentationCommentToken || !prev.Text.StartsWith("/*", StringComparison.Ordinal));
            var startsLine = !first && ((t.NewlinesBefore > 0 && !IsContinuation(t.Kind)) || afterLineComment);

            if (startsLine)
            {
                sb.Append('\n');
                if (t.NewlinesBefore >= 2)
                {
                    sb.Append('\n');
                }

                var isChainOp = t.Kind == SyntaxKind.PipePipeToken || t.Kind == SyntaxKind.AmpersandAmpersandToken;
                currentLineIndent = IsCloser(t.Kind) && openerLineIndent.Count > 0
                    ? openerLineIndent.Peek()
                    : (openerLineIndent.Count > 0 ? openerLineIndent.Peek() + 1 : 0) + (isChainOp ? 1 : 0);
                WriteIndent(sb, currentLineIndent, indent);

                declKind = SyntaxKind.BadToken;
                declWord = string.Empty;
                ternaryDepth = 0;
                suppressSpace = false;
            }
            else if (!first)
            {
                if (IsComment(t.Kind) && t.RawSpaces > 1)
                {
                    sb.Append(' ', t.RawSpaces);
                }
                else if (!suppressSpace && NeedsSpaceBefore(t, prev, next, hasNext, declKind, declWord, ternaryDepth))
                {
                    sb.Append(' ');
                }

                suppressSpace = false;
            }

            sb.Append(t.Text);

            switch (t.Kind)
            {
                case SyntaxKind.OpenBraceToken:
                    openerLineIndent.Push(currentLineIndent);
                    ternaryStack.Push(ternaryDepth);
                    declKind = SyntaxKind.BadToken;
                    declWord = string.Empty;
                    ternaryDepth = 0;
                    break;
                case SyntaxKind.OpenParenthesisToken:
                case SyntaxKind.OpenSquareBracketToken:
                    openerLineIndent.Push(currentLineIndent);
                    ternaryStack.Push(ternaryDepth);
                    ternaryDepth = 0;
                    break;
                case SyntaxKind.CloseBraceToken:
                case SyntaxKind.CloseParenthesisToken:
                case SyntaxKind.CloseSquareBracketToken:
                    if (openerLineIndent.Count > 0)
                    {
                        openerLineIndent.Pop();
                    }

                    ternaryDepth = ternaryStack.Count > 0 ? ternaryStack.Pop() : 0;
                    break;
                case SyntaxKind.QuestionToken:
                    if (IsTernaryQuestion(next, hasNext))
                    {
                        ternaryDepth++;
                    }

                    break;
                case SyntaxKind.ColonToken:
                    if (ternaryDepth > 0)
                    {
                        ternaryDepth--;
                    }

                    break;
                case SyntaxKind.CommaToken:
                case SyntaxKind.SemicolonToken:
                    ternaryDepth = 0;
                    break;
            }

            if (IsDeclKeyword(t.Kind))
            {
                declKind = t.Kind;
            }
            else if (t.Kind == SyntaxKind.IdentifierToken && IsContextualDeclWord(t.Text) &&
                     (first || startsLine || prev.Kind == SyntaxKind.OpenBraceToken || prev.Kind == SyntaxKind.CloseBraceToken))
            {
                declKind = SyntaxKind.IdentifierToken;
                declWord = t.Text;
            }

            if (IsPrefixCandidate(t.Kind) && (first || startsLine || !IsValueEnd(prev.Kind)))
            {
                suppressSpace = true;
            }
            else if (t.Kind == SyntaxKind.EllipsisToken && IsSpreadContext(prev.Kind))
            {
                suppressSpace = true;
            }
        }

        var result = sb.ToString();
        if (result.Length > 0 && result[^1] != '\n')
        {
            result += "\n";
        }

        return result;
    }

    private static List<Tok> Collect(string source)
    {
        var raw = SyntaxTree.ParseTokens(source);
        var list = new List<Tok>(raw.Length);
        var newlines = 0;
        var space = false;
        var rawSpaces = 0;

        foreach (var token in raw)
        {
            if (token.Kind == SyntaxKind.WhitespaceToken)
            {
                space = true;
                rawSpaces = 0;
                foreach (var c in token.Text)
                {
                    if (c == '\n')
                    {
                        newlines++;
                        rawSpaces = 0;
                    }
                    else
                    {
                        rawSpaces++;
                    }
                }

                continue;
            }

            if (token.Kind == SyntaxKind.EndOfFileToken)
            {
                continue;
            }

            var text = token.Text;
            var trailingNewline = false;
            if (IsComment(token.Kind) && text.EndsWith('\n'))
            {
                trailingNewline = true;
                text = text.TrimEnd('\n', '\r');
            }

            list.Add(new Tok(token.Kind, text, newlines, space, rawSpaces));
            newlines = trailingNewline ? 1 : 0;
            space = trailingNewline;
            rawSpaces = 0;
        }

        return list;
    }

    private static bool IsComment(SyntaxKind kind) =>
        kind == SyntaxKind.CommentToken || kind == SyntaxKind.DocumentationCommentToken;

    private static bool IsContinuation(SyntaxKind kind) =>
        kind == SyntaxKind.CloseParenthesisToken ||
        kind == SyntaxKind.CloseSquareBracketToken ||
        kind == SyntaxKind.CommaToken ||
        kind == SyntaxKind.DotToken ||
        kind == SyntaxKind.QuestionDotToken ||
        kind == SyntaxKind.ColonToken ||
        kind == SyntaxKind.SemicolonToken;

    private static bool IsCloser(SyntaxKind kind) =>
        kind == SyntaxKind.CloseBraceToken ||
        kind == SyntaxKind.CloseParenthesisToken ||
        kind == SyntaxKind.CloseSquareBracketToken;

    private static bool IsValueEnd(SyntaxKind kind) =>
        kind == SyntaxKind.IdentifierToken ||
        kind == SyntaxKind.NumberToken ||
        kind == SyntaxKind.StringToken ||
        kind == SyntaxKind.InterpolatedStringToken ||
        kind == SyntaxKind.CharacterToken ||
        kind == SyntaxKind.CloseParenthesisToken ||
        kind == SyntaxKind.CloseSquareBracketToken ||
        kind == SyntaxKind.CloseBraceToken ||
        kind == SyntaxKind.TrueKeyword ||
        kind == SyntaxKind.FalseKeyword ||
        kind == SyntaxKind.NilKeyword ||
        kind == SyntaxKind.PlusPlusToken ||
        kind == SyntaxKind.MinusMinusToken;

    private static bool IsPrefixCandidate(SyntaxKind kind) =>
        kind == SyntaxKind.HatToken ||
        kind == SyntaxKind.MinusToken ||
        kind == SyntaxKind.PlusToken ||
        kind == SyntaxKind.BangToken ||
        kind == SyntaxKind.StarToken ||
        kind == SyntaxKind.AmpersandToken;

    private static bool IsSpreadContext(SyntaxKind prev) =>
        prev == SyntaxKind.OpenBraceToken ||
        prev == SyntaxKind.OpenParenthesisToken ||
        prev == SyntaxKind.CommaToken;

    private static bool IsDeclKeyword(SyntaxKind kind) =>
        kind == SyntaxKind.FuncKeyword ||
        kind == SyntaxKind.ClassKeyword ||
        kind == SyntaxKind.StructKeyword ||
        kind == SyntaxKind.InterfaceKeyword ||
        kind == SyntaxKind.EnumKeyword ||
        kind == SyntaxKind.TypeKeyword ||
        kind == SyntaxKind.OperatorKeyword ||
        kind == SyntaxKind.IfKeyword ||
        kind == SyntaxKind.ElseKeyword ||
        kind == SyntaxKind.ForKeyword ||
        kind == SyntaxKind.WhileKeyword ||
        kind == SyntaxKind.DoKeyword ||
        kind == SyntaxKind.SwitchKeyword ||
        kind == SyntaxKind.SelectKeyword ||
        kind == SyntaxKind.CaseKeyword ||
        kind == SyntaxKind.DefaultKeyword ||
        kind == SyntaxKind.ScopeKeyword ||
        kind == SyntaxKind.TryKeyword ||
        kind == SyntaxKind.CatchKeyword ||
        kind == SyntaxKind.FinallyKeyword ||
        kind == SyntaxKind.DeferKeyword ||
        kind == SyntaxKind.GoKeyword ||
        kind == SyntaxKind.LockKeyword ||
        kind == SyntaxKind.GuardKeyword ||
        kind == SyntaxKind.ImportKeyword ||
        kind == SyntaxKind.PackageKeyword ||
        kind == SyntaxKind.ChanKeyword;

    private static bool IsContextualDeclWord(string text) =>
        text == "prop" || text == "shared" || text == "get" || text == "set";

    private static bool IsInheritanceDecl(SyntaxKind declKind) =>
        declKind == SyntaxKind.ClassKeyword ||
        declKind == SyntaxKind.StructKeyword ||
        declKind == SyntaxKind.InterfaceKeyword ||
        declKind == SyntaxKind.EnumKeyword;

    private static bool IsTernaryQuestion(Tok next, bool hasNext)
    {
        if (!hasNext || next.NewlinesBefore > 0)
        {
            return false;
        }

        return next.Kind != SyntaxKind.CloseParenthesisToken &&
               next.Kind != SyntaxKind.CloseSquareBracketToken &&
               next.Kind != SyntaxKind.CloseBraceToken &&
               next.Kind != SyntaxKind.OpenBraceToken &&
               next.Kind != SyntaxKind.CommaToken &&
               next.Kind != SyntaxKind.EqualsToken &&
               next.Kind != SyntaxKind.SemicolonToken &&
               next.Kind != SyntaxKind.ColonToken;
    }

    private static bool NeedsSpaceBefore(Tok current, Tok prev, Tok next, bool hasNext, SyntaxKind declKind, string declWord, int ternaryDepth)
    {
        var kind = current.Kind;
        var prevKind = prev.Kind;

        if (prevKind == SyntaxKind.OpenParenthesisToken || prevKind == SyntaxKind.OpenSquareBracketToken ||
            prevKind == SyntaxKind.QuestionOpenBracketToken)
        {
            return false;
        }

        if (kind == SyntaxKind.CloseParenthesisToken || kind == SyntaxKind.CloseSquareBracketToken)
        {
            return false;
        }

        if (kind == SyntaxKind.CommaToken || kind == SyntaxKind.SemicolonToken ||
            kind == SyntaxKind.PlusPlusToken || kind == SyntaxKind.MinusMinusToken ||
            kind == SyntaxKind.BangBangToken)
        {
            return false;
        }

        if (kind == SyntaxKind.DotToken || kind == SyntaxKind.QuestionDotToken ||
            prevKind == SyntaxKind.DotToken || prevKind == SyntaxKind.QuestionDotToken)
        {
            return false;
        }

        if (prevKind == SyntaxKind.AtToken)
        {
            return false;
        }

        if (kind == SyntaxKind.OpenParenthesisToken &&
            (prevKind == SyntaxKind.IdentifierToken || prevKind == SyntaxKind.CloseParenthesisToken ||
             prevKind == SyntaxKind.CloseSquareBracketToken || prevKind == SyntaxKind.FuncKeyword))
        {
            return declKind == SyntaxKind.OperatorKeyword || declWord == "prop";
        }

        if ((kind == SyntaxKind.OpenSquareBracketToken || kind == SyntaxKind.QuestionOpenBracketToken) &&
            (prevKind == SyntaxKind.IdentifierToken || prevKind == SyntaxKind.CloseParenthesisToken ||
             prevKind == SyntaxKind.CloseSquareBracketToken || prevKind == SyntaxKind.MapKeyword))
        {
            return kind == SyntaxKind.OpenSquareBracketToken && next.Kind == SyntaxKind.CloseSquareBracketToken;
        }

        if (prevKind == SyntaxKind.CloseSquareBracketToken &&
            (kind == SyntaxKind.IdentifierToken || kind == SyntaxKind.MapKeyword ||
             kind == SyntaxKind.FuncKeyword || kind == SyntaxKind.ChanKeyword ||
             kind == SyntaxKind.SequenceKeyword))
        {
            return false;
        }

        if (kind == SyntaxKind.OpenBraceToken &&
            (prevKind == SyntaxKind.IdentifierToken || prevKind == SyntaxKind.CloseSquareBracketToken))
        {
            return declKind != SyntaxKind.BadToken;
        }

        if (prevKind == SyntaxKind.OpenBraceToken)
        {
            return current.SpaceBefore;
        }

        if (kind == SyntaxKind.CloseBraceToken)
        {
            return current.SpaceBefore;
        }

        if (kind == SyntaxKind.QuestionToken)
        {
            return IsTernaryQuestion(next, hasNext);
        }

        if (kind == SyntaxKind.ColonToken)
        {
            return ternaryDepth > 0 || IsInheritanceDecl(declKind);
        }

        if (prevKind == SyntaxKind.CommaToken || prevKind == SyntaxKind.ColonToken)
        {
            return true;
        }

        return true;
    }

    private static void WriteIndent(StringBuilder sb, int depth, string indent)
    {
        for (var i = 0; i < depth; i++)
        {
            sb.Append(indent);
        }
    }

    private readonly record struct Tok(SyntaxKind Kind, string Text, int NewlinesBefore, bool SpaceBefore, int RawSpaces);
}
