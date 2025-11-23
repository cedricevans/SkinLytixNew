# Chat Feature Development Guide (SkinLytixGPT)

**Document Version:** 1.0  
**Last Updated:** November 23, 2025  
**Owner:** Engineering Team  
**Status:** Active

---

## Table of Contents

1. [Overview](#overview)
2. [Architecture](#architecture)
3. [Backend Implementation](#backend-implementation)
4. [Frontend Implementation](#frontend-implementation)
5. [Database Schema](#database-schema)
6. [Streaming SSE Implementation](#streaming-sse-implementation)
7. [Voice Features](#voice-features)
8. [Error Handling](#error-handling)
9. [Testing Guidelines](#testing-guidelines)
10. [Troubleshooting](#troubleshooting)

---

## Overview

SkinLytixGPT is a conversational AI assistant that provides context-aware explanations about product analysis results. It combines:
- **Context Awareness**: Knows current product analysis details
- **Conversation Persistence**: Saves chat history to database
- **Streaming Responses**: Token-by-token delivery via Server-Sent Events
- **Professional Guardrails**: No medical diagnosis or treatment advice
- **Voice Support**: Optional voice input/output using Web Speech API

---

## Architecture

```
┌─────────────┐
│   User      │
│ (Analysis   │
│   Page)     │
└──────┬──────┘
       │
       │ Opens chat
       ↓
┌─────────────────────────────────┐
│   SkinLytixGPTChat Component    │
│ - Mobile: Bottom Sheet Modal    │
│ - Desktop: Side Panel           │
│ - Voice Input/Output            │
└──────┬──────────────────────────┘
       │
       │ POST /chat-skinlytix
       │ (SSE Stream)
       ↓
┌─────────────────────────────────┐
│   chat-skinlytix Edge Function  │
│ 1. Get/create conversation      │
│ 2. Load message history         │
│ 3. Inject analysis context      │
│ 4. Stream AI response           │
│ 5. Save messages to DB          │
└──────┬──────────────────────────┘
       │
       ├─────────────────┬──────────────────┐
       │                 │                  │
       ↓                 ↓                  ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ Lovable AI   │  │  chat_       │  │  user_       │
│ Gateway      │  │ conversations│  │  analyses    │
│ (Gemini 2.5) │  │              │  │              │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## Backend Implementation

### Edge Function: `chat-skinlytix`

**Location:** `supabase/functions/chat-skinlytix/index.ts`

**Key Functions:**

#### 1. Get or Create Conversation

```typescript
async function getOrCreateConversation(
  supabase: SupabaseClient,
  userId: string,
  analysisId: string
): Promise<string> {
  // Check for existing conversation
  const { data: existing } = await supabase
    .from('chat_conversations')
    .select('id')
    .eq('user_id', userId)
    .eq('analysis_id', analysisId)
    .single();

  if (existing) {
    // Update timestamp
    await supabase
      .from('chat_conversations')
      .update({ updated_at: new Date().toISOString() })
      .eq('id', existing.id);
    return existing.id;
  }

  // Create new conversation
  const { data: newConv } = await supabase
    .from('chat_conversations')
    .insert({ user_id: userId, analysis_id: analysisId })
    .select('id')
    .single();

  return newConv.id;
}
```

#### 2. Load Conversation History

```typescript
async function loadConversationHistory(
  supabase: SupabaseClient,
  conversationId: string
): Promise<Array<{role: string; content: string}>> {
  const { data: messages } = await supabase
    .from('chat_messages')
    .select('role, content')
    .eq('conversation_id', conversationId)
    .order('created_at', { ascending: true })
    .limit(50); // Last 50 messages

  return messages || [];
}
```

#### 3. System Prompt Design

```typescript
const systemPrompt = `You are SkinLytixGPT, an expert AI assistant for skincare ingredient analysis.

CRITICAL GUARDRAILS (NEVER VIOLATE):
1. NO medical diagnosis (no rosacea, eczema, psoriasis, fungal acne diagnoses)
2. NO treatment plans or prescription advice
3. NO pregnancy/breastfeeding safety confirmation
4. ALWAYS refer medical concerns to professionals

CURRENT ANALYSIS CONTEXT:
Product: ${analysis.product_name}
Brand: ${analysis.brand}
EpiQ Score: ${analysis.epiq_score}/100 (${getScoreLabel(analysis.epiq_score)})

Sub-Scores:
- Ingredient Safety: ${subScores.ingredient_safety}/100
- Skin Compatibility: ${subScores.skin_compatibility}/100
- Active Quality: ${subScores.active_quality}/100
- Preservative Safety: ${subScores.preservative_safety}/100

Safe Ingredients (${safeIngredients.length}):
${safeIngredients.map(i => `- ${i.name}: ${i.role}`).join('\n')}

Problematic Ingredients (${problematicIngredients.length}):
${problematicIngredients.map(i => `- ${i.name}: ${i.concern}`).join('\n')}

CAPABILITIES:
- Explain ingredient functions and interactions
- Compare to other products (if user asks)
- Suggest routine placement
- Address safety concerns
- Recommend when to see dermatologist/esthetician

TONE: Friendly, educational, empowering but cautious`;
```

#### 4. Stream AI Response

```typescript
// Call Lovable AI Gateway
const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': `Bearer ${lovableApiKey}`,
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    model: 'google/gemini-2.5-flash',
    messages: [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      ...userMessages
    ],
    stream: true,
    temperature: 0.7,
    max_tokens: 1000
  }),
});

// Return SSE stream directly
return new Response(aiResponse.body, {
  headers: {
    'Content-Type': 'text/event-stream',
    'X-Conversation-Id': conversationId,
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    ...corsHeaders
  }
});
```

#### 5. Save Messages (Background Task)

```typescript
// Save user message immediately
await supabase
  .from('chat_messages')
  .insert({
    conversation_id: conversationId,
    role: 'user',
    content: userMessage
  });

// Accumulate assistant response from stream
let assistantResponse = '';
for await (const chunk of aiStream) {
  assistantResponse += chunk;
  // Stream to client in real-time
}

// Save assistant response after completion
await supabase
  .from('chat_messages')
  .insert({
    conversation_id: conversationId,
    role: 'assistant',
    content: assistantResponse,
    metadata: {
      tokens_used: countTokens(assistantResponse),
      model: 'google/gemini-2.5-flash',
      response_time_ms: Date.now() - startTime
    }
  });
```

---

## Frontend Implementation

### Component: `SkinLytixGPTChat`

**Location:** `src/components/SkinLytixGPTChat.tsx`

**Key Features:**

#### 1. Conversation State Management

```typescript
const [messages, setMessages] = useState<Message[]>([]);
const [isLoading, setIsLoading] = useState(false);
const [conversationId, setConversationId] = useState<string | null>(null);

// Load conversation history on mount
useEffect(() => {
  if (userId && analysisId) {
    loadConversationHistory();
  }
}, [userId, analysisId]);

async function loadConversationHistory() {
  const { data: conversation } = await supabase
    .from('chat_conversations')
    .select('id, chat_messages(*)')
    .eq('user_id', userId)
    .eq('analysis_id', analysisId)
    .single();

  if (conversation) {
    setConversationId(conversation.id);
    setMessages(conversation.chat_messages);
  }
}
```

#### 2. Streaming Message Handler

```typescript
async function sendMessage(content: string) {
  setIsLoading(true);
  
  // Add user message to UI
  const userMessage = { role: 'user' as const, content };
  setMessages(prev => [...prev, userMessage]);

  try {
    const response = await fetch(`${SUPABASE_URL}/functions/v1/chat-skinlytix`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session.access_token}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        analysisId,
        conversationId,
        userId,
        messages: [userMessage]
      })
    });

    // Get conversation ID from header
    const newConvId = response.headers.get('X-Conversation-Id');
    if (newConvId) setConversationId(newConvId);

    // Parse SSE stream
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let assistantMessage = { role: 'assistant' as const, content: '' };
    
    // Add placeholder for assistant message
    setMessages(prev => [...prev, assistantMessage]);

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
            assistantMessage.content += token;

            // Update last message with new token
            setMessages(prev => [
              ...prev.slice(0, -1),
              { ...assistantMessage }
            ]);
          } catch (e) {
            // Skip parse errors
          }
        }
      }
    }
  } catch (error) {
    console.error('Chat error:', error);
    toast.error('Failed to send message. Please try again.');
  } finally {
    setIsLoading(false);
  }
}
```

#### 3. Voice Input (Web Speech API)

```typescript
const [isListening, setIsListening] = useState(false);
const recognitionRef = useRef<SpeechRecognition | null>(null);

