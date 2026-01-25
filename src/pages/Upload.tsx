import { useEffect, useRef, useState } from "react";
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
import AppShell from "@/components/AppShell";
import PageHeader from "@/components/PageHeader";

// Helper: Downscale image for faster AI extraction and OCR
const downscaleImage = (imageDataUrl, maxSize = 1600, quality = 0.82) => {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const maxDim = Math.max(img.width, img.height);
      const scale = maxDim > maxSize ? maxSize / maxDim : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", quality));
    };
    img.onerror = () => resolve(imageDataUrl);
    img.src = imageDataUrl;
  });
};

// Helper: rotate image for alternate OCR passes
const rotateDataUrl = (imageDataUrl, degrees) => {
  if (!degrees) return Promise.resolve(imageDataUrl);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(imageDataUrl);

      const rad = (degrees * Math.PI) / 180;
      const w = img.width;
      const h = img.height;

      const swap = degrees % 180 !== 0;
      canvas.width = swap ? h : w;
      canvas.height = swap ? w : h;

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(rad);
      ctx.drawImage(img, -w / 2, -h / 2);

      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(imageDataUrl);
    img.src = imageDataUrl;
  });
};

// Helper: preprocess variants for better OCR accuracy
const preprocessImageHard = async (imageDataUrl) => {
  const resized = await downscaleImage(imageDataUrl, 2000, 0.92);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(resized);

      const upscale = Math.max(1, 1800 / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * upscale);
      canvas.height = Math.round(img.height * upscale);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const enhanced = gray < 150 ? 0 : 255;
        data[i] = enhanced;
        data[i + 1] = enhanced;
        data[i + 2] = enhanced;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(resized);
    img.src = resized;
  });
};

const preprocessImageSoft = async (imageDataUrl) => {
  const resized = await downscaleImage(imageDataUrl, 2200, 0.92);
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return resolve(resized);

      const upscale = Math.max(1, 1800 / Math.max(img.width, img.height));
      canvas.width = Math.round(img.width * upscale);
      canvas.height = Math.round(img.height * upscale);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const data = imageData.data;

      const contrast = 1.25;
      const intercept = 128 * (1 - contrast);

      for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.299 + data[i + 1] * 0.587 + data[i + 2] * 0.114;
        const c = Math.max(0, Math.min(255, gray * contrast + intercept));
        data[i] = c;
        data[i + 1] = c;
        data[i + 2] = c;
      }

      ctx.putImageData(imageData, 0, 0);
      resolve(canvas.toDataURL("image/png"));
    };
    img.onerror = () => resolve(resized);
    img.src = resized;
  });
};

// Helper: Extract and clean ingredient text
const extractIngredientSection = (text) => {
  const lower = (text || "").toLowerCase();
  const ingredientIndex = lower.search(/ingredients?\b/);
  let section = ingredientIndex >= 0 ? text.slice(ingredientIndex) : text;
  section = section.replace(/ingredients?\s*[:\-]?\s*/i, "");
  section =
    section.split(/\bmay contain\b|\bcontains\b|\bwarning\b|\bdirections\b|\buse\b|\bkeep out\b|\bcaution\b/i)[0] ||
    section;
  return section;
};

const cleanIngredientText = (text) => {
  let cleaned = (text || "").replace(/[^a-zA-Z0-9\s,\-\(\)\/\.]/g, "");
  cleaned = cleaned.replace(/\s+/g, " ");
  cleaned = cleaned.replace(/\b\d+\b/g, "");
  cleaned = cleaned.trim();
  return cleaned;
};

