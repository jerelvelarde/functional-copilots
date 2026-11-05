// The written policy, rule by rule, so the app can show the exact rule text behind every check.
// policies.md writes each rule as one paragraph: **POL-HC-01 Required fields.** Every headcount...
// The server reads the file (lib/server-data.ts) and the page passes the parsed rules to the client.

export type PolicyRule = { id: string; title: string; text: string };

const RULE = /^\*\*(POL-[A-Z]+-\d{2}) ([^*]+?)\.\*\*\s+(.+)$/;

/** Every rule in the policy, by id, in the order written. */
export function parsePolicyRules(markdown: string): Record<string, PolicyRule> {
  const rules: Record<string, PolicyRule> = {};
  for (const line of markdown.split("\n")) {
    const match = RULE.exec(line.trim());
    if (match) rules[match[1]] = { id: match[1], title: match[2], text: match[3].trim() };
  }
  return rules;
}
