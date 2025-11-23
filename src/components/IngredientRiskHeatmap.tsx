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
      <div className="flex items-center gap-3 mb-6">
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-primary-glow flex items-center justify-center shadow-elegant">
          <span className="text-2xl">🗺️</span>
        </div>
        <div>
          <h3 className="text-2xl font-bold">Ingredient Risk Overview</h3>
          <p className="text-sm text-muted-foreground">
            Visual risk assessment at a glance • {ingredients.length} ingredients analyzed
          </p>
        </div>
      </div>
      <div className="relative bg-gradient-to-br from-card to-card/50 rounded-xl p-8 border border-border shadow-elegant backdrop-blur-sm">
        <div className="grid grid-cols-6 md:grid-cols-10 gap-3 md:gap-4">
          {ingredients.map((ingredient, index) => {
            const riskScore = ingredient.risk_score || 
              (ingredient.category === 'problematic' ? 85 :
               ingredient.category === 'unverified' ? 55 :
               ingredient.category === 'beneficial' ? 10 : 25);

            return (
              <div
                key={index}
                className={cn(
                  "relative aspect-square rounded-full cursor-pointer transition-all duration-300 transform hover:scale-125 hover:z-10 shadow-md hover:shadow-glow",
                  "animate-fade-in",
                  getRiskColor(riskScore)
                )}
                style={{
                  animationDelay: `${index * 20}ms`,
                }}
                onMouseEnter={() => setHoveredIngredient(ingredient.name)}
                onMouseLeave={() => setHoveredIngredient(null)}
                onClick={() => onIngredientClick?.(ingredient.name)}
                role="button"
                tabIndex={0}
                aria-label={`${ingredient.name} - ${getRiskLabel(riskScore)}`}
              >
                {hoveredIngredient === ingredient.name && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-3 px-4 py-3 bg-popover text-popover-foreground text-sm rounded-lg shadow-elegant whitespace-nowrap z-50 border border-border backdrop-blur-sm animate-fade-in">
                    <div className="font-bold mb-1">{ingredient.name}</div>
                    <div className="text-muted-foreground text-xs flex items-center gap-1">
                      {riskScore < 30 && '✓'} {riskScore >= 60 && '⚡'} {getRiskLabel(riskScore)} • {riskScore}/100
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <div className="mt-6 flex items-center justify-center gap-8 text-sm">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-green-400 to-green-600 shadow-md"></div>
            <span className="font-medium">Low Risk</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-md"></div>
            <span className="font-medium">Moderate</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-full bg-gradient-to-br from-red-400 to-red-600 shadow-md"></div>
            <span className="font-medium">High Risk</span>
          </div>
        </div>
      </div>
    </div>
  );
};