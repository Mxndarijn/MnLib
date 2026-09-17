/**
 * Public API of the `mn-angular-lib/modal-ui` entry point: the modal shell and body components. `MnModalService` loads this entry point on demand, so it is not part of a consumer's startup bundle.
 *
 * Each entry point is its own module in the published package, so a consumer's bundler
 * splits it into the chunk that uses it instead of loading the whole library at startup.
 * The root `mn-angular-lib` entry re-exports every entry point.
 */
export { MnModalShellComponent } from './src/mn-modal/components/mn-modal-shell/mn-modal-shell.component';
export { MnWizardBodyComponent } from './src/mn-modal/components/mn-wizard-body/mn-wizard-body.component';
export { MnFormBodyComponent } from './src/mn-modal/components/mn-form-body/mn-form-body.component';
export { MnConfirmationBodyComponent } from './src/mn-modal/components/mn-confirmation-body/mn-confirmation-body.component';
export { MnCustomBodyHostComponent } from './src/mn-modal/components/mn-custom-body-host/mn-custom-body-host.component';
