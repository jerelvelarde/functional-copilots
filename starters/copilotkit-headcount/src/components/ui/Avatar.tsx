// A person, as initials in a circle. The people in this demo are fictional and have no photos.

export const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part[0]!.toUpperCase())
    .slice(0, 2)
    .join("");

export function Avatar({ name, size = 28, tone = "stone" }: { name: string; size?: 24 | 28 | 32; tone?: "stone" | "green" | "paper" }) {
  const tones = {
    stone: "bg-stone text-ink",
    green: "bg-green text-on-green",
    paper: "bg-surface text-ink border border-hairline",
  };
  return (
    <span
      aria-hidden
      style={{ width: size, height: size }}
      className={`inline-flex shrink-0 select-none items-center justify-center rounded-full text-small font-semibold tracking-[0.02em] ${tones[tone]}`}
    >
      {initials(name)}
    </span>
  );
}
