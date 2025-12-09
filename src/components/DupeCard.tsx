import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Heart, Check, ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";

interface DupeCardProps {
  name: string;
  brand: string;
  imageUrl?: string;
  reasons: string[];
  sharedIngredients: string[];
  priceEstimate?: string;
  profileMatch?: boolean;
  matchPercentage?: number;
  isSaved?: boolean;
  onToggleSave?: () => void;
  whereToBuy?: string;
  category?: string;
}

const categoryPlaceholders: Record<string, string> = {
  face: 'https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300',
  body: 'https://images.unsplash.com/photo-1608248543803-ba4f8c70ae0b?w=300',
  hair: 'https://images.unsplash.com/photo-1527799820374-dcf8d9d4a388?w=300',
  scalp: 'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e?w=300',
  default: 'https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=300',
};

export const DupeCard = ({
  name,
  brand,
  imageUrl,
  reasons,
  sharedIngredients,
  priceEstimate,
  matchPercentage,
  isSaved = false,
  onToggleSave,
  whereToBuy,
  category = 'face',
}: DupeCardProps) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const fallbackImage = categoryPlaceholders[category] || categoryPlaceholders.default;
  const displayImage = imageError ? fallbackImage : (imageUrl || fallbackImage);

  return (
    <Card className="group relative overflow-hidden bg-card border-border hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
      {/* Heart Button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onToggleSave?.();
        }}
        className="absolute top-3 right-3 z-10 p-2 rounded-full bg-background/80 backdrop-blur-sm hover:bg-background transition-colors"
        aria-label={isSaved ? "Remove from favorites" : "Save to favorites"}
      >
        <Heart
          className={cn(
            "w-5 h-5 transition-colors",
            isSaved
              ? "fill-rose-500 text-rose-500"
              : "text-muted-foreground hover:text-rose-500"
          )}
        />
      </button>

      {/* Match Badge */}
      {matchPercentage && (
        <Badge className="absolute top-3 left-3 z-10 bg-primary/90 text-primary-foreground backdrop-blur-sm">
          {matchPercentage}% Match
        </Badge>
      )}

      {/* Product Image */}
      <div className="aspect-square w-full bg-muted/30 flex items-center justify-center overflow-hidden relative">
        {!imageLoaded && (
          <div className="absolute inset-0 bg-muted animate-pulse" />
        )}
        <img
          src={displayImage}
          alt={`${brand} ${name}`}
          className={cn(
            "w-full h-full object-cover group-hover:scale-105 transition-all duration-300",
            imageLoaded ? "opacity-100" : "opacity-0"
          )}
          onError={() => setImageError(true)}
          onLoad={() => setImageLoaded(true)}
        />
      </div>

      {/* Content */}
      <div className="p-4 space-y-2">
        {/* Brand */}
        <p className="text-xs text-muted-foreground uppercase tracking-wide font-medium">
          {brand}
        </p>

        {/* Product Name */}
        <h3 className="font-semibold text-sm text-foreground line-clamp-2 min-h-[2.5rem]">
          {name}
        </h3>

        {/* Price */}
        {priceEstimate && (
          <p className="text-lg font-bold text-primary">{priceEstimate}</p>
        )}

        {/* Where to Buy */}
        {whereToBuy && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <ExternalLink className="w-3 h-3" />
            <span>Available at {whereToBuy}</span>
          </div>
        )}

        {/* Why it's a dupe */}
        {reasons.length > 0 && (
          <div className="pt-2 border-t border-border/50 space-y-1">
            <p className="text-xs font-medium text-muted-foreground">Why it's a dupe:</p>
            {reasons.slice(0, 2).map((reason, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-xs text-foreground/80">
                <Check className="w-3 h-3 text-emerald-500 mt-0.5 flex-shrink-0" />
                <span className="line-clamp-2">{reason}</span>
              </div>
            ))}
          </div>
        )}

        {/* Shared ingredients preview */}
        {sharedIngredients.length > 0 && (
          <div className="flex flex-wrap gap-1 pt-1">
            {sharedIngredients.slice(0, 3).map((ingredient, idx) => (
              <Badge
                key={idx}
                variant="secondary"
                className="text-[10px] px-1.5 py-0 bg-secondary/50"
              >
                {ingredient}
              </Badge>
            ))}
            {sharedIngredients.length > 3 && (
              <Badge
                variant="outline"
                className="text-[10px] px-1.5 py-0"
              >
                +{sharedIngredients.length - 3}
              </Badge>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};
