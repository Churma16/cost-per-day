# Worthwhile Color Branding

Status: canonical visual reference  
Applies to: product UI and future visual work  
Last reviewed: 2026-09-26

## Core Principle

Worthwhile menggunakan warna untuk **meaning dan interaction**, bukan untuk memenuhi setiap ruang kosong.

Struktur visual utamanya adalah:

```text
Hero           = colored
Content canvas = quiet
Cards          = clean
Actions        = accent
```

Worthwhile harus terasa **calm, reflective, mature, dan evidence-based**—bukan glossy fintech dashboard.

## Surface Hierarchy

```text
┌────────────────────────────┐
│ muted teal / slate hero    │
│ insight + interpretation   │
├────────────────────────────┤
│ #F6F7F8 page background    │
│                            │
│  ┌──────────────────────┐  │
│  │ #FFFFFF content card │  │
│  └──────────────────────┘  │
│                            │
│  ┌──────────────────────┐  │
│  │ #FFFFFF content card │  │
│  └──────────────────────┘  │
├────────────────────────────┤
│ white / near-white nav     │
└────────────────────────────┘
```

### Hero: reflection and interpretation

Hero adalah colored surface terkuat. Gunakan muted teal atau slate untuk membingkai insight, interpretasi, dan refleksi.

Implementasi hero saat ini sesuai dengan arah tersebut:

```css
background: linear-gradient(
  135deg,
  #334A5B 0%,
  #32636A 55%,
  #2F7473 100%
);
```

Gradient ini khusus untuk hero. Jangan mengulangnya pada card, page background, bottom navigation, atau tombol biasa.

### Main page: calm canvas

Gunakan soft neutral gray, bukan putih murni dan bukan tinted teal.

```css
--page-bg: #F6F7F8;
```

Off-white canvas membuat white card terbaca sebagai object tanpa membutuhkan shadow berat. Jangan gunakan warna seperti `#EEF8F7` untuk seluruh halaman: tinted background membuat semua surface ikut “berbicara” dan mengurangi kekuatan hero sebagai interpretation surface.

### Cards: owned objects and content

Card merepresentasikan owned objects, records, dan kelompok konten. Gunakan putih bersih:

```css
--card-bg: #FFFFFF;
--border: #E6E8EC;
```

Gunakan border tipis dan shadow yang sangat subtle:

```css
background: #FFFFFF;
border: 1px solid #E6E8EC;
box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
```

Tujuannya adalah rasa **personal journal / ownership record**, bukan card dashboard. Hindari floating card dengan shadow besar atau berlapis.

### Bottom navigation: navigation layer

Bottom navigation harus terasa sebagai layer navigasi tersendiri, bukan extension dari hero atau page canvas.

```css
background: rgba(255, 255, 255, 0.96);
border-top: 1px solid #E6E8EC;
```

Putih atau hampir putih adalah default. Blur ringan boleh digunakan jika konten dapat bergerak di belakang navigation layer.

## Canonical Palette

| Role | Value | Meaning |
| --- | --- | --- |
| Hero | `#315E65`-ish | Reflection and interpretation |
| Hero slate | `#334A5B` | Trust and analytical depth |
| Hero teal | `#2F7473` | Longevity and reflective emphasis |
| Page background | `#F6F7F8` | Calm, quiet canvas |
| Card background | `#FFFFFF` | Owned objects and clean content |
| Navigation background | `rgba(255,255,255,0.96)` | Separate navigation layer |
| Border | `#E6E8EC` | Quiet structure and separation |
| Primary text | `#20242A` | Main information |
| Secondary text | `#747B85` | Supporting information |
| Interaction accent | Restrained violet/blue or teal | Action, focus, and selection |
| Active semantic | Muted green | Active or healthy state |
| Destructive | Muted red | Destructive action or error |

`#315E65`-ish describes the visual center of the hero family, not a token that must replace the current gradient.

### Core surface tokens

```css
:root {
  --page-bg: #F6F7F8;
  --card-bg: #FFFFFF;
  --nav-bg: rgba(255, 255, 255, 0.96);
  --border: #E6E8EC;
  --text-primary: #20242A;
  --text-secondary: #747B85;
}
```

## Accent and Semantic Color

Accent color exists to show interaction, not to color large areas.

- Use the existing restrained violet/blue or teal for buttons, links, focus, selection, and active navigation.
- Within one interaction group, choose one dominant accent. Do not make violet, blue, and teal compete for the same hierarchy.
- Use muted green only when “active”, “healthy”, “completed”, or another positive semantic meaning is intended.
- Use muted red only for destructive actions, errors, or irreversible warnings.
- Reinforce semantic color with text, icon, shape, or position; never rely on color alone.

Purple or teal tints may appear in small badges or focus treatments. They should not replace the neutral page canvas.

## Typography Color

Use `#20242A` for headings, amounts, and primary content. Use `#747B85` for supporting information where the type is sufficiently large or prominent.

For small normal-weight text, `#747B85` does not reach WCAG AA on white or the page canvas. Use a darker accessible value such as the currently established `#6F7782`, then verify the rendered contrast.

| Combination | Contrast | Guidance |
| --- | ---: | --- |
| `#20242A` on `#FFFFFF` | 15.59:1 | Primary text; AAA |
| `#20242A` on `#F6F7F8` | 14.53:1 | Primary text; AAA |
| `#747B85` on `#FFFFFF` | 4.27:1 | Large text only |
| `#747B85` on `#F6F7F8` | 3.98:1 | Large text only |
| `#6F7782` on `#FFFFFF` | 4.53:1 | Normal text; AA |

## Do and Don't

### Do

- Keep most of the screen neutral.
- Let the hero be the strongest colored surface.
- Use canvas-versus-card contrast to create hierarchy.
- Prefer a thin border and subtle shadow.
- Reserve accent colors for interaction and meaning.
- Keep bottom navigation white or nearly white.

### Don't

- Use pure white for both the full-screen background and every card.
- Tint the entire content canvas teal or another brand color.
- Depend on heavy shadows to separate cards.
- Reuse the hero gradient on ordinary UI elements.
- Add color to empty space only to make the screen look more “designed”.
- Use bright green or red decoratively.
- Create a glossy fintech, crypto-dashboard, or gamified-reward aesthetic.

## Component Reference

| Component | Background | Structure | Color emphasis |
| --- | --- | --- | --- |
| Home hero | Muted teal/slate gradient | Minimal divider | White insight text |
| Page | `#F6F7F8` | None | Quiet neutral canvas |
| Item/content card | `#FFFFFF` | `#E6E8EC` border + subtle shadow | Content first |
| Bottom navigation | Near-white | Top border, optional blur | Accent only for active item |
| Primary action | Neutral or restrained accent | Clear focus state | One dominant accent |
| Secondary action | White or soft neutral | Quiet border | Neutral text or restrained accent |
| Active state | Contextual neutral surface | Optional muted border | Muted green when semantically active |
| Destructive action | Neutral surface or muted red | Clear confirmation | Muted red only where needed |

## Review Checklist

Before approving a visual change, confirm that:

- Hero remains the strongest interpretation surface.
- Main content background is `#F6F7F8`, not pure white or tinted teal.
- Cards remain white and readable as objects.
- Card separation does not depend on a heavy shadow.
- Bottom navigation reads as a separate white or near-white layer.
- Accent color appears only for meaning, interaction, focus, or selection.
- Semantic green and red are muted and purposeful.
- Small secondary text passes contrast requirements.
- The overall screen feels calm, reflective, mature, and evidence-based.

