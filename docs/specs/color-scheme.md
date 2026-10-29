# Color scheme

Source: [Color Hunt palette](https://colorhunt.co/palette/ebe2ccded6c1cfc6b1b7b09e)

A muted, warm neutral (sand/stone) palette, ordered from lightest to darkest.

| Name       | Hex       | RGB           | Suggested use                 |
| ---------- | --------- | ------------- | ----------------------------- |
| Sand light | `#EBE2CC` | 235, 226, 204 | Page background               |
| Sand       | `#DED6C1` | 222, 214, 193 | Surfaces, cards               |
| Stone      | `#CFC6B1` | 207, 198, 177 | Borders, dividers, hover      |
| Stone dark | `#B7B09E` | 183, 176, 158 | Disabled states, muted accent |
| Ink        | `#3B3629` | 59, 54, 41    | Text, primary buttons (added, not from the palette) |

## CSS custom properties

```css
:root {
  --color-sand-light: #ebe2cc;
  --color-sand: #ded6c1;
  --color-stone: #cfc6b1;
  --color-stone-dark: #b7b09e;
  --color-ink: #3b3629;
}
```

## Notes

- The four colors are close in lightness, so they work well as layered backgrounds but not as text on each other.
- The palette has no dark color, so Ink (`#3B3629`) was added for text and primary actions.
- Check text/background contrast against WCAG AA (4.5:1 for body text) before finalizing.
