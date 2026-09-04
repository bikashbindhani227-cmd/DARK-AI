import type { FC } from "react";

interface HackerAISVGProps {
  theme?: "dark" | "light";
  scale?: number;
}

/** DARK AI animated brand mark. Export name is kept for compatibility with the existing UI. */
export const HackerAISVG: FC<HackerAISVGProps> = ({ theme = "dark", scale = 1 }) => {
  const foreground = theme === "dark" ? "#ffffff" : "#0a0a0a";
  const accent = theme === "dark" ? "#8b5cf6" : "#6d28d9";
  const size = Math.max(24, 320 * scale);

  return (
    <div aria-label="DARK AI" className="inline-flex items-center" style={{ height: size * 0.26 }}>
      <svg
        width={size}
        height={size * 0.26}
        viewBox="0 0 360 94"
        role="img"
        aria-labelledby="dark-ai-title"
        style={{ display: "block", overflow: "visible" }}
      >
        <title id="dark-ai-title">DARK AI</title>
        <defs>
          <linearGradient id="dark-ai-gradient" x1="0" x2="1" y1="0" y2="1">
            <stop offset="0%" stopColor={accent}>
              <animate attributeName="stop-color" values={`${accent};#ec4899;#22d3ee;${accent}`} dur="5s" repeatCount="indefinite" />
            </stop>
            <stop offset="100%" stopColor="#22d3ee">
              <animate attributeName="stop-color" values={`#22d3ee;${accent};#ec4899;#22d3ee`} dur="5s" repeatCount="indefinite" />
            </stop>
          </linearGradient>
          <filter id="dark-ai-glow" x="-50%" y="-50%" width="200%" height="200%">
            <feGaussianBlur stdDeviation="2.2" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>
        <circle cx="46" cy="47" r="34" fill="none" stroke="url(#dark-ai-gradient)" strokeWidth="5" filter="url(#dark-ai-glow)">
          <animate attributeName="r" values="34;37;34" dur="2.6s" repeatCount="indefinite" />
          <animate attributeName="opacity" values="1;.7;1" dur="2.6s" repeatCount="indefinite" />
        </circle>
        <path d="M31 50l10 10 21-26" fill="none" stroke={foreground} strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
        <text x="92" y="59" fill={foreground} fontFamily="Inter, ui-sans-serif, system-ui, sans-serif" fontSize="42" fontWeight="700" letterSpacing="3">DARK AI</text>
      </svg>
    </div>
  );
};

/** Preferred DARK AI export name. */
export const DarkAISVG = HackerAISVG;
