import { useState } from 'react';
import { cn } from '@/lib/utils';

interface IngredientRiskHeatmapProps {
  ingredients: Array<{
    name: string;
    category: 'beneficial' | 'safe' | 'problematic' | 'unverified';
    risk_score?: number;
  }>;
  onIngredientClick?: (ingredientName: string) => void;
}

export const IngredientRiskHeatmap = ({ ingredients, onIngredientClick }: IngredientRiskHeatmapProps) => {
  const [hoveredIngredient, setHoveredIngredient] = useState<string | null>(null);

  const getRiskColor = (riskScore: number) => {
    if (riskScore < 30) return 'bg-green-500 hover:bg-green-600';
    if (riskScore < 60) return 'bg-yellow-500 hover:bg-yellow-600';
    return 'bg-red-500 hover:bg-red-600';
  };

  const getRiskLabel = (riskScore: number) => {
    if (riskScore < 30) return 'Low Risk';
    if (riskScore < 60) return 'Moderate Risk';
    return 'High Risk';
  };

  return (
    <div className="w-full mb-8 animate-fade-in-up">
      <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
        🗺️ Ingredient Risk Overview
      </h3>
      <div className="relative bg-card rounded-lg p-6 border border-border shadow-soft">
        <div className="grid grid-cols-6 md:grid-cols-10 gap-2">
          {ingredients.map((ingredient, index) => {
            const riskScore = ingredient.risk_score || 
              (ingredient.category === 'problematic' ? 85 :
               ingredient.category === 'unverified' ? 55 :
               ingredient.category === 'beneficial' ? 10 : 25);

            return (
              <div
                key={index}
                className={cn(
                  "relative aspect-square rounded cursor-pointer transition-all duration-200 transform hover:scale-110 hover:z-10",
                  getRiskColor(riskScore)
                )}
                onMouseEnter={() => setHoveredIngredient(ingredient.name)}
                onMouseLeave={() => setHoveredIngredient(null)}
                onClick={() => onIngredientClick?.(ingredient.name)}
                role="button"
                tabIndex={0}
                aria-label={`${ingredient.name} - ${getRiskLabel(riskScore)}`}
              >
                {hoveredIngredient === ingredient.name && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded shadow-lg whitespace-nowrap z-50 border border-border">
                    <div className="font-semibold">{ingredient.name}</div>
                    <div className="text-muted-foreground">{getRiskLabel(riskScore)}</div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-4 flex items-center justify-center gap-6 text-sm text-muted-foreground">
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-green-500"></div>
            <span>Low Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-yellow-500"></div>
            <span>Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-4 h-4 rounded bg-red-500"></div>
            <span>High Risk</span>
          </div>
        </div>
      </div>
    </div>
  );
};