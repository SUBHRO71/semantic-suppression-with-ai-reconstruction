# Signal Loom visual system

The user approved the direction in PRD.md. This instrument-like dashboard uses a dominant process stage, a comparison plot, an experiment rail, and a compact outcome/evidence area. The visual purpose is understanding a live experiment, not marketing.

## Tokens

| Token | Value |
|---|---|
| canvas | #0B1220 |
| surface | #121E30 |
| raised | #1A2940 |
| text | #EAF0F8 |
| muted | #A8B8CE |
| cyan: measured/sent | #56D9F5 |
| violet: estimated | #B39DFF |
| amber: suppressed | #F2B86B |
| coral: fault | #FF7B88 |
| body | Manrope, locally bundled |
| numeric | IBM Plex Mono, locally bundled |
| radius | 14px surfaces; 8px controls |
| spacing | 4, 8, 12, 16, 24, 32, 48px |

One authored sequence illustrates each actual frame: machine → gate → sent packet or suppression branch → receiver correction/estimate. No fake traffic. Charts use solid truth, dashed estimates, and circles for received samples. The machine drawing is geometric SVG, with a rotor, thermal column, and vibration waveform. Its load-driven motion is explicitly illustrative.

Numbers use tabular glyphs and short interpolation. Pause and reduced-motion stop process animation while preserving information. Desktop has a wide stage and a controls rail; mobile stacks the same story vertically. Avoid decorative glass, constant blinking, neon-green terminal styling, and identical metric cards.

This is the implementation contract derived from the approved PRD, with visual validation required before delivery.
