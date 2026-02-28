

## Solution: Logo Preview Page with PNG Export

### The Problem
Standalone SVG files don't reliably render the Syne font or hsla() gradients across different viewers. That's why the logos look wrong — the SVG spec support varies wildly.

### The Fix
Build a `/logos` page on the site that renders each logo variant using the **exact same CSS** as the homepage hero (same `.text-gradient`, same orb backgrounds, same font). Then use **html2canvas** to let you download each one as a high-resolution PNG image.

This guarantees pixel-perfect results because it uses the real site rendering, not SVG approximations.

### What you'll get

| Variant | Background | Download |
|---------|-----------|----------|
| Dark Master | Site's orb atmosphere | 3840x2160 PNG |
| Transparent | None (transparent) | 3840x2160 PNG |
| Light | White (#FAFAFA) | 3840x2160 PNG |
| Square | Site's orb atmosphere | 2160x2160 PNG |

### How it works
1. Navigate to `/logos` on your site
2. See all four logo variants rendered live — looking exactly like your homepage
3. Click "Download PNG" on any variant to save a high-resolution image

### Technical details
- Install `html2canvas` for PNG export
- Create a new `/logos` route and `LogosPage` component
- Each logo card reuses the site's existing CSS classes (`.text-gradient`, background orbs, Syne font)
- Export at 2x resolution (3840x2160 for landscape) for print-quality output
- Page is hidden from main navigation (direct URL access only)
