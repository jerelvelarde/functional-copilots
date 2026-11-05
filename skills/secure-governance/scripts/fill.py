#!/usr/bin/env python3
"""Fill the /secure-governance page for one app.

    python3 fill.py DATA.json OUT.html [--mode prototype|production]

Copies assets/secure-governance.html, swaps in DATA.json as the page's data block, and checks the
data first: item ids must exist in the template's catalog, statuses must be one of done, partial,
gap, na. Prints what it filled and any item it could not place. Standard library only.
"""
import argparse, json, pathlib, re, sys

STATUSES = {"done", "partial", "gap", "na"}
MODES = {"prototype", "production"}
TEMPLATE = pathlib.Path(__file__).resolve().parent.parent / "assets" / "secure-governance.html"
BLOCK = re.compile(r'(<script type="application/json" id="(catalog|data)">)(.*?)(</script>)', re.S)


def embed(obj):
    # "<" as < keeps "</script>" and "<!--" out of the block; JSON.parse reads it back unchanged.
    return json.dumps(obj, ensure_ascii=False, indent=1).replace("<", "\\u003c")


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("data")
    ap.add_argument("out")
    ap.add_argument("--mode", choices=sorted(MODES), help="override the mode the page opens in")
    ap.add_argument("--template", default=str(TEMPLATE))
    args = ap.parse_args()

    html = pathlib.Path(args.template).read_text(encoding="utf-8")
    blocks = {m.group(2): m for m in BLOCK.finditer(html)}
    if "catalog" not in blocks or "data" not in blocks:
        sys.exit("fill.py: the template has no catalog or data block; is this assets/secure-governance.html?")
    catalog = json.loads(blocks["catalog"].group(3))
    ids = [it["id"] for it in catalog["items"]]
    modes = {it["id"]: it["mode"] for it in catalog["items"]}

    data = json.loads(pathlib.Path(args.data).read_text(encoding="utf-8"))
    if args.mode:
        data["mode"] = args.mode
    problems = []
    if data.get("mode") not in MODES:
        problems.append(f'mode must be "prototype" or "production", not {data.get("mode")!r}')
    for key in ("app", "function", "date"):
        if not str(data.get(key, "")).strip():
            problems.append(f"{key} is empty")
    items = data.get("items", {})
    for item_id, entry in items.items():
        if item_id not in modes:
            problems.append(f"{item_id} is not in the checklist (ids: {', '.join(ids)})")
        elif entry.get("status") not in STATUSES:
            problems.append(f"{item_id} status must be one of {sorted(STATUSES)}, not {entry.get('status')!r}")
        elif entry.get("status") == "done" and not entry.get("evidence"):
            problems.append(f"{item_id} is marked done with no evidence; name the file or test that shows it")
    needed = [i for i in ids if data.get("mode") == "production" or modes[i] == "prototype"]
    missing = [i for i in needed if i not in items]
    if problems:
        sys.exit("fill.py: not filled:\n  - " + "\n  - ".join(problems))

    start, end = blocks["data"].span(3)
    out = html[:start] + embed(data) + html[end:]
    pathlib.Path(args.out).parent.mkdir(parents=True, exist_ok=True)
    pathlib.Path(args.out).write_text(out, encoding="utf-8")
    counts = {}
    for i in needed:
        s = items.get(i, {}).get("status", "not assessed")
        counts[s] = counts.get(s, 0) + 1
    print(f"wrote {args.out} ({data['mode']} mode, {len(needed)} items: " + ", ".join(f"{n} {s}" for s, n in sorted(counts.items())) + ")")
    if missing:
        print("not assessed, shown as 'Not assessed': " + ", ".join(missing))
    head = data.get("headline")
    if not (head.get(data["mode"]) if isinstance(head, dict) else head):
        print(f"no headline for {data['mode']} mode: the top of the page falls back to the summary's first sentence")


if __name__ == "__main__":
    main()
