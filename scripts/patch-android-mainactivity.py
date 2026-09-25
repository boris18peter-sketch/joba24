#!/usr/bin/env python3
"""Idempotently register native Capacitor plugins in the generated MainActivity.

WHY THIS EXISTS
---------------
`npx cap add android` (Capacitor 8.x) generates an EMPTY activity:

    package <pkg>;

    import com.getcapacitor.BridgeActivity;

    public class MainActivity extends BridgeActivity {}

It contains no onCreate override. The previous build steps string-replaced
"super.onCreate(savedInstanceState);" inside that file, which matched nothing --
that line simply does not exist in the generated template. Python's
str.replace() returns the input unchanged when it finds no match, so those steps
logged success while registering zero plugins, and the problem only surfaced
later in the verification step.

ORDERING (required by Capacitor, not a style choice)
----------------------------------------------------
BridgeActivity.registerPlugin(Class) only adds the class to the Bridge.Builder.
BridgeActivity.onCreate() consumes that builder when it calls load() ->
bridgeBuilder.create(). Registration must therefore happen BEFORE
super.onCreate().

IDEMPOTENCY
-----------
The block this script writes is delimited by markers. On every run the previous
block is parsed, merged with the newly requested statements, and rewritten, so
repeated builds never duplicate imports, registrations or methods.

USAGE
-----
  patch-android-mainactivity.py <MainActivity.java> \
      [--before "registerPlugin(X.class);"]... [--after "stmt;"]...
"""

import pathlib
import re
import sys

BEGIN = "// >>> joba24-native-plugins (generated - do not edit by hand)"
END = "// <<< joba24-native-plugins"


def fail(msg):
    sys.exit("ERROR: " + msg)


def uniq(items):
    out = []
    for item in items:
        item = item.strip()
        if item and item not in out:
            out.append(item)
    return out


def main():
    argv = sys.argv[1:]
    if not argv:
        fail("usage: patch-android-mainactivity.py <file> [--before stmt]... [--after stmt]...")

    path = pathlib.Path(argv[0])
    if not path.is_file():
        fail("%s does not exist (did 'npx cap add android' run?)" % path)

    requested_before, requested_after, mode = [], [], None
    for arg in argv[1:]:
        if arg == "--before":
            mode = requested_before
            continue
        if arg == "--after":
            mode = requested_after
            continue
        if mode is None:
            fail("statement %r must follow --before or --after" % arg)
        mode.append(arg)

    src = path.read_text()

    # Detect the REAL generated structure instead of assuming a template.
    if not re.search(r"^\s*package\s+[\w.]+\s*;", src, re.M):
        fail("no package declaration found in %s" % path)
    if not re.search(r"class\s+MainActivity\s+extends\s+[\w.]+", src):
        fail("no 'class MainActivity extends ...' declaration found in %s" % path)

    # Recover what a previous run registered, then drop that block so this run
    # rewrites it cleanly. This is what makes repeated builds idempotent.
    previous_before, previous_after = [], []
    block = re.search(re.escape(BEGIN) + r"(.*?)" + re.escape(END), src, flags=re.S)
    if block:
        inner = block.group(1)
        # Split on the FULL super.onCreate(...) call, never the bare substring,
        # otherwise the tail of that call ("(savedInstanceState);") is mistaken
        # for one of our own statements and gets re-emitted.
        call = re.search(r"super\.onCreate\s*\([^)]*\)\s*;", inner)
        if call:
            previous_before = re.findall(r"^\s*([^\n]+?;)\s*$", inner[: call.start()], re.M)
            previous_after = re.findall(r"^\s*([^\n]+?;)\s*$", inner[call.end():], re.M)
        # Consume the block AND the blank lines that introduced it, so a re-run
        # produces a byte-identical file instead of accumulating empty lines.
        src = re.sub(
            r"\n[ \t]*(?:\n[ \t]*)*" + re.escape(BEGIN) + r".*?" + re.escape(END) + r"[^\n]*",
            "",
            src,
            flags=re.S,
        )

    before = uniq(previous_before + requested_before)
    after = uniq(previous_after + requested_after)

    if re.search(r"\bvoid\s+onCreate\s*\(\s*(?:final\s+)?Bundle\b", src):
        # A genuine onCreate already exists - merge into it rather than adding a
        # second override (which would not compile).
        anchor = re.search(r"\n([ \t]*)super\.onCreate\s*\([^)]*\)\s*;", src)
        if not anchor:
            fail("MainActivity declares onCreate but has no super.onCreate(...) to anchor to")
        indent = anchor.group(1)
        missing_before = [s for s in before if s not in src]
        missing_after = [s for s in after if s not in src]
        src = (
            src[: anchor.start()]
            + "".join("\n%s%s" % (indent, s) for s in missing_before)
            + src[anchor.start(): anchor.end()]
            + "".join("\n%s%s" % (indent, s) for s in missing_after)
            + src[anchor.end():]
        )
    else:
        if not re.search(r"^import\s+android\.os\.Bundle\s*;", src, re.M):
            src = re.sub(
                r"(^\s*package\s+[\w.]+\s*;)",
                r"\1\n\nimport android.os.Bundle;",
                src,
                count=1,
                flags=re.M,
            )
        close = src.rstrip().rfind("}")
        if close == -1:
            fail("could not find the closing brace of MainActivity")
        body = [
            "    " + BEGIN,
            "    @Override",
            "    protected void onCreate(Bundle savedInstanceState) {",
        ]
        body += ["        " + s for s in before]
        body.append("        super.onCreate(savedInstanceState);")
        body += ["        " + s for s in after]
        body += ["    }", "    " + END]
        # Anchor on the class's closing brace and normalise the whitespace before
        # it, so re-runs regenerate the identical file.
        src = src[:close].rstrip() + "\n\n" + "\n".join(body) + "\n" + src[close:]

    path.write_text(src)

    # Guard: never let a silent no-op through again.
    written = path.read_text()
    for stmt in before + after:
        if stmt not in written:
            fail("post-write check failed: %r missing from %s" % (stmt, path))
    if "super.onCreate(" not in written:
        fail("post-write check failed: no super.onCreate() in %s" % path)

    print("[mainactivity] %s updated" % path)
    print("[mainactivity] before super.onCreate: %s" % (", ".join(before) or "none"))
    print("[mainactivity] after super.onCreate: %s" % (", ".join(after) or "none"))


main()