# Trungtrung — Illustration pipeline

*Every collectible/cultural-card illustration (and district map icons,
grouped-card artwork) is **AI-generated** from the master prompt template
below. The board's empty illustration slots are placeholders until the
asset pass runs. This doc is the single source for how those images are
made, so **110 cards (133 artifact records; 58 illustrated)** read as
one hand. Recounted 2026-08-16 — recount from `content/collections.json`
rather than quoting this line.*

## The master template

Derived from Thosam's proven prompt (the butter lamp — kept verbatim as the
worked example below). To generate any card, fill the three slots and keep
the style block untouched:

```
Create a single collectible icon for a Tibetan language-learning mobile app.

The subject is {SUBJECT — one sentence naming the object and its defining
visual features, e.g. "a traditional Tibetan butter lamp with a warm golden
flame burning steadily inside an ornate golden bowl"}.

Style:

* flat vector illustration
* cute and friendly
* rounded, approachable shapes
* clean bold outlines
* minimal shading
* soft, harmonious colors
* simple geometric forms
* suitable for an educational app similar to Duolingo
* centered composition
* isolated object
* transparent background

{OBJECT NOTES — 1–2 sentences of object-specific guidance, e.g. "The
butter lamp should appear warm, peaceful, and inviting. The flame should
emit a subtle soft glow while remaining simple and clean."}

The overall feeling should be {FEELING — e.g. "serene and respectful of
Tibetan Buddhist traditions"}.
No text, no people, no background scenery, no photorealism.
```

## The worked example (verbatim original — the quality bar)

> Create a single collectible icon for a Tibetan language-learning mobile
> app. The subject is a traditional Tibetan butter lamp with a warm golden
> flame burning steadily inside an ornate golden bowl. Style: flat vector
> illustration · cute and friendly · rounded, approachable shapes · clean
> bold outlines · minimal shading · soft, harmonious colors · simple
> geometric forms · suitable for an educational app similar to Duolingo ·
> centered composition · isolated object · transparent background. The
> butter lamp should appear warm, peaceful, and inviting. The flame should
> emit a subtle soft glow while remaining simple and clean. The overall
> feeling should be serene and respectful of Tibetan Buddhist traditions.
> No text, no people, no background scenery, no photorealism.

## Trungtrung-specific rules (on top of the template)

- **Palette harmony.** Colors must sit comfortably on ground `#EDF2F3` and
  alongside the one teal — soft, low-saturation families; never neon,
  never a competing saturated hue that fights the brand teal.
- **One hand.** Same outline weight class and corner-rounding across the
  whole set; matches the mascot's construction rules (flat, bold outlines,
  no gradients or drop shadows — the butter-lamp glow is the sanctioned
  exception, used only where a light source is the object's point).
- **Silhouette test.** Every icon must read as a flat ink silhouette at
  12% opacity — that IS the not-yet-found state (CollectibleCard). If the
  silhouette is mush, simplify the shape.
- **Thumbnail test.** Must read at 64 px (G1's five-thumbnail rows).
- **"No people" has exceptions to handle with care:** monk, nun, lama,
  farmer, nomad ARE cards. For these, depict the *attribute*, not a
  portrait where possible (robe + bowl, herder's sling + tent) — or a
  friendly simplified figure consistent with the mascot's 2.5-head
  proportions. Flag each with [REVIEW].
- **Religious subjects — respect rule.** Medicine Buddha, thangka, deities,
  scripture: descriptive, dignified, never cute-ified into toys, never
  decorative mysticism. These specific cards get a human cultural check
  before shipping; mark them [REVIEW-cultural] in the asset sheet.
- **Grouped cards** (zodiac, day-names, siblings, prayer-flag colours,
  humours) are compositions of small icons in one frame — generate the
  members individually with matched prompts, compose in layout, so the
  grid stays legible.

## Output & files

- Source: 1024×1024 (or larger), transparent background, 1:1.
- Filename = record id: `img/vocab/<slug>.svg` — the dataset and spec §6.3
  already carry `.svg` illustration paths, so SVG is the format. Ruling PNG
  instead would be a spec change: through `build_v3.py` plus a 07-decisions
  entry, never an edit here alone.
- An asset sheet (spreadsheet) tracks: slug · district · collection ·
  prompt used · status (generated / silhouette-checked / cultural-checked
  / final).

## QA checklist per icon

reads at 64 px · silhouette works at 12% ink · transparent background
verified · palette sits on ground without vibrating · no text/background
sneaked in · outline weight matches the set · [REVIEW] flags resolved.
