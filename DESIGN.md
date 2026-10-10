---
name: Signal Loom
description: A precise local laboratory instrument for semantic suppression and AI
  reconstruction.
colors:
  canvas: '#0b1220'
  surface: '#121e30'
  raised: '#1a2940'
  text: '#eaf0f8'
  muted: '#a8b8ce'
  line: '#28384f'
  cyan: '#56d9f5'
  violet: '#b39dff'
  amber: '#f2b86b'
  coral: '#ff7b88'
typography:
  display:
    fontFamily: Manrope, sans-serif
    fontSize: clamp(24px, 2.25vw, 35px)
    fontWeight: 700
    lineHeight: 1.3
    letterSpacing: -0.035em
  title:
    fontFamily: Manrope, sans-serif
    fontSize: 14px
    fontWeight: 600
    letterSpacing: -0.015em
  body:
    fontFamily: Manrope, sans-serif
    fontSize: 13px
    fontWeight: 400
  label:
    fontFamily: Manrope, sans-serif
    fontSize: 12px
    fontWeight: 600
  annotation:
    fontFamily: Manrope, sans-serif
    fontSize: 11px
    fontWeight: 400
  numeric:
    fontFamily: IBM Plex Mono, monospace
    fontSize: 23px
    fontWeight: 400
    letterSpacing: -0.035em
  outcome:
    fontFamily: IBM Plex Mono, monospace
    fontSize: 27px
    fontWeight: 400
    lineHeight: 1
    letterSpacing: -0.035em
rounded:
  surface: 14px
  bar: 12px
  control: 8px
  segmented: 7px
  option: 5px
  fault: 6px
  mark: 2px
spacing:
  xs: 4px
  sm: 8px
  md: 12px
  lg: 16px
  compact-panel: 18px
  rail: 20px
  panel: 24px
components:
  button-primary:
    backgroundColor: '{colors.cyan}'
    textColor: '#092435'
    rounded: '{rounded.segmented}'
    padding: 0 17px
    typography: '{typography.label}'
  button-primary-hover:
    backgroundColor: '#82e6fa'
  button-ghost:
    backgroundColor: transparent
    textColor: '{colors.muted}'
    rounded: '{rounded.control}'
    width: 40px
    height: 40px
  button-ghost-hover:
    backgroundColor: '{colors.raised}'
    textColor: '{colors.text}'
  button-guided:
    backgroundColor: '#211e37'
    textColor: '#d0c2ff'
    rounded: '{rounded.control}'
    padding: 11px 15px
    typography: '{typography.label}'
  button-guided-hover:
    backgroundColor: '#302944'
  button-fault:
    backgroundColor: transparent
    textColor: '#ffacb4'
    rounded: '{rounded.fault}'
    width: 100%
    typography: '{typography.annotation}'
  button-fault-active:
    backgroundColor: '#3d2337'
  panel:
    backgroundColor: '{colors.surface}'
    textColor: '{colors.text}'
    rounded: '{rounded.surface}'
  run-bar:
    backgroundColor: '{colors.surface}'
    rounded: '{rounded.bar}'
    padding: 12px 16px
  segmented:
    backgroundColor: '{colors.canvas}'
    rounded: '{rounded.segmented}'
    padding: 3px
  segmented-option:
    backgroundColor: transparent
    textColor: '{colors.muted}'
    rounded: '{rounded.option}'
    padding: 7px 12px
    typography: '{typography.label}'
  segmented-option-selected:
    backgroundColor: '#2a3c54'
    textColor: '{colors.text}'
  sensor-tab:
    backgroundColor: transparent
    textColor: '{colors.muted}'
    padding: 7px 0
    typography: '{typography.annotation}'
  sensor-tab-selected:
    textColor: '{colors.cyan}'
  switch:
    backgroundColor: '#41506b'
    rounded: '{rounded.bar}'
    padding: 3px
    width: 32px
    height: 19px
  switch-on:
    backgroundColor: '{colors.cyan}'
  slider:
    backgroundColor: transparent
    width: 100%
    height: 24px
  channel-tag:
    textColor: '{colors.muted}'
    typography: 10px Manrope, sans-serif
---

# Design System: Signal Loom

## Overview

**Creative North Star: "The precise laboratory instrument"**

