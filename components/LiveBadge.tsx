// LiveBadge.tsx
// A minimal, Apple-inspired live indicator component

interface LiveBadgeProps {
  viewers?: number;
  size?: 'sm' | 'md' | 'lg';
}

export function LiveBadge({ viewers, size = 'md' }: LiveBadgeProps) {
  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
  };

  return (
    <div className={`
      inline-flex items-center ${sizeClasses[size]}
      rounded-full 
      bg-red-500/10 
      border border-red-500/20
      backdrop-blur-sm
    `}>
      {/* Pulsing dot */}
      <span className="relative flex">
        <span className={`
          absolute inline-flex ${dotSizes[size]}
          animate-ping rounded-full bg-red-400 opacity-75
        `} />
        <span className={`
          relative inline-flex ${dotSizes[size]}
          rounded-full bg-red-500
        `} />
      </span>
      
      {/* LIVE text */}
      <span className="font-semibold uppercase tracking-wider text-red-400">
        Live
      </span>
      
      {/* Optional viewer count */}
      {viewers !== undefined && (
        <span className="text-red-400/60 font-medium">
          {viewers.toLocaleString()}
        </span>
      )}
    </div>
  );
}
