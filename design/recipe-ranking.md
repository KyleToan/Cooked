# Recipe ranking (Beli-style)

Rank the recipes you've cooked by feel and head-to-head picks, and Cooked works out a score out of 10.
Modelled on Beli's rate flow (How was it? → Which do you prefer? → your score), drawn in Cooked's
own materials: white ground, paper colours for picked choices, sage for the one action.

**Design read:** a native iOS task sheet (Operate mode) for people who cook at home. One job per
step, everything quiet except the one thing being decided. The signature is the fridge door: the
three feelings are round paper magnets, and the score lands as a sticky note.

## Entry points (make Rate obvious)

- **Recipe screen**, right under the title and meta line:
  - Not ranked: a grey pill **Rate it** (full width of its row, 44pt, `check` icon in sage-ink).
  - Ranked: a **score ring** (44pt circle, 1.5pt `sage-ink` ring, score in `link` weight) with
    "#2 of 5 you’ve ranked" and a **Rate again** link on the right.
- **Recipe rows** on Recipes: ranked rows show the same score ring (36pt) on the right of the
  title line, the way Beli lists show scores. Unranked rows show nothing.
- **Ranked** filter pill on Recipes lists ranked recipes best first.

## The sheet

One sheet, built up in place as you answer (Beli keeps the answered step visible above the next):

```
┌──────────────────────────────────────┐
│              ───                     │  grabber
│ Shakshuka                       (×)  │  title-lg + close
│ 25 min · somekitchenblog.com         │  caption ink-muted
│                                      │
│ How was it?                          │  section-title
│   ( ✓ )      (   )      (   )        │  76pt paper magnets
│  Loved it   It was fine  Not for me  │  button type, ink / ink-muted
│                                      │
│ Which do you prefer?                 │  section-title, appears after a pick
│ ┌──────────────┐ or ┌──────────────┐ │  two choice cards, 160pt tall
│ │  [photo/AB]  │    │  [photo/CC]  │ │  56pt photo or handwritten initials
│ │  Shakshuka   │    │ Chickpea     │ │  body semibold, centred, 3 lines max
│ │  25 min      │    │ curry · 8.9  │ │  caption; rival's score in sage-ink
│ └──────────────┘    └──────────────┘ │
│  Undo      [ Can’t decide ]    Skip  │  links + one grey pill
└──────────────────────────────────────┘
```

then the result replaces the two steps:

```
│        ┌────────────────────┐        │
│        │  ▭ tape            │        │  cornsilk sticky note, -1.5° tilt
│        │  Shakshuka   (8.3) │        │  note-title + score ring
│        │  #2 of 5 ranked    │        │  note-body
│        └────────────────────┘        │
│ [            Done              ]     │  sage primary (the one sage button)
│              Share                   │  sage-ink link → system share sheet
```

### Tokens

| Element | Token |
| --- | --- |
| Loved magnet | `sage` fill (#CCD5AE) |
| Fine magnet | `cornsilk` fill (#FEFAE0) |
| Not for me magnet | `papaya` fill (#FAEDCD) |
| Magnet edge | 1pt `line` so cornsilk reads on white; `shadow.note` for the paper lift |
| Picked check | `check` icon, `note-ink`, 30pt |
| Unpicked after a pick | 0.45 opacity, label `ink-muted` |
| Choice card | `radius-field`, 1pt `line` at rest; pressed/picked `beige` + 1.5pt `sage-ink` (onboarding's choice card) |
| OR badge | 32pt white circle, 1pt `line`, "or" in `caption` semibold `ink-muted` |
| Score ring | 1.5pt `sage-ink` ring, number in `sage-ink` semibold |

No green/yellow/red: red is only for errors, and the paper colours already mean "a picked choice".
"Didn't like it" becomes **Not for me**, plainer and kinder about someone's cooking.

### Behaviour

- **Pick a feeling** → the check pops in (spring, damping 1, 0.3s), the other two fade to 0.45,
  a selection haptic. Picking another feeling restarts the comparisons.
- **Which do you prefer?** binary-searches the recipes with that feeling (about log₂ n picks).
  Tapping a card: impact haptic, the card goes beige, then the rival side cross-slides to the
  next rival (x 16pt + opacity, damping 1, 0.3s); the new recipe's card stays put.
- **Can’t decide** places it right there. **Skip** drops this rival from the search and asks about
  another (for a recipe you don't remember well). **Undo** goes back one pick, or back to no
  feeling at the first pick.
- The first recipe with a feeling skips the comparisons.
- **Result:** the note settles in (scale 0.96 → 1, opacity, damping 1) with a success haptic.
  No counting-up number.
- Reduce Motion: every move becomes a 200ms cross-fade.
- Closing the sheet before the result saves nothing.

## Score

Bands: Loved 6.7–10, Fine 3.4–6.6, Not for me 0–3.3. Within a band of n recipes, best first, the
recipe at index i scores `lo + (hi − lo) × (n − i) / n`, one decimal. Scores move as more
recipes are ranked (as on Beli).

## Data

`State.ranks: { loved: string[]; fine: string[]; disliked: string[] }`, recipe ids best first. Kept on the phone with the
rest of the saved state. Ids of recipes that are gone are ignored. Personal, not synced.

## Left out

Tagging friends, notes and photos (Beli's step 2), and showing other people's scores.
