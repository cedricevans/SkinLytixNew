# API Documentation

**Document Version:** 1.1  
**Last Updated:** November 23, 2025  
**Owner:** Engineering Team  
**Status:** Active

---

## Table of Contents

1. [Overview](#overview)
2. [Authentication](#authentication)
3. [Edge Functions Reference](#edge-functions-reference)
4. [Rate Limiting](#rate-limiting)
5. [Error Handling](#error-handling)
6. [Example cURL Commands](#example-curl-commands)
7. [Webhook Integrations](#webhook-integrations)

---

## Overview

### API Architecture

SkinLytix uses **Supabase Edge Functions** (Deno runtime) for all backend logic. Edge functions are serverless functions that run on-demand, scaling automatically with traffic.

**Base URL:**
```
https://yflbjaetupvakadqjhfb.supabase.co/functions/v1/
```

**Function URL Pattern:**
```
{BASE_URL}/{function-name}
```

### Technology Stack

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Runtime** | Deno (TypeScript) | Edge function execution |
| **Database** | PostgreSQL (Supabase) | Data persistence |
| **AI Provider** | Lovable AI Gateway | Gemini 2.5 Flash models |
| **OCR** | Tesseract.js | Ingredient extraction |
| **External APIs** | Open Beauty Facts, PubChem | Product & ingredient data |
| **Real-time** | Server-Sent Events (SSE) | Streaming chat responses |

### API Design Principles

1. **RESTful**: Standard HTTP methods (POST, GET)
2. **JSON**: All request/response bodies in JSON
3. **Stateless**: No server-side sessions (JWT auth)
4. **Idempotent**: Safe to retry failed requests
5. **Rate Limited**: Protect against abuse

---

## Authentication

### Authentication Methods

**Method 1: JWT Token (Required for User-Specific Operations)**

```http
POST /functions/v1/analyze-product
Authorization: Bearer <JWT_TOKEN>
Content-Type: application/json
```

**How to Get JWT Token:**

```typescript
import { supabase } from '@/integrations/supabase/client';

// Get current user's JWT token
const { data: { session } } = await supabase.auth.getSession();
const token = session?.access_token;

// Use in API calls
const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-product`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({ productName, ingredients })
});
```

**Method 2: Service Role Key (Admin Operations Only)**

```http
POST /functions/v1/admin-function
apikey: <SUPABASE_SERVICE_ROLE_KEY>
Content-Type: application/json
```

⚠️ **Never expose service role key in client-side code!** Use only in backend/edge functions.

### Row-Level Security (RLS)

**All database operations enforce RLS policies:**

```sql
-- Example: Users can only query their own analyses
SELECT * FROM user_analyses WHERE user_id = auth.uid();

-- Without auth token:
-- Returns empty array (not an error)

-- With auth token:
-- Returns user's analyses only
```

**Testing RLS:**

```typescript
// Test without auth (should fail or return empty)
const { data: noAuth } = await supabase
  .from('user_analyses')
  .select('*');
console.log(noAuth); // []

// Test with auth (should succeed)
await supabase.auth.signIn({ email, password });
const { data: withAuth } = await supabase
  .from('user_analyses')
  .select('*');
console.log(withAuth); // User's analyses
```

---

## Edge Functions Reference

### 1. analyze-product

**Purpose:** Analyze a skincare product's ingredients using AI and return EpiQ score + insights.

**Endpoint:** `POST /functions/v1/analyze-product`

**Authentication:** Required (JWT token)

**Request Body:**

```typescript
interface AnalyzeProductRequest {
  productName: string;        // Required: Product name
  ingredients: string;        // Required: Comma-separated ingredient list
  brand?: string;            // Optional: Brand name
  category?: string;         // Optional: Product category (e.g., "Moisturizer")
  price?: number;            // Optional: Product price (USD)
  userProfile?: {            // Optional: User's skin profile
    skin_type?: string;      // "oily" | "dry" | "combination" | "normal"
    skin_concerns?: string[];// ["acne", "sensitivity", "aging", etc.]
  };
}
```

**Response:**

```typescript
interface AnalyzeProductResponse {
  epiq_score: number;        // 0-100 overall quality score
  sub_scores: {              // NEW: Detailed scoring breakdown
    ingredient_safety: number;      // 0-100, based on problematic ingredient count
    skin_compatibility: number;     // 0-100, profile matching score
    active_quality: number;         // 0-100, beneficial ingredient count
    preservative_safety: number;    // 0-100, preservative system assessment
  };
  recommendations_json: {
    overall_assessment: string;
    product_metadata: {      // NEW: Product classification
      product_type: string;           // "moisturizer", "cleanser", "serum", etc.
      product_type_label: string;     // Human-readable type
      brand: string;
      category: string;
    };
    enriched_ingredients: Array<{    // NEW: Enhanced ingredient data
      name: string;
      role: string;                   // "Humectant", "Emollient", etc.
      explanation: string;            // AI-generated 2-3 sentence explanation
      molecular_weight: number | null;
      safety_profile: string;         // "low", "medium", "high" risk
      risk_score: number;             // 1-10 risk score for heatmap
      category: "safe" | "beneficial" | "problematic" | "unverified";
    }>;
    key_actives: Array<{
      name: string;
      function: string;
      benefits: string[];
    }>;
    red_flags: Array<{
      ingredient: string;
      concern: string;
      severity: "low" | "medium" | "high";
    }>;
    suitable_for: string[];  // Skin types this is good for
    avoid_if: string[];      // Skin types to avoid
    routine_placement: string;
    better_alternatives?: Array<{
      name: string;
      reason: string;
      price_difference: number;
    }>;
    ai_explanation: {        // NEW: Product-level AI insights
      answer_markdown: string;        // Full markdown explanation
      summary_one_liner: string;      // Quick takeaway
      safety_level: "low" | "moderate" | "high" | "unknown";
      professional_referral: {
        needed: boolean;
        reason: string;
        suggested_professional_type: "none" | "dermatologist" | "esthetician" | "either";
      };
    };
  };
  analysis_id: string;       // UUID of saved analysis
}
```

**Example Request:**

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-product`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    productName: 'CeraVe Moisturizing Cream',
    ingredients: 'Water, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Cetyl Alcohol, Ceramide NP, Ceramide AP, Ceramide EOP, Carbomer, Dimethicone, Behentrimonium Methosulfate, Sodium Lauroyl Lactylate, Sodium Hyaluronate, Cholesterol, Phenoxyethanol, Disodium EDTA, Dipotassium Phosphate, Tocopherol, Phytosphingosine, Xanthan Gum, Polysorbate 20, Ethylhexylglycerin',
    brand: 'CeraVe',
    category: 'Moisturizer',
    price: 18.99,
    userProfile: {
      skin_type: 'dry',
      skin_concerns: ['sensitivity', 'dryness']
    }
  })
});

const data = await response.json();
console.log(data);
```

**Example Response:**

```json
{
  "epiq_score": 87,
  "recommendations_json": {
    "overall_assessment": "Excellent choice for dry, sensitive skin. Evidence-backed ceramide formula with minimal irritants.",
    "key_actives": [
      {
        "name": "Ceramides (NP, AP, EOP)",
        "function": "Skin barrier repair",
        "benefits": [
          "Restores lipid barrier",
          "Reduces transepidermal water loss",
          "Improves hydration retention"
        ]
      },
      {
        "name": "Hyaluronic Acid (Sodium Hyaluronate)",
        "function": "Humectant",
        "benefits": [
          "Attracts and retains moisture",
          "Plumps skin",
          "Supports barrier function"
        ]
      }
    ],
    "red_flags": [],
    "suitable_for": ["dry", "normal", "sensitive"],
    "avoid_if": ["extremely_oily"],
    "routine_placement": "Apply morning and evening after cleansing, before sunscreen (AM)",
    "better_alternatives": null
  },
  "analysis_id": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
}
```

**Error Responses:**

```json
// 400 Bad Request - Invalid input
{
  "error": "Missing required field: ingredients"
}

// 429 Too Many Requests - Rate limit exceeded
{
  "error": "Rate limit exceeded. Please try again later.",
  "retry_after_seconds": 3600
}

// 402 Payment Required - AI credits depleted
{
  "error": "AI credits depleted. Please contact support@skinlytix.com"
}

// 500 Internal Server Error
{
  "error": "Failed to analyze product. Please try again."
}
```

---

### 2. chat-skinlytix

**Purpose:** Enable conversational AI chat about product analysis with context awareness and conversation persistence.

**Endpoint:** `POST /functions/v1/chat-skinlytix`

**Authentication:** Optional (JWT token recommended for persistence)

**Request Body:**

```typescript
interface ChatRequest {
  analysisId: string;        // UUID of product analysis
  conversationId?: string;   // Optional: existing conversation ID
  userId?: string;           // Optional: user ID for persistence
  messages: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
}
```

**Response:** Server-Sent Events (SSE) stream

The response is streamed token-by-token using Server-Sent Events format:

```
data: {"choices":[{"delta":{"content":"Hello"}}]}

data: {"choices":[{"delta":{"content":" there"}}]}

data: {"choices":[{"delta":{"content":"!"}}]}

data: [DONE]
```

**Response Headers:**
- `Content-Type: text/event-stream`
- `X-Conversation-Id: <uuid>` - Conversation UUID for follow-up messages
- `Cache-Control: no-cache`
- `Connection: keep-alive`

**Example Request:**

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-skinlytix`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    analysisId: 'analysis-uuid-1234',
    conversationId: 'existing-conv-uuid', // Optional
    userId: 'user-uuid-5678',
    messages: [
      {
        role: 'user',
        content: 'Is this product safe for sensitive skin?'
      }
    ]
  })
});

