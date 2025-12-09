import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Check, Sparkles, DollarSign } from "lucide-react";

interface DupeCardProps {
  name: string;
  brand: string;
  imageUrl?: string;
  reasons: string[];
  sharedIngredients: string[];
  priceEstimate?: string;
  profileMatch?: boolean;
  category?: string;
}

export const DupeCard = ({
  name,
  brand,
  imageUrl,
  reasons,
  sharedIngredients,
  priceEstimate,
  profileMatch,
  category,
}: DupeCardProps) => {
  return (
    <Card className="overflow-hidden hover:shadow-lg transition-shadow duration-300 bg-card border-border">
      <div className="flex">
        {/* Product Image */}
        <div className="w-24 h-24 md:w-32 md:h-32 flex-shrink-0 bg-muted/50 flex items-center justify-center overflow-hidden">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="w-full h-full object-cover"
              onError={(e) => {
                e.currentTarget.src = "https://images.unsplash.com/photo-1556228578-0d85b1a4d571?w=200";
              }}
            />
          ) : (
            <div className="text-4xl">🧴</div>
          )}
        </div>

        {/* Content */}
        <CardContent className="flex-1 p-3 md:p-4">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-sm md:text-base text-foreground line-clamp-1">{name}</h3>
              <p className="text-xs md:text-sm text-muted-foreground">{brand}</p>
            </div>
            {profileMatch && (
              <Badge variant="secondary" className="flex-shrink-0 text-xs bg-emerald-500/10 text-emerald-600 border-emerald-500/20">
                <Check className="w-3 h-3 mr-1" />
                Match
              </Badge>
            )}
          </div>

          {/* Why it's a dupe */}
          <div className="mt-2 space-y-1">
            {reasons.slice(0, 2).map((reason, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-xs text-muted-foreground">
                <Sparkles className="w-3 h-3 mt-0.5 text-primary flex-shrink-0" />
                <span className="line-clamp-1">{reason}</span>
              </div>
            ))}
          </div>

          {/* Shared ingredients */}
          <div className="mt-2 flex flex-wrap gap-1">
            {sharedIngredients.slice(0, 3).map((ingredient, idx) => (
              <Badge key={idx} variant="outline" className="text-[10px] px-1.5 py-0">
                {ingredient}
              </Badge>
            ))}
          </div>

          {/* Price */}
          {priceEstimate && (
            <div className="mt-2 flex items-center gap-1 text-xs text-muted-foreground">
              <DollarSign className="w-3 h-3" />
              <span>{priceEstimate}</span>
            </div>
          )}
        </CardContent>
      </div>
    </Card>
  );
};
