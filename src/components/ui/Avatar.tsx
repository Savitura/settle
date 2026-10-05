import type { GroupMember } from "@/lib/types";

// Each family member gets their own warm, saturated colour so faces are easy to tell apart.
const PALETTES = [
  "from-primary-400 to-primary-600",
  "from-coral-300 to-coral-500",
  "from-sky-400 to-indigo-500",
  "from-sun-300 to-sun-500",
  "from-fuchsia-400 to-fuchsia-600",
  "from-teal-300 to-cyan-600",
];

// Hand out colours in first-seen order so the people in one family never share a colour
// (a hash would often give two siblings the same one). Stable for the rest of the session.
const assigned = new Map<string, number>();

export function avatarGradient(seed: string): string {
  const key = (seed || "?").toLowerCase();
  let idx = assigned.get(key);
  if (idx === undefined) {
    idx = assigned.size % PALETTES.length;
    assigned.set(key, idx);
  }
  return PALETTES[idx];
}

const SIZES = {
  sm: "h-8 w-8 text-xs",
  md: "h-11 w-11 text-sm",
  lg: "h-16 w-16 text-xl",
} as const;

export function Avatar({
  name,
  seed,
  size = "md",
  ring = false,
  tone,
}: {
  name: string;
  seed?: string;
  size?: keyof typeof SIZES;
  ring?: boolean;
  /** Fixed palette index for decorative avatars (doesn't consume a family colour). */
  tone?: number;
}) {
  const initial = (name.trim()[0] || "?").toUpperCase();
  return (
    <div
      aria-hidden="true"
      className={`flex shrink-0 items-center justify-center rounded-full bg-gradient-to-br font-display font-bold text-white ${SIZES[size]} ${
        tone !== undefined ? PALETTES[tone % PALETTES.length] : avatarGradient(seed ?? name)
      } ${ring ? "ring-[3px] ring-white" : ""}`}
    >
      {initial}
    </div>
  );
}

/** Friendly display name — never falls back to a wallet address. */
export function memberName(member: Pick<GroupMember, "displayName" | "email" | "phone"> | undefined | null): string {
  if (!member) return "Family member";
  if (member.displayName) return member.displayName;
  if (member.email) return friendlyFromEmail(member.email);
  if (member.phone) return member.phone;
  return "Family member";
}

/** Secondary line for a member row: email or phone, never chain details. */
export function memberContact(member: Pick<GroupMember, "email" | "phone">): string | null {
  return member.email || member.phone || null;
}

/** "funke.adeyemi@gmail.com" -> "Funke" */
export function friendlyFromEmail(email: string): string {
  const first = email.split("@")[0].split(/[._\-+]/)[0] || email;
  return first.charAt(0).toUpperCase() + first.slice(1);
}
