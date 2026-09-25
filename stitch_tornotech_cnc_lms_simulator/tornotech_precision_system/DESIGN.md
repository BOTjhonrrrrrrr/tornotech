---
name: TornoTech Precision System
colors:
  surface: '#061423'
  surface-dim: '#061423'
  surface-bright: '#2d3a4a'
  surface-container-lowest: '#020f1e'
  surface-container-low: '#0f1c2c'
  surface-container: '#132030'
  surface-container-high: '#1e2b3b'
  surface-container-highest: '#283646'
  on-surface: '#d6e4f9'
  on-surface-variant: '#bdc8d1'
  inverse-surface: '#d6e4f9'
  inverse-on-surface: '#243141'
  outline: '#87929b'
  outline-variant: '#3e4850'
  surface-tint: '#83cfff'
  primary: '#83cfff'
  on-primary: '#00344b'
  primary-container: '#00a8e8'
  on-primary-container: '#003952'
  inverse-primary: '#00658d'
  secondary: '#ffb86b'
  on-secondary: '#492900'
  secondary-container: '#ed9000'
  on-secondary-container: '#583300'
  tertiary: '#c6c7c3'
  on-tertiary: '#2f312e'
  tertiary-container: '#9c9e9a'
  on-tertiary-container: '#333533'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#c6e7ff'
  primary-fixed-dim: '#83cfff'
  on-primary-fixed: '#001e2d'
  on-primary-fixed-variant: '#004c6b'
  secondary-fixed: '#ffdcbc'
  secondary-fixed-dim: '#ffb86b'
  on-secondary-fixed: '#2c1700'
  on-secondary-fixed-variant: '#683d00'
  tertiary-fixed: '#e2e3df'
  tertiary-fixed-dim: '#c6c7c3'
  on-tertiary-fixed: '#1a1c1a'
  on-tertiary-fixed-variant: '#454745'
  background: '#061423'
  on-background: '#d6e4f9'
  surface-variant: '#283646'
typography:
  display-lg:
    fontFamily: Hanken Grotesk
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Hanken Grotesk
    fontSize: 32px
    fontWeight: '600'
    lineHeight: 40px
  headline-md:
    fontFamily: Hanken Grotesk
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  label-sm:
    fontFamily: JetBrains Mono
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  gutter: 16px
  margin: 24px
  container-max: 1440px
---

## Brand & Style

The design system is engineered for a high-stakes technical environment where precision and reliability are paramount. It targets CNC machinists, engineers, and industrial trainees who require a high-density, low-fatigue interface capable of operating in factory settings or focused study sessions.

The aesthetic is **Industrial Minimalism** mixed with **Technical/Futuristic** accents. It leverages a dark-mode first architecture to reduce glare in low-light shop floors while maintaining high legibility. The emotional response is one of "calm authority"—the UI should feel like a calibrated instrument: stable, responsive, and uncompromisingly accurate.

## Colors

The palette is anchored in deep, mechanical tones to ground the user experience.

- **Primary (Electric Blue):** Used for focus states, active progress, and primary navigation. It represents technical "flow."
- **Secondary (Safety Orange):** Reserved for high-priority calls to action, alerts, and critical status indicators (e.g., "Emergency Stop" or "Submit Exam").
- **Neutral/Background:** The "Charcoal" (#0D1B2A) serves as the base layer, with "Deep Navy" (#1B263B) acting as the primary surface color for cards and containers.
- **Accents:** Use #778DA9 for inactive states and #E0E1DD for high-contrast text to ensure accessibility standards are met in low-light environments.

## Typography

This design system utilizes a tiered typography strategy to separate instructional content from technical data.

1.  **Headlines (Hanken Grotesk):** Provides a contemporary, sharp edge to titles. The tight tracking and heavy weights reflect the solidity of machined parts.
2.  **Body (Inter):** Chosen for its exceptional legibility at small sizes, crucial for long-form training modules and tool specifications.
3.  **Technical Data (JetBrains Mono):** Every piece of G-code, ISO coordinate, or machine parameter must use this monospaced font. It ensures that characters like '0' and 'O' are never confused during high-precision training.

## Layout & Spacing

The layout follows a strict **4px baseline grid** to mimic technical drafting standards. 

- **Grid:** Use a 12-column fluid grid for desktop with 24px margins. For data-dense tool tables, use a "compact" layout mode that reduces vertical padding to 8px.
- **Data Density:** Information should be presented in a "modular" fashion. Use 16px gutters to separate distinct technical components (e.g., the 3D viewport from the G-code editor).
- **Mobile:** Transition to a 4-column grid. Code editors should switch to a full-bleed view to maximize horizontal space for long lines of logic.

## Elevation & Depth

To maintain an industrial feel, avoid soft, diffuse "cloud" shadows. 

- **Low-Contrast Outlines:** Use 1px solid borders in `#415A77` to define UI segments. 
- **Tonal Layering:** Depth is achieved through color, not shadows. Base layers use `#0D1B2A`. Floating panels or active cards use `#1B263B`. 
- **Active State Elevation:** Instead of lifting an element, use a 2px "inner glow" or "border highlight" using the primary Electric Blue to indicate selection. This mimics the backlit physical buttons found on CNC control panels.

## Shapes

The shape language is **Soft-Geometric**. Elements use a consistent 4px (0.25rem) corner radius. This provides just enough softening to feel modern while maintaining the rigid, "milled" look of aluminum or steel components. 

- **Buttons:** Use the standard 4px radius.
- **Inputs:** Use sharp 90-degree corners for the bottom edge when stacked, but maintain the 4px radius for standalone fields.
- **Progress Bars:** Use square ends (0px radius) to emphasize measurement accuracy.

## Components

- **Action Buttons:** Primary buttons are solid Electric Blue with white text. Critical "Danger" actions (e.g., Resetting a Module) use the Safety Orange.
- **G-Code Editor:** Features a dark background (#0D1B2A), line highlighting, and syntax coloring using the secondary orange for commands (G, M codes) and blue for coordinates (X, Y, Z).
- **Progress Indicators:** Linear, segmented bars. Each segment represents a completed module, creating a "machined" look rather than a smooth continuous gradient.
- **Data Tables:** Highly condensed with zebra-striping. Headers must be in `label-sm` (monospaced) for a technical readout feel.
- **Tooling Icons:** Use thin-stroke (1.5px) vector icons that represent calipers, lathes, milling bits, and micrometers. Avoid illustrative or "bubbly" iconography.
- **Status Badges:** Use "Machine Status" logic—Green (Ready), Yellow (In Progress), Blue (Focus), and Orange (Action Required).