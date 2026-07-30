import { cn } from "@/lib/utils";

interface RatingDisplayProps {
  rating: number;
  size?: "sm" | "md";
  showMax?: boolean;
}

function ratingColor(rating: number): string {
  if (rating <= 2) return "text-red-500";
  if (rating <= 4) return "text-orange-500";
  if (rating === 5) return "text-yellow-500";
  if (rating <= 7) return "text-lime-500";
  return "text-green-500";
}

export function ratingBgColor(rating: number): string {
  if (rating <= 2) return "bg-red-500";
  if (rating <= 4) return "bg-orange-500";
  if (rating === 5) return "bg-yellow-500";
  if (rating <= 7) return "bg-lime-500";
  return "bg-green-500";
}

export function RatingDisplay({ rating, size = "md", showMax = true }: RatingDisplayProps) {
  return (
    <span
      className={cn(
        "font-bold tabular-nums",
        ratingColor(rating),
        size === "sm" ? "text-sm" : "text-base"
      )}
    >
      {rating}{showMax && "/10"}
    </span>
  );
}
