/**
 * Public API of the `mn-angular-lib/display` entry point: display components (card, breadcrumbs, icon, information card, dual image).
 *
 * Each entry point is its own module in the published package, so a consumer's bundler
 * splits it into the chunk that uses it instead of loading the whole library at startup.
 * The root `mn-angular-lib` entry re-exports every entry point.
 */
export * from './src/mn-card';
export * from './src/mn-breadcrumbs';
export * from './src/mn-icon';
export * from './src/mn-information-card';
export * from './src/mn-dual-horizontal-image';
