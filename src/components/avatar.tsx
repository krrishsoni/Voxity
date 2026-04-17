import Image from "next/image";

type UserAvatarProps = {
  username: string;
  avatarUrl?: string | null;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const sizes = {
  sm: 24,
  md: 32,
  lg: 48,
} as const;

function getDiceBearUrl(seed: string, size: number) {
  return `https://api.dicebear.com/9.x/notionists-neutral/svg?seed=${encodeURIComponent(seed)}&size=${size}&backgroundColor=b6e3f4,c0aede,d1d4f9,ffd5dc,ffdfbf`;
}

export function UserAvatar({ username, avatarUrl, size = "md", className = "" }: UserAvatarProps) {
  const px = sizes[size];
  const src = avatarUrl || getDiceBearUrl(username, px * 2);

  return (
    <Image
      src={src}
      alt={username}
      width={px}
      height={px}
      className={`shrink-0 rounded-full object-cover ring-2 ring-white dark:ring-slate-800 ${className}`}
      unoptimized={!avatarUrl}
    />
  );
}

/* Stack of overlapping avatars */
type VoterAvatarStackProps = {
  voters: { username: string; avatar_url: string | null }[];
  max?: number;
  size?: "sm" | "md";
};

export function VoterAvatarStack({ voters, max = 5, size = "sm" }: VoterAvatarStackProps) {
  const shown = voters.slice(0, max);
  const remaining = voters.length - shown.length;

  if (voters.length === 0) return null;

  return (
    <div className="mt-2 flex items-center">
      <div className="flex -space-x-2">
        {shown.map((voter) => (
          <UserAvatar
            key={voter.username}
            username={voter.username}
            avatarUrl={voter.avatar_url}
            size={size}
            className="transition hover:scale-110 hover:z-10"
          />
        ))}
      </div>
      <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
        {voters.length === 1
          ? shown[0].username
          : remaining > 0
            ? `${shown.map((v) => v.username).join(", ")} +${remaining} more`
            : shown.map((v) => v.username).join(", ")}
      </span>
    </div>
  );
}
