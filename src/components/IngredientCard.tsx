import { useState } from 'react';
import { cn } from '@/lib/utils';

interface IngredientCardProps {
  name: string;
  category: 'beneficial' | 'safe' | 'problematic' | 'unverified';
  details?: string;
  emoji?: string;
}

export const IngredientCard = ({ name, category, details, emoji }: IngredientCardProps) => {
  const [isFlipped, setIsFlipped] = useState(false);

  const getEmoji = () => {
    if (emoji) return emoji;
    
    // Ingredient type detection logic
    const nameLower = name.toLowerCase();
    if (/acid|retinol|peptide|niacinamide|vitamin|serum/.test(nameLower)) return '🧪';
    if (/extract|oil|butter|botanical|plant|herb|seed/.test(nameLower)) return '🌿';
    if (/hyaluronic|glycerin|aloe|aqua|water/.test(nameLower)) return '💧';
    if (/sunscreen|zinc|titanium|spf|uv/.test(nameLower)) return '🛡️';
    
    // Fallback by category
    if (category === 'beneficial') return '✨';
    if (category === 'problematic') return '⚠️';
    if (category === 'unverified') return '❓';
    return '🧴';
  };

  const getCategoryStyles = () => {
    switch (category) {
      case 'beneficial':
        return 'from-emerald-100 to-emerald-200 dark:from-emerald-900 dark:to-emerald-800 border-emerald-300 dark:border-emerald-700';
      case 'safe':
        return 'from-green-100 to-green-200 dark:from-green-900 dark:to-green-800 border-green-300 dark:border-green-700';
      case 'problematic':
        return 'from-red-100 to-red-200 dark:from-red-900 dark:to-red-800 border-red-300 dark:border-red-700';
      case 'unverified':
        return 'from-amber-100 to-amber-200 dark:from-amber-900 dark:to-amber-800 border-amber-300 dark:border-amber-700';
    }
  };

  const getTextColor = () => {
    switch (category) {
      case 'beneficial':
        return 'text-emerald-900 dark:text-emerald-100';
      case 'safe':
        return 'text-green-900 dark:text-green-100';
      case 'problematic':
        return 'text-red-900 dark:text-red-100';
      case 'unverified':
        return 'text-amber-900 dark:text-amber-100';
    }
  };

  return (
    <div 
      className="ingredient-card-perspective cursor-pointer"
      onClick={() => setIsFlipped(!isFlipped)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          setIsFlipped(!isFlipped);
        }
      }}
      role="button"
      tabIndex={0}
      aria-label={`${name} ingredient card. ${isFlipped ? 'Showing details' : 'Click to see details'}`}
    >
      <div className={cn(
        "ingredient-card relative w-full h-32 transition-all duration-600",
        isFlipped && "ingredient-card-flipped"
      )}>
        {/* Front Face */}
        <div className={cn(
          "card-face card-face-front absolute inset-0 flex flex-col items-center justify-center p-4 rounded-lg border-2 shadow-md hover:shadow-lg transition-shadow bg-gradient-to-br",
          getCategoryStyles(),
          getTextColor()
        )}>
          <span className="text-3xl mb-2">{getEmoji()}</span>
          <p className="text-sm font-semibold text-center leading-tight">{name}</p>
        </div>
        
        {/* Back Face */}
        <div className={cn(
          "card-face card-face-back absolute inset-0 flex flex-col items-center justify-center p-4 rounded-lg border-2 shadow-md bg-gradient-to-br overflow-y-auto",
          getCategoryStyles(),
          getTextColor()
        )}>
          <p className="text-xs text-center leading-relaxed">
            {details || 'No additional information available.'}
          </p>
          <p className="text-[10px] mt-2 opacity-70">Click to flip back</p>
        </div>
      </div>
    </div>
  );
};
