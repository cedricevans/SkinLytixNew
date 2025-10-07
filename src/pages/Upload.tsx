import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Upload as UploadIcon, Loader2, Info, Home, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Tesseract from "tesseract.js";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";

const Upload = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [productImage, setProductImage] = useState<string | null>(null);
  const [productName, setProductName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [ingredientsList, setIngredientsList] = useState("");
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);

  const handleImageUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageDataUrl = e.target?.result as string;
      setProductImage(imageDataUrl);
      
      // Run OCR on the uploaded image
      setIsProcessingOCR(true);
      setOcrProgress(0);
      
      try {
        const result = await Tesseract.recognize(imageDataUrl, 'eng', {
          logger: (m) => {
            if (m.status === 'recognizing text') {
              setOcrProgress(Math.round(m.progress * 100));
            }
          }
        });
        
        const fullText = result.data.text;
        const lines = fullText.split('\n').map(l => l.trim()).filter(l => l);
        
        // Extract brand (usually at top)
        if (lines.length > 0 && !brand) {
          const potentialBrand = lines[0];
          if (potentialBrand.length < 30) {
            setBrand(potentialBrand);
          }
        }
        
        // Detect category from text
        const textLower = fullText.toLowerCase();
        const categoryKeywords: Record<string, string[]> = {
          'cleanser': ['cleanser', 'cleansing', 'wash'],
          'serum': ['serum'],
          'moisturizer': ['moisturizer', 'cream', 'lotion'],
          'toner': ['toner'],
          'sunscreen': ['sunscreen', 'spf', 'sun protection'],
          'mask': ['mask'],
          'treatment': ['treatment', 'spot']
        };
        
        for (const [cat, keywords] of Object.entries(categoryKeywords)) {
          if (keywords.some(kw => textLower.includes(kw))) {
            setCategory(cat);
            break;
          }
        }
        
        // Extract ingredients
        const ingredientsMatch = fullText.match(/ingredients?[:\s]+(.+?)(?:\n\n|$)/is);
        if (ingredientsMatch) {
          setIngredientsList(ingredientsMatch[1].trim());
        } else {
          setIngredientsList(fullText);
        }
        
        toast({
          title: "OCR Complete",
          description: "Product info extracted! Please review and edit.",
        });
      } catch (error) {
        console.error('OCR error:', error);
        toast({
          title: "OCR Failed",
          description: "Could not extract text. Please enter ingredients manually.",
          variant: "destructive",
        });
      } finally {
        setIsProcessingOCR(false);
        setOcrProgress(0);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleImageUpload(file);
    }
  };

  const handleAnalyze = async () => {
    if (!productName.trim() || !ingredientsList.trim()) {
      toast({
        title: "Missing Information",
        description: "Please provide product name and ingredients list.",
        variant: "destructive",
      });
      return;
    }

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Please sign in to analyze products.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    setIsAnalyzing(true);

    try {
      const { data, error } = await supabase.functions.invoke('analyze-product', {
        body: {
          product_name: productName,
          barcode: barcode || null,
          brand: brand || null,
          category: category || null,
          ingredients_list: ingredientsList,
          user_id: user.id
        }
      });

      if (error) throw error;

      toast({
        title: "Analysis Complete!",
        description: `EpiQ Score: ${data.epiq_score}/100`,
      });

      navigate(`/analysis/${data.analysis_id}`);

    } catch (error) {
      console.error('Analysis error:', error);
      toast({
        title: "Analysis Failed",
        description: "Could not analyze product. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <TooltipProvider>
      <main className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4">
      <div className="container max-w-3xl mx-auto">
        {/* Navigation Header */}
        <div className="flex justify-between items-center mb-8">
          <Button
            variant="outline"
            onClick={() => navigate('/')}
            className="gap-2"
          >
            <Home className="w-4 h-4" />
            Home
          </Button>
          <Button
            variant="outline"
            onClick={() => navigate('/profile')}
            className="gap-2"
          >
            <User className="w-4 h-4" />
            Profile
          </Button>
        </div>
        
        <h1 className="text-4xl font-bold text-center mb-8">Upload Product</h1>
        
        <Card className="p-6 space-y-6">
          {/* Image Upload */}
          <div className="space-y-4">
            <Label>Product Photo</Label>
            <div className="flex gap-4">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1"
              >
                <UploadIcon className="w-4 h-4 mr-2" />
                Upload Photo
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  // Camera functionality would require additional setup
                  toast({
                    title: "Camera",
                    description: "Camera feature coming soon. Please upload from gallery.",
                  });
                }}
                className="flex-1"
              >
                <Camera className="w-4 h-4 mr-2" />
                Take Photo
              </Button>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>

          {/* Image Preview */}
          {productImage && (
            <div className="rounded-lg overflow-hidden border">
              <img src={productImage} alt="Product" className="w-full h-auto" />
            </div>
          )}

          {/* OCR Progress */}
          {isProcessingOCR && (
            <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
              <Loader2 className="w-5 h-5 animate-spin" />
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-medium">Extracting ingredients...</p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>Our AI is reading the text from your image. Review the results carefully as OCR may occasionally misread handwriting or small text.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <p className="text-xs text-muted-foreground">{ocrProgress}% complete</p>
              </div>
            </div>
          )}

          {/* Product Details */}
          <div className="space-y-4">
            <div>
              <Label htmlFor="productName">Product Name</Label>
              <Input
                id="productName"
                value={productName}
                onChange={(e) => setProductName(e.target.value)}
                placeholder="e.g., Glow Serum SPF 30"
              />
            </div>

            <div>
              <Label htmlFor="barcode">Barcode (Optional)</Label>
              <Input
                id="barcode"
                value={barcode}
                onChange={(e) => setBarcode(e.target.value)}
                placeholder="e.g., 012345678901"
              />
            </div>

            <div>
              <Label htmlFor="brand">Brand (Optional)</Label>
              <Input
                id="brand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                placeholder="e.g., CeraVe, The Ordinary"
              />
            </div>

            <div>
              <Label htmlFor="category">Category (Optional)</Label>
              <Input
                id="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                placeholder="e.g., serum, moisturizer, cleanser"
              />
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="ingredients">Ingredients List</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>Upload a photo of your product's ingredient list or type it manually. We'll extract and analyze each ingredient for safety and compatibility with your skin profile.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <Textarea
                id="ingredients"
                value={ingredientsList}
                onChange={(e) => setIngredientsList(e.target.value)}
                placeholder="Water, Glycerin, Niacinamide, ..."
                className="min-h-[200px]"
              />
              <p className="text-xs text-muted-foreground mt-2">
                Review and correct the extracted text as needed
              </p>
            </div>
          </div>

          {/* Analyze Button */}
          <Button
            onClick={handleAnalyze}
            disabled={isAnalyzing || isProcessingOCR}
            className="w-full"
            variant="cta"
            size="lg"
          >
            {isAnalyzing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Analyzing...
              </>
            ) : (
              'Analyze Product'
            )}
          </Button>
        </Card>
      </div>
    </main>
    </TooltipProvider>
  );
};

export default Upload;
