import argparse
import html
import re
from pathlib import Path


def escaped(value):
    return html.escape(value.strip(), quote=True)


def table_cells(line):
    value = line.strip()
    if value.startswith("|"):
        value = value[1:]
    if value.endswith("|"):
        value = value[:-1]
    return [escaped(cell) for cell in value.split("|")]


def table_rule(line):
    cells = table_cells(line)
    return bool(cells) and all(re.fullmatch(r":?-{3,}:?", html.unescape(cell)) for cell in cells)


def render_table(lines, start):
    header = table_cells(lines[start])
    rules = table_cells(lines[start + 1])
    alignments = []
    for rule in rules:
        raw = html.unescape(rule)
        if raw.startswith(":") and raw.endswith(":"):
            alignments.append("center")
        elif raw.endswith(":"):
            alignments.append("right")
        else:
            alignments.append("left")
    rows = []
    index = start + 2
    while index < len(lines) and lines[index].strip().startswith("|"):
        rows.append(table_cells(lines[index]))
        index += 1
    out = ['<div class="table-scroll"><table><thead><tr>']
    for column, cell in enumerate(header):
        align = alignments[column] if column < len(alignments) else "left"
        out.append(f'<th class="align-{align}">{cell}</th>')
    out.append("</tr></thead><tbody>")
    for row in rows:
        out.append("<tr>")
        for column, cell in enumerate(row):
            align = alignments[column] if column < len(alignments) else "left"
            out.append(f'<td class="align-{align}">{cell}</td>')
        out.append("</tr>")
    out.append("</tbody></table></div>")
    return "".join(out), index


def render_markdown(source):
    lines = source.splitlines()
    title = "Benchmark results"
    body = []
    paragraph = []
    list_kind = None

    def flush_paragraph():
        if paragraph:
            body.append("<p>" + escaped(" ".join(paragraph)) + "</p>")
            paragraph.clear()

    def close_list():
        nonlocal list_kind
        if list_kind:
            body.append(f"</{list_kind}>")
            list_kind = None

    index = 0
    while index < len(lines):
        line = lines[index]
        stripped = line.strip()
        if not stripped:
            flush_paragraph()
            close_list()
            index += 1
            continue
        heading = re.match(r"^(#{1,6})\s+(.+)$", stripped)
        if heading:
            flush_paragraph()
            close_list()
            level = len(heading.group(1))
            text = heading.group(2).strip()
            if level == 1:
                title = text
            body.append(f"<h{level}>{escaped(text)}</h{level}>")
            index += 1
            continue
        if stripped.startswith("|") and index + 1 < len(lines) and table_rule(lines[index + 1]):
            flush_paragraph()
            close_list()
            table, index = render_table(lines, index)
            body.append(table)
            continue
        unordered = re.match(r"^[-*+]\s+(.+)$", stripped)
        ordered = re.match(r"^\d+[.)]\s+(.+)$", stripped)
        if unordered or ordered:
            flush_paragraph()
            kind = "ul" if unordered else "ol"
            if list_kind != kind:
                close_list()
                body.append(f"<{kind}>")
                list_kind = kind
            match = unordered if unordered else ordered
            body.append("<li>" + escaped(match.group(1)) + "</li>")
            index += 1
            continue
        close_list()
        paragraph.append(stripped)
        index += 1
    flush_paragraph()
    close_list()
    return title, "\n".join(body)


def document(title, body):
    return """<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>""" + escaped(title) + """</title>
<style>
:root { color-scheme: dark; --bg: #07111f; --panel: #0b1728; --ink: #b8c2cf; --muted: #7f8a99; --rule: #334155; --accent: #f2cf43; }
* { box-sizing: border-box; }
body { margin: 0; background: var(--bg); color: var(--ink); font-family: ui-monospace, SFMono-Regular, Menlo, Consolas, "Liberation Mono", monospace; font-size: 14px; line-height: 1.55; }
main { width: min(1480px, calc(100% - 32px)); margin: 32px auto 56px; }
h1, h2, h3, h4, h5, h6 { color: var(--accent); font-weight: 700; letter-spacing: .02em; margin: 1.5em 0 .55em; }
h1 { margin-top: 0; font-size: clamp(22px, 3vw, 34px); }
h2 { font-size: 18px; }
p, li { max-width: 112ch; }
p { color: var(--muted); margin: .65em 0 1.2em; }
ul, ol { color: var(--muted); padding-left: 2em; }
.table-scroll { overflow-x: auto; margin: 18px 0 26px; border-top: 2px solid var(--accent); border-bottom: 1px solid var(--rule); background: var(--panel); }
table { width: 100%; min-width: 980px; border-collapse: collapse; font-variant-numeric: tabular-nums; }
th { color: var(--accent); font-weight: 700; white-space: normal; }
th, td { padding: 11px 14px; border-bottom: 1px solid var(--rule); vertical-align: top; }
tbody tr:last-child td { border-bottom: 0; }
tbody tr:hover { background: #101f33; }
.align-left { text-align: left; }
.align-center { text-align: center; }
.align-right { text-align: right; }
@media (max-width: 720px) { main { width: calc(100% - 20px); margin-top: 18px; } body { font-size: 12px; } th, td { padding: 9px 10px; } }
@media print { :root { color-scheme: light; --bg: #fff; --panel: #fff; --ink: #111827; --muted: #374151; --rule: #9ca3af; --accent: #7a5b00; } body { font-size: 9pt; } main { width: 100%; margin: 0; } .table-scroll { overflow: visible; } table { min-width: 0; } tr { break-inside: avoid; } }
</style>
</head>
<body>
<main>
""" + body + """
</main>
</body>
</html>
"""


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("input", type=Path)
    parser.add_argument("output", type=Path)
    args = parser.parse_args()
    title, body = render_markdown(args.input.read_text(encoding="utf-8"))
    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(document(title, body), encoding="utf-8")


if __name__ == "__main__":
    main()