Signal Loom uses navy depth, purposeful signal colors, geometric machine drawings, and legible readings to make a live experiment understandable. The approved direction is preserved: a dominant process stage carries the causal story, a comparison plot exposes reconstruction quality, and controls and evidence stay close to the experiment.

The material is matte and restrained. Manrope carries language; IBM Plex Mono makes quantities easy to compare. Animation explains actual decisions and transmissions, while the rotor is explicitly an illustrative load proxy. Outcome numbers have bars, traces, sample strips, or event journeys beside them. Estimates and measurements remain distinguishable through words and geometry as well as color.

**Key Characteristics:**
- A dark laboratory instrument with tonal surfaces and thin structural dividers.
- Cyan measurements, violet reconstruction, amber suppression, and coral faults.
- Locally bundled type, tabular readings, and geometric SVG process imagery.
- Motion tied to experiment state, with equivalent static information.
- Responsive density that preserves process, controls, outcomes, and evidence.

This specification merges the approved provisional direction with the finished build. Tokens come from `src/global.css` and `src/styles.module.css`; component rules come from the shipped React components. Desktop, mobile, stale-feed, and benchmark-error captures in `.impeccable/review/` supply visual evidence. Frontmatter owns primitives; `.impeccable/design.json` supplies extensions and representative renderable components.

## Colors

Cool navy structure supports four accents with stable experimental meanings. Exact palette values are normative in the frontmatter; local component state tints are not additional global accents.

### Primary
- **Ice cyan** (`cyan`): solid original traces, received-sample circles, actual transmission readings, enabled controls, primary run actions, and keyboard focus.

### Secondary
- **Soft violet** (`violet`): receiver imagery, dashed receiver traces, reconstruction readings, estimated sample strips, and evidence links. A translucent violet field carries the calibrated envelope.

### Tertiary
- **Warm amber** (`amber`): suppressed frames, the local suppression branch, payload savings, configuration markers, and correction rings.
- **Coral** (`coral`): fault events, stale-chart warnings, and benchmark or connection failures.

### Neutral
- **Midnight navy** (`canvas`): the page and recessed segmented-control beds.
- **Slate navy** (`surface`): process, chart, controls, run bar, and benchmark panels.
- **Raised navy** (`raised`): local hover surfaces, tooltips, and visual track beds.
- **Cool ivory** (`text`): primary language and values.
- **Blue gray** (`muted`): supporting descriptions, units, and secondary controls.
- **Structural slate** (`line`): subdivisions, outcome separators, and table rules.

### Named Rules

**The Signal Identity Rule.** Keep cyan measurement, violet reconstruction, amber suppression or correction, and coral event or failure meanings consistent across diagrams, charts, controls, and evidence.

**The Redundant Encoding Rule.** Pair signal color with a line style, marker shape, or readable state label. Solid truth, dashed receiver traces, exact-sample circles, correction rings, and event labels remain identifiable without color alone.

## Typography

**Display Font:** Manrope, with sans-serif fallback.

**Body Font:** Manrope, with sans-serif fallback. Weights 400, 500, 600, 700, and 800 are locally bundled.

**Label/Mono Font:** IBM Plex Mono, with monospace fallback. Weights 400 and 500 are locally bundled.

**Character:** Clear, compact language paired with precise instrument readings. Display and section titles use slight negative tracking; supporting text remains plain and sentence case.

### Hierarchy
- **Display** (`display`): the introductory statement; its secondary phrase uses muted text and weight 500. Responsive exceptions are recorded in Layout.
- **Title** (`title`): process, chart, rail, and evidence headings. Expanded help and benchmark headings use the observed larger size (16px).
- **Body** (`body`): introductory and loading explanations. Longer explanatory prose uses leading of 1.8–1.9 and a maximum width of 100ch.
- **Label** (`label`): group names and compact strong labels. Primary run actions use the same size with weight 800.
- **Annotation** (`annotation`): hints, chart legends, outcome explanations, and evidence descriptions. Multi-line hints and outcome descriptions use leading of 1.7.
- **Numeric** (`numeric`): process readings; units return to Manrope. Supporting values and simulation time use smaller mono type (11–12px).
- **Outcome** (`outcome`): large savings, suppressed-share, and event-delivery readings, with subordinate units and explanations.

### Named Rules

**The Reading Rule.** Use IBM Plex Mono and tabular numerals for quantities and time, with explicit units or a nearby interpretation. Reserve Manrope for the language that explains the reading.

## Layout

