/**
 * Public API of the `mn-angular-lib/modal-core` entry point: modal types, builders, the modal ref and action icons, without any component.
 *
 * Each entry point is its own module in the published package, so a consumer's bundler
 * splits it into the chunk that uses it instead of loading the whole library at startup.
 * The root `mn-angular-lib` entry re-exports every entry point.
 */
export * from './src/mn-modal/mn-modal.types';
export * from './src/mn-modal/mn-modal-action-icons';
export * from './src/mn-modal/mn-modal-haptics';
export * from './src/mn-modal/builder';
export { MnModalRef } from './src/mn-modal/mn-modal-ref';
