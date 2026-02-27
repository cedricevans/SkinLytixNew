import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  BookOpen,
  AlertCircle
} from 'lucide-react';
import { CitationForm, type Citation } from './CitationForm';
import { CitationList } from './CitationList';

interface OEWEvidencePanelProps {
  citations: Citation[];
  onCitationsChange: (citations: Citation[]) => void;
  ingredientName: string;
}

export function OEWEvidencePanel({
  citations,
  onCitationsChange,
  ingredientName
}: OEWEvidencePanelProps) {
  const [isAddingCitation, setIsAddingCitation] = useState(false);

  const handleAddCitation = (citation: Citation) => {
    onCitationsChange([...citations, citation]);
    setIsAddingCitation(false);
  };

  const handleRemoveCitation = (index: number) => {
    onCitationsChange(citations.filter((_, i) => i !== index));
  };

  const hasRequiredCitations = citations.length >= 1;

  return (
    <Card className="border-l-4 border-l-primary">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-primary" />
            <CardTitle className="text-lg font-semibold">Step 2: Evidence</CardTitle>
          </div>
          <Badge 
            variant="outline"
            className={hasRequiredCitations ? 'bg-green-500/10 text-green-600 border-green-500/20' : 'bg-amber-500/10 text-amber-600 border-amber-500/20'}
          >
            {citations.length} / 1 citations
          </Badge>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Find peer-reviewed sources that confirm or contradict the AI claim
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Citation Requirements */}
        <div className="p-4 bg-blue-500/5 border border-blue-500/20 rounded-lg space-y-2">
          <p className="text-sm font-medium text-blue-600 flex items-center gap-2">
            <AlertCircle className="w-4 h-4" />
            Evidence Requirements
          </p>
          <ul className="text-xs text-blue-600/80 space-y-1 ml-6 list-disc">
            <li>1+ peer-reviewed source (required)</li>
            <li>Can be: PubMed article, journal article with DOI, CIR monograph, clinical study, or textbook</li>
            <li>Must include DOI (10.xxxx) or PubMed ID (PMID:xxxxx)</li>
            <li>Must include direct URL to source</li>
          </ul>
        </div>

        {/* Citation Form */}
        <div className="space-y-3">
          <p className="font-medium text-sm">Add Citation</p>
          <CitationForm 
            onAddCitation={handleAddCitation}
            isLoading={isAddingCitation}
          />
        </div>

        {/* Current Citations */}
        <div className="space-y-3">
          <CitationList 
            citations={citations}
            onRemove={handleRemoveCitation}
          />
        </div>

        {/* Guidelines */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-3">
          <p className="font-medium text-sm">Where to Find Sources</p>
          <div className="grid md:grid-cols-2 gap-3 text-xs">
            <div className="space-y-1">
              <p className="font-medium">🔬 PubMed</p>
              <p className="text-muted-foreground">pubmed.ncbi.nlm.nih.gov - Search "{ingredientName} cosmetic dermatology"</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">🎓 Google Scholar</p>
              <p className="text-muted-foreground">scholar.google.com - Filter by recent years</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">📖 CIR Database</p>
              <p className="text-muted-foreground">cir-safety.org - Cosmetic Ingredient Review (expert panel)</p>
            </div>
            <div className="space-y-1">
              <p className="font-medium">📚 Dermatology Journals</p>
              <p className="text-muted-foreground">Journal of Cosmetic Dermatology, Dermatologic Clinics</p>
            </div>
          </div>
        </div>

        {/* Tips */}
        <div className="space-y-2 pt-2 border-t border-muted text-xs text-muted-foreground">
          <p className="font-medium text-foreground">💡 Tips for Finding Good Evidence</p>
          <ul className="list-disc ml-5 space-y-1">
            <li>Prefer systematic reviews and meta-analyses (strongest evidence)</li>
            <li>Look for multiple independent studies confirming the claim</li>
            <li>Check publication year - recent sources are better for active research areas</li>
            <li>If conflicting evidence exists, note it in internal notes</li>
            <li>Avoid influencer blogs, marketing claims, and anecdotal evidence</li>
          </ul>
        </div>
      </CardContent>
    </Card>
  );
}
