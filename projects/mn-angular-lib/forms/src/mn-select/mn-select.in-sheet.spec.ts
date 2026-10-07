import { Type } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { MN_IN_BOTTOM_SHEET, MN_IN_MODAL } from 'mn-angular-lib/core';
import { MnSelect } from './mn-select';
import { MnMultiSelect } from '../mn-multi-select/mn-multi-select';

/** The private narrow-viewport flag both selects set from a media query. */
type Narrowable = { isNarrowViewport: boolean };

/**
 * A select on a phone opens its options as a bottom sheet of its own. Inside a sheet (an
 * mn-bottom-sheet, or a modal, which is one on a phone) that stacked a second sheet over the
 * first and hid the form around it, so there it opens as an anchored dropdown instead — and
 * stands out from the sheet it shares a background with: a dimming shield and a firmer edge,
 * both layered above the sheet's own z-index.
 */
describe('mn-select and mn-multi-select inside a sheet', () => {
  const options = [
    { label: 'Admin', value: 'admin' },
    { label: 'Editor', value: 'editor' },
  ];

  /**
   * Creates one select on a narrow screen.
   * @param component The select component.
   * @param providers What the select's surroundings provide.
   * @returns The component instance.
   */
  function narrow<C>(component: Type<C>, providers: unknown[] = []): C {
    TestBed.configureTestingModule({
      imports: [component],
      providers: [provideHttpClient(withXhr()), provideHttpClientTesting(), ...(providers as never[])],
    });
    const fixture = TestBed.createComponent(component);
    (fixture.componentInstance as { props: unknown }).props = { id: 'probe', options };
    fixture.detectChanges();
    (fixture.componentInstance as unknown as Narrowable).isNarrowViewport = true;
    return fixture.componentInstance;
  }

  it('opens a sheet of its own on a phone outside any sheet', () => {
    const select = narrow(MnSelect);
    expect(select.isSheet).toBeTrue();
    expect(select.shieldClasses).not.toContain('bg-black');
  });

  it('opens a dropdown inside a bottom sheet, dimmed and above the sheet', () => {
    const select = narrow(MnSelect, [{ provide: MN_IN_BOTTOM_SHEET, useValue: true }]);
    expect(select.isSheet).toBeFalse();
    expect(select.shieldClasses).toContain('bg-black/30');
    expect(select.shieldClasses).toContain('z-[10000]');
    expect(select.panelClasses).toContain('z-[10001]');
  });

  it('opens a dropdown inside a modal', () => {
    expect(narrow(MnSelect, [{ provide: MN_IN_MODAL, useValue: true }]).isSheet).toBeFalse();
  });

  it('does the same for a multi-select', () => {
    const multi = narrow(MnMultiSelect, [{ provide: MN_IN_BOTTOM_SHEET, useValue: true }]);
    expect(multi.isSheet).toBeFalse();
    expect(multi.shieldClasses).toContain('bg-black/30');
  });
});
