# Saugfried artwork

`saugfried-atlas.png` is the original transparent collage supplied by the owner
as `3.png` for Saugfried, Fürst von Flusenfels. It is used unchanged. The CSS
viewports in `src/design/flusenfels.js` select portraits, heraldry and lettering
without redrawing or regenerating the portraits and heraldry.

`saugfried-wordmark.png` replaces only the name ribbon, correcting the original
`SAugfried` to `Saugfried`. Generated with the imagegen skill in edit mode on
2026-10-17, using the supplied `3.png` as reference and a transparent background.
Saved project asset: `src/assets/saugfried-wordmark.png`.

Prompt: Extract only the cream/gold medieval name ribbon; preserve its green/gold
palette, fleur-de-lis, crown, shaded cartoon illustration and serif lettering.
Correct the name to exactly “Saugfried” (capital S, lowercase a and remaining
letters). Return a tightly framed standalone transparent logo with padding,
without other atlas characters, subtitles or new words.

The build embeds the atlas into the HACS JavaScript resource as a data URL, so
the cleaning theme does not need additional HA `/local/` files or remote images.
The optional `cleaning.theme: flusenfels` enables it only on the cleaning view.
