## Chat Feature Tables

### chat_conversations

**Purpose:** Store persistent chat sessions linked to product analyses. One conversation per user per analysis.

**Schema:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `user_id` | UUID | No | - | Foreign key to auth.users |
| `analysis_id` | UUID | No | - | Foreign key to user_analyses |
| `title` | TEXT | Yes | NULL | Conversation title (optional) |
| `created_at` | TIMESTAMPTZ | No | now() | Conversation start timestamp |
| `updated_at` | TIMESTAMPTZ | No | now() | Last message timestamp |

**Constraints:**
- `UNIQUE(user_id, analysis_id)` - One conversation per user per analysis

**RLS Policies:**
- Users can view their own conversations
- Users can create their own conversations
- Users can update their own conversations

**TypeScript Interface:**

```typescript
interface ChatConversation {
  id: string;
  user_id: string;
  analysis_id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
}
```

**Example Row:**

```json
{
  "id": "conv-uuid-1234",
  "user_id": "user-uuid-5678",
  "analysis_id": "analysis-uuid-abcd",
  "title": "Questions about CeraVe Moisturizer",
  "created_at": "2025-11-23T10:00:00.000Z",
  "updated_at": "2025-11-23T10:15:00.000Z"
}
```

---

### chat_messages

**Purpose:** Store individual messages in conversations (user and assistant messages).

**Schema:**

| Column | Type | Nullable | Default | Description |
|--------|------|----------|---------|-------------|
| `id` | UUID | No | gen_random_uuid() | Primary key |
| `conversation_id` | UUID | No | - | Foreign key to chat_conversations |
| `role` | TEXT | No | - | "user" or "assistant" |
| `content` | TEXT | No | - | Message text |
| `metadata` | JSONB | Yes | NULL | Optional metadata (tokens, model, etc.) |
| `created_at` | TIMESTAMPTZ | No | now() | Message timestamp |

**Constraints:**
- CHECK constraint: `role IN ('user', 'assistant')`

**RLS Policies:**
- Users can view messages in their conversations
- Users can insert messages in their conversations
- Assistant role messages inserted by edge function

**TypeScript Interface:**

```typescript
interface ChatMessage {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant';
  content: string;
  metadata: {
    tokens_used?: number;
    model?: string;
    response_time_ms?: number;
  } | null;
  created_at: string;
}
```

**Example Rows:**

```json
// User message
{
  "id": "msg-uuid-1111",
  "conversation_id": "conv-uuid-1234",
  "role": "user",
  "content": "Is this product safe for sensitive skin?",
  "metadata": null,
  "created_at": "2025-11-23T10:10:00.000Z"
}

// Assistant message
{
  "id": "msg-uuid-2222",
  "conversation_id": "conv-uuid-1234",
  "role": "assistant",
  "content": "Based on the analysis, this product has an EpiQ score of 87/100 and is well-suited for sensitive skin. The ceramide-rich formula is gentle and the product contains no harsh irritants or common allergens.",
  "metadata": {
    "tokens_used": 156,
    "model": "google/gemini-2.5-flash",
    "response_time_ms": 2341
  },
  "created_at": "2025-11-23T10:10:03.000Z"
}
```

---

### Chat Feature Data Flow

```
User opens chat on Analysis page
         ↓
Frontend checks for existing conversation_id
         ↓
POST /chat-skinlytix with analysis_id, user_id, messages
         ↓
Edge function: getOrCreateConversation(user_id, analysis_id)
         ↓
Load conversation history from chat_messages
         ↓
Inject analysis context + history into system prompt
         ↓
Stream AI response token-by-token (SSE)
         ↓
Save user message + assistant response to chat_messages
         ↓
Return conversation_id in X-Conversation-Id header
```

---

### Query Examples

**Get user's conversations:**

```sql
SELECT 
  c.*,
  a.product_name,
  a.brand,
  COUNT(m.id) as message_count,
  MAX(m.created_at) as last_message_at
FROM chat_conversations c
JOIN user_analyses a ON c.analysis_id = a.id
LEFT JOIN chat_messages m ON c.id = m.conversation_id
WHERE c.user_id = auth.uid()
GROUP BY c.id, a.product_name, a.brand
ORDER BY c.updated_at DESC;
```

**Get conversation with messages:**

```sql
SELECT 
  m.*
FROM chat_messages m
WHERE m.conversation_id = $1
ORDER BY m.created_at ASC;
```

**Create conversation:**

```sql
INSERT INTO chat_conversations (user_id, analysis_id, title)
VALUES ($1, $2, $3)
ON CONFLICT (user_id, analysis_id) DO UPDATE
SET updated_at = NOW()
RETURNING *;
```
