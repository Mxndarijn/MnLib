import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActionStyle, MN_MODAL_ACTION_ICONS, ModalFooterAction } from 'mn-angular-lib/modal-core';
import { MnFooterActionsComponent } from './mn-footer-actions.component';

/** Covers where a footer action draws its icon: before the label, or after it with `iconPosition: 'end'`. */
describe('MnFooterActionsComponent icon position', () => {
  let fixture: ComponentFixture<MnFooterActionsComponent>;

  /**
   * Renders one right-hand action and returns its button.
   * @param action The footer action under test.
   */
  function render(action: ModalFooterAction): HTMLButtonElement {
    fixture.componentInstance.actions = [action];
    fixture.detectChanges();
    return fixture.nativeElement.querySelector('button') as HTMLButtonElement;
  }

  /**
   * Whether the button's icon comes after its label text.
   * @param button The rendered button.
   */
  function iconIsAfterLabel(button: HTMLButtonElement): boolean {
    const svg = button.querySelector('svg')!;
    const label = [...button.childNodes].find((n) => n.nodeType === Node.TEXT_NODE && n.textContent!.trim())!;
    return !!(label.compareDocumentPosition(svg) & Node.DOCUMENT_POSITION_FOLLOWING);
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [MnFooterActionsComponent] }).compileComponents();
    fixture = TestBed.createComponent(MnFooterActionsComponent);
  });

  it('draws the icon before the label by default', () => {
    const button = render({ label: 'Opslaan', style: ActionStyle.PRIMARY });
    expect(button.querySelector('svg')).not.toBeNull();
    expect(iconIsAfterLabel(button)).toBeFalse();
  });

  it('draws the icon after the label with iconPosition end', () => {
    const button = render({
      label: 'Volgende',
      style: ActionStyle.PRIMARY,
      icon: MN_MODAL_ACTION_ICONS.next,
      iconPosition: 'end',
    });
    expect(button.querySelectorAll('svg').length).toBe(1);
    expect(iconIsAfterLabel(button)).toBeTrue();
  });
});