const scoreIngredientLikeText = (rawText) => {
  const t = (rawText || "").trim();
  if (!t) return 0;

  const lower = t.toLowerCase();
  const hasIngredientsWord = /ingredients?\b/.test(lower) ? 15 : 0;

  const cleaned = cleanIngredientText(extractIngredientSection(t));
  const tokens = cleaned
    .split(/[,;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);

  const tokenCount = tokens.length;
  const tokenScore = Math.min(35, tokenCount * 2);

  const weirdRatio = (() => {
    const letters = (t.match(/[a-z]/gi) || []).length;
    const weird = (t.match(/[^\w\s,().\-\/%:]/g) || []).length;
    if (letters === 0) return 50;
    return Math.min(50, Math.round((weird / letters) * 100));
  })();

  const knownMarkers = [
    "water",
    "glycerin",
    "fragrance",
    "parfum",
    "niacinamide",
    "alcohol",
    "phenoxyethanol",
    "citric acid",
    "sodium",
    "chloride",
    "tocopherol",
    "caprylic",
    "cetearyl",
    "dimethicone",
  ];
  const markerHits = knownMarkers.reduce((sum, k) => (lower.includes(k) ? sum + 1 : sum), 0);
  const markerScore = Math.min(20, markerHits * 4);

  const lengthPenalty = cleaned.length < 40 ? 25 : 0;

  return hasIngredientsWord + tokenScore + markerScore - weirdRatio - lengthPenalty;
};

const buildAnalysisSignature = (name, ingredients) => {
  const normalizedName = (name || "").trim().toLowerCase();
  const normalizedIngredients = (ingredients || "").trim().toLowerCase().replace(/\s+/g, " ");
  return `${normalizedName}::${normalizedIngredients}`;
};

const ANALYSIS_CACHE_TTL_MS = 1000 * 60 * 60 * 24;

const getAnalysisCacheKey = (userId, signature) => {
  if (!userId || !signature) return null;
  return `sl_analysis_cache_${userId}_${signature}`;
};

const readAnalysisCache = (userId, signature) => {
  const key = getAnalysisCacheKey(userId, signature);
  if (!key) return null;

  const sources = [() => sessionStorage.getItem(key), () => localStorage.getItem(key)];

  for (const source of sources) {
    try {
      const value = source();
      if (!value) continue;
      const parsed = JSON.parse(value);
      if (parsed?.analysisId) {
        const cachedAt = typeof parsed.cachedAt === "number" ? parsed.cachedAt : 0;
        if (cachedAt && Date.now() - cachedAt > ANALYSIS_CACHE_TTL_MS) continue;
        return parsed.analysisId;
      }
    } catch {
      continue;
    }
  }

  return null;
};

const invalidateAnalysisCache = (userId, signature) => {
  const key = getAnalysisCacheKey(userId, signature);
  if (!key) return;
  try {
    sessionStorage.removeItem(key);
  } catch {}
  try {
    localStorage.removeItem(key);
  } catch {}
};

const isAnalysisComplete = (analysis) => {
  const rec = analysis?.recommendations_json;
  if (!rec) return false;
  if (rec.fast_mode) return false;
  const safeCount = rec.safe_ingredients?.length ?? 0;
  const concernCount = rec.concern_ingredients?.length ?? 0;
  const routineCount = rec.routine_suggestions?.length ?? 0;
  return safeCount + concernCount > 0 && routineCount > 0;
};

const writeAnalysisCache = (userId, signature, analysisId) => {
  const key = getAnalysisCacheKey(userId, signature);
  if (!key) return;
  const payload = JSON.stringify({ analysisId, cachedAt: Date.now() });
  try {
    sessionStorage.setItem(key, payload);
  } catch {}
  try {
    localStorage.setItem(key, payload);
  } catch {}
};

const Upload = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  useTracking("upload");

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const ocrWorkerRef = useRef(null);
  const ocrWorkerReadyRef = useRef(false);

  const [productImage, setProductImage] = useState(null);
  const [productName, setProductName] = useState("");
  const [barcode, setBarcode] = useState("");
  const [brand, setBrand] = useState("");
  const [category, setCategory] = useState("");
  const [ingredientsList, setIngredientsList] = useState("");
  const [isProcessingOCR, setIsProcessingOCR] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [ocrProgress, setOcrProgress] = useState(0);
  const [productType, setProductType] = useState("auto");
  const [productPrice, setProductPrice] = useState("");
  const [showFrictionBanner, setShowFrictionBanner] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState(0);
  const [analysisStatus, setAnalysisStatus] = useState("Preparing analysis...");
  const [analysisId, setAnalysisId] = useState(null);
  const [analysisReady, setAnalysisReady] = useState(false);
  const analysisStartRef = useRef(null);
  const [lastCacheSignature, setLastCacheSignature] = useState(null);

  // OCR worker init
  // Key change: force worker paths (fixes blank OCR in many Vite builds)
  // Key change: do not apply a tight whitelist (it can zero out valid text)
  const initOcrWorker = async () => {
    if (ocrWorkerReadyRef.current && ocrWorkerRef.current) return ocrWorkerRef.current;

    const worker = await Tesseract.createWorker({
      workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js",
      corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core.wasm.js",
      langPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/lang-data",
      logger: (m) => {
        if (!m) return;
        if (typeof m.progress === "number") setOcrProgress(Math.max(1, Math.round(m.progress * 100)));
      },
    });

    await worker.loadLanguage("eng");
    await worker.initialize("eng");

    await worker.setParameters({
      preserve_interword_spaces: "1",
      user_defined_dpi: "300",
    });

    ocrWorkerRef.current = worker;
    ocrWorkerReadyRef.current = true;
    return worker;
  };

  useEffect(() => {
    return () => {
      const w = ocrWorkerRef.current;
      if (w) {
        try {
          w.terminate();
        } catch {}
      }
      ocrWorkerRef.current = null;
      ocrWorkerReadyRef.current = false;
    };
  }, []);

  const handleImageUpload = async (file) => {
    trackEvent({
      eventName: "image_uploaded",
      eventCategory: "upload",
      eventProperties: { productType },
    });

    const reader = new FileReader();
    reader.onload = async (e) => {
      const imageDataUrl = e.target?.result;
      setProductImage(imageDataUrl);
      await handleAIExtraction(imageDataUrl);
    };
    reader.readAsDataURL(file);
  };

  const runOcrPass = async (worker, imageDataUrl, passParams, passLabel) => {
    try {
      await worker.setParameters(passParams);
      const res = await worker.recognize(imageDataUrl);

      const text = res?.data?.text || "";
      const words = res?.data?.words || [];
      const avgConfidence =
        words.length > 0
          ? Math.round(words.reduce((sum, w) => sum + (w.confidence || 0), 0) / words.length)
          : 0;

      const ingredientScore = scoreIngredientLikeText(text);

      return {
        label: passLabel,
        text,
        avgConfidence,
        ingredientScore,
        combinedScore: avgConfidence * 0.7 + ingredientScore * 1.3,
      };
    } catch (e) {
      return {
        label: passLabel,
        text: "",
        avgConfidence: 0,
        ingredientScore: 0,
        combinedScore: 0,
        error: e,
      };
    }
  };

  const finalizeFromOcrText = (fullText) => {
    const lines = (fullText || "")
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    if (lines.length > 0 && !brand) {
      const potentialBrand = lines[0];
      if (potentialBrand.length < 30) setBrand(cleanIngredientText(potentialBrand));
    }

    const textLower = (fullText || "").toLowerCase();
    const categoryKeywords = {
      cleanser: ["cleanser", "cleansing", "wash"],
      serum: ["serum"],
      moisturizer: ["moisturizer", "cream", "lotion"],
      toner: ["toner"],
      sunscreen: ["sunscreen", "spf", "sun protection"],
      mask: ["mask"],
      treatment: ["treatment", "spot"],
      shampoo: ["shampoo"],
      conditioner: ["conditioner"],
      deodorant: ["deodorant"],
      bodywash: ["body wash", "bodywash"],
    };

    for (const [cat, keywords] of Object.entries(categoryKeywords)) {
      if (keywords.some((kw) => textLower.includes(kw))) {
        setCategory(cat);
        break;
      }
    }

    const ingredientsMatch = (fullText || "").match(/ingredients?[:\s]+(.+?)(?:\n\n|$)/is);
    const rawIngredients = ingredientsMatch ? ingredientsMatch[1].trim() : extractIngredientSection(fullText || "");
    const cleaned = cleanIngredientText(rawIngredients);

    return { cleanedIngredients: cleaned, rawIngredients };
  };

  // OCR tuned for typed text first
  const handleTesseractOCR = async (imageDataUrl) => {
    setIsProcessingOCR(true);
    setOcrProgress(0);

    try {
      const worker = await initOcrWorker();

      setOcrProgress(5);

      const resized = await downscaleImage(imageDataUrl, 2200, 0.92);
      setOcrProgress(10);

      const soft = await preprocessImageSoft(imageDataUrl);
      setOcrProgress(15);

      const hard = await preprocessImageHard(imageDataUrl);
      setOcrProgress(20);

      const soft90 = await rotateDataUrl(soft, 90);
      const soft270 = await rotateDataUrl(soft, 270);
      const hard90 = await rotateDataUrl(hard, 90);
      const hard270 = await rotateDataUrl(hard, 270);

      const candidates = [
        { img: imageDataUrl, name: "original" },
        { img: resized, name: "resized" },
        { img: soft, name: "soft" },
        { img: hard, name: "hard" },
        { img: soft90, name: "soft-90" },
        { img: soft270, name: "soft-270" },
        { img: hard90, name: "hard-90" },
        { img: hard270, name: "hard-270" },
      ];

      const passes = [
        { label: "psm6", params: { tessedit_pageseg_mode: "6", user_defined_dpi: "300" } },
        { label: "psm3", params: { tessedit_pageseg_mode: "3", user_defined_dpi: "300" } },
        { label: "psm4", params: { tessedit_pageseg_mode: "4", user_defined_dpi: "300" } },
        { label: "psm11", params: { tessedit_pageseg_mode: "11", user_defined_dpi: "300" } },
      ];

      const results = [];
      setOcrProgress(25);

      for (const c of candidates.slice(0, 2)) {
        for (const p of passes.slice(0, 3)) {
          results.push(await runOcrPass(worker, c.img, p.params, `${c.name}-${p.label}`));
        }
      }

      results.sort((a, b) => (b.combinedScore || 0) - (a.combinedScore || 0));
      let best = results[0];

      const weak = !best || !best.text || best.text.trim().length < 20 || best.avgConfidence < 45;
      if (weak) {
        setOcrProgress(45);
        for (const c of candidates.slice(2)) {
          for (const p of passes.slice(0, 3)) {
            results.push(await runOcrPass(worker, c.img, p.params, `${c.name}-${p.label}`));
          }
          results.sort((a, b) => (b.combinedScore || 0) - (a.combinedScore || 0));
          best = results[0];
          if (best?.text && best.text.trim().length > 60 && best.avgConfidence >= 55) break;
        }
      }

      const bestText = (best?.text || "").trim();

      console.log("OCR best pass:", {
        label: best?.label,
        avgConfidence: best?.avgConfidence,
        ingredientScore: best?.ingredientScore,
        combinedScore: best?.combinedScore,
        sample: bestText.slice(0, 200),
      });

      const { cleanedIngredients } = finalizeFromOcrText(bestText);

      const finalIngredientScore = scoreIngredientLikeText(bestText);
      const finalOk = cleanedIngredients.length >= 40 && finalIngredientScore >= 8;

      if (!finalOk) {
        toast({
          title: "OCR Needs Help",
          description: "We could not read the label clearly. Retake the photo with better light, or type ingredients manually.",
          variant: "destructive",
        });
      } else {
        setIngredientsList(cleanedIngredients);
        toast({
          title: "OCR Complete",
          description: "Ingredients extracted. Review and edit.",
        });
      }
    } catch (error) {
      console.error("OCR error:", error);
      toast({
        title: "OCR Failed",
        description: "Could not extract text. Enter ingredients manually.",
        variant: "destructive",
      });
    } finally {
      setIsProcessingOCR(false);
      setOcrProgress(0);
    }
  };

  const handleAIExtraction = async (imageDataUrl) => {
    setIsProcessingOCR(true);
    setOcrProgress(40);

    try {
      const compressedImage = await downscaleImage(imageDataUrl, 1600, 0.82);
      const { data, error } = await supabase.functions.invoke("extract-ingredients", {
        body: {
          image: compressedImage,
          productType: productType === "auto" ? null : productType,
        },
      });

      if (error) throw error;

      const aiIngredients = (data?.ingredients || "").trim();
      const aiLooksBad =
        !aiIngredients ||
        aiIngredients.length < 40 ||
        scoreIngredientLikeText(aiIngredients) < 10 ||
        /[^\w\s,().\-\/%:+]/.test(aiIngredients);

      if (aiLooksBad) throw new Error("AI returned low-quality extraction");

      setIngredientsList(aiIngredients);
      if (data?.brand) setBrand(data.brand);
      if (data?.category) setCategory(data.category);
      if (data?.productName) setProductName(data.productName);

      setOcrProgress(100);
      toast({
        title: "AI Extraction Complete",
        description: "Ingredients extracted. Review and edit.",
      });
    } catch (error) {
      console.error("AI extraction error:", error);
      toast({
        title: "AI Unavailable",
        description: "Switching to advanced OCR mode.",
        variant: "destructive",
      });
      await handleTesseractOCR(imageDataUrl);
    } finally {
      setIsProcessingOCR(false);
      setOcrProgress(0);
    }
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) handleImageUpload(file);
  };

  const handleAnalyze = async (source = "manual") => {
    if (!productName.trim() || !ingredientsList.trim()) {
      toast({
        title: "Missing Information",
        description: "Add product name and ingredients list.",
        variant: "destructive",
      });
      return;
    }

    if (isAnalyzing) return;

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      toast({
        title: "Authentication Required",
        description: "Sign in to analyze products.",
        variant: "destructive",
      });
      navigate("/auth");
      return;
    }

    const signature = buildAnalysisSignature(productName, ingredientsList);

    const cachedAnalysisId = readAnalysisCache(user.id, signature);
    if (cachedAnalysisId) {
      const { data: cachedAnalysis } = await supabase
        .from("user_analyses")
        .select("id, recommendations_json")
        .eq("id", cachedAnalysisId)
        .eq("user_id", user.id)
        .maybeSingle();

      if (isAnalysisComplete(cachedAnalysis)) {
        setAnalysisId(cachedAnalysisId);
        setAnalysisReady(true);
        setAnalysisStatus("Results ready. Review ingredients, then continue.");
        return;
      }

      invalidateAnalysisCache(user.id, signature);
    }

    const { data: existingAnalysis } = await supabase
      .from("user_analyses")
      .select("id, recommendations_json")
      .eq("user_id", user.id)
      .eq("product_name", productName)
      .eq("ingredients_list", ingredientsList)
      .order("analyzed_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (existingAnalysis?.id && isAnalysisComplete(existingAnalysis)) {
      writeAnalysisCache(user.id, signature, existingAnalysis.id);
      setAnalysisId(existingAnalysis.id);
      setAnalysisReady(true);
      setAnalysisStatus("Results ready. Review ingredients, then continue.");
      return;
    }

    setIsAnalyzing(true);
    setAnalysisReady(false);
    setAnalysisId(null);
    analysisStartRef.current = Date.now();
    setAnalysisProgress(5);
    setAnalysisStatus(source === "auto" ? "Detailed scan is running..." : "Preparing detailed scan...");

    try {
      const payload = {
        product_name: productName,
        barcode: barcode || null,
        brand: brand || null,
        category: category || null,
        ingredients_list: ingredientsList,
        product_price: productPrice ? parseFloat(productPrice) : null,
        user_id: user.id,
        image_url: productImage || null,
        skip_ingredient_ai_explanations: false,
        scan_mode: "detailed",
        skip_ai_explanation: false,
      };

      const useProxy = import.meta.env.DEV && import.meta.env.VITE_USE_FUNCTIONS_PROXY === "true";
      let data;

      if (useProxy) {
        const { data: sessionData } = await supabase.auth.getSession();
        const accessToken = sessionData.session?.access_token;

        const response = await fetch("/functions/analyze-product", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            apikey: import.meta.env.VITE_SUPABASE_ANON_KEY,
            ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
          },
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(errorText || "Failed to analyze product");
        }

        data = await response.json();
      } else {
        const { data: invokeData, error } = await supabase.functions.invoke("analyze-product", {
          body: payload,
        });
        if (error) throw error;
        data = invokeData;
      }

      trackEvent({
        eventName: "product_analyzed",
        eventCategory: "upload",
        eventProperties: {
          epiq_score: data?.epiq_score,
          productType,
          hasBarcode: !!barcode,
          hasBrand: !!brand,
          scanMode: "detailed",
        },
      });

      const resolvedAnalysisId = data?.analysis_id || data?.analysisId || data?.id || null;
      if (!resolvedAnalysisId) throw new Error("Analysis completed but no report ID was returned.");

      writeAnalysisCache(user.id, signature, resolvedAnalysisId);

      setAnalysisProgress(100);
      setAnalysisStatus("Analysis ready. Review ingredients, then continue.");
      toast({
        title: "Analysis Ready",
        description: "Review your details, then open the report.",
      });

      setAnalysisId(resolvedAnalysisId);
      setAnalysisReady(true);

      window.requestAnimationFrame(() => {
        document.getElementById("analysis-ready")?.scrollIntoView({ behavior: "smooth", block: "center" });
      });
    } catch (error) {
      console.error("Analysis error:", error);
      setShowFrictionBanner(true);
      toast({
        title: "Analysis Failed",
        description: typeof error?.message === "string" ? error.message : "Could not analyze product. Try again.",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
      analysisStartRef.current = null;
    }
  };

  useEffect(() => {
    if (!isAnalyzing) return;

    const ingredientCount = ingredientsList
      .split(/[,;\n]/)
      .map((item) => item.trim())
      .filter(Boolean).length;

    let progressValue = 5;
    setAnalysisProgress(progressValue);

    const intervalId = window.setInterval(() => {
      if (progressValue < 80) {
        progressValue = Math.min(80, progressValue + Math.random() * 3 + 1);
      } else if (progressValue < 95) {
        progressValue = Math.min(95, progressValue + Math.random() * 1.2 + 0.5);
      }

      setAnalysisProgress(Math.round(progressValue));

      const total = Math.max(ingredientCount, 1);
      const scanned = Math.min(total, Math.max(1, Math.round((progressValue / 95) * total)));

      if (progressValue >= 95) setAnalysisStatus("Finalizing your report...");
      else setAnalysisStatus(`Detected ${total} ingredients. Scanning ${scanned} of ${total} for highest-quality results...`);
    }, 900);

    return () => window.clearInterval(intervalId);
  }, [isAnalyzing, ingredientsList]);

  useEffect(() => {
    if (isProcessingOCR || isAnalyzing) return;

    const name = productName.trim();
    const ingredients = ingredientsList.trim();

    if (!name || !ingredients) {
      setAnalysisReady(false);
      setAnalysisId(null);
      return;
    }

    const signature = buildAnalysisSignature(name, ingredients);
    if (lastCacheSignature === signature) return;

    const checkCache = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      setLastCacheSignature(signature);

      const cachedId = readAnalysisCache(user.id, signature);
      if (cachedId) {
        const { data: cachedAnalysis } = await supabase
          .from("user_analyses")
          .select("id, recommendations_json")
          .eq("id", cachedId)
          .eq("user_id", user.id)
          .maybeSingle();

        if (isAnalysisComplete(cachedAnalysis)) {
          setAnalysisId(cachedId);
          setAnalysisReady(true);
          setAnalysisStatus("Results ready. Review ingredients, then continue.");
          return;
        }

        invalidateAnalysisCache(user.id, signature);
      }

      const { data: existingAnalysis } = await supabase
        .from("user_analyses")
        .select("id, recommendations_json")
        .eq("user_id", user.id)
        .eq("product_name", productName)
        .eq("ingredients_list", ingredientsList)
        .order("analyzed_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (existingAnalysis?.id && isAnalysisComplete(existingAnalysis)) {
        writeAnalysisCache(user.id, signature, existingAnalysis.id);
        setAnalysisId(existingAnalysis.id);
        setAnalysisReady(true);
        setAnalysisStatus("Results ready. Review ingredients, then continue.");
      }
    };

    const t = window.setTimeout(() => {
      checkCache();
    }, 500);

    return () => window.clearTimeout(t);
  }, [productName, ingredientsList, isProcessingOCR, isAnalyzing, lastCacheSignature]);

  return (
    <TooltipProvider>
      <AppShell
        className="bg-gradient-to-b from-background to-muted"
        showNavigation
        showBottomNav
        header={
          <PageHeader>
            <div className="flex flex-col gap-3">
              <div className="flex flex-wrap gap-2">
                <Button variant="ghost" onClick={() => navigate("/home")} className="gap-2">
                  <Home className="w-4 h-4" />
                  Home
                </Button>
                <Button variant="ghost" onClick={() => navigate("/profile")} className="gap-2">
                  <User className="w-4 h-4" />
                  Profile
                </Button>
              </div>
              <h1 className="text-3xl md:text-4xl font-bold">Upload Product</h1>
            </div>
          </PageHeader>
        }
        contentClassName="px-[5px] lg:px-4 py-10 overflow-x-hidden"
      >
        <div className="container max-w-3xl mx-auto w-full">
          {showFrictionBanner && (
            <div className="mb-6">
              <FrictionFeedbackBanner trigger="error" context="Analysis failed" />
            </div>
          )}

          <Card className="p-6 space-y-6">
            <div className="space-y-2">
              <Label>Product Type</Label>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant={productType === "auto" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setProductType("auto")}
                  className="touch-target w-full sm:w-auto"
                >
                  Auto-Detect
                </Button>
                <Button
                  type="button"
                  variant={productType === "face" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setProductType("face")}
                  className="touch-target w-full sm:w-auto"
                >
                  👤 Face
                </Button>
                <Button
                  type="button"
                  variant={productType === "body" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setProductType("body")}
                  className="touch-target w-full sm:w-auto"
                >
                  🧴 Body
                </Button>
                <Button
                  type="button"
                  variant={productType === "hair" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setProductType("hair")}
                  className="touch-target w-full sm:w-auto"
                >
                  💆 Hair
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">Helps optimize ingredient analysis for your product type</p>
            </div>

            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 space-y-3">
              <div className="flex items-start gap-3">
                <Camera className="w-5 h-5 text-blue-600 dark:text-blue-400 flex-shrink-0 mt-0.5" />
                <div className="flex-1 space-y-2">
                  <p className="text-sm font-semibold text-blue-900 dark:text-blue-100">📸 Photograph the Ingredient List Label</p>
                  <p className="text-xs text-blue-700 dark:text-blue-300 leading-relaxed">
                    Find where the ingredients are listed on your product packaging and take a clear, well-lit photo of that text.
                  </p>
                  <p className="text-xs text-blue-600 dark:text-blue-400 italic">
                    💡 We analyze the ingredient text you photograph, we do not look up products by name or barcode.
                  </p>
                </div>
              </div>

              <details className="text-xs text-blue-700 dark:text-blue-300">
                <summary className="cursor-pointer font-medium hover:text-blue-900 dark:hover:text-blue-100 select-none">
                  💡 Tips for best results (tap to expand)
                </summary>
                <ul className="mt-2 space-y-1 pl-4 list-disc marker:text-blue-500">
                  <li>
                    <strong>Good lighting</strong> Avoid shadows and glare
                  </li>
                  <li>
                    <strong>Hold steady</strong> Focus on the ingredient text
                  </li>
                  <li>
                    <strong>Full list</strong> Include the complete ingredient list in frame
                  </li>
                  <li>
                    <strong>Common locations</strong> Back of bottle, side of tube, inside box flap, bottom of jar
                  </li>
                  <li>
                    <strong>Multiple languages</strong> Photograph the English ingredient list if available
                  </li>
                </ul>
              </details>
            </div>

            <div className="space-y-4">
              <Label className="flex items-center gap-2 flex-wrap mb-2">
                <span className="flex items-center gap-1.5">📋 Ingredient List Photo</span>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Info className="w-4 h-4 text-muted-foreground cursor-help" />
                  </TooltipTrigger>
                  <TooltipContent className="max-w-xs">
                    <p className="text-xs leading-relaxed">
                      Take a photo of where the ingredients are listed. We extract the text using AI, with advanced OCR fallback.
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
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex-1 w-full touch-target"
                >
                  <Camera className="w-4 h-4 mr-2" />
                  Take Photo
                </Button>
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFileChange} className="hidden" />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>

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
                    <p className="text-xs font-medium text-green-900 dark:text-green-100">Ingredient list photo uploaded</p>
                    <p className="text-xs text-green-700 dark:text-green-300 mt-0.5">
                      Review the extracted text below and correct anything before analyzing.
                    </p>
                  </div>
                </div>
              </div>
            )}

            {isProcessingOCR && (
              <OCRLoadingTips progress={ocrProgress} message="Extracting ingredients, AI first then advanced OCR..." />
            )}

            <div className="space-y-4">
              <div>
                <Label htmlFor="productName">Product Name</Label>
                <Input
                  id="productName"
                  value={productName}
                  onChange={(e) => setProductName(e.target.value)}
                  placeholder="e.g., Glow Serum SPF 30"
                  className="placeholder:text-muted-foreground/60"
                />
              </div>

              <div>
                <Label htmlFor="barcode">Barcode (Optional)</Label>
                <Input
                  id="barcode"
                  value={barcode}
                  onChange={(e) => setBarcode(e.target.value)}
                  placeholder="e.g., 012345678901"
                  className="placeholder:text-muted-foreground/60"
                />
              </div>

              <div>
                <Label htmlFor="brand">Brand (Optional)</Label>
                <Input
                  id="brand"
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                  placeholder="e.g., CeraVe, The Ordinary"
                  className="placeholder:text-muted-foreground/60"
                />
              </div>

              <div>
                <Label htmlFor="category">Category (Optional)</Label>
                <Input
                  id="category"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g., serum, moisturizer, cleanser"
                  className="placeholder:text-muted-foreground/60"
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
                      <p>Helps track your routine expenses and find budget-friendly alternatives.</p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">$</span>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    min="0"
                    value={productPrice}
                    onChange={(e) => setProductPrice(e.target.value)}
                    placeholder="24.99"
                    className="pl-7 placeholder:text-muted-foreground/60"
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
                        From photo, we extract the ingredient text automatically. Manual entry, type ingredients separated by commas.
                      </p>
                    </TooltipContent>
                  </Tooltip>
                </div>
                <Textarea
                  id="ingredients"
                  value={ingredientsList}
                  onChange={(e) => setIngredientsList(e.target.value)}
                  placeholder="Water, Glycerin, Niacinamide, ..."
                  className="min-h-[200px] placeholder:text-muted-foreground/60"
                />
                <p className="text-xs text-muted-foreground mt-2">Review and correct the extracted text as needed</p>
              </div>
            </div>

            <Button
              onClick={analysisReady && analysisId ? () => navigate(`/analysis/${analysisId}`) : handleAnalyze}
              disabled={isAnalyzing || isProcessingOCR}
              className={analysisReady && analysisId ? "w-full bg-emerald-600 hover:bg-emerald-700 text-white" : "w-full"}
              variant={analysisReady && analysisId ? "default" : "cta"}
              size="lg"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Analyzing...
                </>
              ) : analysisReady && analysisId ? (
                "Results Ready - View Report"
              ) : (
                "Analyze Product"
              )}
            </Button>

            {analysisStatus && isAnalyzing && <p className="text-xs text-muted-foreground mt-2">{analysisStatus}</p>}

            <div id="analysis-ready" className="pt-1" />
          </Card>
        </div>
      </AppShell>
    </TooltipProvider>
  );
};

export default Upload;