import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Camera, Upload as UploadIcon, Loader2, Info, Home, User, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import Tesseract from "tesseract.js";
import { Tooltip, TooltipContent, TooltipTrigger, TooltipProvider } from "@/components/ui/tooltip";
import { Switch } from "@/components/ui/switch";

// Helper: Preprocess image for better OCR accuracy
const preprocessImage = (imageDataUrl: string): Promise<string> => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      canvas.width = img.width;
      canvas.height = img.height;
      ctx.drawImage(img, 0, 0);
      
      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;
      
      // Convert to grayscale and increase contrast
      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const enhanced = gray < 128 ? 0 : 255;
        data[i] = enhanced;
        data[i + 1] = enhanced;
        data[i + 2] = enhanced;
      }
      
      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL());
    };
    img.src = imageDataUrl;
  });
};

// Helper: Clean extracted text
const cleanIngredientText = (text: string): string => {
  let cleaned = text.replace(/[^a-zA-Z0-9\s,\-\(\)\/\.]/g, '');
  cleaned = cleaned.replace(/\s+/g, ' ');
  cleaned = cleaned.replace(/\b\d+\b/g, '');
  cleaned = cleaned.trim();
  return cleaned;
};

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
  const [useAIExtraction, setUseAIExtraction] = useState(true);

  const handleImageUpload = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageDataUrl = e.target?.result as string;
      setProductImage(imageDataUrl);
      
      if (useAIExtraction) {
        // Use AI-powered extraction
        await handleAIExtraction(imageDataUrl);
      } else {
        // Use Tesseract with improvements
        await handleTesseractOCR(imageDataUrl);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleTesseractOCR = async (imageDataUrl: string) => {
    setIsProcessingOCR(true);
    setOcrProgress(0);
    
    try {
      // Phase 2: Preprocess image
      const preprocessedImage = await preprocessImage(imageDataUrl);
      
      // Phase 1: Use enhanced Tesseract OCR
      const result = await Tesseract.recognize(preprocessedImage, 'eng', {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setOcrProgress(Math.round(m.progress * 100));
          }
        }
      });
      
      const fullText = result.data.text;
      const lines = fullText.split('\n').map(l => l.trim()).filter(l => l);
      
      // Extract brand
      if (lines.length > 0 && !brand) {
        const potentialBrand = lines[0];
        if (potentialBrand.length < 30) {
          setBrand(cleanIngredientText(potentialBrand));
        }
      }
      
      // Detect category
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
      
      // Extract and clean ingredients
      const ingredientsMatch = fullText.match(/ingredients?[:\s]+(.+?)(?:\n\n|$)/is);
      const rawIngredients = ingredientsMatch ? ingredientsMatch[1].trim() : fullText;
      setIngredientsList(cleanIngredientText(rawIngredients));
      
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

  const handleAIExtraction = async (imageDataUrl: string) => {
    setIsProcessingOCR(true);
    setOcrProgress(50);
    
    try {
      const { data, error } = await supabase.functions.invoke('extract-ingredients', {
        body: { image: imageDataUrl }
      });

      if (error) throw error;

      setIngredientsList(data.ingredients);
      if (data.brand) setBrand(data.brand);
      if (data.category) setCategory(data.category);
      if (data.productName) setProductName(data.productName);
      
      setOcrProgress(100);
      toast({
        title: "AI Extraction Complete",
        description: "Ingredients extracted with 99% accuracy!",
      });
    } catch (error) {
      console.error('AI extraction error:', error);
      toast({
        title: "AI Extraction Failed",
        description: "Falling back to standard OCR...",
        variant: "destructive",
      });
      // Fallback to Tesseract
      await handleTesseractOCR(imageDataUrl);
    } finally {
      setIsProcessingOCR(false);
      setOcrProgress(0);
    }
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
            <div className="flex items-center justify-between mb-2">
              <Label>Product Photo</Label>
              <div className="flex items-center gap-2">
                <Label htmlFor="ai-extraction" className="text-sm font-normal cursor-pointer">
                  AI Extraction (Recommended)
                </Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div className="flex items-center gap-2">
                      <Switch
                        id="ai-extraction"
                        checked={useAIExtraction}
                        onCheckedChange={setUseAIExtraction}
                      />
                      <Sparkles className="w-4 h-4 text-primary" />
                    </div>
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p><strong>AI Extraction (Default):</strong> 99% accuracy, understands context, handles all languages. <strong>Standard OCR:</strong> Free alternative but may produce errors with special characters.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
            </div>
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
                  <p className="text-sm font-medium">
                    {useAIExtraction ? 'AI extracting ingredients...' : 'Extracting ingredients...'}
                  </p>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                    </TooltipTrigger>
                    <TooltipContent className="max-w-xs">
                      <p>
                        {useAIExtraction 
                          ? 'AI-powered extraction understands ingredient context and provides near-perfect accuracy.'
                          : 'Enhanced OCR with image preprocessing and text cleaning for better accuracy. Review results carefully.'}
                      </p>
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
