import { describe, expect, it } from "vitest";

/**
 * Architecture rules, checked on every test run so the structure can't drift:
 * - Dependencies point one way: app → features → shared.
 * - Code outside a feature uses it only through its `index.ts` (the feature's public API).
 * - A feature's `model/` folder is pure logic: no React, components or hooks.
 * Tests are exempt so they can build expectations from feature internals.
 */
const sources = import.meta.glob<string>(
  ["./**/*.{ts,tsx}", "!./**/*.test.{ts,tsx}", "!./test/**"],
  { query: "?raw", import: "default", eager: true },
);

/** Raw `import ... from "x"` specifiers, including packages such as "react". */
const specifiersOf = (code: string) =>
  [...code.matchAll(/(?:from|import)\s+["']([^"']+)["']/g)].map(
    ([, specifier = ""]) => specifier,
  );

interface Dependency {
  /** Importing file, relative to src/, e.g. "features/swap/useSwap.ts". */
  from: string;
  /** Imported module, relative to src/ and without extension, e.g. "features/tokens". */
  to: string;
}

const dependencies: Dependency[] = Object.entries(sources).flatMap(
  ([path, code]) => {
    const from = path.replace(/^\.\//, "");
    return specifiersOf(code)
      .filter((specifier) => specifier.startsWith(".")) // skip npm packages
      .map((specifier) => ({
        from,
        to: new URL(specifier, `file:///src/${from}`).pathname.replace(
          /^\/src\//,
          "",
        ),
      }));
  },
);

const featureOf = (path: string) => /^features\/([^/]+)/.exec(path)?.[1];

describe("architecture", () => {
  it("scans the source files", () => {
    expect(dependencies.length).toBeGreaterThan(30);
  });

  it("shared code never depends on features or the app", () => {
    expect(
      dependencies.filter(
        ({ from, to }) =>
          from.startsWith("shared/") && /^(features|app)\//.test(to),
      ),
    ).toEqual([]);
  });

  it("features never depend on the app", () => {
    expect(
      dependencies.filter(
        ({ from, to }) => from.startsWith("features/") && to.startsWith("app/"),
      ),
    ).toEqual([]);
  });

  it("a feature's model/ stays pure: no React, components or hooks", () => {
    const modelFiles = Object.entries(sources).filter(([path]) =>
      /^\.\/features\/[^/]+\/model\//.test(path),
    );
    expect(
      modelFiles.flatMap(([path, code]) =>
        specifiersOf(code)
          .filter((s) => /^react($|-dom)|\/components\/|\/use[A-Z]/.test(s))
          .map((s) => `${path} imports ${s}`),
      ),
    ).toEqual([]);
  });

  it("code outside a feature imports it only through its index", () => {
    expect(
      dependencies.filter(({ from, to }) => {
        const feature = featureOf(to);
        if (!feature || featureOf(from) === feature) return false;
        return (
          to !== `features/${feature}` && to !== `features/${feature}/index`
        );
      }),
    ).toEqual([]);
  });
});