The desktop shell has a full-width header (84px high) and centered content capped at 1680px, with proportional side gutters (3.4%) and top padding (30px). The experiment grid gives the process and chart a flexible column and controls a fixed rail (286px), separated by 18px. Main panels use roughly 20–24px internal padding. Four aligned labels and readouts correspond to the process diagram's four nodes.

Outcomes form an open strip divided by thin rules, using asymmetric columns (1.25fr, 1.15fr, 1fr, 1fr). Evidence pairs a flexible log with a receiver column (300px), separated by 40px. The plot is 188px high by default; the process SVG has a 1000 × 250 viewBox. The reused spacing rhythm is 4, 8, 12, 16, and 24px, with 18px compact-panel and 20px rail spacing. The provisional 32px and 48px spacing steps were not recurring spacing primitives in the shipped CSS and are not extracted tokens.

- **At 1600px and above:** the process SVG is capped at 255px high; the plot grows to 205px.
- **At 1150px and below:** shell gutters are 24px, the rail is 260px, the main grid gap is 14px, and process/chart side padding is 18px. Display type is 25px and process readings are 20px.
- **At 900px and below:** process and chart precede controls in a single column; control groups occupy three columns, outcomes occupy two, and the secondary header description is removed. The secondary display phrase moves onto its own line.
- **At 620px and below:** the header is 68px high and main gutters are 16px. Run settings wrap onto their own row. Controls use two columns with fault actions spanning both; evidence and footer actions wrap or stack. Display type is 27px with leading 1.4, section titles are 13px, process readings are 17px, and outcome readings are 24px. The plot is 200px high. Stage subtitles give way to a readable suppression caption below the diagram.

The body supports a minimum width of 320px. Wide exact-reading tables scroll inside their own container; main columns shrink and explanatory text wraps.

## Elevation & Depth

Depth comes from navy tone changes, restrained borders, and local signal transparency. Major panels are flat and have no drop shadows or backdrop blur. The machine uses a navy housing gradient, the thermal column grades from cyan through amber to coral, and the channel uses translucent cyan-to-violet fill. These gradients explain process material rather than decorating the page.

### Shadow Vocabulary
- **Slider thumb:** a small contact shadow (`0 2px 6px #0004`) on the WebKit range thumb only; it is not panel elevation.
- **Keyboard focus:** a cyan outline (2px), offset from interactive elements (4px), applies to buttons, links, inputs, selects, and disclosure summaries.

### Named Rules

**The Matte Instrument Rule.** Build hierarchy with tone, spacing, type, and thin rules; keep shadows and translucent effects local to the control or process material that needs them.

## Shapes

Process, chart, controls, and benchmark surfaces use the surface radius. Run and explanatory bars use the tighter bar radius. Ghost and guided controls use the control radius; primary run actions and segmented beds use the segmented radius, with tighter selected options. Fault buttons have a compact dedicated radius. Traffic bars and sample marks use the mark radius.

Circles identify samples, status dots, slider thumbs, and switch knobs. The machine housing, rotor, thermal column, suppression gate, branch, and receiver are authored SVG geometry. Rounded switches remain functional controls; thin borders subdivide groups and rows without enclosing every datum.

## Components

### Buttons

Compact actions carry functional emphasis.

- **Primary:** cyan fill, dark ink, extra-bold text (800), and a leading action icon. Minimum height is 39px; hover brightens the fill and press scales the action to 0.98. Mobile horizontal padding is 11px.
- **Ghost:** muted icon on a transparent square; hover adds raised navy and brightens the icon. Run-bar ghost actions narrow to 32px on mobile.
- **Guided demo:** violet-tinted surface, muted violet border, and light violet text; hover deepens its local fill. Book and arrow icons frame the action.
- **Fault:** coral-tinted outline and text; hover or active fault adds a dark coral field and stronger border. Mobile actions sit side by side with minimum height 40px.
- **Focus / disabled:** shared cyan focus outline. Disabled actions and fieldsets use opacity 0.5 and a not-allowed cursor.

### Chips

The channel tag is an inline status label with a cyan dot, not a filled badge. Decision-log states are readable colored text: cyan sent, amber suppressed, and coral event. Text carries state independently of color.

### Cards / Containers

Main panels share the slate surface, surface radius, and flat depth treatment. Process and chart use desktop padding of 22px vertically and 24px horizontally; the process decision row has a thin top rule. Controls use 22px top and 20px side padding. The outcome strip stays on the canvas with separators and a different visual explanation for each metric. Help and benchmark content expand inline.

