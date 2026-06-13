# 服飾網購整理 — Project Notes

## Overview
A static single-page app (`index.html`) that displays the user's bookmarked clothing shopping websites, organized by star rating and price tier, with filtering and search.

## Data source
Store data is manually extracted from Chrome bookmarks at:
`C:\Users\neil8\AppData\Local\Google\Chrome\User Data\Default\Bookmarks`

The bookmarks folder is named **"衣服"** and contains sub-folders:
- `☆ ☆ ☆ ☆ ☆` (5 stars)
- `☆ ☆ ☆ ☆` (4 stars)
- `☆ ☆ ☆` (3 stars)
- `☆ ☆` (2 stars)
- `☆` (1 star)
- `代購` → Japanese proxy buying
- `日本網站` → Japanese fashion sites
- `鞋` → Shoes
- `小包` / `後背包` → Bags

## Bookmark naming convention
Price tiers are encoded in bookmark names using 💲 symbols:
- `(💲)` = 平價 / Budget ($)
- `(💲💲)` = 中等 / Mid-range ($$)
- `(💲💲💲)` = 高端 / Premium ($$$)
- `(實體店)` = Physical store only

## index.html structure
- Pure HTML/CSS/JS — no build tools, no dependencies
- Store data lives in the `STORES` array in the `<script>` block
- Filtering by: star rating, price tier, category (台灣品牌/日系/韓系/歐美/日本網站/鞋/包包)
- Search by store name
- Thumbnails via `https://www.google.com/s2/favicons?domain=xxx&sz=64`
- Dark theme with card grid layout, responsive

## How to update stores
Edit the `STORES` array in `index.html`. Each entry:
```js
{ name: "Store Name", url: "https://...", stars: 5, price: 2, cat: "台灣品牌", domain: "example.com" }
```
- `stars`: 0–5 (0 = no rating, shown under "其他類別")
- `price`: 1 = $, 2 = $$, 3 = $$$
- `cat`: one of `台灣品牌`, `日系`, `韓系`, `歐美`, `日本網站`, `鞋`, `包包`
- `domain`: used for favicon lookup
- `note` (optional): short label shown as a badge (e.g. `"常秒殺"`)

## Skills used in this project
- `anthropic-skills:xlsx` — if exporting store list to spreadsheet
- `anthropic-skills:pdf` — if generating a PDF catalog

## Git workflow
- 每次透過 AI 對話編輯而異動檔案時，需將所有 local changes 一併進行 Git commit。
