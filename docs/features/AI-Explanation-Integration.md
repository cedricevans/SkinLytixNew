# AI Explanation Integration

**Document Version:** 1.1  
**Last Updated:** November 23, 2025

## Overview
SkinLytix integrates AI-powered explanations at three levels:
1. **Product-level analysis** (overall snapshot via SkinLytixGPT)
2. **Ingredient-level explanations** (individual component analysis)
3. **Conversational chat** (interactive Q&A via SkinLytixGPT Chat)

This multi-layer approach provides comprehensive understanding from macro insights to micro details, with interactive exploration capabilities.

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

#### Product-Level Display (Collapsible)
**Location**: `src/pages/Analysis.tsx` → `src/components/AIExplanationAccordion.tsx`

**Features**:
1. **Collapsible Accordion** (NEW):
   - Defaults to collapsed state to reduce page height
   - Smooth expand/collapse animation (300ms)
   - Chevron icon rotation for clear affordance
   - Click header to toggle visibility
   
2. **Safety Level Visual Meter**:
   - Converts `safety_level` to visual progress bar
   - Color-coded zones (low, moderate, high risk)
   - Always visible when accordion expanded
   
3. **Professional Referral Alert**:
   - Conditionally displayed if `professional_referral.needed === true`
   - Amber-styled alert with suggested professional type
   - Sticky banner for high-priority referrals
   
4. **Markdown Content Rendering**:
   - Uses `react-markdown` for formatted display
   - Sections: Overall Snapshot, Key Ingredients, Flagged Items, Routine Fit
   
5. **Metadata Badges**:
   - Ingredient-focused badge
   - EpiQ Score Analysis badge
   - "Powered by SkinLytix GPT" footer

6. **Interactive Chat Access**:
   - "Ask SkinLytixGPT" button opens conversational chat
   - Context-aware AI assistant for follow-up questions

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

## Chat Feature (SkinLytixGPT) - NEW

### Overview
SkinLytixGPT Chat provides conversational AI assistance for understanding product analysis results. It combines context awareness, conversation history, and professional guardrails to deliver personalized skincare guidance.

### Architecture
**Edge Function:** `supabase/functions/chat-skinlytix/index.ts`
- Streams responses token-by-token using Server-Sent Events (SSE)
- Maintains conversation context across messages
- Persists chat history to database (`chat_conversations` + `chat_messages`)
- Injects analysis data into system prompt for context awareness

**Frontend Component:** `src/components/SkinLytixGPTChat.tsx`
- **Mobile**: Bottom sheet modal (slides up from bottom)
- **Desktop**: Side panel (docked to right side)
- **Voice Input**: Web Speech API for hands-free interaction
- **Text-to-Speech**: Optional voice playback of responses
- **Markdown Rendering**: Formatted responses with lists, bold, etc.

### System Prompt Design

**Guardrails (Never Violate):**
- No medical diagnosis (rosacea, eczema, fungal acne, etc.)
- No treatment plans or prescription advice
- No pregnancy/breastfeeding safety confirmation
- Must refer to professionals for medical concerns

**Context Injection:**
```typescript
const systemPrompt = `You are SkinLytixGPT...

CURRENT ANALYSIS CONTEXT:
Product: ${analysis.product_name}
EpiQ Score: ${analysis.epiq_score}/100
Sub-Scores:
- Ingredient Safety: ${subScores.ingredient_safety}/100
- Skin Compatibility: ${subScores.skin_compatibility}/100

Safe Ingredients: ${safeIngredients.map(i => i.name).join(', ')}
Flagged Concerns: ${problematicIngredients.map(i => i.name + ': ' + i.concern).join(', ')}

Answer user questions about this specific analysis.`;
```

### Conversation Persistence

**Database Schema:**
- `chat_conversations`: One conversation per user per analysis (unique constraint)
- `chat_messages`: All messages with role (user/assistant)
- Automatic conversation retrieval on subsequent chats

**Flow:**
1. User opens chat on Analysis page
2. Frontend checks for existing `conversation_id`
3. Edge function retrieves or creates conversation
4. Loads message history from `chat_messages`
5. Injects history + analysis context into AI call
6. Streams response and saves to database

### Voice Features

**Input:** Web Speech API (`SpeechRecognition`)
- Continuous listening mode
- Real-time transcription display
- Auto-send on silence detection
- Browser compatibility: Chrome, Edge, Safari 14.1+

**Output:** Text-to-Speech API (`SpeechSynthesis`)
- Optional voice playback of responses
- User toggle control
- Respects browser TTS settings
- All modern browsers supported

### Performance

- **First Response**: 1-3 seconds (after user message)
- **Streaming**: Token-by-token rendering (perceived as instant)
- **History Load**: <500ms for 50 messages
- **Database Write**: Async (doesn't block response stream)

### Security & Privacy

- **No PII**: User names, emails not sent to AI
- **Server-side System Prompts**: Never exposed to client
- **RLS Enforcement**: Users can only access their own conversations
- **Rate Limiting**: 20 messages/minute per user

---

## Future Enhancements

### Short-term
1. **Ingredient explanation caching**: Store AI explanations in `ingredient_cache` table
2. **Batch processing**: Generate ingredient explanations in batches of 10
3. **Retry logic**: Automatic retry on transient failures
4. **Chat export**: Download conversation as PDF/TXT

### Long-term
1. **Multi-language support**: Generate explanations in user's preferred language
2. **Voice-first interface**: Hands-free chat mode for accessibility
3. **Personalized tone**: Adjust explanation complexity based on user expertise level
4. **Real-time streaming**: Stream AI explanations token-by-token for faster perceived performance
5. **Multi-product comparison**: Chat about multiple analyses simultaneously
6. **Routine builder assistant**: AI helps create optimized routines through conversation