// Parse SSE stream
const reader = response.body.getReader();
const decoder = new TextDecoder();
let fullResponse = '';

while (true) {
  const { done, value } = await reader.read();
  if (done) break;
  
  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');
  
  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.substring(6);
      if (data === '[DONE]') break;
      
      try {
        const parsed = JSON.parse(data);
        const token = parsed.choices[0]?.delta?.content || '';
        fullResponse += token;
        console.log(token); // Render token-by-token
      } catch (e) {
        // Skip parsing errors
      }
    }
  }
}

// Get conversation ID from response header
const conversationId = response.headers.get('X-Conversation-Id');
console.log('Conversation ID:', conversationId);
```

**Features:**
- **Context-Aware**: AI knows current product analysis details
- **Conversation Persistence**: Messages saved to database
- **Streaming Responses**: Token-by-token delivery for perceived speed
- **Professional Guardrails**: No medical diagnosis or treatment advice
- **One Conversation Per Analysis**: Unique constraint on `(user_id, analysis_id)`

**Error Responses:**

```json
// 400 Bad Request - Missing required fields
{
  "error": "Missing required field: analysisId"
}

// 429 Too Many Requests - Rate limit exceeded
{
  "error": "Rate limit exceeded. Please try again later.",
  "retry_after_seconds": 60
}

