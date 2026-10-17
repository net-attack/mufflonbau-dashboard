# Saugfried artwork

`saugfried-atlas.png` is the original transparent collage supplied by the owner
as `3.png` for Saugfried, Fürst von Flusenfels. It is used unchanged. The CSS
viewports in `src/design/flusenfels.js` select portraits, heraldry and lettering
without redrawing or regenerating the artwork.

The build embeds the atlas into the HACS JavaScript resource as a data URL, so
the cleaning theme does not need additional HA `/local/` files or remote images.
The optional `cleaning.theme: flusenfels` enables it only on the cleaning view.
