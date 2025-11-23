# AI Explanation Integration

## Overview
SkinLytix integrates AI-powered explanations at two levels: **product-level analysis** (overall snapshot) and **ingredient-level explanations** (individual component analysis). This dual-layer approach provides both macro and micro insights for comprehensive understanding.

## Architecture

### 1. Backend: AI Explanation Generation
**Location**: `supabase/functions/analyze-product/index.ts`

#### Product-Level AI Explanation (SkinLytix GPT)
- **Model**: Google Gemini 2.5 Flash via Lovable AI Gateway
- **Purpose**: Generate human-friendly, non-medical explanations of product analysis
- **Trigger**: After EpiQ score calculation and ingredient categorization
- **Function**: `generateGptExplanation()`

**System Prompt Highlights**:
- Never ask follow-up questions (one-shot explanation)
- No medical advice or diagnosis
- Explain based on ingredients, flags, and scores
- Recommend professional referral when needed
- Must return valid JSON with specific schema

**Response Schema**:
```typescript
{
  answer_markdown: string,          // Markdown-formatted explanation
  summary_one_liner: string,        // Quick takeaway
  ingredient_focus: boolean,        // Whether explanation is ingredient-focused
  epiQ_or_score_used: boolean,     // Whether EpiQ score referenced
  professional_referral: {
    needed: boolean,
    reason: string,
    suggested_professional_type: "none" | "esthetician" | "dermatologist" | "either"
  },
  safety_level: "low" | "moderate" | "high" | "unknown",
  sources_used: string[],
  debug_notes: string
}
```

#### Ingredient-Level AI Explanation
- **Model**: Google Gemini 2.5 Flash
- **Purpose**: Generate 2-3 sentence consumer-friendly explanations for each ingredient
- **Function**: `generateIngredientExplanation()`
- **Enrichment**: All ingredients (safe, beneficial, problematic, unverified) receive AI explanations

**Explanation Focus**:
- What the ingredient does (role/function)
- Why it's used in skincare
- Key safety notes (if applicable)
- Conversational, non-technical language

### 2. Frontend: Display & Interaction

#### Product-Level Display
**Location**: `src/pages/Analysis.tsx` - AI Explanation card

**Features**:
1. **Safety Level Visual Meter**:
   - Converts `safety_level` to visual progress bar
   - Color-coded zones (low, moderate, high risk)
   
2. **Professional Referral Alert**:
   - Conditionally displayed if `professional_referral.needed === true`
   - Amber-styled alert with suggested professional type
   
3. **Markdown Content Rendering**:
   - Uses `react-markdown` for formatted display
   - Sections: Overall Snapshot, Key Ingredients, Flagged Items, Routine Fit
   
4. **Metadata Badges**:
   - Ingredient-focused badge
   - EpiQ Score Analysis badge
   - "Powered by SkinLytix GPT" footer

#### Ingredient-Level Display
**Location**: `src/components/IngredientCard.tsx` - Card back face

**Integration**:
- AI-generated explanation displayed on flip side
- Replaces generic "Generally recognized as safe" placeholders
- Shows molecular weight + safety profile below explanation
- "Source: SkinLytix GPT" attribution (optional)

## Data Flow

```
1. User submits product analysis
   ↓
2. Backend: Extract ingredients → PubChem lookup
   ↓
3. Backend: Categorize ingredients (safe, beneficial, problematic, unverified)
   ↓
4. Backend: Calculate EpiQ score + sub-scores
   ↓
5. Backend: Generate AI explanations
   ├─ Product-level: generateGptExplanation()
   │  └─ Input: Full analysis data (ingredients, score, flags)
   │  └─ Output: SkinLytixGptResponse object
   │
   └─ Ingredient-level: generateIngredientExplanation() (parallel)
      └─ Input: Ingredient name, category, PubChem data
      └─ Output: 2-3 sentence explanation string
   ↓
6. Backend: Store in database with AI explanations
   ↓
7. Frontend: Fetch analysis
   ↓
8. Frontend: Render dashboard with AI content
   ├─ Product explanation in AI card
   └─ Ingredient explanations on flip cards
```

## Graceful Degradation

### API Failures
- **Rate Limit (429)**: Skip AI explanation, return `null`, log warning
- **Credits Depleted (402)**: Skip AI explanation, return `null`, log warning
- **Network Error**: Skip AI explanation, return `null`, log error
- **Invalid Response**: Parse error → return `null`, log error

### Fallback Content
- **Product-level**: Static EpiQ score explanation still available
- **Ingredient-level**: Generic role-based descriptions ("Humectant - hydrates skin")

### User Experience
- No blocking errors - analysis always completes
- AI section gracefully hidden if generation fails
- Ingredient cards show basic info without AI enhancement

## Parsing AI Markdown for Ingredient Cards

### Challenge
The product-level AI explanation includes detailed per-ingredient analysis in markdown format. We want to extract these details and inject them into individual ingredient flip cards.

