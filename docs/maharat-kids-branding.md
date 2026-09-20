# Maharat Kids — Official Logo Integration & Brand Specification

## Scope

This pass integrates the official Maharat Kids brand identity into the ecommerce application, replacing the temporary CSS mark with optimized web derivatives of the supplied artwork. All ecommerce transactional semantics, database architecture, authentication, and feature boundaries were preserved.

## 1. Official Brand Assets & Derivatives

The master artwork supplied is preserved in the repository at `public/brand/maharat-kids-logo.jpeg`.

High-resolution, transparent-background web derivatives were generated using precise anti-aliased edge extraction to ensure crisp rendering on all light and dark surfaces:

| Asset | Path | Format & Dimensions | Role |
|---|---|---|---|
| **Master Source** | `public/brand/maharat-kids-logo.jpeg` | JPEG, 1254×1254 | Preserved original brand artwork |
| **Full Official Logo** | `public/brand/maharat-kids-logo.webp` | WebP (alpha), 955×1015 | Complete logo: star, children, book, Arabic/English brand names, and strapline (`نتعلم • نلعب • نتطور`) |
| **Compact Logo** | `public/brand/maharat-kids-logo-compact.webp` | WebP (alpha), 955×920 | Compact lockup: star, children, book, Arabic and English brand names (without strapline) |
| **Horizontal Logo** | `public/brand/maharat-kids-logo-horizontal.webp` | WebP (alpha), 1072×260 | Horizontal lockup for storefront header and wide navigation |
| **Official Mark** | `public/brand/maharat-kids-mark.webp` | WebP (alpha), 785×575 | Recognizable children, book, and star illustration |
| **Favicon** | `public/favicon.ico` & `src/app/favicon.ico` | ICO / PNG 32×32 | Browser tab icon derived from official mark |
| **App Icons** | `src/app/icon.png`, `src/app/apple-icon.png`, `public/brand/maharat-kids-icon-512.png` | PNG, 512×512 | PWA / Apple Touch / Next.js auto-generated app icons |

## 2. Centralized Brand Component (`BrandLockup`)

`src/components/brand/brand-lockup.tsx` encapsulates all brand asset derivatives and exposes semantic variants across the application without scattering raw image paths:

- **`variant="header"` (Default)**: Renders the horizontal official logo with responsive scaling (`h-9` on mobile, `h-11` on desktop, max-width bounded to prevent collisions with search and cart controls in 390px mobile viewports).
- **`variant="footer"` / `full`**: Renders the complete vertical official logo with the official strapline `نتعلم • نلعب • نتطور` at `h-24 sm:h-28`.
- **`variant="admin"`**: Renders the restrained mark (`h-8 w-8` in expanded sidebar alongside console label, `h-7 w-7` centered when collapsed) for an uncluttered operational interface.
- **`variant="auth"`**: Renders the compact official lockup at `h-16 sm:h-20` on customer login, registration, and password recovery cards.
- **`variant="mark"`**: Standalone mark icon for utility and compact surfaces.
- **`variant="compact"`**: Inline mark with typography for secondary badges.

## 3. Brand Palette Verification

The application color tokens in `src/app/globals.css` were calibrated against the exact sampled hues from the official logo artwork while maintaining WCAG AA/AAA contrast ratios:

| Token | Role | Hex Value | Calibration against Artwork |
|---|---|---|---|
| `--primary` | Educational deep blue/teal (actions, focus, active states) | `#125b78` | Matches Arabic brand lettering and boy's illustration accents (`#066088` / `#076088`) with enhanced contrast |
| `--primary-hover` | Primary hover state | `#0d465e` | Deeper contrast state |
| `--brand-green` | Growth and learning cues | `#4e9b68` | Matches book wing and "ds" lettering (`#58b84e` / `#68b938`) |
| `--accent` | Warm star highlight & promotion accents | `#f3a928` | Matches official star, book wing, and "i" letter (`#f8a51d` / `#fdb02e`) |
| `--brand-pink` | Reserved subtle accents | `#e66a89` | Matches girl's bow/shirt and "K" letter (`#f65277` / `#ea4b78`) |
| `--background` | Canvas background | `#fbfcfa` | Clean, subtle off-white for reading comfort |
| `--surface-muted` | Panels, search inputs, pills | `#f1f7f4` | Soft teal-tinted neutral |
| `--text-primary` | Main text hierarchy | `#17324d` | Deep readable slate-navy |
| `--text-secondary` | Supporting text | `#536b78` | Balanced neutral |
| `--border` | Dividers and controls | `#dbe7e1` | Harmonized light border |

## 4. Brand Typography & Localization

- **Arabic Brand Name:** مهارة طفل / مهارات طفل
- **English Brand Name:** Maharat Kids
- **Official Strapline:** نتعلم • نلعب • نتطور (Learn • Play • Grow)
- **Currency:** SAR (ر.س)
- **Primary Direction:** RTL (`/ar`) with full LTR support (`/en`)

## 5. Verification & QA Results

### Automated Quality Checks

```text
npm exec -- tsc --noEmit   -> 0 errors (Passed)
npm run lint               -> 0 warnings/errors (Passed)
npm run build              -> Compiled successfully, static & dynamic routes ready (Passed)
```

### Runtime Visual QA & Route Verification

The application was verified at `http://localhost:3000` across all key screens:

| Endpoint | Status | Description / Visual Checks |
|---|---|---|
| `GET /ar` | 200 | Arabic storefront with official header logo, hero carousel, category cards, and full footer lockup |
| `GET /en` | 200 | English storefront with LTR alignment, official header logo, and translated copy |
| `GET /ar/products` | 200 | Product listing with responsive grid and SAR pricing |
| `GET /en/products` | 200 | English product listing |
| `GET /ar/cart` & `/en/cart` | 200 | Cart drawer & page with consistent branding and currency |
| `GET /ar/login` & `/en/login` | 200 | Customer authentication with official `BrandLockup variant="auth"` |
| `GET /ar/register` | 200 | Customer registration card with official brand mark |
| `GET /favicon.ico` | 200 | Serves official Maharat Kids 32×32 favicon |
| `GET /icon.png` | 200 | Serves official Maharat Kids 512×512 app icon |
| `GET /api/health` | 200 | `{"status":"ok",...}` health endpoint |
| `GET /ar/account` | 307 | Protected route redirects unauthenticated users to `/ar/login` |
| `GET /ar/checkout` | 307 | Protected route redirects unauthenticated users to `/ar/login` |
| `GET /ar/admin` | 307 | Protected admin area with restrained official mark redirecting unauthenticated users to login |

### Responsive QA (Desktop & 390px Mobile)

- **Desktop (1440px / 1280px / 1024px):** Header height is `h-20` (80px), navigation links fit on a single line, search input and action controls are well spaced with zero overlap.
- **Mobile (390px):** Logo scales to `h-9` (`max-w-[155px]`), hamburger menu and cart badge render without collision, zero horizontal scroll overflow (`overflow-x: hidden`).

## 6. Remaining Client-Provided Information Required

The technical brand integration and visual QA are complete. The following real-world client data will be needed during future production launch phases:

1. **Commercial & Legal Information:** Commercial Registration (CR) number, Saudi VAT number, official legal entity name, and physical address.
2. **Support Contacts:** Official support phone number, WhatsApp business number, and support email address.
3. **Third-Party Credentials:** Saudi SMS/OTP gateway provider, Saudi online payment gateway credentials (e.g. Moyasar, HyperPay, Tabby/Tamara), and shipping carrier API keys (e.g. SMSA, Aramex, SPL).
4. **Live Catalog Assets:** High-resolution photography and copy for production inventory items.
