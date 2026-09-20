import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActionStyle, ModalBuilder, ModalCloseReason } from 'mn-angular-lib/modal-core';
import { firstValueFrom } from 'rxjs';
import { MnModalService } from './mn-modal.service';

describe('MnModalService', () => {
  let service: MnModalService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting()],
    });
    service = TestBed.inject(MnModalService);
  });

  it('returns a ref straight away and mounts the shell once the modal components load', async () => {
    const ref = service.open(ModalBuilder.custom().title('Lazy').build());
    const closed = firstValueFrom(ref.afterClosed$);

    await service.preload();
    await Promise.resolve();

    expect(ref.component).toBeDefined();
    expect(document.querySelector('mn-modal-shell')).not.toBeNull();
    ref.dismiss(ModalCloseReason.CANCELLED);
    expect((await closed).reason).toBe(ModalCloseReason.CANCELLED);
  });

  it('lets update() add footer actions to a frozen built config without throwing', async () => {
    await service.preload();
    // ModalBuilder.build() returns a frozen config; MnModalRef.update() mutates the
    // config in place. open() must operate on a mutable copy, otherwise adding a
    // runtime key like footerActions throws "Object is not extensible".
    const config = ModalBuilder.custom().title('Frozen').build();
    expect(Object.isFrozen(config)).toBeTrue();

    const ref = service.open(config);
    expect(() =>
      ref.update({ footerActions: [{ label: 'OK', style: ActionStyle.PRIMARY }] }),
    ).not.toThrow();

    const shell = ref.component as { config: { footerActions?: unknown[] } };
    expect(shell.config.footerActions?.length).toBe(1);
    // The caller's built config stays untouched (immutability guarantee).
    expect((config as { footerActions?: unknown[] }).footerActions).toBeUndefined();

    ref.close();
  });
});