### Solution Approach
**Option 1: Regex Parsing** (Implemented)
- Extract "Key Ingredients and What They Do" section
- Parse ingredient entries marked with `**` or bullet points
- Map ingredient name to detailed explanation
- Store in enriched ingredient objects

**Option 2: Structured Prompting** (Future Enhancement)
- Modify system prompt to return structured JSON with per-ingredient breakdowns
- Eliminates parsing complexity
- More reliable than regex but requires prompt engineering

### Implementation
```typescript
const parseIngredientExplanations = (markdown: string): Map<string, string> => {
  const ingredientMap = new Map();
  
  // Extract "Key Ingredients" section
  const sectionMatch = markdown.match(/### Key Ingredients.*?###/s);
  if (!sectionMatch) return ingredientMap;
  
  // Parse each ingredient entry
  const entries = sectionMatch[0].split(/\n\*\*|\n-\s/);
  
  for (const entry of entries) {
    const nameMatch = entry.match(/^([^:]+):/);
    if (nameMatch) {
      const name = nameMatch[1].trim();
      const explanation = entry.substring(nameMatch[0].length).trim();
      ingredientMap.set(name.toLowerCase(), explanation);
    }
  }
  
  return ingredientMap;
};
```

## Professional Referral Logic

### Triggers
AI explanation includes `professional_referral.needed = true` when:
1. Analysis mentions diagnosed conditions (rosacea, eczema, psoriasis, etc.)
2. Severe reactions noted (burning, blistering, swelling)
3. Medical-level evaluation needed based on ingredient concerns
4. User profile indicates complex skin conditions

### Suggested Professional Types
- **"dermatologist"**: Medical conditions, prescription needs, severe reactions
- **"esthetician"**: Routine optimization, product selection, skin analysis
- **"either"**: Could benefit from both perspectives
- **"none"**: No referral needed

### Frontend Display
1. **Professional Referral Banner** (sticky, top of page):
   - Pulsing animation
   - Clear reason text
   - Suggested professional type
   - "Learn More" modal
   
2. **AI Explanation Alert**:
   - Inline alert within AI card
   - Amber styling
   - Same reason + professional type

## Performance Optimization

### Backend
- **Parallel Processing**: All ingredient explanations generated concurrently via `Promise.all()`
- **Timeout Handling**: 30-second max per API call
- **Caching**: PubChem data cached in `ingredient_cache` table

### Frontend
- **Lazy Loading**: AI explanation card loads only when visible
- **Debounced Rendering**: Markdown parser debounced for large content
- **Skeleton Loaders**: `AIExplanationLoader` component during generation

### Expected Latency
- **Product-level AI**: 2-5 seconds
- **Ingredient-level AI** (per ingredient): 0.5-1 second
- **Total analysis time**: 8-15 seconds (including PubChem lookups)

## Error Handling

### Backend Errors
```typescript
try {
  const aiExplanation = await generateGptExplanation(...);
} catch (error) {
  console.error('Error generating GPT explanation:', error);
  return null; // Graceful degradation
}
```

### Frontend Errors
- **Missing AI explanation**: Hide AI card entirely
- **Invalid markdown**: Display raw text as fallback
- **Network errors**: Show retry button

## Security & Privacy

### Data Handling
- **No PII in prompts**: User names, emails, addresses never sent to AI
- **Anonymized context**: Only skin type/concerns, not personal identifiers
- **Server-side only**: API keys and system prompts never exposed to client
- **No storage of prompts**: Only final explanations stored in database

### API Key Management
- **Environment variable**: `LOVABLE_API_KEY` in edge function environment
- **Never logged**: API keys redacted from all logs
- **Rotation**: Keys rotatable without code changes

## Testing & Validation

### Unit Tests
- Test `generateGptExplanation()` with mock analysis data
- Test `generateIngredientExplanation()` with various ingredient types
- Test markdown parsing with edge cases

### Integration Tests
- Full analysis flow from upload to AI explanation generation
- Graceful degradation when AI API unavailable
- Professional referral logic with various conditions

### Manual QA Checklist
- [ ] AI explanation displays correctly on Analysis page
- [ ] Ingredient explanations show on flip cards
- [ ] Professional referral banner appears when needed
- [ ] Safety level meter matches AI safety assessment
- [ ] Markdown formatting renders properly
- [ ] Graceful degradation when AI fails

## Future Enhancements

### Short-term
1. **Ingredient explanation caching**: Store AI explanations in `ingredient_cache` table
2. **Batch processing**: Generate ingredient explanations in batches of 10
3. **Retry logic**: Automatic retry on transient failures

### Long-term
1. **Multi-language support**: Generate explanations in user's preferred language
2. **Voice explanations**: Text-to-speech integration for accessibility
3. **Personalized tone**: Adjust explanation complexity based on user expertise level
4. **Real-time streaming**: Stream AI explanations token-by-token for faster perceived performance