// 402 Payment Required - AI credits depleted
{
  "error": "AI credits depleted. Please contact support@skinlytix.com"
}

// 500 Internal Server Error
{
  "error": "Failed to generate response. Please try again."
}
```

---

### 3. optimize-routine

**Purpose:** Analyze a user's skincare routine and provide optimization recommendations (cost savings, redundancies, better order).

**Endpoint:** `POST /functions/v1/optimize-routine`

**Authentication:** Required (JWT token)

**Request Body:**

```typescript
interface OptimizeRoutineRequest {
  routineId: string;  // UUID of routine to optimize
}
```

**Response:**

```typescript
interface OptimizeRoutineResponse {
  optimization_id: string;
  routine_id: string;
  optimization_data: {
    summary: {
      current_cost: number;
      optimized_cost: number;
      savings: number;
      savings_percentage: number;
      products_analyzed: number;
    };
    insights: {
      redundancies: Array<{
        products: string[];
        ingredient: string;
        recommendation: string;
      }>;
      order_optimization: Array<{
        product: string;
        current_position: number;
        recommended_position: number;
        reason: string;
      }>;
      better_alternatives: Array<{
        current_product: string;
        alternative: string;
        price_difference: number;
        why_better: string;
      }>;
      missing_essentials: Array<{
        product_type: string;
        reason: string;
        recommendations: string[];
      }>;
    };
    routine_type: "face" | "body" | "hair" | "mixed";
  };
}
```

---

### 4. find-dupes

**Purpose:** Discover affordable skincare alternatives ("dupes") for a given product using AI analysis.

**Endpoint:** `POST /functions/v1/find-dupes`

**Authentication:** Optional (recommended for personalized results)

**Request Body:**

```typescript
interface FindDupesRequest {
  productName: string;        // Required: Product name to find dupes for
  brand?: string;            // Optional: Brand of original product
  ingredients: string[];     // Required: Array of ingredient names
  category?: string;         // Optional: "face" | "body" | "hair"
  skinType?: string;         // Optional: User's skin type for profile matching
  concerns?: string[];       // Optional: User's skin concerns
}
```

**Response:**

```typescript
interface FindDupesResponse {
  dupes: Array<{
    name: string;                    // Dupe product name
    brand: string;                   // Dupe brand
    imageUrl: string;                // Product image URL
    priceEstimate: string;           // Price string (e.g., "$12.99")
    reasons: string[];               // Why it's a dupe
    sharedIngredients: string[];     // Common ingredients
    profileMatch: boolean;           // Matches user profile?
    category: string;                // Product category
    whereToBuy?: string;             // Retailer suggestions
  }>;
}
```

**Example Request:**

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/find-dupes`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    productName: 'Drunk Elephant B-Hydra Intensive Hydration Serum',
    brand: 'Drunk Elephant',
    ingredients: ['Panthenol', 'Sodium Hyaluronate', 'Ceramides', 'Niacinamide'],
    category: 'face',
    skinType: 'dry',
    concerns: ['dehydration', 'sensitivity']
  })
});
```

**Example Response:**

```json
{
  "dupes": [
    {
      "name": "Hyaluronic Acid 2% + B5",
      "brand": "The Ordinary",
      "imageUrl": "https://images.unsplash.com/photo-1620916566398-39f1143ab7be?w=300",
      "priceEstimate": "$7.90",
      "reasons": [
        "Contains Hyaluronic Acid for intense hydration",
        "Includes Panthenol (Pro-Vitamin B5)",
        "Budget-friendly alternative"
      ],
      "sharedIngredients": ["Sodium Hyaluronate", "Panthenol"],
      "profileMatch": true,
      "category": "face",
      "whereToBuy": "Ulta, Sephora, The Ordinary website"
    }
  ]
}
```

**Features:**
- AI-powered product matching from trusted budget brands
- Real product images from Open Beauty Facts API when available
- Profile matching based on skin type and concerns
- Returns up to 5 dupe suggestions per request

**Error Responses:**

```json
// 400 Bad Request - Missing required fields
{
  "error": "Missing required field: ingredients"
}

