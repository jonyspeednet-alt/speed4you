# CI/CD Deployment Secrets (GitHub Actions)

**Server:**
```
Host: 203.0.113.2:2973
User: speed4you  
Frontend path: /var/www/html/portal
Backend path: /home/speed4you/portal-app/backend
Live site: https://data.speed4you.net/portal
```

**GitHub Secrets (repo settings/actions/secrets):**
```
DEPLOY_HOST     = 203.0.113.2
DEPLOY_PORT     = 2973
DEPLOY_USER     = speed4you
DEPLOY_SSH_KEY  = [-----BEGIN OPENSSH PRIVATE KEY----- ... full deploy_key content]
JWT_SECRET      = [REDACTED]
TMDB_API_KEY    = [REDACTED]
```

**SSH Key Fingerprint:** SHA256:RVa4r61dsjHbh52j0eIllF0yCj6rJebnPKnj7x3JXco

**Test:** git commit --allow-empty -m "test" && git push (Actions tab check করুন)

**⚠️ NEVER commit secrets to git!** This file for reference only.

