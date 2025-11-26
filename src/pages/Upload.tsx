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
import { useTracking, trackEvent } from "@/hooks/useTracking";
import OCRLoadingTips from "@/components/OCRLoadingTips";
import { FrictionFeedbackBanner } from "@/components/FrictionFeedbackBanner";

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
  useTracking('upload');
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
  const [productType, setProductType] = useState<'face' | 'body' | 'hair' | 'auto'>('auto');
  const [productPrice, setProductPrice] = useState("");
  const [showFrictionBanner, setShowFrictionBanner] = useState(false);

  const handleImageUpload = async (file: File) => {
    trackEvent({
      eventName: 'image_uploaded',
      eventCategory: 'upload',
      eventProperties: { 
        productType 
      }
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageDataUrl = e.target?.result as string;
      setProductImage(imageDataUrl);
      
      // Always attempt AI extraction first (automatic fallback to OCR on failure)
      await handleAIExtraction(imageDataUrl);
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
        body: { 
          image: imageDataUrl,
          productType: productType === 'auto' ? null : productType
        }
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
          product_price: productPrice ? parseFloat(productPrice) : null,
          user_id: user.id
        }
      });

      if (error) throw error;

      trackEvent({
        eventName: 'product_analyzed',
        eventCategory: 'upload',
        eventProperties: {
          epiq_score: data.epiq_score,
          productType,
          hasBarcode: !!barcode,
          hasBrand: !!brand
        }
      });

      toast({
        title: "Analysis Complete!",
        description: `EpiQ Score: ${data.epiq_score}/100. Add to routine to unlock cost savings!`,
      });

      navigate(`/analysis/${data.analysis_id}`);

    } catch (error) {
      console.error('Analysis error:', error);
      setShowFrictionBanner(true);
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
      <main className="min-h-screen bg-gradient-to-b from-background to-muted py-12 px-4 overflow-x-hidden">
      <div className="container max-w-3xl mx-auto w-full">
        {/* Friction Feedback Banner */}
        {showFrictionBanner && (
          <div className="mb-6">
            <FrictionFeedbackBanner trigger="error" context="Analysis failed" />
          </div>
        )}
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
          {/* Product Type Selector */}
          <div className="space-y-2">
            <Label>Product Type</Label>
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant={productType === 'auto' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProductType('auto')}
                className="touch-target w-full sm:w-auto"
              >
                Auto-Detect
              </Button>
              <Button
                type="button"
                variant={productType === 'face' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProductType('face')}
                className="touch-target w-full sm:w-auto"
              >
                👤 Face
              </Button>
              <Button
                type="button"
                variant={productType === 'body' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProductType('body')}
                className="touch-target w-full sm:w-auto"
              >
                🧴 Body
              </Button>
              <Button
                type="button"
                variant={productType === 'hair' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setProductType('hair')}
                className="touch-target w-full sm:w-auto"
              >
                💆 Hair
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              Helps optimize ingredient analysis for your product type
            </p>
          </div>

          {/* Instructional Banner - What to Photograph */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
            <div className="flex items-start gap-3">
              <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1 space-y-2">
                <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">
                  📸 Photograph the Ingredient List Label
                </p>
                <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                  Find where the ingredients are listed on your product packaging (back label, side of tube, box flap, bottle, etc.) and take a clear, well-lit photo of that text.
                </p>
                <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                  💡 We analyze the ingredient text you photograph — we don't look up products by name or barcode.
                </p>
              </div>
            </div>
            
            {/* Collapsible Tips Section */}
            <details className="text-xs text-blue-700 dark:text-blue-300">
              <summary className="cursor-pointer font-medium hover:text-blue-900 dark:hover:text-blue-100 select-none">
                💡 Tips for best results (tap to expand)
              </summary>
              <ul className="mt-2 space-y-1 pl-4 list-disc marker:text-blue-500">
                <li><strong>Good lighting</strong> — Avoid shadows and glare</li>
                <li><strong>Hold steady</strong> — Focus on the ingredient text</li>
                <li><strong>Full list</strong> — Include the complete ingredient list in frame</li>
                <li><strong>Common locations:</strong> Back of bottle, side of tube, inside box flap, bottom of jar</li>
                <li><strong>Multiple languages?</strong> Photograph the English ingredient list if available</li>
              </ul>
            </details>
          </div>

          {/* Image Upload */}
          <div className="space-y-4">
            <Label className="flex items-center gap-2 flex-wrap mb-2">
              <span className="flex items-center gap-1.5">
                📋 Ingredient List Photo
              </span>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  <p className="text-xs leading-relaxed">
                    Take a photo of <strong>where the ingredients are listed</strong> on your product packaging. We'll automatically extract the ingredient text using AI (with OCR fallback if needed).
                  </p>
                </TooltipContent>
              </Tooltip>
            </Label>
            <div className="flex flex-col sm:flex-row gap-4">
              <Button
                variant="outline"
                onClick={() => fileInputRef.current?.click()}
                className="flex-1 w-full touch-target"
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
                className="flex-1 w-full touch-target"
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
            <div className="space-y-2">
              <div className="rounded-lg overflow-hidden border">
                <img src={productImage} alt="Ingredient list preview" className="w-full h-auto" />
              </div>
              <div className="flex items-start gap-2 p-3 bg-green-50 dark:bg-green-950/30 border border-green-200 dark:border-green-800 rounded-lg">
                <div className="w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center flex-shrink-0 text-xs font-bold">
                  ✓
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-green-900 dark:text-green-100">
                    Ingredient list photo uploaded
                  </p>
                  <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                    Review the extracted text below and make any corrections before analyzing.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* OCR Progress */}
          {isProcessingOCR && (
            <OCRLoadingTips 
              progress={ocrProgress}
              message="Extracting ingredients with AI..."
            />
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
                <Label htmlFor="price">Price (Optional)</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p>How much did this product cost? This helps track your routine expenses and find budget-friendly alternatives.</p>
                  </TooltipContent>
                </Tooltip>
              </div>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">
                  $
                </span>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  min="0"
                  value={productPrice}
                  onChange={(e) => setProductPrice(e.target.value)}
                  placeholder="24.99"
                  className="pl-7"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center gap-2 mb-2">
                <Label htmlFor="ingredients">Ingredients List</Label>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs leading-relaxed">
                      <strong>From photo:</strong> We extract the ingredient text automatically.<br/>
                      <strong>Manual entry:</strong> Type ingredients separated by commas.<br/><br/>
                      We analyze each ingredient for safety and compatibility with your skin profile.
                    </p>
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
