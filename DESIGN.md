---
version: alpha
name: Peti
description: A clear, bilingual ordering counter for Jabalpur kirana retailers.
colors:
  primary: '#155e4b'
  primaryHover: '#104b3c'
  ink: '#192d29'
  muted: '#5d6e68'
  background: '#f5f7f5'
  surface: '#ffffff'
  line: '#d9e2dc'
  soft: '#eaf3ed'
  accent: '#985216'
  accentSoft: '#fff2d9'
  danger: '#af3030'
  dangerSoft: '#fff0ed'
typography:
  display:
    fontFamily: 'Manrope Variable, Noto Sans Devanagari, sans-serif'
  body:
    fontFamily: 'Noto Sans Devanagari, Segoe UI, sans-serif'
rounded:
  control: '10px'
  panel: '16px'
spacing:
  small: '8px'
  medium: '16px'
  large: '24px'
components:
  button:
    backgroundColor: '#155e4b'
    color: '#ffffff'
---

## Overview

Product register: a retailer's ordering counter, not a marketing site. User: a kirana owner making a quick order between customers, often on a small Android phone. Office staff process the same orders on desktop. English and Hindi; India/INR; no Japan-market scope.

Product name Peti and the four sample brands are fictional demo choices. Business source: PROJECT_PLAN.md and the user-supplied assignment. No sibling implementation existed before this foundation.

North star: a neatly stocked shelf beside a legible order slip. Signature: product cards always connect pack size, per-piece price and case price; a quiet receipt panel makes the arithmetic visible. Product packaging carries colour; the application stays restrained. Reject generic KPI dashboards and loud promotional banners.

## Colors

Deep green for committed actions, pale green for selected states, amber for schemes, red for errors. Status always includes text. White product cards on a mist-grey surface, with dark ink and visible borders. Light theme only.

Token ownership: Model A. The frontmatter is the canonical source. `scripts/tokens.ts` generates `src/tokens.css`; `npm run tokens:check` detects drift. Every colors key maps to `--color-{key}`, typography to `--font-{key}`, rounded to `--radius-{key}`, spacing to `--space-{key}`. App CSS and shared primitives consume those variables. Packaging art uses its own illustrative palette, not interface status colours.

## Typography

Self-hosted Manrope for titles, navigation and numerical prices. Noto Sans Devanagari and system UI for readable Hindi/body text. Tabular numerals in money and tables. Body 14–16px, page titles 28–36px, primary price 24px. No remote font requests. Hindi line-height at least 1.6.

## Layout

Desktop: a 220px navigation rail, flexible content, and 300px order slip when space permits. Laptop: slip below catalogue. Mobile: compact header, bottom navigation, one or two product columns depending on width. Product imagery has reserved 4:3 geometry. Document scrolling owns the page. Tables own horizontal overflow only. Controls are at least 44px high; adequate bottom padding prevents navigation overlap.

## Elevation & Depth

Borders carry structure. Subtle shadow only for the sticky order slip and active navigation. No gradients, glass effects or entrance animations. Reduced-motion overrides all nonessential transitions. Do not communicate asynchronous completion through motion alone.

## Shapes

Ten-pixel controls, sixteen-pixel product panels. Pills are limited to filter chips and status labels. Repeated spacing comes from the documented rhythm; full-width tap targets on mobile.

## Components

Button, Field, Notice, Loading, EmptyState, StatusBadge and ProductArt are shared owners. Semantic icons use Lucide. All clickable elements have hover, active and focus-visible treatments. Disabled states keep text readable. Global scrollbars derive from muted, line and surface tokens, with explicit forced-colors fallback.

## Do's and Don'ts

- Say what a person can do: Browse products, Review order, Place order.
- Keep demo configuration outside the everyday shopping workflow except a small clear sample-data label.
- Do not present future AI capture as a working feature. Do not show decorative dead buttons.
- Use original fictional packaging illustrations; never imply real brand endorsement.
- Show schemes and tax assumptions consistently. Never conceal out-of-stock items.
