# Motion Guidelines

Worthwhile uses motion to preserve context, explain spatial relationships, and make layout changes feel calm. Motion must never compete with the user's content or make the interface feel slower.

This document is the canonical specification for new frontend animations and animation reviews.

## Core principles

1. **Calm, not inert.** Motion should be noticeable enough to explain what changed, but restrained enough to disappear from attention after repeated use.
2. **Continuity over decoration.** Animate position, size, or state only when it helps the user understand where an element came from or where it went.
3. **Immediate acknowledgement.** A pressed control must react immediately. Longer page or height transitions may continue after that acknowledgement.
4. **One spatial model.** Direction, progress, and container movement must describe the same navigation model.
5. **Stable controls.** Copy changes may crossfade, but interactive controls should not disappear, duplicate, or become temporarily ambiguous.
6. **Content determines height.** Containers adapt to their content; content must not be clipped merely to avoid animating height.

## Shared motion language

Use these easing curves unless a component already has a documented local token:

```js
export const CALM_EASE = [0.16, 1, 0.3, 1];
export const CALM_HEIGHT_EASE = [0.22, 1, 0.36, 1];
```

`CALM_EASE` is the default for opacity, short translation, selection, and page-entry motion. `CALM_HEIGHT_EASE` is reserved for adaptive height and coordinated layout movement.

Recommended duration bands:

| Motion | Duration | Typical use |
| --- | ---: | --- |
| Immediate feedback | 120–180 ms | Fade-out, press, checkmark, small state acknowledgement |
| Selection change | 240–300 ms | Selected/unselected opacity, border, and subtle scale |
| Copy fade-in | 260–320 ms | Localized text or a short label replacement |
| Layout glide | 320–380 ms | Controls moving because nearby copy wrapped or changed height |
| Screen entry | 340–460 ms | Authentication to onboarding, first card appearance |
| Adaptive height | 420–500 ms | A card or form growing and shrinking between content states |

Avoid durations above 500 ms for routine application interactions. A sequence may contain multiple phases, but it should acknowledge the user's action in the first 180 ms.

## Direction and distance

### Sequential pages and steps

- Forward navigation enters from the right and exits toward the left.
- Back navigation enters from the left and exits toward the right.
- Progress indicators must advance in the same direction.
- Keep travel restrained: approximately 10–18 px. The motion should communicate direction without resembling a carousel fling.
- Combine horizontal movement with a soft opacity change. Do not use large translations for standard form steps.

### Local state changes

- Do not imply navigation for a change that remains on the same page.
- Use opacity, a 1–3 px vertical settle, or a very small scale adjustment.
- Selection controls may use a subtle inactive state around `opacity: 0.76` and `scale: 0.985`, returning to full opacity and scale when selected.

### Initial onboarding entry

- Authentication exits slightly to the left before onboarding enters slightly from the right.
- The onboarding surface may combine opacity, 14–18 px horizontal movement, and a scale no lower than `0.994`.
- The transition must also run after returning from external authentication, not only when continuing as a guest.

## Adaptive height and layout

Height changes must begin when the user triggers the transition, not after the destination content has fully appeared.

- Measure the incoming content as soon as it mounts.
- Allow outgoing and incoming step content to overlap only when duplicate controls cannot remain interactive.
- Animate the viewport height with `CALM_HEIGHT_EASE` in roughly 420–500 ms.
- Use coordinated layout animation when copy wrapping changes the position of controls below it.
- Apply position layout animation to the elements that visibly move—not only to an outer container.
- Group related layout elements so they measure the same layout update.

For example, if Indonesian helper copy wraps to an additional line, the language selector, currency field, and Continue button should glide together to their new positions in roughly 360 ms.

Avoid scaling text to fake a height transition. Text should crossfade normally while the controls below it animate their positions.

### Calm collapse primitive

Use [`CalmCollapse`](../src/components/ui/CalmCollapse.jsx) for presence-based card disclosures with content-driven heights. It owns the shared expand/collapse timing, `CALM_HEIGHT_EASE`, reduced-motion behavior, and the inert exit state so callers do not duplicate lifecycle plumbing.

