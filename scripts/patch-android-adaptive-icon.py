#!/usr/bin/env python3
"""
patch-android-adaptive-icon.py — make the generated Android project use the new
artwork as a real ADAPTIVE icon, and prove nothing quietly replaced it.

── WHY THIS IS A SEPARATE STEP ───────────────────────────────────────────────
The Android project does not exist in the repository: it is generated during the
build by `npx cap add android`, from Capacitor's template. That template ships
its OWN launcher icon and its OWN adaptive-icon definition, so copying the new
`mipmap-*` files over it is only half the job:

  • the template's `mipmap-anydpi-v26/ic_launcher.xml` points its background at
    `@color/ic_launcher_background`, which the template colours WHITE — the
    mascot would sit on a white disc on every Android 8+ launcher;
  • the foreground must be drawn on the 108dp adaptive canvas, so the artwork
    stays inside the inner 72dp safe zone and no launcher mask can crop it.

Both are written here, after the icon copy and before the build, so the result is
the same on every run and does not depend on what the template happens to ship.

── THE GUARD THAT MATTERS ────────────────────────────────────────────────────
Every copied icon is compared byte-for-byte with `android-config/icons`. If a
later step (a re-sync, a plugin, anything that regenerates resources) put the
template's icon back, this fails the build instead of shipping the old logo.
"""

import hashlib
import os
import struct
import sys

SRC = "android-config/icons"
RES = "android/app/src/main/res"
NAVY = "#0A1220"  # the mascot's own background
DENSITIES = ["mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"]
LEGACY_PX = {"mdpi": 48, "hdpi": 72, "xhdpi": 96, "xxhdpi": 144, "xxxhdpi": 192}
FILES = ["ic_launcher.png", "ic_launcher_round.png", "ic_launcher_foreground.png"]

ADAPTIVE_XML = """<?xml version="1.0" encoding="utf-8"?>
<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
    <background android:drawable="@color/ic_launcher_background" />
    <foreground android:drawable="@mipmap/ic_launcher_foreground" />
</adaptive-icon>
"""

BACKGROUND_XML = """<?xml version="1.0" encoding="utf-8"?>
<resources>
    <!-- The mascot's own navy: the adaptive icon's background layer. -->
    <color name="ic_launcher_background">%s</color>
</resources>
""" % NAVY


def sha256(path):
    with open(path, "rb") as handle:
        return hashlib.sha256(handle.read()).hexdigest()


def png_header(path):
    """(width, height, colour_type) straight from IHDR — no image library."""
    with open(path, "rb") as handle:
        data = handle.read(33)
    width, height = struct.unpack(">II", data[16:24])
    return width, height, data[25]


def main():
    errors = []

    # ── 1. The copy landed, byte for byte ────────────────────────────────────
    for density in DENSITIES:
        for name in FILES:
            source = os.path.join(SRC, "mipmap-%s" % density, name)
            target = os.path.join(RES, "mipmap-%s" % density, name)
            if not os.path.exists(source):
                errors.append("missing source icon %s" % source)
            elif not os.path.exists(target):
                errors.append("missing %s — the icon copy step did not run" % target)
            elif sha256(source) != sha256(target):
                errors.append("%s does not match %s (a later step replaced the new icon)" % (target, source))

    # ── 2. The adaptive foreground is a 108dp canvas with transparency ───────
    for density in DENSITIES:
        path = os.path.join(RES, "mipmap-%s" % density, "ic_launcher_foreground.png")
        if not os.path.exists(path):
            continue
        width, height, colour = png_header(path)
        # 108dp adaptive canvas = 2.25 × the 48dp legacy icon
        expected = int(round(LEGACY_PX[density] * 2.25))
        if width != expected or height != expected:
            errors.append("%s is %dx%d, expected %dx%d (108dp adaptive canvas)"
                          % (path, width, height, expected, expected))
        if colour != 6:
            errors.append("%s has no alpha channel — the launcher mask would crop it" % path)

    # ── 3. Adaptive definition + background colour ───────────────────────────
    values_dir = os.path.join(RES, "values")
    os.makedirs(values_dir, exist_ok=True)
    background = os.path.join(values_dir, "ic_launcher_background.xml")
    with open(background, "w", encoding="utf-8") as handle:
        handle.write(BACKGROUND_XML)

    anydpi = os.path.join(RES, "mipmap-anydpi-v26")
    os.makedirs(anydpi, exist_ok=True)
    for name in ("ic_launcher.xml", "ic_launcher_round.xml"):
        with open(os.path.join(anydpi, name), "w", encoding="utf-8") as handle:
            handle.write(ADAPTIVE_XML)

    if errors:
        print("\nANDROID ICON CHECK FAILED (%d):" % len(errors))
        for problem in errors:
            print("  ✗ %s" % problem)
        sys.exit(1)

    print("Android adaptive icon wired: navy background %s, %d densities verified"
          % (NAVY, len(DENSITIES)))


if __name__ == "__main__":
    main()