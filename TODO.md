# TODO - Move "online" badge from main site to admin sidebar

## Steps
- [x] 1. Remove `LiveUserBadge` import from `frontend/src/components/navigation/TopNav.jsx`
- [x] 2. Remove `{isDesktop && <LiveUserBadge />}` from `TopNav.jsx`
- [x] 3. Add `LiveUserBadge` import to `frontend/src/layouts/AdminLayout.jsx`
- [x] 4. Add `<LiveUserBadge />` to the admin sidebar in `AdminLayout.jsx`
- [x] 5. Verify changes
