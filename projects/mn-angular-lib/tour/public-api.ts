/**
 * Public API of the `mn-angular-lib/tour` entry point: guided tours (highlight + step card)
 * and the offer card that proposes one.
 *
 * Each entry point is its own module in the published package, so a consumer's bundler
 * splits it into the chunk that uses it instead of loading the whole library at startup.
 * The root `mn-angular-lib` entry re-exports every entry point.
 */
export * from './src/mn-tour';
