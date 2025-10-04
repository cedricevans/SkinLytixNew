import { useParams, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertCircle, CheckCircle2, Sparkles, Home, ScanLine, Database, Users } from "lucide-react";
import PostAnalysisFeedback from "@/components/PostAnalysisFeedback";

interface AnalysisData {
  id: string;
  product_name: string;
  product_id: string | null;
  barcode: string | null;
  ingredients_list: string;
  epiq_score: number;
  recommendations_json: {
    safe_ingredients: string[];
    concern_ingredients: string[];
    warnings?: string[];
    summary: string;
    routine_suggestions: string[];
    personalized?: boolean;
  };
  analyzed_at: string;
}

const Analysis = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [analysis, setAnalysis] = useState<AnalysisData | null>(null);
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [savedToDb, setSavedToDb] = useState(false);

  const fetchAnalysis = async () => {
    if (!id) return;

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate('/auth');
        return;
      }

      const { data, error } = await supabase
        .from('user_analyses')
        .select('*')
        .eq('id', id)
        .eq('user_id', user.id)
        .single();

      if (error) {
        console.error('Error fetching analysis:', error);
        toast({
          title: "Error loading analysis",
          description: "Could not load the analysis data.",
          variant: "destructive",
        });
        navigate('/');
        return;
      }

      setAnalysis(data as any);
      setSavedToDb(!!data.product_id);
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveToDatabase = async () => {
    if (!analysis || savedToDb) return;

    setIsSaving(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast({
          title: "Not authenticated",
          description: "Please sign in to save products.",
          variant: "destructive",
        });
        return;
      }

      // Parse ingredients from the stored list
      const ingredientsArray = analysis.ingredients_list
        .split(/[,\n]/)
        .map((i: string) => i.trim())
        .filter((i: string) => i.length > 0);

      const { data, error } = await supabase.functions.invoke('save-product', {
        body: {
          product_name: analysis.product_name,
          barcode: analysis.barcode,
          ingredients: ingredientsArray,
          analysis_id: analysis.id,
        },
      });

      if (error) throw error;

      const result = data as { success: boolean; product_id: string; verification_count: number; is_new: boolean };

      toast({
        title: result.is_new ? "✅ Added to Community Database!" : "✅ Product Verified!",
        description: result.is_new 
          ? `You're contributor #${result.verification_count}`
          : `Verified by ${result.verification_count} users`,
      });

      setSavedToDb(true);
    } catch (error: any) {
      console.error('Error saving product:', error);
      toast({
        title: "Failed to save product",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  useEffect(() => {
    fetchAnalysis();
  }, [id]);

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted">
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading your analysis...</p>
        </div>
      </main>
    );
  }

  if (!analysis) return null;

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-green-600 dark:text-green-400";
    if (score >= 50) return "text-yellow-600 dark:text-yellow-400";
    return "text-red-600 dark:text-red-400";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 70) return "Excellent";
    if (score >= 50) return "Good";
    return "Needs Attention";
  };

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4">
      <div className="container max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <Button variant="ghost" onClick={() => navigate('/')}>
            <Home className="w-4 h-4 mr-2" />
            Back to Home
          </Button>
          <Button variant="outline" onClick={() => navigate('/upload')}>
            <ScanLine className="w-4 h-4 mr-2" />
            Analyze Another
          </Button>
        </div>

        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2">{analysis.product_name}</h1>
          <p className="text-muted-foreground">
            Analyzed on {new Date(analysis.analyzed_at).toLocaleDateString()}
          </p>
        </div>

        <Card className="p-8 mb-8 text-center bg-gradient-to-br from-primary/5 to-accent/5">
          <h2 className="text-2xl font-semibold mb-4">EpiQ Score</h2>
          <div className={`text-7xl font-bold mb-4 ${getScoreColor(analysis.epiq_score)}`}>
            {analysis.epiq_score}
          </div>
          <Badge variant="secondary" className="text-lg px-4 py-2">
            {getScoreLabel(analysis.epiq_score)}
          </Badge>
          <p className="mt-6 text-muted-foreground max-w-2xl mx-auto">
            {analysis.recommendations_json.summary}
          </p>
        </Card>

        {!savedToDb && (
          <Card className="p-6 mb-8 bg-accent/5 border-accent">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-accent/20 flex items-center justify-center flex-shrink-0">
                  <Database className="w-6 h-6 text-accent" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold mb-1">Help the Community! 🌟</h3>
                  <p className="text-sm text-muted-foreground mb-3">
                    Be the first to add <strong>{analysis.product_name}</strong> to our database. 
                    Your contribution helps others discover safer products.
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Users className="w-4 h-4" />
                    <span>Join our community of beauty transparency advocates</span>
                  </div>
                </div>
              </div>
              <Button 
                onClick={handleSaveToDatabase}
                disabled={isSaving}
                size="lg"
                className="ml-4"
              >
                {isSaving ? "Saving..." : "Add to Database"}
              </Button>
            </div>
          </Card>
        )}

        {savedToDb && (
          <Card className="p-6 mb-8 bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-green-600 dark:text-green-400" />
              <div>
                <h3 className="font-semibold text-green-900 dark:text-green-100">Saved to Community Database</h3>
                <p className="text-sm text-green-700 dark:text-green-300">
                  This product is now discoverable by other users. Thank you for contributing!
                </p>
              </div>
            </div>
          </Card>
        )}

        {analysis.recommendations_json.personalized && (
          <Card className="p-6 mb-8 bg-primary/5 border-primary/20">
            <div className="flex items-center gap-3">
              <Sparkles className="w-6 h-6 text-primary" />
              <div>
                <h3 className="font-semibold">Personalized for Your Skin</h3>
                <p className="text-sm text-muted-foreground">
                  This analysis is customized based on your skin type and concerns
                </p>
              </div>
            </div>
          </Card>
        )}

        {analysis.recommendations_json.warnings && analysis.recommendations_json.warnings.length > 0 && (
          <Card className="p-6 mb-8 bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-600 dark:text-yellow-400" />
              <div>
                <h2 className="text-2xl font-bold text-yellow-900 dark:text-yellow-100">Personalized Warnings</h2>
                <p className="text-sm text-yellow-700 dark:text-yellow-300">Based on your skin profile</p>
              </div>
            </div>
            <div className="space-y-2">
              {analysis.recommendations_json.warnings.map((warning, index) => (
                <div key={index} className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-yellow-200 dark:border-yellow-800">
                  <p className="text-sm">{warning}</p>
                </div>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-500" />
            <div>
              <h2 className="text-2xl font-bold">Safe Ingredients</h2>
              <p className="text-sm text-muted-foreground">These ingredients are recognized and documented</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {analysis.recommendations_json.safe_ingredients.length > 0 ? (
              analysis.recommendations_json.safe_ingredients.map((ingredient, index) => (
                <Badge key={index} variant="secondary" className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100">
                  {ingredient}
                </Badge>
              ))
            ) : (
              <p className="text-muted-foreground">No safe ingredients identified</p>
            )}
          </div>
        </Card>

        {analysis.recommendations_json.concern_ingredients.length > 0 && (
          <Card className="p-6 mb-8">
            <div className="flex items-center gap-3 mb-4">
              <AlertCircle className="w-8 h-8 text-yellow-500" />
              <div>
                <h2 className="text-2xl font-bold">Ingredients Needing Attention</h2>
                <p className="text-sm text-muted-foreground">
                  Not found in our database - research recommended
                </p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {analysis.recommendations_json.concern_ingredients.map((ingredient, index) => (
                <Badge key={index} variant="secondary" className="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100">
                  {ingredient}
                </Badge>
              ))}
            </div>
          </Card>
        )}

        <Card className="p-6">
          <div className="flex items-center gap-3 mb-4">
            <Sparkles className="w-8 h-8 text-primary" />
            <h2 className="text-2xl font-bold">Routine Suggestions</h2>
          </div>
          <ul className="space-y-3">
            {analysis.recommendations_json.routine_suggestions.map((suggestion, index) => (
              <li key={index} className="flex items-start gap-3 p-3 bg-accent/5 rounded-lg">
                <span className="text-primary mt-1">•</span>
                <span className="flex-1">{suggestion}</span>
              </li>
            ))}
          </ul>
        </Card>

        {/* Post-Analysis Feedback */}
        <PostAnalysisFeedback analysisId={analysis.id} />
      </div>
    </main>
  );
};

export default Analysis;
