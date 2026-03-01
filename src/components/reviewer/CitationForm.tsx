import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Loader2, AlertCircle } from 'lucide-react';

export type CitationSourceType =
  | 'pubmed'
  | 'pubchem'
  | 'cir'
  | 'dermatology_textbook'
  | 'request_source_type'
  | 'other';

export interface Citation {
  type: CitationSourceType;
  title: string;
  authors: string;
  journal_name: string;
  publication_year: number | null;
  source_id: string;
  requested_source_type?: string;
  source_url: string;
}

interface CitationFormProps {
  onAddCitation: (citation: Citation) => void;
  isLoading?: boolean;
  allowExtendedSourceTypes?: boolean;
}

const BASE_SOURCE_TYPES: Array<{ value: CitationSourceType; label: string }> = [
  { value: 'pubmed', label: 'PubMed' },
  { value: 'pubchem', label: 'PubChem' },
  { value: 'cir', label: 'CIR' },
];

const EXTENDED_SOURCE_TYPES: Array<{ value: CitationSourceType; label: string }> = [
  { value: 'dermatology_textbook', label: 'Dermatology Textbook' },
  { value: 'other', label: 'Other Approved Source' }
];

export function CitationForm({
  onAddCitation,
  isLoading = false,
  allowExtendedSourceTypes = false
}: CitationFormProps) {
  const [formData, setFormData] = useState<Citation>({
    type: 'pubmed',
    title: '',
    authors: '',
    journal_name: '',
    publication_year: new Date().getFullYear(),
    source_id: '',
    requested_source_type: '',
    source_url: ''
  });

  const [errors, setErrors] = useState<Partial<Record<keyof Citation, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const citationTypes = [
    ...BASE_SOURCE_TYPES,
    ...(allowExtendedSourceTypes ? EXTENDED_SOURCE_TYPES : []),
    { value: 'request_source_type' as CitationSourceType, label: 'Request New Source Type' }
  ];

  const sourceIdLabel =
    formData.type === 'pubmed'
      ? 'PMID'
      : formData.type === 'pubchem'
        ? 'CID'
        : formData.type === 'cir'
          ? 'CIR ID'
          : 'Source ID';

  const requiresSourceId = formData.type === 'pubmed' || formData.type === 'pubchem' || formData.type === 'cir';
  const sourceIdPlaceholder =
    formData.type === 'pubmed'
      ? 'e.g., 34567890'
      : formData.type === 'pubchem'
        ? 'e.g., 5793'
        : formData.type === 'cir'
          ? 'e.g., CIR-2024-001'
          : 'Enter source identifier';

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
    if (requiresSourceId) {
      if (!formData.source_id.trim()) {
        newErrors.source_id = `${sourceIdLabel} is required`;
      } else if ((formData.type === 'pubmed' || formData.type === 'pubchem') && !/^\d+$/.test(formData.source_id.trim())) {
        newErrors.source_id = `${sourceIdLabel} must be numeric`;
      }
    }
    if (formData.type === 'request_source_type' && !formData.requested_source_type?.trim()) {
      newErrors.requested_source_type = 'Please enter the new source type you want approved';
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
        type: 'pubmed',
        title: '',
        authors: '',
        journal_name: '',
        publication_year: new Date().getFullYear(),
        source_id: '',
        requested_source_type: '',
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
                {citationTypes.map(type => (
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

          {requiresSourceId && (
            <div className="space-y-2">
              <Label htmlFor="source-id" className="text-sm font-medium">
                {sourceIdLabel} *
              </Label>
              <Input
                id="source-id"
                placeholder={sourceIdPlaceholder}
                value={formData.source_id}
                onChange={(e) => setFormData(prev => ({ ...prev, source_id: e.target.value }))}
                className={errors.source_id ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {errors.source_id && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.source_id}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                {formData.type === 'pubmed'
                  ? 'Use numeric PMID only.'
                  : formData.type === 'pubchem'
                    ? 'Use numeric PubChem CID only.'
                    : 'Enter the official CIR identifier.'}
              </p>
            </div>
          )}

          {formData.type === 'request_source_type' && (
            <div className="space-y-2">
              <Label htmlFor="requested-source-type" className="text-sm font-medium">
                Requested Source Type *
              </Label>
              <Input
                id="requested-source-type"
                placeholder="e.g., EU SCCS Opinion"
                value={formData.requested_source_type || ''}
                onChange={(e) => setFormData(prev => ({ ...prev, requested_source_type: e.target.value }))}
                className={errors.requested_source_type ? 'border-red-500 focus-visible:ring-red-500' : ''}
              />
              {errors.requested_source_type && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3 h-3" />
                  {errors.requested_source_type}
                </p>
              )}
              <p className="text-xs text-muted-foreground">
                Tell admins which source type should be approved next.
              </p>
            </div>
          )}

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
            * 1+ validated source required
          </p>
        </form>
      </CardContent>
    </Card>
  );
}
