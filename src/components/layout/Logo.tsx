import { cn } from "@/lib/utils";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 100 100"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="KLA Computer"
    >
      <rect width="100" height="100" rx="18" fill="#3B1856" />
      <text
        x="50"
        y="62"
        textAnchor="middle"
        fontFamily="Arial, Helvetica, sans-serif"
        fontWeight={800}
        fontSize={38}
        fill="#F9C227"
        letterSpacing={-1}
      >
        KLA
      </text>
      <path d="M74 34 L86 24 L84 38 L74 34Z" fill="#F9C227" />
      <path
        d="M58 44 L84 26"
        stroke="#F9C227"
        strokeWidth={4}
        strokeLinecap="round"
      />
    </svg>
  );
}

export function LogoWordmark({
  className,
  markClassName,
}: {
  className?: string;
  markClassName?: string;
}) {
  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      <LogoMark className={cn("w-9 h-9", markClassName)} />
      <div className="leading-tight">
        <p className="font-extrabold text-white tracking-tight">
          KLA <span className="text-brand">Computer</span>
        </p>
        <p className="text-[11px] text-purple-200/80 -mt-0.5">
          Service Handling
        </p>
      </div>
    </div>
  );
}
