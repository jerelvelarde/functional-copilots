// A proposed or published skill, set as a document: its number, its serif title, and its sections.
// The markdown comes from lib/learning.ts templates, which use only "#", "##", paragraphs and "-"
// bullets, so this reads exactly those and nothing else.

type Block = { kind: "h2"; text: string } | { kind: "p"; text: string } | { kind: "ul"; items: string[] };

function parse(markdown: string): { title: string; blocks: Block[] } {
  let title = "";
  const blocks: Block[] = [];
  for (const raw of markdown.split("\n")) {
    const line = raw.trim();
    if (!line) continue;
    if (line.startsWith("# ")) title = line.slice(2).replace(/^Skill:\s*/, "");
    else if (line.startsWith("## ")) blocks.push({ kind: "h2", text: line.slice(3) });
    else if (line.startsWith("- ")) {
      const last = blocks.at(-1);
      if (last?.kind === "ul") last.items.push(line.slice(2));
      else blocks.push({ kind: "ul", items: [line.slice(2)] });
    } else blocks.push({ kind: "p", text: line });
  }
  return { title, blocks };
}

export function SkillDocument({ markdown, number }: { markdown: string; number: string }) {
  const { title, blocks } = parse(markdown);
  return (
    <div className="min-w-0">
      <h2 className="font-serif text-title text-ink [text-wrap:balance]">{title}</h2>
      <p className="mt-1 font-mono text-small text-muted">{number}</p>
      <div className="mt-3 max-w-[58ch] space-y-2">
        {blocks.map((block, i) =>
          block.kind === "h2" ? (
            <h3 key={i} className="section-label pt-2">
              {block.text}
            </h3>
          ) : block.kind === "p" ? (
            <p key={i} className="text-ink">
              {block.text}
            </p>
          ) : (
            <ul key={i} className="list-disc space-y-1 pl-4 text-ink marker:text-muted">
              {block.items.map((item) => (
                <li key={item}>{item}</li>
              ))}
            </ul>
          ),
        )}
      </div>
    </div>
  );
}
