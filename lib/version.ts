import "server-only";

import pkg from "@/package.json";

/**
 * App version, read from package.json so `npm version` is the only place to
 * bump it. Shown in the footer to make tester bug reports pin down a build.
 *
 * Server-only on purpose: importing this from a client component would bundle
 * the whole of package.json — every dependency and its exact version — into the
 * browser payload. `server-only` turns that mistake into a build error instead
 * of a silent leak.
 */
export const APP_VERSION: string = pkg.version;
