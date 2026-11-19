"""Rebuild the embedded UI font subsets in assets/fonts.

Usage:
    python scripts/subset-fonts.py <dir-with-source-ttf>

The source directory must contain the unmodified Google Fonts OFL files:
    NotoSerifSC.ttf              (ofl/notoserifsc/NotoSerifSC[wght].ttf)
    CormorantGaramond.ttf        (ofl/cormorantgaramond/CormorantGaramond[wght].ttf)
    CormorantSC-SemiBold.ttf     (ofl/cormorantsc/CormorantSC-SemiBold.ttf)

Requires fonttools and brotli. The character set is collected from the UI
source, prompts and the preview scene, so rerun this after changing UI text.
Weight 900 also carries GB2312 level-1 hanzi because page titles show names
generated during play; glyphs outside a subset fall back to system fonts.
"""
import glob
import os
import sys

from fontTools import subset
from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'assets', 'fonts')
SKIP = ('.generated.mjs',)


def ui_text():
    paths = sorted(glob.glob(os.path.join(ROOT, 'src', '*.mjs')))
    paths += sorted(glob.glob(os.path.join(ROOT, 'prompts', '*.md')))
    paths.append(os.path.join(ROOT, 'scripts', 'preview.mjs'))
    chars = set()
    for path in paths:
        if path.endswith(SKIP):
            continue
        with open(path, encoding='utf-8') as f:
            chars.update(ch for ch in f.read() if ord(ch) > 0x7f)
    return chars


def gb2312_level1():
    chars = set()
    for hi in range(0xB0, 0xD8):
        for lo in range(0xA1, 0xFF):
            try:
                chars.add(bytes([hi, lo]).decode('gb2312'))
            except UnicodeDecodeError:
                pass
    return chars


ASCII = {chr(c) for c in range(0x20, 0x7f)}
PUNCT = set('·–—‘’“”…×、。，：；！？（）《》「」『』【】〈〉～￥％＋－＝／')


def build(src, weight, chars, out):
    font = TTFont(src)
    if 'fvar' in font:
        font = instancer.instantiateVariableFont(font, {'wght': weight})
    opts = subset.Options()
    opts.flavor = 'woff2'
    opts.layout_features = ['*']
    opts.name_IDs = ['*']
    opts.notdef_outline = True
    opts.hinting = False
    opts.desubroutinize = True
    sub = subset.Subsetter(opts)
    sub.populate(text=''.join(sorted(chars)))
    sub.subset(font)
    font.flavor = 'woff2'
    target = os.path.join(OUT, out)
    font.save(target)
    print(f'{out}: {len(chars)} chars, {os.path.getsize(target)} bytes')


def main():
    if len(sys.argv) != 2:
        sys.exit(__doc__)
    src = sys.argv[1]
    os.makedirs(OUT, exist_ok=True)
    ui = ui_text() | ASCII | PUNCT
    latin = ASCII | set('·–—‘’“”…×')
    build(os.path.join(src, 'NotoSerifSC.ttf'), 900, ui | gb2312_level1(), 'dl4-serif-900.woff2')
    build(os.path.join(src, 'NotoSerifSC.ttf'), 600, ui, 'dl4-serif-600.woff2')
    build(os.path.join(src, 'CormorantGaramond.ttf'), 600, latin, 'dl4-latin-600.woff2')
    build(os.path.join(src, 'CormorantSC-SemiBold.ttf'), 600, latin, 'dl4-latin-sc-600.woff2')


if __name__ == '__main__':
    main()
