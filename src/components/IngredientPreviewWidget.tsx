import { useState } from 'react';
import { Sparkles, AlertTriangle, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useNavigate } from 'react-router-dom';

interface IngredientResult {
  name: string;
  status: 'safe' | 'caution' | 'concern';
  note: string;
}

// Simple ingredient analysis for preview (client-side only)
const analyzeIngredients = (text: string): IngredientResult[] => {
  const ingredients = text.split(',').map(i => i.trim().toLowerCase()).filter(Boolean).slice(0, 5);
  
  const knownIngredients: Record<string, IngredientResult> = {
    'water': { name: 'Water', status: 'safe', note: 'Primary solvent, hydrating base' },
    'aqua': { name: 'Aqua', status: 'safe', note: 'Water (INCI name)' },
    'glycerin': { name: 'Glycerin', status: 'safe', note: 'Excellent humectant' },
    'niacinamide': { name: 'Niacinamide', status: 'safe', note: 'Brightening, pore-refining' },
    'hyaluronic acid': { name: 'Hyaluronic Acid', status: 'safe', note: 'Powerful hydrator' },
    'retinol': { name: 'Retinol', status: 'caution', note: 'Potent, use with sun protection' },
    'fragrance': { name: 'Fragrance', status: 'caution', note: 'Potential sensitizer' },
    'parfum': { name: 'Parfum', status: 'caution', note: 'Potential sensitizer' },
    'alcohol': { name: 'Alcohol', status: 'caution', note: 'Can be drying for some' },
    'sodium lauryl sulfate': { name: 'SLS', status: 'concern', note: 'May irritate sensitive skin' },
    'parabens': { name: 'Parabens', status: 'concern', note: 'Preservative, some concerns' },
    'formaldehyde': { name: 'Formaldehyde', status: 'concern', note: 'Known irritant' },
  };

  return ingredients.map(ing => {
    const match = Object.entries(knownIngredients).find(([key]) => 
      ing.includes(key) || key.includes(ing)
    );
    
    if (match) {
      return match[1];
    }
    
    return {
      name: ing.charAt(0).toUpperCase() + ing.slice(1),
      status: 'safe' as const,
      note: 'Standard cosmetic ingredient',
    };
  });
};

const IngredientPreviewWidget = () => {
  const navigate = useNavigate();
  const [ingredients, setIngredients] = useState('');
  const [results, setResults] = useState<IngredientResult[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [hasAnalyzed, setHasAnalyzed] = useState(false);

  const handleAnalyze = () => {
    if (!ingredients.trim()) return;
    
    setIsAnalyzing(true);
    
    // Simulate brief delay for effect
    setTimeout(() => {
      const analyzed = analyzeIngredients(ingredients);
      setResults(analyzed);
      setIsAnalyzing(false);
      setHasAnalyzed(true);
    }, 800);
  };

  const getStatusIcon = (status: 'safe' | 'caution' | 'concern') => {
    switch (status) {
      case 'safe':
        return <CheckCircle2 className="h-4 w-4 text-success-foreground" />;
      case 'caution':
        return <AlertTriangle className="h-4 w-4 text-amber-500" />;
      case 'concern':
        return <AlertTriangle className="h-4 w-4 text-destructive" />;
    }
  };

  const getStatusColor = (status: 'safe' | 'caution' | 'concern') => {
    switch (status) {
      case 'safe':
        return 'bg-success/10 text-success-foreground border-success/30';
      case 'caution':
        return 'bg-amber-500/10 text-amber-600 border-amber-500/30';
      case 'concern':
        return 'bg-destructive/10 text-destructive border-destructive/30';
    }
  };

  return (
    <section className="py-16 md:py-20 px-4 md:px-6">
      <div className="max-w-4xl mx-auto">
        <Card className="overflow-hidden border-2 border-accent/30 bg-gradient-to-br from-accent/5 via-transparent to-primary/5">
          <CardContent className="p-6 md:p-10">
            <div className="grid md:grid-cols-2 gap-8 items-start">
              {/* Left side - Input */}
              <div>
                <div className="flex items-center gap-2 mb-4">
                  <Sparkles className="h-5 w-5 text-accent" />
                  <h3 className="text-xl font-heading font-bold">Try It Now</h3>
                </div>
                <p className="text-muted-foreground text-sm mb-4">
                  Paste a few ingredients from any product to see instant insights. 
                  No sign-up required.
                </p>
                
                <Textarea
                  placeholder="e.g., Water, Glycerin, Niacinamide, Fragrance..."
                  value={ingredients}
                  onChange={(e) => setIngredients(e.target.value)}
                  className="min-h-[100px] mb-4 resize-none"
                />
                
                <Button 
                  onClick={handleAnalyze}
                  disabled={!ingredients.trim() || isAnalyzing}
                  className="w-full gap-2"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      Analyzing...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4" />
                      Quick Analyze
                    </>
                  )}
                </Button>

                <p className="text-xs text-muted-foreground mt-3 text-center">
                  This is a preview. Full analysis includes 50+ data points.
                </p>
              </div>

              {/* Right side - Results */}
              <div className="min-h-[200px]">
                {!hasAnalyzed ? (
                  <div className="h-full flex items-center justify-center border-2 border-dashed border-border rounded-lg p-6">
                    <p className="text-muted-foreground text-center text-sm">
                      Enter ingredients to see<br />instant safety insights
                    </p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="font-semibold text-sm">Quick Results</h4>
                      <Badge variant="secondary" className="text-xs">
                        {results.length} ingredients
                      </Badge>
                    </div>
                    
                    {results.map((result, i) => (
                      <div 
                        key={i}
                        className={`flex items-start gap-3 p-3 rounded-lg border ${getStatusColor(result.status)}`}
                      >
                        {getStatusIcon(result.status)}
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-sm truncate">{result.name}</p>
                          <p className="text-xs opacity-80">{result.note}</p>
                        </div>
                      </div>
                    ))}

                    <Button 
                      variant="cta" 
                      className="w-full mt-4 gap-2"
                      onClick={() => navigate('/demo-analysis')}
                    >
                      Get Full Analysis
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </section>
  );
};

export default IngredientPreviewWidget;
