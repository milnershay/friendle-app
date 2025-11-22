# Quick Reference: GitHub Actions & Vercel Deployment

## 🚀 Quick Start

1. **Set up GitHub Secrets** (one-time setup)
   - Go to GitHub repo → Settings → Secrets and variables → Actions
   - Add Firebase env vars (7 secrets)
   - Add Vercel credentials (3 secrets)
   - See [GITHUB_ACTIONS.md](./GITHUB_ACTIONS.md) for details

2. **Deploy**
   ```bash
   git push origin main
   ```
   That's it! GitHub Actions will test and deploy automatically.

## 📋 Required Secrets Checklist

### Firebase (7 secrets)
- [ ] `NEXT_PUBLIC_FIREBASE_API_KEY`
- [ ] `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- [ ] `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
- [ ] `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- [ ] `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- [ ] `NEXT_PUBLIC_FIREBASE_APP_ID`

### Vercel (3 secrets)
- [ ] `VERCEL_TOKEN` - Get from [vercel.com/account/tokens](https://vercel.com/account/tokens)
- [ ] `VERCEL_ORG_ID` - Run `vercel link` then check `.vercel/project.json`
- [ ] `VERCEL_PROJECT_ID` - Same file as above

## 🔧 Get Vercel IDs

```bash
# Link project
vercel link

# Get IDs
cat .vercel/project.json | grep -E '"(orgId|projectId)"'
```

## 📊 Workflows

### CI Workflow (`.github/workflows/ci.yml`)
**Triggers:** Push to main/develop, PRs to main/develop
**Actions:**
- ✅ Lint code
- ✅ Run unit tests
- ✅ Build application
- ✅ Run E2E tests
- ✅ Upload test reports

### Deploy Workflow (`.github/workflows/deploy-vercel.yml`)
**Triggers:** Push to main only
**Actions:**
- ✅ Pull Vercel config
- ✅ Build project
- ✅ Deploy to production

## 🎯 Common Commands

```bash
# Test locally before pushing
npm run lint
npm test
npm run test:e2e
npm run build

# Push to trigger deployment
git push origin main

# View workflow status
# Go to: https://github.com/YOUR_USERNAME/Friendle/actions
```

## 🐛 Troubleshooting

| Issue | Solution |
|-------|----------|
| "Missing secrets" error | Add all 10 secrets in GitHub Settings |
| Vercel deployment fails | Re-run `vercel link` and update IDs |
| E2E tests timeout | Check Firebase connection, verify secrets |
| Build succeeds locally but fails in CI | Check Node version (should be 20.x) |

## 📚 Full Documentation

- **Setup Guide:** [GITHUB_ACTIONS.md](./GITHUB_ACTIONS.md)
- **Deployment Options:** [DEPLOY.md](./DEPLOY.md)
- **Firebase Setup:** [FIREBASE_SETUP.md](./FIREBASE_SETUP.md)

## 🎨 Status Badges

Add to README.md:

```markdown
![CI](https://github.com/YOUR_USERNAME/Friendle/workflows/CI/badge.svg)
![Deploy](https://github.com/YOUR_USERNAME/Friendle/workflows/Deploy%20to%20Vercel/badge.svg)
```

## ⚡ Next Steps

1. [ ] Configure all GitHub Secrets
2. [ ] Push to main to test deployment
3. [ ] Add status badges to README
4. [ ] Set up branch protection (optional)
5. [ ] Configure Slack/Discord notifications (optional)
