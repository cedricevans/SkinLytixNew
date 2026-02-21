import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';

interface CorrectionInputProps {
  value: string;
  onChange: (value: string) => void;
  isVisible: boolean;
}

export function CorrectionInput({
  value,
  onChange,
  isVisible
}: CorrectionInputProps) {
  if (!isVisible) {
    return null;
  }

  const wordCount = value.trim().split(/\s+/).filter(w => w.length > 0).length;

  return (
    <Card className="border-l-4 border-l-amber-500 bg-amber-50/30">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-amber-600" />
            <CardTitle className="text-lg font-semibold">Correction Required</CardTitle>
          </div>
          <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-500/20">
            Verdict: Correct
          </Badge>
        </div>
        <p className="text-sm text-amber-700/80 mt-1">
          Describe specifically what needs to be corrected in the AI claim
        </p>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Guidance */}
        <div className="p-4 bg-white border border-amber-200 rounded-lg space-y-2">
          <p className="font-medium text-sm text-amber-900">How to Write Your Correction</p>
          <ol className="text-xs text-amber-800/80 space-y-2 list-decimal ml-5">
            <li><span className="font-medium">Specify what's wrong:</span> "AI said X, but evidence shows Y"</li>
            <li><span className="font-medium">Provide the correct statement:</span> State what should replace the incorrect claim</li>
            <li><span className="font-medium">Cite your source:</span> Reference the peer-reviewed study that contradicts the claim</li>
            <li><span className="font-medium">Explain the nuance:</span> Why did AI get it partially wrong? Are there conditions that apply?</li>
          </ol>
        </div>

        {/* Textarea */}
        <div className="space-y-2">
          <Label htmlFor="correction" className="text-sm font-medium">
            What needs to be corrected? *
          </Label>
          <Textarea
            id="correction"
            placeholder={`Example: "AI claimed niacinamide directly reduces pore size, but the evidence shows it improves the APPEARANCE of pores by reducing sebum production and making pores less visible. This distinction is important—it's not shrinking the physical pore, but making them look smaller through improved skin texture."`}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            rows={6}
            className="font-sans text-sm resize-none"
          />
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Provide clear, specific corrections based on your evidence</span>
            <span>{wordCount} words</span>
          </div>
        </div>

        {/* Examples */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <p className="font-medium text-sm">Good Correction Examples</p>
          <div className="space-y-3">
            <div className="border-l-2 border-green-500 pl-3 space-y-1">
              <p className="text-xs font-mono bg-white p-2 rounded text-green-700">
                "AI overstated concentration: said 2-5%, but clinical studies used 0.5-2%. Should recommend lower starting concentration."
              </p>
            </div>
            <div className="border-l-2 border-green-500 pl-3 space-y-1">
              <p className="text-xs font-mono bg-white p-2 rounded text-green-700">
                "AI missed pregnancy warning: Retinoid absorption risk is significant in pregnancy. CIR monograph recommends avoidance."
              </p>
            </div>
            <div className="border-l-2 border-green-500 pl-3 space-y-1">
              <p className="text-xs font-mono bg-white p-2 rounded text-green-700">
                "AI claim too broad: Evidence only supports ingredient in 1-2% concentration, not higher. Should specify safe range."
              </p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg space-y-2">
          <p className="font-medium text-sm text-blue-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Tips for Strong Corrections
          </p>
          <ul className="text-xs text-blue-600/80 space-y-1 list-disc ml-5">
            <li>Be specific: "overstated" vs "said 5% but evidence shows 2%"</li>
            <li>Use evidence: Always reference which study contradicts the claim</li>
            <li>Distinguish nuance: AI may be partially right but missing important context</li>
            <li>Be fair: If AI is 80% correct, acknowledge the correct parts</li>
            <li>Think like a consumer: What's the practical implication of the correction?</li>
          </ul>
        </div>

        {/* Bad Examples */}
        <div className="p-4 bg-red-500/5 border border-red-500/20 rounded-lg space-y-2">
          <p className="font-medium text-sm text-red-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            ❌ Avoid These Common Mistakes
          </p>
          <div className="space-y-2 text-xs text-red-600/80">
            <p>"<span className="line-through">This is wrong</span>" — Be specific about what and why</p>
            <p>"<span className="line-through">I don't think this is right</span>" — Use evidence, not opinion</p>
            <p>"<span className="line-through">AI is stupid</span>" — Be professional, focus on the science</p>
            <p>"<span className="line-through">Studies show different</span>" — Always cite which studies and how</p>
          </div>
        </div>

        {/* Validation */}
        {value.trim().length === 0 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Correction details are required when verdict is "Correct"
          </div>
        )}
        {value.trim().length > 0 && value.trim().split(/\s+/).length < 10 && (
          <div className="p-3 bg-amber-500/10 border border-amber-500/20 rounded text-xs text-amber-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            Consider providing more detail (at least 10 words recommended)
          </div>
        )}
        {value.trim().split(/\s+/).length >= 10 && (
          <div className="p-3 bg-green-500/10 border border-green-500/20 rounded text-xs text-green-600 flex items-center gap-2">
            ✓ Good detail level
          </div>
        )}
      </CardContent>
    </Card>
  );
}
