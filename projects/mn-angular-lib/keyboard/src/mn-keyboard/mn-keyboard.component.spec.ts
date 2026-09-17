import {ComponentFixture, TestBed} from '@angular/core/testing';
import {MnKeyboard} from './mn-keyboard.component';

/**
 * Tests for {@link MnKeyboard}.
 *
 * The behaviour worth pinning is that it is *controlled*: it reports what the text
 * should become and never assumes it owns the field, because on a kiosk the same
 * value is also written by a barcode scanner. The layout switch and the length cap
 * are the other two things a consumer relies on.
 */
describe('MnKeyboard', () => {
  let fixture: ComponentFixture<MnKeyboard>;
  let component: MnKeyboard;

  beforeEach(async () => {
    await TestBed.configureTestingModule({imports: [MnKeyboard]}).compileComponents();
    fixture = TestBed.createComponent(MnKeyboard);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  /** Collects every value the component emits. */
  const emissions = (): string[] => {
    const seen: string[] = [];
    component.valueChange.subscribe((value) => seen.push(value));
    return seen;
  };

  it('creates', () => {
    expect(component).toBeTruthy();
  });

  it('appends a pressed key to the current value', () => {
    const seen = emissions();
    component.value = 'ab';

    component.press('c');

    expect(seen).toEqual(['abc']);
  });

  it('removes the last character on backspace', () => {
    const seen = emissions();
    component.value = 'abc';

    component.backspace();

    expect(seen).toEqual(['ab']);
  });

  it('empties the value on clear', () => {
    const seen = emissions();
    component.value = 'abc';

    component.clear();

    expect(seen).toEqual(['']);
  });

  it('does not emit when nothing would change', () => {
    const seen = emissions();
    component.value = '';

    component.backspace();
    component.clear();

    expect(seen).toEqual([]);
  });

  it('clamps to maxLength so a scanner burst cannot overrun the field', () => {
    const seen = emissions();
    component.maxLength = 3;
    component.value = 'abc';

    component.press('d');

    expect(seen).toEqual([]);
  });

  it('renders a digit row above the letters for the alphanumeric layout', () => {
    component.layout = 'alphanumeric';

    expect(component.rows[0]).toEqual(['1', '2', '3', '4', '5', '6', '7', '8', '9', '0']);
    expect(component.rows.length).toBe(4);
  });

  it('drops the digit row for the alpha layout', () => {
    component.layout = 'alpha';

    expect(component.rows[0][0]).toBe('q');
    expect(component.rows.length).toBe(3);
  });

  it('renders a phone pad for the numeric layout, with no space key', () => {
    component.layout = 'numeric';

    expect(component.rows[0]).toEqual(['1', '2', '3']);
    expect(component.spaceVisible).toBeFalse();
  });

  it('upper-cases the letters when asked', () => {
    component.layout = 'alpha';
    component.uppercase = true;

    expect(component.rows[0][0]).toBe('Q');
  });

  it('types the case that is displayed', () => {
    const seen = emissions();
    component.uppercase = true;

    component.press(component.rows[1][0]);

    expect(seen).toEqual(['Q']);
  });

  it('hides the space key when the host forbids spaces', () => {
    component.allowSpace = false;

    expect(component.spaceVisible).toBeFalse();
  });

  it('reports a submit press with the current value', () => {
    const seen: string[] = [];
    component.submitted.subscribe((value) => seen.push(value));
    component.value = 'ada';

    component.submit();

    expect(seen).toEqual(['ada']);
  });

  it('ignores a submit press while submitting is disabled', () => {
    const seen: string[] = [];
    component.submitted.subscribe((value) => seen.push(value));
    component.submitDisabled = true;

    component.submit();

    expect(seen).toEqual([]);
  });

  it('reports a dismissal so a sheet host can close itself', () => {
    let dismissed = 0;
    component.dismissed.subscribe(() => (dismissed += 1));

    component.onDismiss();

    expect(dismissed).toBe(1);
  });
});
