# CI/CD Deployment Secrets (GitHub Actions)

**Server:**
```
Host: ***REMOVED***:2973
User: speed4you  
Frontend path: /var/www/html/portal
Backend path: /home/speed4you/portal-app/backend
Live site: https://data.speed4you.net/portal
```

**GitHub Secrets (repo settings/actions/***REMOVED***s):**
```
DEPLOY_HOST     = ***REMOVED***
DEPLOY_PORT     = 2973
DEPLOY_USER     = speed4you
DEPLOY_SSH_KEY  = [***REMOVED*** ... full deploy_key content]
JWT_SECRET      = ***REMOVED***
TMDB_API_KEY    = ***REMOVED***
```

**SSH Key Fingerprint:** SHA256:RVa4r61dsjHbh52j0eIllF0yCj6rJebnPKnj7x3JXco

**Test:** git commit --allow-empty -m "test" && git push (Actions tab check করুন)

**⚠️ NEVER commit ***REMOVED***s to git!** This file for reference only.

