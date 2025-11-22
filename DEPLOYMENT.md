# Deployment Guide

## Avoiding Double Deployments

This project uses **GitHub Actions** for deployments to maintain CI/CD control. To prevent double deployments:

### Vercel Configuration Required

1. Go to your Vercel project settings: https://vercel.com/milnershay-8540s-projects/friendle/settings/git
2. Under "Git" settings, disable automatic deployments:
   - **Production Branch**: Leave empty or disable
   - **Preview Branches**: Disable if you want GitHub Actions to handle all deploys

The `.github/workflows/deploy-vercel.yml` workflow will handle all production deployments when you push to `main`.

## Deployment Workflow

### Automatic Deployments
- **Push to main** → GitHub Actions builds and deploys to Vercel production
- Version number from `package.json` is automatically included

### Manual Release Process

To create a new release with version bump:

```bash
# Bump version (patch: 0.1.0 → 0.1.1)
npm run release patch

# Bump version (minor: 0.1.0 → 0.2.0)
npm run release minor

# Bump version (major: 0.1.0 → 1.0.0)
npm run release major
```

This will:
1. Bump version in `package.json` and `package-lock.json`
2. Update `CHANGELOG.md` with new version and date
3. Create a git commit and tag
4. Push the tag to trigger deployment with the new version

### Push the Release

After running the release script:

```bash
git push origin main --follow-tags
```

This will deploy the new version to production with the version number displayed in the UI.

## Environment Variables

All Firebase credentials are stored in GitHub Secrets:
- `NEXT_PUBLIC_FIREBASE_API_KEY`
- `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `NEXT_PUBLIC_FIREBASE_DATABASE_URL`
- `NEXT_PUBLIC_FIREBASE_PROJECT_ID`
- `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `NEXT_PUBLIC_FIREBASE_APP_ID`

Additionally needed for Vercel deployment:
- `VERCEL_TOKEN`
- `VERCEL_ORG_ID`
- `VERCEL_PROJECT_ID`

## Monitoring Deployments

- **GitHub Actions**: https://github.com/milnershay/friendle-app/actions
- **Vercel Dashboard**: https://vercel.com/milnershay-8540s-projects/friendle

## Current Deployment URLs

- **Production**: https://friendle.vercel.app (or your custom domain)
- **Latest**: Check latest deployment in Vercel dashboard
