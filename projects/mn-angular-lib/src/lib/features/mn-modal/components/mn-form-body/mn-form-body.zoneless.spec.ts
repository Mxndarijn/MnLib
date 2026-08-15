import {ComponentFixture, TestBed} from '@angular/core/testing';
import {provideZonelessChangeDetection} from '@angular/core';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {
  FieldKind,
  FormFieldConfig,
  FormModalConfig,
  MnFormBodyComponent,
  MnModalRef,
  ModalKind,
  SubmitMode,
} from '../..';

/**
 * Regression coverage for state this component mutates outside an Angular event handler.
 *
 * Consuming apps run zoneless, where a plain property write after an `await` (or from an
 * RxJS subscription) notifies nothing: the view is never marked dirty, so it keeps
 * rendering the stale value and `checkNoChanges` reports it as NG0100. These specs assert
 * the rendered DOM catches up, and deliberately never call `detectChanges()` after the
 * async work — forcing a render by hand would make them pass with the fix reverted.
 */
function createMockModalRef(): MnModalRef<unknown> {
  return {
    close: jasmine.createSpy('close'),
    dismiss: jasmine.createSpy('dismiss'),
    afterClosed$: {subscribe: () => {}},
  } as unknown as MnModalRef<unknown>;
}

describe('MnFormBodyComponent (zoneless change detection)', () => {
  let fixture: ComponentFixture<MnFormBodyComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnFormBodyComponent, HttpClientTestingModule],
      providers: [provideZonelessChangeDetection()],
    }).compileComponents();
  });

  /**
   * Renders the component and hands change detection to Angular's own scheduler, so the
   * specs observe exactly what a zoneless consumer would.
   */
  function setup(config: Partial<FormModalConfig<unknown>>): void {
    fixture = TestBed.createComponent(MnFormBodyComponent);
    fixture.componentInstance.config = {
      kind: ModalKind.FORM,
      ...config,
    } as unknown as FormModalConfig<unknown>;
    fixture.componentInstance.modalRef = createMockModalRef();
    fixture.autoDetectChanges();
  }

  function submitButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[type="submit"]') as HTMLButtonElement;
  }

  it('re-enables the submit button after a failed submit', async () => {
    let rejectSubmit!: (reason: Error) => void;
    const submitted = new Promise<void>((_, reject) => (rejectSubmit = reject));

    setup({
      fields: [
        {kind: FieldKind.CHECKBOX, key: 'a', label: 'A'},
        {kind: FieldKind.CHECKBOX, key: 'b', label: 'B'},
      ] as FormFieldConfig<Record<string, unknown>>[],
      initialValue: {a: true, b: true},
      submitMode: SubmitMode.ONCE,
      onComplete: {handle: () => submitted},
    });
    await fixture.whenStable();

    (fixture.nativeElement.querySelector('form') as HTMLFormElement).dispatchEvent(new Event('submit'));
    await fixture.whenStable();

    // SubmitMode.ONCE locks the button for the duration of the request.
    expect(submitButton().disabled).toBeTrue();

    // The failure is reported in a promise continuation. Nothing about that write is
    // visible to a zoneless app unless the component says so.
    rejectSubmit(new Error('submit failed'));
    await submitted.catch(() => undefined);
    await fixture.whenStable();

    expect(fixture.componentInstance.isSubmitting).toBeFalse();
    expect(submitButton().disabled)
      .withContext('a failed submit must leave the button usable so the action can be retried')
      .toBeFalse();
  });

  it('stops rendering the loading state once an async dataSource resolves', async () => {
    let resolveOptions!: (options: {label: string; value: string}[]) => void;
    const loaded = new Promise<{label: string; value: string}[]>((resolve) => (resolveOptions = resolve));

    setup({
      fields: [
        {
          kind: FieldKind.MULTI_SELECT,
          key: 'tags',
          label: 'Tags',
          options: [],
          dataSource: {load: () => loaded},
        },
      ] as FormFieldConfig<Record<string, unknown>>[],
    });
    await fixture.whenStable();

    expect(fixture.componentInstance.isFieldLoading('tags')).toBeTrue();
    expect(fixture.nativeElement.querySelector('mn-lib-multi-select')).toBeNull();

    resolveOptions([{label: 'Red', value: 'red'}]);
    await loaded;
    await fixture.whenStable();

    expect(fixture.componentInstance.isFieldLoading('tags')).toBeFalse();
    expect(fixture.nativeElement.querySelector('mn-lib-multi-select'))
      .withContext('the field must swap the spinner for the real control once options arrive')
      .not.toBeNull();
  });
});