### Inputs / Fields

- **Ranges:** a slim track (4px) inside a full-width interaction area (24px high), cyan completed fill, slate remaining fill, and pale cyan thumb (12px). Labels and mono outputs show values and units. Both WebKit and Firefox receive authored track and thumb styles.
- **Switches:** compact tracks (32 × 19px), circular knobs (13px), and an invisible hit-area extension (9px vertically, 6px horizontally). Enabled switches are cyan with dark knobs, displaced 13px; resting switches are slate with light knobs. Accessible labels and checked state accompany the visual.
- **Segments:** recessed canvas beds with 3px gaps and padding. Selected options use a lighter navy field and bright text; inactive choices remain muted. Scenario selection is a native select with a transparent resting surface.
- **State:** labels and hints remain when controls are disabled; keyboard focus uses the shared ring.

### Navigation

The header carries brand, process description, locality, and help. Sensor navigation uses three text buttons with a cyan underline (2px) and `aria-pressed` for selection. Desktop tab spacing is 16px; mobile spacing is 20px and the current-error label can wrap. Footer exports and evidence links pair text with line icons; footer links brighten to cyan on hover.

### Process and comparison

The signature sequence is machine → gate → transmitted packet or local suppression branch → receiver correction/estimate. The rotor, thermal column, and vibration waveform explain the machine. Exact frames travel toward the receiver; suppressed frames turn onto the amber branch. Packet motion follows actual samples, while rotor speed remains an illustrative load proxy. Four aligned readings connect the drawing to machine temperature, suppression count, transmission count, and the receiver value and source.

The plot pairs cyan solid truth (2px) with violet dashed receiver values (2px, dash pattern 5 4). Exact samples are hollow cyan circles (radius 3.5px); material corrections use larger amber rings (radius 6px). Events use coral dashed vertical markers and readable labels; setting changes use faint amber dashed markers. The calibrated envelope is translucent violet (opacity 0.1) and only appears when available. Grid lines are subdued and horizontal, tooltips use raised navy, and exact values are available in a local scrolling table.

### Outcomes, evidence, and lifecycle

Savings use aligned baseline/actual bars; sample share uses taller cyan received marks and shorter violet estimated marks; error uses one fixed-scale bar per sensor; delivery pairs event counts with a time journey. Unavailable metrics use an em dash and meaningful explanation. The log keeps time, state, and reason together. Loading explains the next action. A stale feed retains last readings and chart data, labels them stale, and disables experiment controls. Benchmark failures use coral text beside a retry action.

Process animation stops when paused, disconnected, reduced motion is requested, motion is disabled, or the page is hidden. Numeric interpolation uses a spring (stiffness 180, damping 30), with direct updates in reduced mode. Chart series update without chart interpolation. Packet travel lasts 1 second with ease-in-out; its authored fade lasts 1.05 seconds. This illustrates flow rather than measured network latency. Control feedback lasts 0.18–0.2 seconds and outcome bars 0.3 seconds. Reduced-motion CSS collapses animation and transition durations to 0.01ms without removing information.

## Do's and Don'ts

### Do:
- **Do** preserve the approved navy instrument palette and stable signal meanings.
- **Do** pair each prominent experiment reading with its relevant trace, bar, sample strip, or event journey.
- **Do** distinguish exact readings, estimates, corrections, and events through labels and geometry.
- **Do** use locally bundled Manrope for language and IBM Plex Mono with tabular numerals for readings.
- **Do** keep focus visible, controls labeled, and static information complete when motion stops.
- **Do** preserve the process-to-controls-to-evidence reading order as the layout stacks.

### Don't:
- **Don't** introduce decorative glass, excessive glow, constant blinking, or neon-green terminal styling.
- **Don't** replace the outcome strip with a wall of identical filled statistic cards.
- **Don't** animate fabricated traffic or let illustrative machine movement imply measured network latency.
- **Don't** communicate live, stale, estimated, or fault state through color alone.
- **Don't** hide missing data or failure behind a successful-looking value or fabricated calibration envelope.

Not canonized: local 8–10px technical suffixes, stage indices, and log badges are component exceptions, not the reusable body or label scale. This documentation pass does not repair source styles. No palette, visual direction, or behavior was changed.
