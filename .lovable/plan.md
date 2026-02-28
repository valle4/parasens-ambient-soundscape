

## High-End Logo Package -- Enhanced Plan

### Quality strategy

SVGs are vector and scale infinitely, so "quality" here means **visual richness and fidelity**. Here's what we'll do to make these feel premium:

### 1. Background atmosphere (dark variants only)

Recreate the site's layered orb system as SVG elements:
- 6 radial-gradient ellipses matching the exact HSL values from `body::before` in `index.css`
- A secondary floating orb layer matching `.bg-orb-layer`
- Noise texture via SVG `<filter>` with `feTurbulence` (same grain as the site)
- Vignette overlay via radial gradient (matching `.vignette` class)

This creates the same moody, cinematic depth as the live site.

### 2. PARASENS wordmark -- exact gradient match

Use the precise `.text-gradient` CSS stops converted to SVG:
- 0%: `#FFFFFF` (pure white)
- 25%: `#B3B3B3` (70% grey)
- 50%: `#FFFFFF` (pure white)
- 75%: `#999999` (60% grey)
- 100%: `#F2F2F2` (95% grey)

This gives the high-contrast metallic shimmer that defines the brand.

### 3. Typography precision

- Font: `Syne` loaded via `@import` inside SVG `<style>` with fallback stack
- "PARASENS": weight 800, size 180px (landscape) / 120px (square), letter-spacing 4
- "MOOD MUSIC MANAGEMENT": weight 400, size 18px, letter-spacing 8, color `#8C8C8C`
- "SET THE TONE": weight 300, size 22px, letter-spacing 6, color `#666666`

### 4. Quality safeguards

- **Font embedding**: The `@import` in SVG ensures Syne loads when viewed in any modern browser or email client. For environments that strip external resources, the fallback sans-serif stack keeps it clean.
- **Large canvas**: 1920x1080 viewBox for landscape, 1080x1080 for square -- these are presentation-grade dimensions.
- **Clean markup**: Proper `xmlns`, `role="img"`, `aria-label` for accessibility.
- **No rasterization artifacts**: Everything is pure vector -- gradients, shapes, text. Scales from favicon to billboard.

### 5. Limitation to be aware of

One thing SVG cannot do is animate the gradient shift the way the site does with CSS `animation: gradient-shift 8s`. The logo will capture the gradient at its most visually striking position (the bright-silver state). This is standard for logo exports -- the animation lives on the website, the logo captures the brand's "hero moment."

### Files to update

| File | Background | Use case |
|------|-----------|----------|
| `parasens-logo-pro.svg` | Dark + orbs + noise + vignette | Presentations, decks, hero banners |
| `parasens-logo-transparent.svg` | None | Email signatures, partner sites |
| `parasens-logo-light.svg` | Light `#FAFAFA` | White documents, light pages |
| `parasens-logo-square.svg` | Dark + orbs + noise + vignette | Social profiles, avatars |

### What "high-end" looks like in practice

- Open the dark master SVG and it should feel like a screenshot of the live homepage hero section
- The atmospheric orbs give it gallery-quality depth, not flat-design cheapness
- The metallic gradient on PARASENS catches the eye the same way the animated version does on site
- The noise and vignette add the subtle analog texture that separates premium from generic