This primitive was introduced by [#105](https://github.com/Churma16/cost-per-day/issues/105), follows the Motion lifecycle convention established by [#103](https://github.com/Churma16/cost-per-day/issues/103), and supports the calm interaction direction in [#33](https://github.com/Churma16/cost-per-day/issues/33).

## Copy and language changes

Language preview is a local state change, not page navigation.

- Animate only copy that changes language.
- Keep cards, inputs, selectors, and primary actions visually stable.
- Fade old copy out in about 140 ms, then fade new copy in over about 280 ms.
- A 1 px vertical settle is acceptable for the incoming copy.
- Coordinate downstream controls with a layout glide when translated copy changes height.
- Never dim the entire page merely because its language changed.
- Never leave two focusable copies of the same control active during a crossfade.
- Reference names generated from suggestions must update to the selected language, while user-edited names remain unchanged.

## Selection feedback

Selection feedback should feel like a quiet confirmation:

- Change background, border, text color, opacity, and scale together.
- Animate a checkmark with a short opacity/scale transition.
- Keep the selected control in the same layout position.
- Use `aria-pressed` or the appropriate native selected state.
- Do not delay the selected state while waiting for surrounding content to animate.

## Progress indicators

- Progress lines fill from left to right.
- The active segment should begin shortly after the surface appears, normally after 100–160 ms.
- Step progress and page movement must feel synchronized.
- Completed segments remain filled; future segments remain quiet.
- The indicator must still communicate the current step without relying on animation.

## Presence and interactive safety

Choose presence behavior based on the content:

- Use overlapping presence for non-interactive visual surfaces when it improves continuity.
- Use sequential presence or a single stable control when overlap would duplicate buttons, inputs, labels, or focus targets.
- Exiting interactive content must be removed from keyboard and assistive-technology interaction.
- Do not use animation as the only indication that saving, validation, or navigation occurred.

## Reduced motion

All new motion must respect the user's reduced-motion preference.

- Keep the application-level `MotionConfig reducedMotion="user"` behavior.
- Use `useReducedMotion()` for custom durations, offsets, and layout effects.
- Reduced motion should remove translation, scale, and animated height where practical.
- State changes, selected styles, progress state, and content must remain fully understandable without animation.
- Do not replace motion with flashing or abrupt high-contrast effects.

## Responsive behavior

- Motion must work before and after responsive wrapping.
- Never rely on a label staying on one line.
- When controls wrap from side-by-side to stacked, preserve reading order and animate only if the change happens during an in-app state transition.
- Avoid fixed heights for translated copy and mobile layouts.
- Test both English and Indonesian at narrow and wide viewport widths.

## Implementation guidance

When using Motion for React:

- Prefer shared constants for easing and repeated durations.
- Use `AnimatePresence` for genuine mount/unmount transitions.
- Use `LayoutGroup` with `layout="position"` for coordinated control movement caused by reflow.
- Use `initial={false}` when a component should animate only after its first rendered state.
- Keep motion wrappers semantically neutral, or use semantic motion elements such as `motion.button` and `motion.fieldset` when appropriate.
- Avoid introducing transformed ancestors around long-lived scroll containers; transforms can affect sticky and fixed positioning.

## Review checklist

Before merging a new animation, verify:

- The animation explains a state, direction, or layout change.
- The pressed control responds within 180 ms.
- Forward and backward directions are consistent.
- Content height begins adapting at the start of the transition.
- Translated copy can wrap without clipping or snapping nearby controls.
- Interactive elements are not duplicated during presence transitions.
- Keyboard focus and semantic state remain correct.
- Reduced-motion mode remains clear and usable.
- English and Indonesian layouts are both tested.
- Repeated use still feels calm rather than theatrical.

## Anti-patterns

Do not introduce:

- Large slides for small state changes.
- Spring bounce on routine form controls or adaptive height.
- Whole-page dimming for a label or language update.
- Delayed visual acknowledgement after a click.
- Fixed-height containers that clip translated content.
- Multiple independent animations that fight for attention.
- Duplicate active controls during crossfades.
- Motion that changes saved data semantics or delays persistence.
