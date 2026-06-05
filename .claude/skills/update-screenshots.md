---
name: update-admin-screenshots
description: Take screenshots of all admin pages and update the README. Starts the dev server if needed, captures 6 pages, then commits.
---

# Update Admin Screenshots

Take fresh screenshots of the tracker admin UI and update the project README.

## Steps

1. **Ensure dev server is running** on port 5180:
   ```bash
   cd apps/admin && npm run dev:mock -- --port 5180 &
   sleep 3
   ```

2. **Take screenshots**:
   ```bash
   cd apps/admin && npm run screenshots
   ```

3. **Commit**:
   ```bash
   git add docs/images/ README.md
   git commit -m "docs: update admin screenshots"
   ```

## One-liner

```bash
cd apps/admin && npm run dev:mock -- --port 5180 & sleep 3 && npm run screenshots && kill %1
```
