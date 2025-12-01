# Database Migration Guide

This document outlines the process for running database migrations for the application.

## When to Run Migrations

Migrations should be run:

-   **Before deploying a new version** of the application that depends on a new database schema.
-   **After making manual changes** to the database structure that need to be propagated to all environments.

## `migrateRoomSettings.ts`

This script is designed to ensure all "room" objects in the Firebase Realtime Database have a valid `settings` object.

### What it Does

-   Scans all rooms in the `rooms/` path of the database.
-   Identifies rooms that are missing the `settings` field entirely or have an incomplete `settings` object.
-   For each of these rooms, it adds the default settings, preserving any existing valid settings.
-   Logs which rooms were migrated and which were skipped.
-   Provides a "dry-run" mode to see what changes would be made without actually writing to the database.

### How to Run it Safely

1.  **Always run in dry-run mode first.** This is the default behavior and will show you which rooms will be affected.

    ```bash
    npm run migrate:rooms
    ```

    You can also explicitly specify dry-run mode for clarity:
    ```bash
    npm run migrate:rooms -- --dry-run
    ```

2.  **Review the output.** The script will print a list of rooms that would be migrated. Ensure this is what you expect.

3.  **Run with the `--force` flag to apply the changes.** Once you are confident in the dry-run, you can apply the migration.

    ```bash
    npm run migrate:rooms -- --force
    ```

4.  **Migrate a specific room.** If you only need to fix a single room, you can use the `--room` flag.

    ```bash
    # Dry run for a single room
    npm run migrate:rooms -- --room YOUR_ROOM_ID_HERE

    # Force migration for a single room
    npm run migrate:rooms -- --room YOUR_ROOM_ID_HERE --force
    ```

### How to Verify Migration

After running the migration with `--force`, you can run it again in dry-run mode. The output should show "0 rooms migrated," indicating that all rooms now have the required settings. You can also manually inspect the database in the Firebase console to confirm the changes.