// 429 Too Many Requests - Rate limit exceeded
{
  "error": "Rate limit exceeded. Please try again later."
}

// 500 Internal Server Error
{
  "error": "Failed to find dupes. Please try again."
}
```
```

**Example Request:**

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/optimize-routine`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    routineId: 'routine-uuid-1234'
  })
});

const data = await response.json();
```

**Example Response:**

```json
{
  "optimization_id": "opt-uuid-5678",
  "routine_id": "routine-uuid-1234",
  "optimization_data": {
    "summary": {
      "current_cost": 127.50,
      "optimized_cost": 89.00,
      "savings": 38.50,
      "savings_percentage": 30.2,
      "products_analyzed": 5
    },
    "insights": {
      "redundancies": [
        {
          "products": ["The Ordinary Niacinamide 10%", "CeraVe PM Lotion"],
          "ingredient": "Niacinamide",
          "recommendation": "Both products contain 5%+ niacinamide. Consider using only one to avoid potential irritation and save money."
        }
      ],
      "order_optimization": [
        {
          "product": "The Ordinary AHA 30% + BHA 2%",
          "current_position": 2,
          "recommended_position": 4,
          "reason": "Exfoliating acids should be applied after cleansing and toning, but before moisturizer for optimal pH."
        }
      ],
      "better_alternatives": [
        {
          "current_product": "CeraVe PM Facial Moisturizing Lotion ($15)",
          "alternative": "The Ordinary Natural Moisturizing Factors + HA ($7)",
          "price_difference": -8.00,
          "why_better": "Similar ingredient profile (ceramides, hyaluronic acid) at half the price. Equally effective for dry skin."
        }
      ],
      "missing_essentials": [
        {
          "product_type": "Sunscreen (SPF 30+)",
          "reason": "No SPF product detected. Sun protection is essential, especially when using active ingredients like retinol or acids.",
          "recommendations": [
            "La Roche-Posay Anthelios ($18)",
            "EltaMD UV Clear ($38)",
            "Supergoop Unseen Sunscreen ($34)"
          ]
        }
      ]
    },
    "routine_type": "face"
  }
}
```

