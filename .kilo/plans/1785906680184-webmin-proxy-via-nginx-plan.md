# Plan: Fix Webmin Login Behind Nginx Reverse Proxy (webprefix issue)

## Problem
After proxying Webmin at `https://speed4you.net/webmin/`, the login page renders
but the form `action="/session_login.cgi"` drops the `/webmin/` prefix. The POST
hits Nginx's SPA fallback (`try_files` → `index.html`), returning the React app
instead of logging in. In some cases this surfaces as **405 Not Allowed**.

## Root Cause
Two coupled issues:
1. **Webmin `webprefix=` is empty** → Webmin generates root-relative URLs (`/session_login.cgi`)
   instead of prefixed ones (`/webmin/session_login.cgi`).
2. **Nginx `proxy_pass https://127.0.0.1:10000/;`** (trailing slash) → Nginx **strips**
   `/webmin/` from the path before forwarding to Webmin. So even if `webprefix=/webmin`
   were set, Webmin wouldn't see the `/webmin/` prefix in the incoming path.

The current state (from the initial implementation):
- `/etc/webmin/config` has `proxy=1` but `webprefix=` (empty)
- `/etc/nginx/sites-enabled/speed4you.net` has `location /webmin/ { proxy_pass https://127.0.0.1:10000/; ... }`

## Fix (two coordinated changes)

### T1. Set `webprefix=/webmin` in Webmin config
```sh
# On server, as root:
sed -i 's/^webprefix=.*/webprefix=\/webmin/' /etc/webmin/config
grep -q '^webprefixnodot=1' /etc/webmin/config || echo 'webprefixnodot=1' >> /etc/webmin/config
```
- `webprefix=/webmin`: Tells Webmin to generate all URLs with this prefix
- `webprefixnodot=1`: Ensures the prefix is a bare path (`/webmin`) not combined with hostname

### T2. Fix Nginx `proxy_pass` — remove trailing slash
```sh
# Change in /etc/nginx/sites-enabled/speed4you.net:
# FROM: proxy_pass https://127.0.0.1:10000/;
# TO:   proxy_pass https://127.0.0.1:10000;
```
- **Without trailing slash**: Nginx passes the **full original URI** (including `/webmin/`)
  to Webmin. Webmin sees `/webmin/session_login.cgi`, strips the prefix via `webprefix`,
  and processes `/session_login.cgi` internally. Generated URLs include `/webmin/` prefix. ✓
- **With trailing slash** (current bug): Nginx strips `/webmin/` and sends `/session_login.cgi`
  to Webmin. Webmin has no prefix context → generates root-relative URLs. ✗

### T3. Restart Webmin + reload Nginx
```sh
systemctl restart webmin
nginx -t && systemctl reload nginx
```

### T4. Update deploy.yml (idempotent — for future deploys)
In `.github/workflows/deploy.yml`, the "Configure speed4you.net nginx HTTP/2 & gzip" step
already has webmin-logic from the initial implementation. Update it to:
1. Set `webprefix=/webmin` in `/etc/webmin/config` (currently missing)
2. Ensure `proxy_pass https://127.0.0.1:10000;` has **no trailing slash** (currently the
   initial implementation added a trailing slash — fix it)

## Validation
1. `curl -fsS https://speed4you.net/webmin/` → 200, login page with `action="/webmin/session_login.cgi"`
2. `curl -fsSI https://speed4you.net/webmin/` → 302 redirect to `/webmin/` (or 200 if already logged in session cookie is set)
3. `curl -fsS -X POST https://speed4you.net/webmin/session_login.cgi -d "user=root&pass=xxx"` → 303 redirect to `/webmin/` (login succeeds)
4. Open `https://speed4you.net/webmin/` in Chrome → no cert warning, login works end-to-end
5. Verify form action is `/webmin/session_login.cgi` (not `/session_login.cgi`)
