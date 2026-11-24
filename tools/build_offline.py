#!/usr/bin/env python3
"""Build dist/marginalia.html: one self-contained file that opens by double-click with no network.

Inlines css/styles.css (fonts become base64 data URIs), js/content.js and js/app.js,
inlines the icon, and drops the manifest link and the service worker registration.
Python 3 standard library only.
"""
import base64
import pathlib
import re
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent


def read(rel):
    return (ROOT / rel).read_text(encoding="utf-8")


def inline_fonts(css):
    def repl(m):
        path = (ROOT / "css" / m.group(1)).resolve()
        data = base64.b64encode(path.read_bytes()).decode("ascii")
        return 'url("data:font/woff2;base64,%s")' % data

    out, n = re.subn(r'url\("(\.\./fonts/[^"]+\.woff2)"\)', repl, css)
    if n == 0:
        sys.exit("no font urls found in css/styles.css")
    return out


def safe_script(js, name):
    # an inline script ends at the first "</script", so it must never appear inside one
    if re.search(r"</script", js, re.I):
        sys.exit("%s contains </script and cannot be inlined" % name)
    return js


def swap(html, pattern, replacement, label):
    out, n = re.subn(pattern, lambda _m: replacement, html, count=1)
    if n != 1:
        sys.exit("could not find %s in index.html" % label)
    return out


def main():
    html = read("index.html")
    css = inline_fonts(read("css/styles.css"))
    icon = base64.b64encode((ROOT / "icons/icon.svg").read_bytes()).decode("ascii")

    html = swap(html, r'<link rel="stylesheet" href="css/styles.css">', "<style>\n" + css + "\n</style>", "stylesheet link")
    html = swap(html, r'<script src="js/content.js"></script>', "<script>\n" + safe_script(read("js/content.js"), "content.js") + "\n</script>", "content.js")
    html = swap(html, r'<script src="js/app.js"></script>', "<script>\n" + safe_script(read("js/app.js"), "app.js") + "\n</script>", "app.js")
    html = swap(html, r'\s*<link rel="manifest" href="manifest.webmanifest">', "", "manifest link")
    html = swap(html, r'(?s)\s*<script id="sw-register">.*?</script>', "", "service worker registration")
    html = swap(html, r'href="icons/icon.svg"', 'href="data:image/svg+xml;base64,%s"' % icon, "icon link")

    leftovers = re.findall(r'(?:src|href)="(?!data:|#)[^"]+"', html)
    if leftovers:
        sys.exit("external references left in the offline edition: %s" % leftovers)

    out = ROOT / "dist" / "marginalia.html"
    out.parent.mkdir(exist_ok=True)
    out.write_text(html, encoding="utf-8")
    print("wrote %s (%d bytes)" % (out.relative_to(ROOT), out.stat().st_size))


if __name__ == "__main__":
    main()
