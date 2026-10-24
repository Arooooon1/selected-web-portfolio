# LIGHT LAB — rebuilt product meshes, 24 October 2026

The visual references are the existing transparent catalog renders: STRIKE 75, PULSE PRO and ECHO X. No catalog image was changed.

## Geometry

- STRIKE 75: the original interactive 81-key layout is retained. Keycaps now have tapered sides, rolled edges and concave tops, instead of rounded boxes. The dial has machined ridges; the chassis includes a screen, USB-C opening, rubber feet, screws and an underside label.
- PULSE PRO: the shell uses a continuous curved profile, separate primary buttons and a real scroll-wheel cutout. The wheel has a knurled orange surface. Side grips, side buttons, glide pads and a sensor window distinguish its surfaces and underside.
- ECHO X: a wide headband replaces the tubular frame. Separate leather padding, metal rails, connected forks, hinge hardware, cable details, rounded cushions, driver fabric and a slimmer microphone give the object a more recognisable construction.

## Materials and lighting

The mouse and headset are rebuilt as curved surfaces and layered swept shells, rather than stacks of primitive blocks. Click panels follow a curved split, the nose is closed and rounded, and the side button is seated into the casing. The headset has swept metal forks, angled cups, recessed driver fabric, soft pads and a fully visible microphone. Keycaps use evenly sampled corner arcs and a higher-resolution legend atlas.

Studio Small 08, a photographic studio HDRI from Poly Haven, supplies the environment reflections. Leather Red 02 normal and roughness scans supply the cushion grain. These CC0 source assets are retained in assets/studio/ with credits. build-studio.mjs packages the original bytes into a lazily loaded local script, including data URLs for texture uploads, so direct file:// viewing works without network access. Plastic, brushed metal, rubber and driver fabric retain separate procedural microtextures.

The HDR scene is tone-mapped once in the final composite, before display colour conversion. The desktop canvas renders at a minimum 1.8× CSS resolution; touch devices use 1.65×, with hardware multisampling where available. Night mode uses reduced illumination and restrained bloom. Studio mode preserves the material detail.

The keyboard still uses instanced meshes, including per-key light and press animation. Existing orbit, zoom, five light modes, custom colour, intensity, speed, reaction, sound and SYNC controls remain available. Reduced-motion behaviour is retained.

## Scope

These are original real-time interpretations of the catalog devices. They are not exact reconstructions, factory CAD files or photographic assets. The supplied renders do not include matching production meshes, material scans or unseen views.

The functional checks and current HTML hash are recorded in the adjacent verification.json. visual-verification.json records offline material loading, supersampling, rendered rotation changes, mobile containment and shader errors. screenshots/quality-* are direct browser captures of the real viewer, including front, side and rear views; they are not substituted catalog images. The latest actual viewer recording is light-lab-preview.mp4.
