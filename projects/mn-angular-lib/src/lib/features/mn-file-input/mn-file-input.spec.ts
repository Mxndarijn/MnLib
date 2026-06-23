import {ComponentFixture, TestBed} from '@angular/core/testing';
import {HttpClientTestingModule} from '@angular/common/http/testing';
import {MnFileInput, MnFileInputProps} from 'mn-angular-lib';

/** Builds a mock File of the given name/size/type. */
function mockFile(name: string, size: number, type = 'text/plain'): File {
  return new File([new Array(size).fill('a').join('')], name, {type});
}

/** Builds a fake file-input change event carrying the given files. */
function changeEvent(files: File[]): Event {
  return {target: {files, value: ''}} as unknown as Event;
}

describe('MnFileInput', () => {
  let fixture: ComponentFixture<MnFileInput>;
  let component: MnFileInput;
  let lastValue: unknown;
  let touched: boolean;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MnFileInput, HttpClientTestingModule],
    }).compileComponents();

    fixture = TestBed.createComponent(MnFileInput);
    component = fixture.componentInstance;
    lastValue = undefined;
    touched = false;
    component.registerOnChange((v) => (lastValue = v));
    component.registerOnTouched(() => (touched = true));
  });

  /** Sets props and runs ngOnInit. */
  function init(props: MnFileInputProps): void {
    component.props = props;
    fixture.detectChanges();
  }

  /** Reads the component's transient selection error (protected signal). */
  function internalError(): string | null {
    return (component as unknown as { internalError: () => string | null }).internalError();
  }

  it('emits a single File and marks touched in single mode', () => {
    init({id: 'f'});
    component.onFileSelected(changeEvent([mockFile('a.pdf', 10)]));
    expect(lastValue instanceof File).toBeTrue();
    expect((lastValue as File).name).toBe('a.pdf');
    expect(touched).toBeTrue();
  });

  it('keeps only the last file when several are picked in single mode', () => {
    init({id: 'f'});
    component.onFileSelected(changeEvent([mockFile('a.pdf', 10), mockFile('b.pdf', 10)]));
    expect(lastValue instanceof File).toBeTrue();
    expect((lastValue as File).name).toBe('b.pdf');
  });

  it('emits an array and appends across picks in multiple mode', () => {
    init({id: 'f', multiple: true});
    component.onFileSelected(changeEvent([mockFile('a.pdf', 10)]));
    component.onFileSelected(changeEvent([mockFile('b.pdf', 10)]));
    expect(Array.isArray(lastValue)).toBeTrue();
    expect((lastValue as File[]).map((f) => f.name)).toEqual(['a.pdf', 'b.pdf']);
  });

  it('rejects files that do not match accept and records an error', () => {
    init({id: 'f', accept: 'image/*'});
    component.onFileSelected(changeEvent([mockFile('a.pdf', 10, 'application/pdf')]));
    expect(lastValue).toBeNull();
    expect(internalError()).not.toBeNull();
  });

  it('accepts files matching an extension token', () => {
    init({id: 'f', accept: '.pdf,.doc'});
    component.onFileSelected(changeEvent([mockFile('a.pdf', 10, 'application/pdf')]));
    expect((lastValue as File).name).toBe('a.pdf');
    expect(internalError()).toBeNull();
  });

  it('rejects files larger than maxSize', () => {
    init({id: 'f', maxSize: 50});
    component.onFileSelected(changeEvent([mockFile('big.pdf', 100), mockFile('small.pdf', 30)]));
    expect((lastValue as File).name).toBe('small.pdf');
    expect(internalError()).not.toBeNull();
  });

  it('enforces maxFiles in multiple mode', () => {
    init({id: 'f', multiple: true, maxFiles: 2});
    component.onFileSelected(
      changeEvent([mockFile('a.pdf', 10), mockFile('b.pdf', 10), mockFile('c.pdf', 10)]),
    );
    expect((lastValue as File[]).length).toBe(2);
    expect(internalError()).not.toBeNull();
  });

  it('removes a selected file by index (multiple)', () => {
    init({id: 'f', multiple: true});
    component.onFileSelected(changeEvent([mockFile('a.pdf', 10), mockFile('b.pdf', 10)]));
    component.removeFile(0);
    expect((lastValue as File[]).map((f) => f.name)).toEqual(['b.pdf']);
  });

  it('emits null when the only file is removed (single)', () => {
    init({id: 'f'});
    component.onFileSelected(changeEvent([mockFile('a.pdf', 10)]));
    component.removeFile(0);
    expect(lastValue).toBeNull();
  });

  it('shows an existing image via currentUrl and emits cleared on removal', () => {
    let cleared = false;
    component.cleared.subscribe(() => (cleared = true));
    init({id: 'f', currentUrl: 'https://example.com/cover.png'});

    expect(component.displayItems().length).toBe(1);
    expect(component.displayItems()[0].existing).toBeTrue();

    component.removeExisting(0);
    expect(cleared).toBeTrue();
    expect(component.displayItems().length).toBe(0);
  });

  it('flags non-image selections as files, not images', () => {
    init({id: 'f'});
    component.onFileSelected(changeEvent([mockFile('a.pdf', 10, 'application/pdf')]));
    expect(component.displayItems()[0].isImage).toBeFalse();
  });

  it('writeValue accepts a File (single) and an array (multiple)', () => {
    init({id: 'f'});
    component.writeValue(mockFile('a.pdf', 10));
    expect(component.displayItems().length).toBe(1);

    component.writeValue([mockFile('a.pdf', 10), mockFile('b.pdf', 10)]);
    expect(component.displayItems().length).toBe(2);

    component.writeValue(null);
    expect(component.displayItems().length).toBe(0);
  });
});
