/**
 * Public API of the `mn-angular-lib/collection` entry point: collections (table, list, grid, pagination).
 *
 * Each entry point is its own module in the published package, so a consumer's bundler
 * splits it into the chunk that uses it instead of loading the whole library at startup.
 * The root `mn-angular-lib` entry re-exports every entry point.
 */
export * from './src/mn-collection';
export * from './src/mn-table';
export * from './src/mn-list';
export * from './src/mn-grid';