**Error Responses:**

```json
// 404 Not Found - Routine doesn't exist
{
  "error": "Routine not found or you don't have access"
}

// 400 Bad Request - Routine has less than 2 products
{
  "error": "Routine must have at least 2 products to optimize"
}
```

---

### 4. extract-ingredients

**Purpose:** Extract ingredients from product image using OCR (Tesseract.js).

**Endpoint:** `POST /functions/v1/extract-ingredients`

**Authentication:** Required (JWT token)

**Request Body:**

```typescript
interface ExtractIngredientsRequest {
  imageBase64: string;  // Base64-encoded image
  imageFormat: string;  // "jpeg" | "png" | "webp"
}
```

**Response:**

```typescript
interface ExtractIngredientsResponse {
  ingredients: string;   // Comma-separated ingredient list
  confidence: number;    // 0-100 confidence score
  raw_text: string;      // Raw OCR output (for debugging)
}
```

**Example Request:**

```typescript
// Convert image file to base64
const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const base64 = reader.result?.toString().split(',')[1];
      resolve(base64 || '');
    };
    reader.onerror = error => reject(error);
  });
};

const imageBase64 = await fileToBase64(imageFile);

const response = await fetch(`${SUPABASE_URL}/functions/v1/extract-ingredients`, {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${jwt_token}`,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    imageBase64: imageBase64,
    imageFormat: 'jpeg'
  })
});

const data = await response.json();
```

**Example Response:**

```json
{
  "ingredients": "Water, Glycerin, Niacinamide, Panthenol, Sodium Hyaluronate, Tocopheryl Acetate, Dimethicone, Carbomer, Triethanolamine",
  "confidence": 87,
  "raw_text": "INGREDIENTS: Water, Glycerin, Niacinamide, Panthenol, Sodium Hyaluronate..."
}
```

**Error Responses:**

```json
// 400 Bad Request - Invalid image format
{
  "error": "Invalid image format. Supported: jpeg, png, webp"
}

// 422 Unprocessable Entity - OCR failed
{
  "error": "Could not extract ingredients from image. Please ensure image is clear and ingredients are visible.",
  "suggestions": [
    "Use good lighting",
    "Hold camera straight",
    "Ensure text is in focus"
  ]
}
```

---

### 5. query-pubchem

**Purpose:** Query PubChem database for ingredient information (molecular weight, safety data, properties).

**Endpoint:** `POST /functions/v1/query-pubchem`

**Authentication:** Optional (caching benefits all users)

**Request Body:**

```typescript
interface QueryPubChemRequest {
  ingredientName: string;  // INCI name or common name
}
```

**Response:**

```typescript
interface QueryPubChemResponse {
  ingredient_name: string;
  pubchem_cid: string;          // PubChem Compound ID
  molecular_weight: number;
  molecular_formula: string;
  properties: {
    iupac_name: string;
    synonyms: string[];
    safety_profile: {
      comedogenic_rating: number;  // 0-5 scale
      irritancy_potential: "low" | "medium" | "high";
      allergen_risk: "low" | "medium" | "high";
    };
    functions: string[];          // ["Humectant", "Emollient", etc.]
  };
  cached: boolean;               // Was this from cache?
}
```

**Example Request:**

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/query-pubchem`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    ingredientName: 'Niacinamide'
  })
});

