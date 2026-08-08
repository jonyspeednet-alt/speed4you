# Fix: Admin panel navigation for draft content

## Problem
In `frontend/src/pages/admin/ContentLibraryPage.jsx`, the `getPublicPath()` helper returns public-facing URLs (`/movies/:id` or `/series/:id`) for **all** items, including drafts. The public API endpoints (`/api/movies/:id`, `/api/series/:id`) reject non-published items with 404. When an admin clicks a draft item's poster, title, or "View" button in the admin panel, they hit a dead-end "Movie not found" page.

## Root Cause
`getPublicPath()` at line ~1235 does not consider `item.status`. It blindly returns the public slug path.

## Fix
Update `getPublicPath()` to return the admin edit path for non-published items, so admins always land on a usable page.

### File to change
- `frontend/src/pages/admin/ContentLibraryPage.jsx`

### Changes
1. **Modify `getPublicPath(item)`** (around line 1235):
   ```js
   function getPublicPath(item) {
     if (!item) return '/';
     const slugOrId = item.slug || item.id;
     if (item.status !== 'published') {
       return `/admin/content/${item.id}/edit`;
     }
     return item.type === 'series' ? `/series/${slugOrId}` : `/movies/${slugOrId}`;
   }
   ```

2. **Update the "View" button text** for draft items (line ~846 and ~956):
   - Change `<Link to={getPublicPath(item)} style={styles.miniBtn}>View</Link>` to conditionally render "Edit" for drafts and "View" for published items.
   - Example:
     ```jsx
     {item.status === 'published' ? (
       <Link to={getPublicPath(item)} style={styles.miniBtn}>View</Link>
     ) : (
       <Link to={getPublicPath(item)} style={styles.miniBtn}>Edit</Link>
     )}
     ```

## Impact
- Draft items clicked from the admin library now navigate to the admin edit page instead of 404.
- Published items continue to navigate to their public pages.
- No backend changes required.
- No impact on public-facing routes or APIs.

## Validation
1. In admin panel, set a movie to `draft`.
2. Click its poster, title, and "View" button — all should open the admin edit form.
3. Set the movie to `published` and repeat — all should open the public movie page.
4. Repeat for series and season items in grouped view.
