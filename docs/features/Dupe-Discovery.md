# Dupe Discovery Feature

**Document Version:** 1.0  
**Last Updated:** December 9, 2025  
**Owner:** Product Team  
**Status:** Active

---

## Overview

Dupe Discovery is a core SkinLytix feature that helps users find affordable alternatives ("dupes") to their analyzed skincare products. It combines AI-powered market research with ingredient overlap analysis from the user's own product collection.

---

## Feature Components

### 1. Market Dupes (AI-Powered)

Uses the `find-dupes` edge function to discover real market alternatives from trusted budget-friendly brands.

**How it works:**
1. User selects a product from their analysis history
2. Clicks "Find Market Dupes"
3. AI analyzes ingredients and returns 5 alternative products

**Supported Brands:**
- CeraVe
- The Ordinary
- La Roche-Posay
- Cetaphil
- Neutrogena
- e.l.f.
- Good Molecules
- Versed

**Response includes:**
- Product name and brand
- Price estimate
- Image URL (from Open Beauty Facts or category placeholder)
- Why it's a dupe (shared ingredients, similar benefits)
- Where to buy
- Profile match indicator

### 2. My Products Comparison

Compares the selected product against other products in the user's analysis history based on ingredient overlap.

**Matching Algorithm:**
```typescript
// Calculate ingredient overlap percentage
const overlapPercent = (sharedIngredients / totalSourceIngredients) * 100;

// Minimum threshold: 30% overlap
if (overlapPercent >= 30) {
  // Include in matches
}
```

**Sorting:** Highest overlap percentage first

---

## User Interface

### Product Picker
- Dropdown with all user's analyzed products
- Shows EpiQ score badge next to each product
- Selected product details shown in info card

### Tabs
1. **Market Dupes** - AI-discovered alternatives
2. **My Products** - Ingredient overlap comparison

### Category Filters
- All | Face | Body | Hair
- Filters both market dupes and my products

### DupeCard Component
Mobile-responsive card displaying:
- Product image (user-uploaded or placeholder)
- Brand name (truncated on mobile)
- Product name (2-line clamp)
- Price estimate
- Match percentage badge
- "Why it's a dupe" reasons
- Shared ingredients badges
- Save to favorites heart button

---

## Database Schema

### saved_dupes Table

| Column | Type | Description |
|--------|------|-------------|
| `id` | UUID | Primary key |
| `user_id` | UUID | Foreign key to auth.users |
| `source_product_id` | UUID | The original product being compared |
| `product_name` | TEXT | Name of the dupe product |
| `brand` | TEXT | Brand name |
| `image_url` | TEXT | Product image URL |
| `reasons` | TEXT[] | Array of dupe reasons |
| `shared_ingredients` | TEXT[] | Array of shared ingredient names |
| `price_estimate` | TEXT | Price string (e.g., "$12.99") |
| `saved_at` | TIMESTAMPTZ | When saved |

### user_analyses.image_url Column

Added to store user-uploaded product images for display in "My Products" tab.

---

## API Endpoints

### POST /functions/v1/find-dupes

**Request:**
```json
{
  "productName": "CeraVe PM Facial Moisturizing Lotion",
  "brand": "CeraVe",
  "ingredients": ["Niacinamide", "Ceramides", "Hyaluronic Acid"],
  "category": "face",
  "skinType": "oily",
  "concerns": ["acne", "large_pores"]
}
```

**Response:**
```json
{
  "dupes": [
    {
      "name": "Niacinamide 10% + Zinc 1%",
      "brand": "The Ordinary",
      "imageUrl": "https://...",
      "priceEstimate": "$5.90",
      "reasons": ["Contains Niacinamide at higher concentration", "Budget-friendly"],
      "sharedIngredients": ["Niacinamide", "Glycerin"],
      "profileMatch": true,
      "category": "face",
      "whereToBuy": "Ulta, Sephora, Target"
    }
  ]
}
```

---

## Mobile Responsiveness

### Breakpoints
- **Mobile** (<640px): 2-column grid, compact card text
- **Tablet** (640-1024px): 3-column grid
- **Desktop** (>1024px): 4-column grid

### Mobile Optimizations
- Smaller text sizes (text-[10px] sm:text-xs)
- Truncated brand names
- Fewer shared ingredient badges shown (2 vs 3)
- "Why it's a dupe" section hidden on very small screens
- Touch-friendly heart button (44x44px target)

---

## Subscription Tiers

| Feature | Free | Premium | Pro |
|---------|------|---------|-----|
| Market dupes per search | 2 | 5 | Unlimited |
| Save to favorites | ✓ | ✓ | ✓ |
| Category filters | ✓ | ✓ | ✓ |
| My Products comparison | ✓ | ✓ | ✓ |

---

## Analytics Events

| Event Name | Category | Properties |
|------------|----------|------------|
| `dupe_search_started` | comparison | `productId`, `productName` |
| `dupe_search_completed` | comparison | `resultCount`, `category` |
| `dupe_saved` | conversion | `dupeId`, `sourceProductId` |
| `dupe_unsaved` | engagement | `dupeId` |
| `tab_switched` | engagement | `tab` (market/myproducts) |

---

## Future Enhancements

1. **Affiliate Links**: Direct purchase links with tracking
2. **Price Comparison**: Real-time price checking across retailers
3. **Ingredient Deep Dive**: Show exact concentration comparisons
4. **Community Reviews**: User ratings for dupe accuracy
5. **Barcode Scanning**: Scan dupes in-store to verify - [See Roadmap](./Barcode-Scanning-Roadmap.md)

---

## Saved Favorites Page

Users can access all their saved dupes at `/favorites` with:
- **Sorting**: Recently saved, price low-to-high, price high-to-low, brand A-Z
- **Filtering**: By price range (Under $15, $15-30, $30-50, $50+)
- **Actions**: Unsave items, navigate to Compare for more dupes
- **Empty State**: Prompt to find dupes when no favorites saved

**Navigation Access:**
- Bottom navigation "Favorites" icon (Heart)
- Profile page link
- Compare page "View All Saved" button
