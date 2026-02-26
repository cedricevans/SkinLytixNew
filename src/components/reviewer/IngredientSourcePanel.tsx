import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  FlaskConical, 
  Bot, 
  Database,
  ExternalLink,
  BookOpen
} from 'lucide-react';

interface IngredientSourcePanelProps {
  ingredientName: string;
  pubchemData?: {
    cid?: string;
    molecularWeight?: number;
    molecularFormula?: string;
    iupacName?: string;
    synonyms?: string[];
  } | null;
  aiData?: {
    role?: string;
    explanation?: string;
    safetyLevel?: string;
  } | null;
  obfData?: {
    category?: string;
    functions?: string[];
  } | null;
}

export function IngredientSourcePanel({
  ingredientName,
  pubchemData,
  aiData,
  obfData
}: IngredientSourcePanelProps) {
  return (
    <Card className="h-full">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm font-medium flex items-center gap-2">
          <Database className="w-4 h-4" />
          Data Sources for {ingredientName}
        </CardTitle>
      </CardHeader>
      <CardContent className="p-0">
        <Tabs defaultValue="pubchem" className="w-full">
          <TabsList className="w-full grid grid-cols-3 rounded-none border-b">
            <TabsTrigger value="pubchem" className="flex items-center gap-1.5 text-xs">
              <FlaskConical className="w-3 h-3" />
              PubChem
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center gap-1.5 text-xs">
              <Bot className="w-3 h-3" />
              AI
            </TabsTrigger>
            <TabsTrigger value="obf" className="flex items-center gap-1.5 text-xs">
              <BookOpen className="w-3 h-3" />
              OBF
            </TabsTrigger>
          </TabsList>

          {/* PubChem Tab */}
          <TabsContent value="pubchem" className="p-4 space-y-4">
            {pubchemData ? (
              <>
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">CID</span>
                    <span className="font-mono text-sm break-all">{pubchemData.cid || 'N/A'}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Molecular Weight</span>
                    <span className="font-mono text-sm">
                      {pubchemData.molecularWeight ? `${pubchemData.molecularWeight} g/mol` : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Formula</span>
                    <span className="font-mono text-sm break-all">
                      {pubchemData.molecularFormula || 'N/A'}
                    </span>
                  </div>
                </div>
                
                {pubchemData.iupacName && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">IUPAC Name</span>
                    <p className="text-sm font-mono break-all">{pubchemData.iupacName}</p>
                  </div>
                )}

                {pubchemData.synonyms && pubchemData.synonyms.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">Synonyms</span>
                    <div className="flex flex-wrap gap-1">
                      {pubchemData.synonyms.slice(0, 5).map((syn, i) => (
                        <Badge key={i} variant="secondary" className="text-xs">
                          {syn}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {pubchemData.cid && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full"
                    asChild
                  >
                    <a 
                      href={`https://pubchem.ncbi.nlm.nih.gov/compound/${pubchemData.cid}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      View on PubChem
                      <ExternalLink className="w-3 h-3 ml-2" />
                    </a>
                  </Button>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No PubChem data available
              </div>
            )}
          </TabsContent>

          {/* AI Tab */}
          <TabsContent value="ai" className="p-4 space-y-4">
            {aiData ? (
              <>
                {aiData.role && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Classified Role</span>
                    <Badge variant="secondary" className="capitalize">
                      {aiData.role}
                    </Badge>
                  </div>
                )}
                
                {aiData.safetyLevel && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Safety Level</span>
                    <Badge 
                      className={
                        aiData.safetyLevel === 'safe' ? 'bg-green-500/10 text-green-600' :
                        aiData.safetyLevel === 'caution' ? 'bg-amber-500/10 text-amber-600' :
                        'bg-red-500/10 text-red-600'
                      }
                    >
                      {aiData.safetyLevel}
                    </Badge>
                  </div>
                )}

                {aiData.explanation && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">AI Explanation</span>
                    <p className="text-sm bg-muted/50 p-3 rounded-lg italic break-words">
                      "{aiData.explanation}"
                    </p>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No AI analysis data available
              </div>
            )}
          </TabsContent>

          {/* Open Beauty Facts Tab */}
          <TabsContent value="obf" className="p-4 space-y-4">
            {obfData ? (
              <>
                {obfData.category && (
                  <div className="space-y-1">
                    <span className="text-xs text-muted-foreground">Category</span>
                    <Badge variant="secondary">{obfData.category}</Badge>
                  </div>
                )}
                
                {obfData.functions && obfData.functions.length > 0 && (
                  <div className="space-y-2">
                    <span className="text-xs text-muted-foreground">Functions</span>
                    <div className="flex flex-wrap gap-1">
                      {obfData.functions.map((fn, i) => (
                        <Badge key={i} variant="outline" className="text-xs">
                          {fn}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="text-center py-6 text-muted-foreground text-sm">
                No Open Beauty Facts data available
              </div>
            )}

            <Button
              variant="outline"
              size="sm"
              className="w-full"
              asChild
            >
              <a 
                href="https://world.openbeautyfacts.org/"
                target="_blank"
                rel="noopener noreferrer"
              >
                Browse Open Beauty Facts
                <ExternalLink className="w-3 h-3 ml-2" />
              </a>
            </Button>
          </TabsContent>
        </Tabs>

        {/* External Reference Links */}
        <div className="p-4 border-t space-y-2">
          <span className="text-xs text-muted-foreground">Quick Reference Links</span>
          <div className="grid grid-cols-2 gap-2">
            <Button variant="ghost" size="sm" className="justify-start text-xs h-8" asChild>
              <a href="https://cir-safety.org/ingredients" target="_blank" rel="noopener noreferrer">
                CIR Database
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </Button>
            <Button variant="ghost" size="sm" className="justify-start text-xs h-8" asChild>
              <a href="https://www.ewg.org/skindeep/" target="_blank" rel="noopener noreferrer">
                EWG Skin Deep
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </Button>
            <Button variant="ghost" size="sm" className="justify-start text-xs h-8" asChild>
              <a href="https://www.paulaschoice.com/ingredient-dictionary" target="_blank" rel="noopener noreferrer">
                Paula's Choice
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </Button>
            <Button variant="ghost" size="sm" className="justify-start text-xs h-8" asChild>
              <a href="https://incidecoder.com/" target="_blank" rel="noopener noreferrer">
                INCIDecoder
                <ExternalLink className="w-3 h-3 ml-1" />
              </a>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
