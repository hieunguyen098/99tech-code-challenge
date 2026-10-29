import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import { dirname } from "node:path";
import { MIGRATIONS, type Migration } from "./migrations.js";

export type DB = Database.Database;

/**
 * Opens (or creates) the SQLite database and applies any pending migrations.
 * Pass ":memory:" for a throwaway database (tests).
 */
export function createDatabase(path: string): DB {
  if (path !== ":memory:") mkdirSync(dirname(path), { recursive: true });

  const db = new Database(path);
  db.pragma("journal_mode = WAL");
  // SQLite's recommended setting with WAL: commits skip an fsync, and the database stays
  // consistent; a power cut (not an app crash) can lose only the last few commits.
  db.pragma("synchronous = NORMAL");
  db.pragma("foreign_keys = ON");
  runMigrations(db);
  return db;
}

/** The number of migrations applied to this database. */
export function schemaVersion(db: DB): number {
  return db.pragma("user_version", { simple: true }) as number;
}

/**
 * Applies the migrations newer than the database's version, each in its own transaction:
 * a failing migration rolls back completely and leaves the version where it was, so a
 * fixed migration can simply be re-run. Returns the resulting version.
 */
export function runMigrations(
  db: DB,
  migrations: Migration[] = MIGRATIONS,
): number {
  migrations.forEach((migration, index) => {
    if (migration.version !== index + 1) {
      throw new Error(
        `Migration versions must be 1, 2, 3… without gaps; found ${migration.version} at position ${index + 1}`,
      );
    }
  });

  const current = schemaVersion(db);
  if (current > migrations.length) {
    // Running older code against a newer schema could corrupt data; refuse instead.
    throw new Error(
      `Database schema version ${current} is newer than this app supports (${migrations.length})`,
    );
  }

  for (const migration of migrations.slice(current)) {
    db.transaction(() => {
      db.exec(migration.sql);
      db.pragma(`user_version = ${migration.version}`);
    })();
  }
  return schemaVersion(db);
}
