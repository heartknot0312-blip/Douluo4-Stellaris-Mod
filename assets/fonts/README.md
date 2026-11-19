# 界面字体

星海导航内嵌的四个字体子集，都由 Google Fonts 仓库中的 SIL Open Font License 1.1 字体裁出。三套原字体均未声明 Reserved Font Name，子集沿用原字体名之外的家族名 `DL4 Serif`、`DL4 Latin`、`DL4 Latin SC` 注册。

| 文件 | 来源 | 字重 | 用途 |
| --- | --- | --- | --- |
| dl4-serif-900.woff2 | Noto Serif SC（`ofl/notoserifsc/NotoSerifSC[wght].ttf`） | 900 | 页面标题、星系名、竖排名；含界面用字与 GB2312 一级汉字 |
| dl4-serif-600.woff2 | Noto Serif SC | 600 | 副标题、叙事段落；只含界面与提示词用字 |
| dl4-latin-600.woff2 | Cormorant Garamond（`ofl/cormorantgaramond/CormorantGaramond[wght].ttf`） | 600 | 数字、拉丁眉题 |
| dl4-latin-sc-600.woff2 | Cormorant SC（`ofl/cormorantsc/CormorantSC-SemiBold.ttf`） | 600 | 小型大写眉题 |

许可证原文：`OFL-NotoSerifSC.txt`、`OFL-Cormorant.txt`（Cormorant Garamond 与 Cormorant SC 同一份）。

## 重新生成

界面文字改动后，子集里可能缺字（缺的字会回退系统字体，不会报错）。重新裁剪：

```bash
pip install fonttools brotli
python scripts/subset-fonts.py <放三份原始 ttf 的目录>
node scripts/build.mjs
```

运行时由 `atlas.mjs` 通过宿主文档的 `FontFace` 接口注册（Shadow DOM 内的 `@font-face` 不生效），不访问网络。
