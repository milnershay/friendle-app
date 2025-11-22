# GitHub Actions Setup Guide

This guide explains how to set up GitHub Actions for continuous integration and automatic deployment to Vercel.

## Overview

Two workflows are configured:

1. **CI Workflow** (`.github/workflows/ci.yml`) - Runs on all pushes and PRs
   - Linting
   - Unit tests
   - Build verification
   - E2E tests with Playwright

2. **Vercel Deployment** (`.github/workflows/deploy-vercel.yml`) - Runs on push to `main`
   - Automatic production deployment to Vercel
   - Uses Vercel CLI for deployment

## Required GitHub Secrets

You need to configure the following secrets in your GitHub repository:

### Navigate to Repository Settings
1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret** for each secret below

### Firebase Configuration Secrets

Add all Firebase environment variables:

```
NEXT_PUBLIC_FIREBASE_API_KEY
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN
NEXT_PUBLIC_FIREBASE_DATABASE_URL
NEXT_PUBLIC_FIREBASE_PROJECT_ID
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID
NEXT_PUBLIC_FIREBASE_APP_ID
```

> [!TIP]
> Copy these values from your `.env.local` file

### Vercel Configuration Secrets

You need three Vercel-specific secrets:

#### 1. `VERCEL_TOKEN`

**How to get it:**
1. Go to [Vercel Account Settings → Tokens](https://vercel.com/account/tokens)
2. Click **Create Token**
3. Name it "GitHub Actions" or similar
4. Set scope to your account/team
5. Copy the token and add it as a GitHub secret

#### 2. `VERCEL_ORG_ID`

**How to get it:**
```bash
# Install Vercel CLI if not already installed
npm i -g vercel

# Login to Vercel
vercel login

# Link your project (run in project directory)
vercel link

# The .vercel/project.json file will contain your IDs
cat .vercel/project.json
```

The `orgId` field is your `VERCEL_ORG_ID`.

#### 3. `VERCEL_PROJECT_ID`

From the same `.vercel/project.json` file, the `projectId` field is your `VERCEL_PROJECT_ID`.

> [!IMPORTANT]
> Do NOT commit the `.vercel` directory to git. It's already in `.gitignore`.

## Quick Setup Script

Run this to get your Vercel IDs:

```bash
# Link project to Vercel
vercel link

# Extract IDs
echo "VERCEL_ORG_ID: $(cat .vercel/project.json | grep orgId | cut -d'"' -f4)"
echo "VERCEL_PROJECT_ID: $(cat .vercel/project.json | grep projectId | cut -d'"' -f4)"
```

## Environment Variables in Vercel

Make sure your Firebase environment variables are also configured in Vercel:

1. Go to [Vercel Dashboard](https://vercel.com/dashboard)
2. Select your project
3. Go to **Settings** → **Environment Variables**
4. Add all `NEXT_PUBLIC_*` variables for **Production**, **Preview**, and **Development**

> [!NOTE]
> The GitHub Action will use the secrets from GitHub, but Vercel also needs them configured for manual deployments and previews.

## Testing the Workflows

### Test CI Workflow

```bash
# Create a new branch
git checkout -b test-ci

# Make a small change
echo "# Test" >> README.md

# Commit and push
git add .
git commit -m "Test CI workflow"
git push origin test-ci

# Create a PR on GitHub and watch the CI run
```

### Test Vercel Deployment

```bash
# Merge to main (or push directly)
git checkout main
git merge test-ci
git push origin main

# Watch the deployment at:
# https://github.com/YOUR_USERNAME/Friendle/actions
```

## Workflow Status Badges

Add these badges to your `README.md`:

```markdown
![CI](https://github.com/YOUR_USERNAME/Friendle/workflows/CI/badge.svg)
![Deploy](https://github.com/YOUR_USERNAME/Friendle/workflows/Deploy%20to%20Vercel/badge.svg)
```

Replace `YOUR_USERNAME` with your GitHub username.

## Troubleshooting

### Workflow Fails with "Missing Secrets"

**Solution:** Verify all secrets are added in GitHub Settings → Secrets and variables → Actions

### Vercel Deployment Fails

**Common issues:**

1. **Invalid token:** Regenerate your Vercel token
2. **Wrong project ID:** Re-run `vercel link` and update the secret
3. **Missing env vars:** Check Vercel dashboard for environment variables

### E2E Tests Fail

**Possible causes:**

1. **Firebase connection issues:** Verify Firebase secrets are correct
2. **Timeout:** Increase timeout in `playwright.config.ts`
3. **Browser issues:** The workflow installs Chromium automatically

### Build Fails

```bash
# Test locally first
npm run build

# If it works locally but fails in CI, check:
# 1. Node version matches (20.x)
# 2. All dependencies are in package.json
# 3. No local-only environment variables
```

## Customization

### Run CI on Different Branches

Edit `.github/workflows/ci.yml`:

```yaml
on:
  push:
    branches: [ main, develop, staging ]  # Add your branches
  pull_request:
    branches: [ main ]
```

### Deploy to Vercel Preview

For preview deployments on PRs, create `.github/workflows/deploy-preview.yml`:

```yaml
name: Deploy Preview

on:
  pull_request:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v4
    - uses: actions/setup-node@v4
      with:
        node-version: '20.x'
    - run: npm ci
    - run: npm install --global vercel@latest
    - run: vercel pull --yes --environment=preview --token=${{ secrets.VERCEL_TOKEN }}
      env:
        VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
        VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
    - run: vercel build --token=${{ secrets.VERCEL_TOKEN }}
      env:
        VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
        VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
    - run: vercel deploy --prebuilt --token=${{ secrets.VERCEL_TOKEN }}
      env:
        VERCEL_ORG_ID: ${{ secrets.VERCEL_ORG_ID }}
        VERCEL_PROJECT_ID: ${{ secrets.VERCEL_PROJECT_ID }}
```

### Skip CI for Docs Changes

Add to commit message:

```bash
git commit -m "Update README [skip ci]"
```

## Manual Deployment

You can still deploy manually:

```bash
# Deploy to production
vercel --prod

# Deploy preview
vercel
```

## Monitoring

### GitHub Actions

- View workflow runs: `https://github.com/YOUR_USERNAME/Friendle/actions`
- Download artifacts (test reports): Click on a workflow run → Artifacts

### Vercel

- View deployments: [Vercel Dashboard](https://vercel.com/dashboard)
- Check logs: Click on a deployment → View Function Logs

## Security Best Practices

1. ✅ **Never commit secrets** to git
2. ✅ **Use GitHub Secrets** for sensitive data
3. ✅ **Rotate tokens** periodically (every 90 days)
4. ✅ **Limit token scope** to specific projects if possible
5. ✅ **Review workflow logs** for exposed secrets (GitHub auto-masks them)

## Cost Considerations

- **GitHub Actions:** 2,000 free minutes/month for private repos
- **Vercel:** Free tier includes unlimited deployments
- **Firebase:** Usage is the same as manual deployments

## Next Steps

After setup:

1. ✅ Push to main and verify deployment works
2. ✅ Create a PR and verify CI runs
3. ✅ Add status badges to README
4. ✅ Set up Slack/Discord notifications (optional)
5. ✅ Configure branch protection rules (optional)

## Support

For issues:
- Check [GitHub Actions docs](https://docs.github.com/en/actions)
- Check [Vercel deployment docs](https://vercel.com/docs/deployments/overview)
- Review workflow logs in GitHub Actions tab
