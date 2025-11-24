# Testing

This document outlines the testing strategies and procedures for the Friendle project.

## Unit Testing

Unit tests are written with [Vitest](https://vitest.dev/).

To run all unit tests, use the following command:
```bash
npm test
```

## End-to-End (E2E) Testing

E2E tests are written with [Playwright](https://playwright.dev/). These tests simulate real user interactions in a browser environment.

### Running E2E Tests

The E2E tests require the Firebase Emulators to be running. The Playwright configuration will automatically start the emulators and the Next.js server.

To run the E2E tests, use the following command:
```bash
npm run test:e2e
```

This command will:
1. Start the Firebase Auth and Database emulators.
2. Build and start the Next.js application.
3. Run the Playwright tests.
4. Shut down the emulators and the Next.js server.
