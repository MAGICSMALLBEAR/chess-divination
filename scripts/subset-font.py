# -*- coding: utf-8 -*-
# 產生原生端 Noto Serif TC 子集字型（籤詩用字）
#
# 用法：
#   pip install fonttools
#   npm i -D @expo-google-fonts/noto-serif-tc
#   python scripts/subset-font.py
#
# 輸出：
#   assets/fonts/NotoSerifTC-400.ttf           子集字型（家族名改為 NotoSerifTC）
#   assets/fonts/NotoSerifTC-subset-chars.txt  收錄字元的清單（守門測試據此檢查）
#
# 收錄規則：src/**/*.ts(x) 出現過的全部非 ASCII 字元（含註解——過度收錄
# 是故意的，漏字比多幾個字形嚴重）＋ ASCII 可列印字元＋常用標點。
#
# 以 Noto Serif TC 為主：日文譯文用到的「新字體」漢字（価、単、厳……）
# 不在 TC 的 cmap 裡，故再以 Noto Serif JP 子集補上那幾個字元，合併成
# 一個字型檔。連 JP 都沒有的（emoji、幾何符號等）不進子集，由 RN 走
# 系統後備，並寫進 NotoSerifTC-excluded-chars.txt 供守門測試查核——
# 若排除的是漢字、假名或全形標點，腳本直接失敗。新字串用到新字元時，
# fontSubset.test.ts 會紅，重跑本腳本即可。

import io
import sys
from pathlib import Path

from fontTools import subset
from fontTools.merge import Merger
from fontTools.ttLib import TTFont

ROOT = Path(__file__).resolve().parent.parent
SRC_DIR = ROOT / "src"
TC_DIR = ROOT / "node_modules" / "@expo-google-fonts" / "noto-serif-tc"
JP_DIR = ROOT / "node_modules" / "@expo-google-fonts" / "noto-serif-jp"
OUT_DIR = ROOT / "assets" / "fonts"
MANIFEST = OUT_DIR / "NotoSerifTC-subset-chars.txt"
EXCLUDED = OUT_DIR / "NotoSerifTC-excluded-chars.txt"

# 這些區段缺字是不允許的——字型本來就該有
MUST_COVER = [
    (0x2E80, 0x2FFF),   # CJK 部首
    (0x3000, 0x303F),   # CJK 標點
    (0x3040, 0x30FF),   # 平假名／片假名
    (0x31F0, 0x31FF),   # 片假名語音擴展
    (0x3400, 0x4DBF),   # CJK 擴展 A
    (0x4E00, 0x9FFF),   # CJK 統一表意
    (0xFF00, 0xFFEF),   # 全形
]

SUBSET_OPTIONS = subset.Options(
    layout_features=["*"],
    name_IDs=["*"],
    name_languages=["*"],
    notdef_outline=True,
    recalc_bounds=True,
)


def make_subset(src: Path, text: str) -> TTFont:
    font = subset.load_font(str(src), SUBSET_OPTIONS)
    subsetter = subset.Subsetter()
    subsetter.populate(text=text)
    subsetter.subset(font)
    return font

# 目前只有籤詩行使用此字體（Regular 400）。日後要用粗體再增加權重。
WEIGHTS = [
    ("400Regular", "NotoSerifTC-400.ttf", "Regular"),
]

ASCII = "".join(chr(c) for c in range(0x20, 0x7F))
PUNCT = "「」『』〈〉《》、。！？：；，．（）【】…—–·‘’“”×※★◎●◆─│└┘┬┤"


def collect_chars() -> str:
    text = ASCII + PUNCT
    for path in sorted(SRC_DIR.rglob("*")):
        # 測試檔從不渲染：裡面的字元（含正規式範圍界標）不需要字形
        if "__tests__" in path.parts:
            continue
        if path.suffix in (".ts", ".tsx"):
            text += path.read_text(encoding="utf-8")
    return "".join(sorted(set(text)))


def rename_family(font: TTFont, subfamily: str) -> None:
    """把家族名改成 NotoSerifTC，讓 iOS／Android 用同一個 key 引用。"""
    for record in font["name"].names:
        if record.nameID == 1 or record.nameID == 16:  # family / typographic family
            record.string = "NotoSerifTC".encode(record.getEncoding())
        elif record.nameID == 2 or record.nameID == 17:  # subfamily
            record.string = subfamily.encode(record.getEncoding())
        elif record.nameID == 4:  # full name
            record.string = f"NotoSerifTC {subfamily}".encode(record.getEncoding())
        elif record.nameID == 6:  # postscript name
            record.string = f"NotoSerifTC-{subfamily}".encode(record.getEncoding())


def main() -> int:
    chars = collect_chars()
    OUT_DIR.mkdir(parents=True, exist_ok=True)

    for package_dir, out_name, subfamily in WEIGHTS:
        tc_src = TC_DIR / package_dir / f"NotoSerifTC_{package_dir}.ttf"
        jp_src = JP_DIR / package_dir / f"NotoSerifJP_{package_dir}.ttf"
        if not tc_src.exists() or not jp_src.exists():
            print("找不到來源字型，請先安裝：")
            print("  npm i -D @expo-google-fonts/noto-serif-tc @expo-google-fonts/noto-serif-jp")
            return 1

        # 以 TC 為主，TC 沒有的交給 JP（新字體漢字）
        tc_cmap = TTFont(str(tc_src), lazy=True).getBestCmap()
        jp_cmap = TTFont(str(jp_src), lazy=True).getBestCmap()
        tc_chars = "".join(ch for ch in chars if ord(ch) in tc_cmap)
        jp_chars = "".join(ch for ch in chars if ord(ch) not in tc_cmap and ord(ch) in jp_cmap)
        excluded = "".join(ch for ch in chars if ord(ch) not in tc_cmap and ord(ch) not in jp_cmap)

        # 漢字／假名／全形標點不允許落進排除清單
        hard_missing = [
            ch for ch in excluded
            if any(lo <= ord(ch) <= hi for lo, hi in MUST_COVER)
        ]
        if hard_missing:
            print(f"TC+JP 都缺了不該缺的 {len(hard_missing)} 個字元（前 20 個）：{''.join(hard_missing[:20])}")
            return 1

        MANIFEST.write_text(tc_chars + jp_chars, encoding="utf-8")
        EXCLUDED.write_text(excluded, encoding="utf-8")

        # Merger 只吃檔案路徑或 file-like，子集先寫進記憶體再合併
        tc_buf = io.BytesIO()
        make_subset(tc_src, tc_chars).save(tc_buf)
        merged_srcs = [tc_buf]
        if jp_chars:
            jp_buf = io.BytesIO()
            make_subset(jp_src, jp_chars).save(jp_buf)
            merged_srcs.append(jp_buf)
        merged = Merger().merge(merged_srcs)

        rename_family(merged, subfamily)
        dst = OUT_DIR / out_name
        merged.save(str(dst))
        size_kb = dst.stat().st_size // 1024
        print(f"{out_name}: TC {len(tc_chars)} + JP {len(jp_chars)}, excluded {len(excluded)}, {size_kb} KB")

    print(f"charset -> {MANIFEST.relative_to(ROOT)}; excluded -> {EXCLUDED.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
