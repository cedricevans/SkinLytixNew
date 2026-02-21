import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Loader2, AlertCircle } from 'lucide-react';

export interface Citation {
  type: 'peer_reviewed' | 'clinical_study' | 'systematic_review' | 'dermatology_textbook' | 'cir_monograph' | 'other';
  title: string;
  authors: string;
  journal_name: string;
  publication_year: number | null;
  doi_or_pmid: string;
  source_url: string;
}

interface CitationFormProps {
  onAddCitation: (citation: Citation) => void;
  isLoading?: boolean;
}

const CITATION_TYPES = [
  { value: 'peer_reviewed', label: 'Peer-Reviewed Journal Article' },
  { value: 'clinical_study', label: 'Clinical Study' },
  { value: 'systematic_review', label: 'Systematic Review / Meta-Analysis' },
  { value: 'dermatology_textbook', label: 'Dermatology Textbook' },
  { value: 'cir_monograph', label: 'CIR Monograph' },
  { value: 'other', label: 'Other Peer-Reviewed Source' }
];

export function CitationForm({
  onAddCitation,
  isLoading = false
}: CitationFormProps) {
  const [formData, setFormData] = useState<Citation>({
    type: 'peer_reviewed',
    title: '',
    authors: '',
    journal_name: '',
    publication_year: new Date().getFullYear(),
    doi_or_pmid: '',
    source_url: ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof Citation, string>>>({});
  const [submitting, setSubmitting] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<Record<keyof Citation, string>> = {};

    if (!formData.title.trim()) {
      newErrors.title = 'Title is required';
    }
    if (!formData.authors.trim()) {
      newErrors.authors = 'Authors are required';
    }
    if (!formData.journal_name.trim()) {
      newErrors.journal_name = 'Journal/Source name is required';
    }
    if (!formData.doi_or_pmid.trim()) {
      newErrors.doi_or_pmid = 'DOI or PubMed ID is required';
    } else {
      // Basic validation of DOI or PMID format
      const isDOI = formData.doi_or_pmid.startsWith('10.');
      const isPMID = formData.doi_or_pmid.startsWith('PMID:');
      if (!isDOI && !isPMID) {
        newErrors.doi_or_pmid = 'Format: "10.xxxx/xxx" (DOI) or "PMID:xxxxx" (PubMed ID)';
      }
    }
    if (!formData.source_url.trim()) {
      newErrors.source_url = 'URL to source is required';
    } else {
      try {
        new URL(formData.source_url);
      } catch {
        newErrors.source_url = 'Invalid URL format';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setSubmitting(true);
    try {
      onAddCitation(formData);
      
      // Reset form
      setFormData({
        type: 'peer_reviewed',
        title: '',
        authors: '',
        journal_name: '',
        publication_year: new Date().getFullYear(),
        doi_or_pmid: '',
        source_url: ''
      });
      setErrors({});
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="border-amber-200/50 bg-amber-50/30">
      <CardContent className="pt-6">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Citation Type */}
          <div className="space-y-2">
            <Label htmlFor="citation-type" className="text-sm font-medium">
              Citation Type *
            </Label>
            <Select
              value={formData.type}
              onValueChange={(value) => 
                setFormData(prev => ({ 
                  ...prev, 
                  type: value as Citation['type'] 
                }))
              }
            >
              <SelectTrigger id="citation-type">
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {CITATION_TYPES.map(type => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Title */}
          <div className="space-y-2">
            <Label htmlFor="title" className="text-sm font-medium">
              Title *
            </Label>
            <Input
              id="title"
              placeholder="Full title of the article or study"
              value={formData.title}
              onChange={(e) => setFormData(prev => ({ ...prev, title: e.target.value }))}
              className={errors.title ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {errors.title && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.title}
              </p>
            )}
          </div>

          {/* Authors */}
          <div className="space-y-2">
            <Label htmlFor="authors" className="text-sm font-medium">
              Authors *
            </Label>
            <Input
              id="authors"
              placeholder="Last, F.; Last, F.; et al."
              value={formData.authors}
              onChange={(e) => setFormData(prev => ({ ...prev, authors: e.target.value }))}
              className={errors.authors ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {errors.authors && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.authors}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Format: "Last, First.; Last, First.; et al."
            </p>
          </div>

          {/* Journal Name */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="journal" className="text-sm font-medium">
                Journal/Source Name *
              </Label>
              <Input
                id="journal"
                placeholder="Journal of Cosmetic Dermatology"
                value={formData.journal_name}
                onChange={(e) => setFormData(prev => ({ ...prev, journal_name: e.target.value }))}
                className={errors.journal_name ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {errors.journal_name && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.journal_name}
                </p>
              )}
            </div>

            {/* Publication Year */}
            <div className="space-y-2">
              <Label htmlFor="year" className="text-sm font-medium">
                Publication Year
              </Label>
              <Input
                id="year"
                type="number"
                min="1900"
                max={new Date().getFullYear() + 1}
                placeholder={new Date().getFullYear().toString()}
                value={formData.publication_year || ''}
                onChange={(e) => setFormData(prev => ({ 
                  ...prev, 
                  publication_year: e.target.value ? parseInt(e.target.value) : null 
                }))}
              />
            </div>
          </div>

          {/* DOI or PubMed ID */}
          <div className="space-y-2">
            <Label htmlFor="doi-pmid" className="text-sm font-medium">
              DOI or PubMed ID *
            </Label>
            <Input
              id="doi-pmid"
              placeholder="10.1111/jocd.13452 or PMID:34567890"
              value={formData.doi_or_pmid}
              onChange={(e) => setFormData(prev => ({ ...prev, doi_or_pmid: e.target.value }))}
              className={errors.doi_or_pmid ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {errors.doi_or_pmid && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.doi_or_pmid}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Use "10.xxxx/xxx" format for DOI or "PMID:xxxxx" for PubMed
            </p>
          </div>

          {/* Source URL */}
          <div className="space-y-2">
            <Label htmlFor="url" className="text-sm font-medium">
              URL to Source *
            </Label>
            <Input
              id="url"
              type="url"
              placeholder="https://pubmed.ncbi.nlm.nih.gov/... or https://doi.org/..."
              value={formData.source_url}
              onChange={(e) => setFormData(prev => ({ ...prev, source_url: e.target.value }))}
              className={errors.source_url ? 'border-red-500 focus-visible:ring-red-500' : ''}
            />
            {errors.source_url && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" />
                {errors.source_url}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            disabled={submitting || isLoading}
            className="w-full"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Adding Citation...
              </>
            ) : (
              <>
                <Plus className="w-4 h-4 mr-2" />
                Add Citation
              </>
            )}
          </Button>

          {/* Required note */}
          <p className="text-xs text-muted-foreground text-center pt-2">
            * Minimum 1 peer-reviewed citation required
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