const data = await response.json();
```

**Example Response:**

```json
{
  "ingredient_name": "Niacinamide",
  "pubchem_cid": "936",
  "molecular_weight": 122.12,
  "molecular_formula": "C6H6N2O",
  "properties": {
    "iupac_name": "Pyridine-3-carboxamide",
    "synonyms": [
      "Nicotinamide",
      "Vitamin B3",
      "3-Pyridinecarboxamide"
    ],
    "safety_profile": {
      "comedogenic_rating": 0,
      "irritancy_potential": "low",
      "allergen_risk": "low"
    },
    "functions": [
      "Brightening",
      "Anti-inflammatory",
      "Barrier support",
      "Sebum regulation"
    ]
  },
  "cached": true
}
```

---

### 6. query-open-beauty-facts

**Purpose:** Query Open Beauty Facts database for product information by barcode.

**Endpoint:** `POST /functions/v1/query-open-beauty-facts`

**Authentication:** Optional

**Request Body:**

```typescript
interface QueryOBFRequest {
  barcode: string;  // Product barcode (UPC/EAN)
}
```

**Response:**

```typescript
interface QueryOBFResponse {
  product_name: string;
  brand: string;
  category: string;
  ingredients: string;
  image_url: string;
  barcode: string;
  cached: boolean;
}
```

**Example Request:**

```typescript
const response = await fetch(`${SUPABASE_URL}/functions/v1/query-open-beauty-facts`, {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    barcode: '3337875597180'  // Example: CeraVe product
  })
});

const data = await response.json();
```

**Example Response:**

```json
{
  "product_name": "Moisturizing Cream",
  "brand": "CeraVe",
  "category": "Face moisturizer",
  "ingredients": "Water, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride...",
  "image_url": "https://images.openfoodfacts.org/images/products/...",
  "barcode": "3337875597180",
  "cached": false
}
```

**Error Responses:**

```json
// 404 Not Found - Product not in OBF database
{
  "error": "Product not found in Open Beauty Facts database",
  "barcode": "1234567890123"
}
```

---

## Rate Limiting

### Rate Limit Implementation

SkinLytix uses database-backed rate limiting via the `check_rate_limit` function.

**Rate Limits:**

| Endpoint | Limit | Window | Identifier |
|----------|-------|--------|------------|
| `analyze-product` | 10 requests | 1 hour | User ID |
| `optimize-routine` | 5 requests | 1 hour | User ID |
| `extract-ingredients` | 20 requests | 1 hour | User ID |
| `chat-skinlytix` | 20 messages | 1 minute | User ID or IP |
| `query-pubchem` | 100 requests | 1 hour | IP address |
| `query-open-beauty-facts` | 100 requests | 1 hour | IP address |

### How Rate Limiting Works

```typescript
// Inside edge function
const { data: rateLimitResult } = await supabase.rpc('check_rate_limit', {
  _endpoint: 'analyze-product',
  _identifier: userId,
  _max_requests: 10,
  _window_minutes: 60
});

