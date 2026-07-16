import {TestBed} from '@angular/core/testing';
import {provideHttpClient} from '@angular/common/http';
import {provideHttpClientTesting} from '@angular/common/http/testing';
import {ActionStyle, MnModalService, ModalBuilder} from '.';

describe('MnModalService', () => {
  let service: MnModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    service = TestBed.inject(MnModalService);
  });

  it('lets update() add footer actions to a frozen built config without throwing', () => {
    // ModalBuilder.build() returns a frozen config; MnModalRef.update() mutates the
    // config in place. open() must operate on a mutable copy, otherwise adding a
    // runtime key like footerActions throws "Object is not extensible".
    const config = ModalBuilder.custom().title('Frozen').build();
    expect(Object.isFrozen(config)).toBeTrue();

    const ref = service.open(config);
    expect(() =>
      ref.update({footerActions: [{label: 'OK', style: ActionStyle.PRIMARY}]}),
    ).not.toThrow();

    const shell = ref.component as { config: { footerActions?: unknown[] } };
    expect(shell.config.footerActions?.length).toBe(1);
    // The caller's built config stays untouched (immutability guarantee).
    expect((config as { footerActions?: unknown[] }).footerActions).toBeUndefined();

    ref.close();
  });
});
