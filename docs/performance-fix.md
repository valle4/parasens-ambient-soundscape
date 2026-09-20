# Catalogue responsiveness fix — 2026-09-20

The user reported that loading, scrolling and clicking across the development
website became very slow after adding Music Library.

## Findings and changes

- The old CustomCursor MutationObserver attached new anonymous mouseenter and
  mouseleave handlers to every interactive element on every subtree change,
  without removing them. Catalogue changes increased the number of affected
  controls and updates. Replaced with a fixed set of delegated pointer handlers,
  including cleanup. Newly imported controls need no new listeners.
- Both pointer effects used React state for coordinates. They now update refs
  through one pending animation frame per effect and use the latest position.
  Leaving the window, blur, reduced motion, pointer capability changes and
  unmount cancel pending work and remove listeners.
- The spotlight previously changed a viewport-sized gradient on every move.
  It now translates a fixed 600×600 gradient. Cursor motion uses translate
  instead of changing layout coordinates. The visual design is retained.
- Public catalogue labels are indexed once per data change and filtered lists
  are memoized. Offscreen song rows use content-visibility while all published
  songs remain accessible in the list.
- Home, dashboard, release submission, confirmation and Spotify callback pages
  load their code on demand. The main entry bundle decreased from 654.75 kB
  (192.99 kB gzip) to 581.21 kB (173.69 kB gzip), about 11% less uncompressed JS.
  This is a bundle-size comparison, not a measured end-to-end speedup.

## Verification

The isolated release, excluding unrelated invitation-expiry changes, passed 29
unit/database/Spotify/pointer tests, TypeScript checking, targeted lint and a
production build. Pointer tests cover 3,000 movement events, 1,500 newly created
controls, constant listener counts, one queued frame per effect, cleanup and
reduced-motion/touch behavior. Local built-page browser checks verified genre
filtering, player expansion and portal navigation. A dedicated Chrome DevTools
trace was unavailable; no Core Web Vitals score or full resolution of the user's
observed slowdown is claimed without their follow-up.

References: [React lazy](https://react.dev/reference/react/lazy),
[offscreen content rendering](https://web.dev/articles/content-visibility).
