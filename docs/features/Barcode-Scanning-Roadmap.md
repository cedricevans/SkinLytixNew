# Barcode Scanning & Real Product Images - Feature Roadmap

## Status: Planned Feature (Not Yet Implemented)

## Overview

This document outlines the planned implementation of barcode scanning functionality that will enable users to scan product barcodes using their phone camera and automatically retrieve real product images, names, and ingredient lists from Open Beauty Facts and other databases.

## Current State

### Existing Infrastructure
- ✅ **Open Beauty Facts API Integration**: Edge function `query-open-beauty-facts` already queries the OBF database
- ✅ **Barcode Input Field**: Manual barcode entry exists in `Upload.tsx`
- ✅ **Product Cache Table**: `product_cache` table caches OBF responses by barcode
- ✅ **Image URL Storage**: `user_analyses.image_url` column stores product images

### Current Limitations
- ❌ No camera-based barcode scanning
- ❌ Market dupes from `find-dupes` AI function don't have reliable real product images
- ❌ Manual barcode entry requires user to type 13-digit UPC codes
- ❌ No auto-population of product info from scanned barcode

## Planned Solution

### Phase 1: Camera Barcode Scanning (MVP)
**Timeline**: 2-3 weeks

#### Components
1. **BarcodeScanner.tsx** - React component using device camera
   - Use `@nicolarossi/barcode-scanner` or native Web API
   - Support UPC-A, EAN-13, EAN-8 formats
   - Mobile-first responsive design
   - Fallback to manual entry

2. **ScanUploadFlow** - New upload flow variant
   - "Scan Barcode" button prominent on Upload page
   - Auto-populate product name, brand, ingredients from OBF
   - Pull real product image from OBF `image_url` field
   - User confirms/edits before analysis

3. **Enhanced OBF Query** - Improve edge function
   - Return structured product data including image URLs
   - Handle multiple image sizes (thumbnail, full)
   - Cache responses for faster repeated lookups

#### Database Changes
```sql
-- Add scanned_barcode to track scan source
ALTER TABLE user_analyses ADD COLUMN scanned_barcode TEXT;
ALTER TABLE user_analyses ADD COLUMN data_source TEXT DEFAULT 'manual';
-- Values: 'manual', 'barcode_scan', 'ocr', 'api_import'
```

### Phase 2: Enhanced Product Data (Post-MVP)
**Timeline**: 2-4 weeks after Phase 1

1. **Affiliate Network Integration**
   - Amazon Product API for US products
   - Ulta/Sephora affiliate feeds
   - Real-time pricing data

2. **Google Shopping API** (Alternative)
   - Product image search by name
   - Price comparison data
   - Retailer availability

3. **Community Contributions**
   - User-uploaded product images
   - Verified image moderation queue
   - Image quality scoring

### Phase 3: Real Images for Market Dupes
**Timeline**: 4-6 weeks after Phase 2

1. **Dupe Image Resolution**
   - Query OBF by product name + brand
   - Fallback to affiliate/Google images
   - Cache resolved images in new table

2. **DupeCard Enhancement**
   - Display real product images when available
   - Show "verified image" badge
   - Graceful fallback to category placeholders

```sql
-- New table for dupe image cache
CREATE TABLE dupe_image_cache (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_name TEXT NOT NULL,
  brand TEXT,
  image_url TEXT NOT NULL,
  image_source TEXT, -- 'obf', 'affiliate', 'google', 'user'
  verified BOOLEAN DEFAULT false,
  cached_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(product_name, brand)
);
```

## Technical Architecture

### Barcode Scanning Flow
```
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Camera Scan    │────▶│  Decode Barcode  │────▶│  Query OBF API  │
│  (BarcodeScanner)│     │  (Web/Library)   │     │  (Edge Function) │
└─────────────────┘     └──────────────────┘     └─────────────────┘
                                                          │
                                                          ▼
┌─────────────────┐     ┌──────────────────┐     ┌─────────────────┐
│  Run Analysis   │◀────│  User Confirms   │◀────│  Display Product │
│  (analyze-product)│    │  (Edit if needed) │     │  Name, Image, etc│
└─────────────────┘     └──────────────────┘     └─────────────────┘
```

### Image Resolution Priority
1. Open Beauty Facts (free, extensive cosmetics database)
2. Affiliate Network CDN (Amazon, retailers)
3. Google Shopping Images API
4. User-uploaded verified images
5. Category placeholder (fallback)

## API Changes

### Enhanced `query-open-beauty-facts` Response
```typescript
interface OBFProductResponse {
  found: boolean;
  barcode: string;
  product: {
    name: string;
    brand: string;
    ingredients_text: string;
    image_url: string;           // Full-size image
    image_thumb_url: string;     // Thumbnail
    image_small_url: string;     // Medium size
    categories: string[];
    labels: string[];
  } | null;
}
```

### New `resolve-product-image` Endpoint
```typescript
// POST /functions/v1/resolve-product-image
interface ResolveImageRequest {
  productName: string;
  brand?: string;
  category?: string;
}

interface ResolveImageResponse {
  imageUrl: string | null;
  source: 'obf' | 'affiliate' | 'google' | 'cache' | 'placeholder';
  cached: boolean;
}
```

## Mobile UX Considerations

1. **Camera Permissions**
   - Request on first use with clear explanation
   - Graceful degradation if denied

2. **Scanning Experience**
   - Viewfinder overlay with barcode alignment guide
   - Haptic feedback on successful scan
   - Audio cue option (accessibility)

3. **Offline Handling**
   - Queue scans for later processing
   - Show cached product info when available

## Success Metrics

| Metric | Target |
|--------|--------|
| Scan success rate | >90% on first attempt |
| OBF product match rate | >60% for US cosmetics |
| Time to complete scan + analysis | <15 seconds |
| User adoption of scan feature | >40% of analyses via scan |

## Dependencies

- Camera access (HTTPS required)
- Open Beauty Facts API (free, no key required)
- Optional: Affiliate network API keys
- Optional: Google Cloud Vision API key

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| OBF database coverage gaps | Fallback to manual entry + OCR |
| Camera API browser support | Feature detection + graceful degradation |
| Barcode misreads | Confidence threshold + retry prompt |
| Rate limiting on external APIs | Aggressive caching + batch requests |

## Related Documentation

- [Dupe Discovery Feature](./Dupe-Discovery.md)
- [API Documentation](../technical/API-Documentation.md)
- [Data Models](../technical/Data-Models.md)

---

*Last Updated: December 2024*
*Status: Planning Phase*
