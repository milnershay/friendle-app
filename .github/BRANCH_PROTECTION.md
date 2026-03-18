# Branch Protection Setup

To ensure all CI checks pass before merging to main, set up branch protection rules in GitHub:

## Steps:

1. Go to your GitHub repository
2. Navigate to **Settings** → **Branches**
3. Click **Add branch protection rule**
4. Set **Branch name pattern**: `main`
5. Enable the following:
   - ✅ **Require status checks to pass before merging**
   - ✅ **Require branches to be up to date before merging**
   - Select these status checks:
     - `lint`
     - `typecheck`
     - `audit`
     - `unit-test`
     - `build`
     - `e2e-test`
   - ✅ **Require linear history** (optional, keeps git history clean)
   - ✅ **Do not allow bypassing the above settings**

6. Click **Create** or **Save changes**

## Result:
- Pull requests cannot be merged until all CI checks pass
- Code quality and security are enforced automatically
- Deployments only happen when code is verified
