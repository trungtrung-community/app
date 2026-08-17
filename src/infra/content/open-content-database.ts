/**
 * @fileoverview Opening the bundled content database on a device.
 *
 * Separated from `SqliteContentSource` so the adapter's SQL stays testable without
 * expo-sqlite. This file is the only part that cannot run in a plain Vitest process,
 * and it holds no query logic — just the copy, the staleness check and the open.
 */

import * as SQLite from 'expo-sqlite';

import {CONTENT_VERSION} from './rows.generated';
import type {ContentDatabase} from './sqlite-content-source';

const DATABASE_NAME = 'content.db';

/**
 * Copy the bundled artifact into place if needed, then open it read-only.
 *
 * The staleness dance is required rather than defensive. expo-sqlite copies a
 * bundled database to the app's directory on first launch and deliberately leaves it
 * alone afterwards, so shipping new content in an app update would otherwise leave
 * every existing learner reading the old set forever. Comparing the copied file's
 * recorded version against the one this build was made with catches that, and
 * re-importing is safe because progress is in MMKV — nothing a learner owns lives in
 * this file.
 */
export async function openContentDatabase(): Promise<ContentDatabase> {
  const asset = {assetId: require('../../../assets/content.db') as number};

  await SQLite.importDatabaseFromAssetAsync(DATABASE_NAME, asset);
  let db = await SQLite.openDatabaseAsync(DATABASE_NAME);

  const installed = await readContentVersion(db);
  if (installed !== CONTENT_VERSION) {
    await db.closeAsync();
    await SQLite.importDatabaseFromAssetAsync(DATABASE_NAME, {...asset, forceOverwrite: true});
    db = await SQLite.openDatabaseAsync(DATABASE_NAME);
  }

  return db;
}

async function readContentVersion(db: SQLite.SQLiteDatabase): Promise<string | null> {
  try {
    const row = await db.getFirstAsync<{value: string}>(
      "SELECT value FROM meta WHERE key = 'content_version'",
    );
    return row?.value ?? null;
  } catch {
    // A database predating the meta table, or a truncated copy. Either way the
    // answer is "not this build", which triggers the re-import above.
    return null;
  }
}
