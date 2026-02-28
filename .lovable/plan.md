
Objective
Create a downloadable logo package that matches the live site aesthetic exactly (not a generic interpretation), while keeping it usable in email signatures and external websites.

What is currently causing the mismatch
- The current `public/parasens-logo-pro.svg` is close in layout, but not in styling details that define your site:
  - Uses `Montserrat` instead of the site’s display font (`Syne`).
  - Uses a different metallic gradient than the hero’s actual animated text gradient.
  - Tagline casing/weight/spacing don’t fully match the hero lockup feel.
  - It’s a single static variant, not a practical export set for real-world usage.

Implementation approach
1) Build a “source-of-truth” logo lockup that mirrors the hero style
- Recreate the 3-line lockup:
  - Top: `MOOD MUSIC MANAGEMENT`
  - Center: `PARASENS`
  - Bottom: `SET THE TONE`
- Match site typography system:
  - Use `Syne`-first stack to align with hero (`font-display`).
  - Re-tune font sizes, weights, and tracking to reflect hero proportions.
- Match site color language:
  - Use the same bright-silver gradient logic as `.text-gradient` in `src/index.css` for `PARASENS`.
  - Use muted greys derived from existing theme tokens for top/bottom lines.
- Preserve clean, minimal composition and generous negative space.

2) Produce a professional downloadable asset set (same design, multiple contexts)
- Dark-background master SVG (for presentations, decks, dark pages).
- Transparent-background SVG (for email signatures and partner websites).
- Light-background SVG (dark text variant for white pages/docs).
- Optional square social/avatar version (same lockup adapted to 1:1 canvas).

3) Improve portability for external use
- Keep SVG text-based for lightweight/editability.
- Add robust fallback font stack in the SVG style block.
- Ensure dimensions/viewBox are clean and predictable for downstream use.
- Include clear naming so collaborators know which file to use where.

4) Keep website usage unchanged unless requested
- This task will focus on creating high-quality downloadable files in `public/`.
- No navigation/hero UI changes unless you want the same logo embedded into the site header/footer later.

Files to update/create
- Update:
  - `public/parasens-logo-pro.svg` (make this the exact site-matching master)
- Create:
  - `public/parasens-logo-transparent.svg`
  - `public/parasens-logo-light.svg`
  - `public/parasens-logo-square.svg` (optional but recommended)

Validation checklist
- Visual parity against hero:
  - Font family/weight/tracking feels consistent with homepage branding.
  - Gradient tone and contrast feel “same brand,” not just similar.
  - Vertical rhythm and spacing match the site’s premium/minimal look.
- Practicality:
  - Transparent variant works on both dark and light surfaces.
  - SVG scales crisply from tiny signature size to large hero/banner usage.
  - File names and variants are clear for external collaborators.

Technical notes
- Reference points:
  - `src/components/HeroSection.tsx` for lockup copy and hierarchy.
  - `src/index.css` `.text-gradient` and theme token palette for exact color/finish.
  - `tailwind.config.ts` `fontFamily.display` (`Syne`) for typography consistency.
- Current gap in `public/parasens-logo-pro.svg` is mainly typography and color system mismatch; layout structure is already usable as a starting skeleton.

Once approved, I’ll implement this as a polished logo pack that is visually aligned with the live site and immediately usable outside the project.