if (!rateLimitResult.allowed) {
  return new Response(
    JSON.stringify({ 
      error: 'Rate limit exceeded',
      retry_after_seconds: rateLimitResult.retry_after_seconds,
      current_count: rateLimitResult.current_count,
      max_requests: rateLimitResult.max_requests
    }),
    { 
      status: 429,
      headers: { 'Retry-After': rateLimitResult.retry_after_seconds.toString() }
    }
  );
}
```

### Rate Limit Response

```json
// 429 Too Many Requests
{
  "error": "Rate limit exceeded",
  "retry_after_seconds": 3600,
  "current_count": 11,
  "max_requests": 10
}
```

**Response Headers:**

```
HTTP/1.1 429 Too Many Requests
Retry-After: 3600
Content-Type: application/json
```

### Premium Users (Future)

Premium users will have higher rate limits:

| Endpoint | Free | Premium |
|----------|------|---------|
| `analyze-product` | 10/hour | 100/hour |
| `optimize-routine` | 5/hour | 50/hour |
| `extract-ingredients` | 20/hour | 200/hour |

---

## Error Handling

### Standard Error Response Format

```json
{
  "error": "Human-readable error message",
  "code": "ERROR_CODE",
  "details": {
    "field": "specific_field",
    "reason": "why it failed"
  }
}
```

### HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| **200** | OK | Successful request |
| **400** | Bad Request | Invalid input, missing required fields |
| **401** | Unauthorized | Missing or invalid JWT token |
| **402** | Payment Required | AI credits depleted |
| **403** | Forbidden | User doesn't have permission |
| **404** | Not Found | Resource doesn't exist |
| **422** | Unprocessable Entity | OCR failed, image quality too poor |
| **429** | Too Many Requests | Rate limit exceeded |
| **500** | Internal Server Error | Server-side error, try again |
| **503** | Service Unavailable | Temporary outage, retry later |

### Client-Side Error Handling

```typescript
const analyzeProduct = async (productData: AnalyzeProductRequest) => {
  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/analyze-product`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(productData)
    });

    // Handle rate limiting
    if (response.status === 429) {
      const error = await response.json();
      toast({
        title: 'Rate limit exceeded',
        description: `Please try again in ${Math.ceil(error.retry_after_seconds / 60)} minutes`,
        variant: 'destructive'
      });
      return null;
    }

    // Handle payment required
    if (response.status === 402) {
      toast({
        title: 'AI credits depleted',
        description: 'Please contact support to add more credits',
        variant: 'destructive'
      });
      return null;
    }

    // Handle other errors
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Failed to analyze product');
    }

    const data = await response.json();
    return data;

  } catch (error) {
    console.error('Analysis error:', error);
    toast({
      title: 'Analysis failed',
      description: error instanceof Error ? error.message : 'Unknown error',
      variant: 'destructive'
    });
    return null;
  }
};
```

### Retry Strategy

**Exponential Backoff:**

```typescript
const fetchWithRetry = async (
  url: string,
  options: RequestInit,
  maxRetries = 3
): Promise<Response> => {
  let lastError: Error;

  for (let i = 0; i < maxRetries; i++) {
    try {
      const response = await fetch(url, options);

      // Don't retry on 4xx errors (client errors)
      if (response.status >= 400 && response.status < 500) {
        return response;
      }

      // Retry on 5xx errors (server errors)
      if (response.status >= 500) {
        throw new Error(`Server error: ${response.status}`);
      }

      return response;

    } catch (error) {
      lastError = error as Error;
      
      // Exponential backoff: 1s, 2s, 4s
      const delay = Math.pow(2, i) * 1000;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError!;
};
```

---

## Example cURL Commands

### Analyze Product

```bash
curl -X POST https://yflbjaetupvakadqjhfb.supabase.co/functions/v1/analyze-product \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "productName": "CeraVe Moisturizing Cream",
    "ingredients": "Water, Glycerin, Cetearyl Alcohol, Caprylic/Capric Triglyceride, Cetyl Alcohol, Ceramide NP, Ceramide AP, Ceramide EOP",
    "brand": "CeraVe",
    "category": "Moisturizer",
    "price": 18.99,
    "userProfile": {
      "skin_type": "dry",
      "skin_concerns": ["sensitivity", "dryness"]
    }
  }'
```

### Optimize Routine

```bash
curl -X POST https://yflbjaetupvakadqjhfb.supabase.co/functions/v1/optimize-routine \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "routineId": "a1b2c3d4-e5f6-7890-abcd-ef1234567890"
  }'
```

### Extract Ingredients

```bash
curl -X POST https://yflbjaetupvakadqjhfb.supabase.co/functions/v1/extract-ingredients \
  -H "Authorization: Bearer YOUR_JWT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "imageBase64": "/9j/4AAQSkZJRgABAQAAAQABAAD...",
    "imageFormat": "jpeg"
  }'
```

### Query PubChem

```bash
curl -X POST https://yflbjaetupvakadqjhfb.supabase.co/functions/v1/query-pubchem \
  -H "Content-Type: application/json" \
  -d '{
    "ingredientName": "Niacinamide"
  }'
```

### Query Open Beauty Facts

```bash
curl -X POST https://yflbjaetupvakadqjhfb.supabase.co/functions/v1/query-open-beauty-facts \
  -H "Content-Type: application/json" \
  -d '{
    "barcode": "3337875597180"
  }'
```

---

## Webhook Integrations

### Outgoing Webhooks (Future)

**Purpose:** Notify external systems when events occur in SkinLytix.

**Supported Events:**
- `product.analyzed` - Product analysis completed
- `routine.created` - User created routine
- `routine.optimized` - Routine optimization completed
- `user.signed_up` - New user registered
- `subscription.upgraded` - User upgraded to premium

**Webhook Payload:**

```json
{
  "event": "product.analyzed",
  "timestamp": "2025-11-11T10:30:45.123Z",
  "data": {
    "user_id": "user-uuid",
    "product_name": "CeraVe Moisturizing Cream",
    "epiq_score": 87,
    "analysis_id": "analysis-uuid"
  },
  "signature": "sha256=abc123..."
}
```

**Webhook Signature Verification:**

```typescript
// Verify webhook signature
const verifySignature = (payload: string, signature: string, secret: string): boolean => {
  const crypto = require('crypto');
  const computedSignature = crypto
    .createHmac('sha256', secret)
    .update(payload)
    .digest('hex');
  
  return `sha256=${computedSignature}` === signature;
};

// Usage
const isValid = verifySignature(
  JSON.stringify(req.body),
  req.headers['x-skinlytix-signature'],
  WEBHOOK_SECRET
);

if (!isValid) {
  return res.status(401).json({ error: 'Invalid signature' });
}
```

### Incoming Webhooks (Zapier Integration)

**Purpose:** Trigger SkinLytix actions from external systems.

**Example: Add product from Zapier**

```bash
curl -X POST https://yflbjaetupvakadqjhfb.supabase.co/functions/v1/webhook-zapier \
  -H "X-Zapier-Secret: YOUR_ZAPIER_SECRET" \
  -H "Content-Type: application/json" \
  -d '{
    "action": "analyze_product",
    "user_email": "user@example.com",
    "product_name": "New Product",
    "ingredients": "Water, Glycerin..."
  }'
```

**Response:**

```json
{
  "success": true,
  "analysis_id": "analysis-uuid",
  "epiq_score": 82
}
```

---

## Postman Collection

**Download:** [SkinLytix API Postman Collection](https://www.postman.com/skinlytix/workspace/skinlytix-api)

**Collection Contents:**
- All edge function endpoints
- Example requests with realistic data
- Environment variables (staging, production)
- Pre-request scripts for JWT token generation
- Tests for response validation

**How to Use:**

1. Import collection into Postman
2. Set environment variables:
   - `SUPABASE_URL`
   - `JWT_TOKEN` (get from Supabase dashboard)
3. Run requests

---

## Document Version History

| Version | Date | Author | Changes |
|---------|------|--------|---------|
| 1.0 | Nov 11, 2025 | Engineering Team | Initial comprehensive API documentation |

---

**For Questions or Updates:**  
Contact: Backend Engineer or CTO  
Slack Channel: #backend

**Related Documentation:**
- [Data Models](./Data-Models.md)
- [Engineering SOPs](./Engineering-SOPs.md)
- [Database Migration Guide](./Database-Migration-Guide.md)
- [Edge Function Development Guide](./Engineering-SOPs.md#edge-function-development)

---

**End of API Documentation**
