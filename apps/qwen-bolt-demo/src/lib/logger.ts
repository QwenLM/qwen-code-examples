/**
 * Application logger that silences debug output in production.
 *
 * In development (`NODE_ENV !== 'production'`), all methods behave like their
 * `console.*` counterparts. In production builds, `debug` and `log` become
 * no-ops while `warn`, `error`, and `info` are always forwarded.
 */

const isDevelopment =
  typeof process !== 'undefined'
    ? process.env.NODE_ENV !== 'production'
    : true;

/* eslint-disable @typescript-eslint/no-explicit-any */
const noop = (..._args: any[]) => {};

const logger = {
  /** Verbose debug output — silenced in production. */
  debug: isDevelopment ? console.log.bind(console) : noop,

  /** General log output — silenced in production. */
  log: isDevelopment ? console.log.bind(console) : noop,

  /** Informational messages — always printed. */
  info: console.info.bind(console),

  /** Warnings — always printed. */
  warn: console.warn.bind(console),

  /** Errors — always printed. */
  error: console.error.bind(console),
};

export default logger;
