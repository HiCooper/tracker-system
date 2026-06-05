---
name: screenshot-frontend
description: Take screenshots of any frontend project pages. Accepts a list of URLs and an output directory. Captures 2-3 core pages.
---

# Frontend Screenshot

Capture screenshots of frontend pages for documentation. Works with any project — just pass the URLs.

## Usage

Tell Claude which pages to capture:

```
/screenshot-frontend http://localhost:5173/ http://localhost:5173/dashboard http://localhost:5173/settings
```

Or specify output directory:

```
/screenshot-frontend --out docs/screenshots http://localhost:5173/
```

## Defaults

- **Output**: `docs/images/` (project root)
- **Viewport**: 1440×900
- **Wait**: network idle + 500ms
- **Pages**: whatever URLs you pass (first arg is the dev server)

## How it works

1. Ensure dev server is running on the base URL
2. Navigate to each URL passed
3. Save screenshots as `{page-slug}.png` in output directory

## Example

```
/screenshot-frontend http://localhost:5180/tracker/setup http://localhost:5180/tracker/analysis
```
→ Saves `docs/images/localhost-5180-tracker-setup.png` and `docs/images/localhost-5180-tracker-analysis.png`
