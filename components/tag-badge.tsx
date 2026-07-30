"use client";

import { getBaseTag } from "@/lib/db";
import { useTagColors } from "@/lib/tag-colors";
import { cn } from "@/lib/utils";

interface TagBadgeProps {
  tag: string;
  onClick?: () => void;
  children?: React.ReactNode;
  className?: string;
  selected?: boolean;
}

export function TagBadge({ tag, onClick, children, className, selected }: TagBadgeProps) {
  const colors = useTagColors();
  const color = colors?.get(getBaseTag(tag));

  return (
    <span
      onClick={onClick}
      className={cn(
        "inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-medium transition-all",
        onClick && "cursor-pointer hover:opacity-80",
        !color && !selected && "bg-muted text-muted-foreground",
        !color && selected && "bg-foreground text-background",
        className
      )}
      style={
        color
          ? {
              backgroundColor: selected ? color + "44" : color + "22",
              color: color,
              border: `${selected ? 2 : 1}px solid ${color}`,
            }
          : undefined
      }
    >
      {tag}
      {children}
    </span>
  );
}
