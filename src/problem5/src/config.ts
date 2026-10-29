import { z } from "zod";

export const LOG_LEVELS = [
  "fatal",
  "error",
  "warn",
  "info",
  "debug",
  "trace",
  "silent",
] as const;

const envSchema = z.object({
  PORT: z
    .string()
    .regex(/^\d+$/, "must be a whole number")
    .transform(Number)
    .pipe(z.number().int().min(1).max(65535))
    .default(3000),
  DATABASE_PATH: z.string().default("./data/app.db"),
  LOG_LEVEL: z.enum(LOG_LEVELS).default("info"),
});

export interface Config {
  port: number;
  databasePath: string;
  logLevel: (typeof LOG_LEVELS)[number];
}

/**
 * Reads and validates settings from the environment. Empty values count as unset, so
 * `PORT=` in .env means "use the default" — not port 0, which would make the server
 * listen on a random port and log a URL that doesn't work. Invalid values stop startup
 * with a clear message instead of crashing later (`PORT=abc`) or silently using a
 * throwaway database (`DATABASE_PATH=`).
 */
export function loadConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const set = Object.fromEntries(
    Object.entries(env).filter(([, value]) => value !== ""),
  );
  const result = envSchema.safeParse(set);
  if (!result.success) {
    const problems = result.error.issues
      .map((issue) => `${issue.path.join(".")} ${issue.message}`)
      .join("; ");
    throw new Error(`Invalid configuration: ${problems}`);
  }
  return {
    port: result.data.PORT,
    databasePath: result.data.DATABASE_PATH,
    logLevel: result.data.LOG_LEVEL,
  };
}

/**
 * For entry points: a bad setting is a setup mistake, not a crash, so print just the
 * message and exit instead of throwing a stack trace.
 */
export function loadConfigOrExit(): Config {
  try {
    return loadConfig();
  } catch (error) {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  }
}
