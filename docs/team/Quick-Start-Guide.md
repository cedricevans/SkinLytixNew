# SkinLytix Developer Quick-Start Guide

## 🚀 Get Running in 5 Minutes

### Prerequisites
- Node.js 18+
- Git

### Setup
```bash
# Clone and install
git clone [repository-url]
cd skinlytix
npm install

# Start development server
npm run dev
```

The app runs at `http://localhost:5173`

---

## 🏗️ Project Structure

```
src/
├── components/          # React components
│   ├── ui/             # shadcn/ui primitives
│   ├── paywall/        # Subscription gates (coming soon)
│   └── ...             # Feature components
├── hooks/              # Custom React hooks
│   ├── useSubscription.ts    # Tier & access control
│   ├── useUsageLimits.ts     # Free tier tracking
│   └── ...
├── pages/              # Route pages
├── integrations/       # Supabase client (auto-generated)
└── lib/                # Utilities

supabase/
├── functions/          # Edge functions (serverless)
│   ├── analyze-product/
│   ├── chat-skinlytix/
│   └── ...
└── config.toml         # Supabase configuration
```

---

## 🔐 Authentication & Authorization

### User Roles
```typescript
// Roles stored in user_roles table
type AppRole = 'admin' | 'moderator' | 'user';

// Check role
const { data } = await supabase
  .from('user_roles')
  .select('role')
  .eq('user_id', userId)
  .eq('role', 'admin')
  .maybeSingle();
```

### Subscription Tiers
```typescript
// Tiers stored in profiles table
type SubscriptionTier = 'free' | 'premium' | 'pro';

// Use the hook
import { useSubscription } from '@/hooks/useSubscription';

const { tier, isAdmin, canAccess } = useSubscription();
if (canAccess('routine_optimization')) {
  // Show feature
}
```

---

## 💰 Subscription System

### Feature Access Matrix
```typescript
const FEATURE_ACCESS = {
  score_breakdown: ['premium', 'pro'],
  full_ai_explanation: ['premium', 'pro'],
  chat_unlimited: ['pro'],
  routine_optimization: ['premium', 'pro'],
  batch_analysis: ['pro'],
};
```

### Usage Limits (Free Tier)
```typescript
const FREE_LIMITS = {
  chat_messages: 3,        // per month
  routines: 1,             // total
  products_per_routine: 3,
  routine_optimizations: 0, // preview only
  product_comparisons: 2,
};
```

---

## 🎨 Design System

### Colors (use semantic tokens!)
```css
/* ✅ Correct */
className="bg-primary text-primary-foreground"
className="bg-muted text-muted-foreground"

/* ❌ Wrong */
className="bg-purple-500 text-white"
```

### Key Tokens
- `--primary` - Brand color (purple gradient)
- `--accent` - Accent actions (teal/cyan)
- `--destructive` - Errors, warnings
- `--muted` - Subtle backgrounds

---

## 🔌 Edge Functions

### Calling Functions
```typescript
import { supabase } from '@/integrations/supabase/client';

const { data, error } = await supabase.functions.invoke('analyze-product', {
  body: { ingredients, productName, skinType }
});
```

### Available Functions
| Function | Purpose |
|----------|---------|
| `analyze-product` | AI ingredient analysis |
| `chat-skinlytix` | SkinLytixGPT conversations |
| `optimize-routine` | Routine recommendations |
| `extract-ingredients` | OCR text extraction |

---

## 📊 Database Tables

### Core Tables
| Table | Purpose |
|-------|---------|
| `profiles` | User data, subscription tier |
| `user_roles` | Admin/moderator access |
| `user_analyses` | Saved product analyses |
| `routines` | User routines |
| `usage_limits` | Free tier tracking |
| `user_badges` | Gamification |

### Key Queries
```typescript
// Get user profile with subscription
const { data: profile } = await supabase
  .from('profiles')
  .select('*, subscription_tier, demo_mode_tier')
  .eq('id', userId)
  .single();

// Check admin status
const { data: isAdmin } = await supabase
  .rpc('has_role', { _user_id: userId, _role: 'admin' });
```

---

## 🧪 Testing

### Run Tests
```bash
npm run test        # Unit tests
npm run test:e2e    # E2E tests (if configured)
```

### Test User Accounts
| Email | Password | Role |
|-------|----------|------|
| admin@test.com | test1234 | admin |
| user@test.com | test1234 | user |

---

## 🚢 Deployment

### Preview Deploys
Every push creates a preview at `https://[branch].lovable.app`

### Production
Merge to `main` triggers production deploy.

### Environment Variables
Set in Lovable project settings:
- `VITE_SUPABASE_URL` (auto)
- `VITE_SUPABASE_PUBLISHABLE_KEY` (auto)
- Stripe keys (when enabled)

---

## 📚 Key Documentation

| Doc | Location |
|-----|----------|
| Revenue Model | `docs/business/Revenue-Model.md` |
| API Docs | `docs/technical/API-Documentation.md` |
| Data Models | `docs/technical/Data-Models.md` |
| User Flows | `docs/product/User-Flows.md` |

---

## 🆘 Common Issues

### "Row level security violation"
Ensure user is authenticated before mutations:
```typescript
const { data: { user } } = await supabase.auth.getUser();
if (!user) throw new Error('Must be logged in');
```

### "Edge function timeout"
- Check logs: `supabase functions logs [function-name]`
- AI calls can take 5-10s, ensure timeout is adequate

### Subscription not updating
- Check `profiles.subscription_tier` column
- Verify Stripe webhook is configured
- Check for demo_mode_tier override (admin only)

---

## 📞 Getting Help

1. Check existing docs in `/docs`
2. Search codebase for similar patterns
3. Ask in team Slack/Discord
4. Create GitHub issue for bugs
