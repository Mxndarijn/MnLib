/**
 * Public API of the `mn-angular-lib/modal` entry point: the modal service.
 *
 * Each entry point is its own module in the published package, so a consumer's bundler
 * splits it into the chunk that uses it instead of loading the whole library at startup.
 * The root `mn-angular-lib` entry re-exports every entry point.
 */
export { MnModalService } from './src/mn-modal/mn-modal.service';
