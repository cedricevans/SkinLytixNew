import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { 
  Trash2, 
  ExternalLink, 
  AlertCircle 
} from 'lucide-react';
import type { Citation } from './CitationForm';

interface CitationListProps {
  citations: Citation[];
  onRemove: (index: number) => void;
}

const CITATION_TYPE_LABELS: Record<Citation['type'], string> = {
  peer_reviewed: 'Peer-Reviewed Article',
  clinical_study: 'Clinical Study',
  systematic_review: 'Systematic Review',
  dermatology_textbook: 'Textbook',
  cir_monograph: 'CIR Monograph',
  other: 'Other Source'
};

const CITATION_TYPE_COLORS: Record<Citation['type'], string> = {
  peer_reviewed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  clinical_study: 'bg-green-500/10 text-green-600 border-green-500/20',
  systematic_review: 'bg-purple-500/10 text-purple-600 border-purple-500/20',
  dermatology_textbook: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  cir_monograph: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20',
  other: 'bg-muted text-muted-foreground border-muted'
};

export function CitationList({
  citations,
  onRemove
}: CitationListProps) {
  if (citations.length === 0) {
    return (
      <div className="p-4 bg-muted/30 rounded-lg border border-dashed border-muted text-center">
        <AlertCircle className="w-5 h-5 text-muted-foreground mx-auto mb-2" />
        <p className="text-sm text-muted-foreground">
          No citations added yet. Add a peer-reviewed source.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="font-medium flex items-center gap-2">
          <span>Added Citations</span>
          <Badge variant="secondary" className="ml-auto">
            {citations.length} of ∞
          </Badge>
        </h3>
      </div>

      <div className="space-y-2">
        {citations.map((citation, index) => (
          <Card key={index} className="overflow-hidden">
            <CardContent className="p-4">
              <div className="flex gap-4">
                {/* Citation Content */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Type Badge + Actions */}
                  <div className="flex items-start justify-between gap-3">
                    <Badge 
                      variant="outline"
                      className={`capitalize ${CITATION_TYPE_COLORS[citation.type]}`}
                    >
                      {CITATION_TYPE_LABELS[citation.type]}
                    </Badge>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRemove(index)}
                      className="text-red-500 hover:text-red-700 hover:bg-red-50"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>

                  {/* Title */}
                  <div>
                    <p className="font-medium text-sm leading-snug">
                      {citation.title}
                    </p>
                  </div>

                  {/* Authors */}
                  <p className="text-xs text-muted-foreground italic">
                    {citation.authors}
                  </p>

                  {/* Journal + Year */}
                  <div className="flex items-center gap-2 flex-wrap text-xs text-muted-foreground">
                    <span className="font-mono">{citation.journal_name}</span>
                    {citation.publication_year && (
                      <>
                        <span>•</span>
                        <span>{citation.publication_year}</span>
                      </>
                    )}
                  </div>

                  {/* DOI/PMID */}
                  <div className="flex items-center gap-2 flex-wrap pt-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                      {citation.doi_or_pmid}
                    </code>
                    {citation.source_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-xs"
                        asChild
                      >
                        <a
                          href={citation.source_url}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <ExternalLink className="w-3 h-3 mr-1" />
                          View
                        </a>
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <div className="p-3 bg-green-500/5 border border-green-500/20 rounded-lg text-sm text-green-600">
        ✓ {citations.length} citation{citations.length !== 1 ? 's' : ''} added
      </div>
    </div>
  );
}
