# Repository instructions

Read and follow [`GEMINI.md`](./GEMINI.md) before working in this repository.

## Frontend motion

Before implementing or reviewing frontend animation, read and follow
[`docs/motion-guidelines.md`](./docs/motion-guidelines.md).

- Use Motion for presence, adaptive height, coordinated layout, and other structural state changes.
- Keep simple hover, focus, color, border, background, and shadow transitions in CSS or Tailwind.
- Reuse `CalmCollapse` for presence-based disclosures with content-driven height instead of defining one-off collapse timing.
- Preserve reduced-motion behavior and make exiting interactive content inert immediately.
- When changing a shared motion primitive, update its documentation and targeted regression tests in the same change.