function startVoiceInput() {
  if (!('webkitSpeechRecognition' in window)) {
    toast.error('Voice input not supported in this browser');
    return;
  }

  const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition;
  const recognition = new SpeechRecognition();
  
  recognition.continuous = false;
  recognition.interimResults = true;
  recognition.lang = 'en-US';

  recognition.onstart = () => setIsListening(true);
  recognition.onend = () => setIsListening(false);

  recognition.onresult = (event: SpeechRecognitionEvent) => {
    const transcript = Array.from(event.results)
      .map(result => result[0].transcript)
      .join('');
    
    if (event.results[0].isFinal) {
      sendMessage(transcript);
    }
  };

  recognition.start();
  recognitionRef.current = recognition;
}

function stopVoiceInput() {
  recognitionRef.current?.stop();
}
```

#### 4. Voice Output (Text-to-Speech)

```typescript
function speakMessage(text: string) {
  if (!('speechSynthesis' in window)) {
    toast.error('Text-to-speech not supported');
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.rate = 0.9;
  utterance.pitch = 1.0;
  utterance.volume = 1.0;

  speechSynthesis.speak(utterance);
}
```

---

## Database Schema

See: `docs/technical/Data-Models-Chat-Tables.md` for complete schema documentation.

**Key Tables:**
- `chat_conversations` - One per user per analysis (UNIQUE constraint)
- `chat_messages` - All user and assistant messages

**RLS Policies:**
- Users can only access their own conversations
- Automatic user_id matching via `auth.uid()`

---

## Streaming SSE Implementation

### Server-Side (Edge Function)

```typescript
// Return AI stream directly to client
return new Response(aiResponse.body, {
  headers: {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    'Connection': 'keep-alive',
    'X-Conversation-Id': conversationId,
    ...corsHeaders
  }
});
```

### Client-Side (React)

```typescript
// Parse SSE stream token-by-token
const reader = response.body!.getReader();
const decoder = new TextDecoder();

while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.substring(6);
      if (data === '[DONE]') break;

      const parsed = JSON.parse(data);
      const token = parsed.choices[0]?.delta?.content || '';
      // Render token immediately
      updateUIWithToken(token);
    }
  }
}
```

---

## Voice Features

### Browser Compatibility

- **Speech Recognition**: Chrome, Edge, Safari 14.1+
- **Speech Synthesis**: All modern browsers

### Implementation Notes

1. **Request Permissions**: Microphone access required for voice input
2. **Continuous vs Single**: Use `continuous: false` for single utterances
3. **Interim Results**: Show real-time transcription for better UX
4. **Error Handling**: Detect unsupported browsers, permission denials

---

## Error Handling

### Common Errors

1. **429 Rate Limit**
   - Show friendly toast: "You're chatting too fast! Please wait a moment."
   - Disable input temporarily
   - Suggest waiting 60 seconds

2. **402 Credits Depleted**
   - Show upgrade prompt
   - Link to pricing page
   - Notify admins

3. **Network Errors**
   - Offer retry button
   - Maintain unsent message in input
   - Show offline indicator

4. **Streaming Errors**
   - Detect disconnection mid-stream
   - Show partial response + retry option
   - Log error for debugging

---

## Testing Guidelines

### Unit Tests

```typescript
// Test conversation creation
describe('getOrCreateConversation', () => {
  it('creates new conversation for new user-analysis pair', async () => {
    const convId = await getOrCreateConversation(supabase, userId, analysisId);
    expect(convId).toBeDefined();
  });

  it('returns existing conversation for same user-analysis pair', async () => {
    const convId1 = await getOrCreateConversation(supabase, userId, analysisId);
    const convId2 = await getOrCreateConversation(supabase, userId, analysisId);
    expect(convId1).toBe(convId2);
  });
});
```

### Integration Tests

1. **Full Chat Flow**
   - Send message → Receive streamed response → Verify database save
   
2. **Conversation Persistence**
   - Create conversation → Reload page → Verify history loaded

3. **Voice Features**
   - Start voice input → Transcribe → Send message

### Manual QA Checklist

- [ ] Chat opens on Analysis page
- [ ] Messages stream token-by-token
- [ ] Conversation history loads on revisit
- [ ] Voice input works (Chrome/Safari)
- [ ] Voice output pronounces correctly
- [ ] Mobile: Bottom sheet animates smoothly
- [ ] Desktop: Side panel doesn't obstruct content
- [ ] Error messages display appropriately
- [ ] Rate limiting shows friendly message
- [ ] Professional guardrails enforced (no medical diagnosis)

---

## Troubleshooting

### Messages Not Saving

**Symptom:** Chat works but history not persisted

**Check:**
1. Edge function logs for database errors
2. RLS policies on `chat_messages` table
3. User authentication (JWT token valid)

**Fix:**
```sql
-- Verify RLS policies
SELECT * FROM pg_policies WHERE tablename = 'chat_messages';

-- Test insert manually
INSERT INTO chat_messages (conversation_id, role, content)
VALUES ('test-uuid', 'user', 'test message');
```

### Streaming Not Working

**Symptom:** Full response arrives at once instead of streaming

**Check:**
1. Response `Content-Type` header is `text/event-stream`
2. Frontend is parsing SSE format correctly
3. Browser devtools → Network → Response type

**Fix:**
- Ensure edge function returns `aiResponse.body` directly
- Don't buffer response before returning

### Voice Input Not Activating

**Symptom:** Microphone icon click does nothing

**Check:**
1. Browser supports Speech Recognition API
2. Microphone permissions granted
3. HTTPS (required for mic access)

**Fix:**
```typescript
// Check browser support
if (!('webkitSpeechRecognition' in window)) {
  console.error('Speech Recognition not supported');
  return;
}

// Request permissions explicitly
navigator.mediaDevices.getUserMedia({ audio: true })
  .then(() => startRecognition())
  .catch(err => console.error('Mic permission denied:', err));
```

---

**For additional support, consult:**
- Edge function logs: Lovable Cloud → Functions → chat-skinlytix
- Database queries: Lovable Cloud → Database → Query Editor
- Frontend errors: Browser DevTools → Console
