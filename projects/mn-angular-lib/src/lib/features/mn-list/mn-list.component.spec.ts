import {Component, TemplateRef, ViewChild} from '@angular/core';
import {ComponentFixture, TestBed} from '@angular/core/testing';
import {BehaviorSubject} from 'rxjs';

import {MnList} from './mn-list.component';
import {ListDataSource} from './mn-list.types';
import {MnCollectionState} from '../mn-collection';
import {MnLanguageService} from '../../language';

/** One row of test data. */
type Row = { id: string; name: string };

/**
 * Host that supplies the list with an item template plus the three toolbar
 * templates, so a test can assign any combination to the data source.
 */
@Component({
  standalone: true,
  imports: [MnList],
  template: `
    <ng-template #item let-row>
      <span class="item">{{ row.name }}</span>
    </ng-template>
    <ng-template #left><span class="left-slot">left</span></ng-template>
    <ng-template #right><span class="right-slot">right</span></ng-template>
    <ng-template #legacy><span class="legacy-slot">legacy</span></ng-template>
    <mn-list [dataSource]="dataSource"></mn-list>
  `,
})
class HostComponent {
  @ViewChild('item', { static: true }) item!: TemplateRef<unknown>;
  @ViewChild('left', { static: true }) left!: TemplateRef<unknown>;
  @ViewChild('right', { static: true }) right!: TemplateRef<unknown>;
  @ViewChild('legacy', { static: true }) legacy!: TemplateRef<unknown>;

  dataSource!: ListDataSource<Row>;
}

describe('MnList toolbar slots', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  /**
   * Builds a minimal valid data source.
   * @param extra Fields to merge over the defaults.
   * @returns The data source.
   */
  function makeDataSource(extra: Partial<ListDataSource<Row>> = {}): ListDataSource<Row> {
    return {
      dataRows: new BehaviorSubject<Row[]>([{ id: '1', name: 'Alpha' }]),
      itemTemplate: host.item,
      getID: (row: Row) => row.id,
      emptyMessage: '',
      state: MnCollectionState.RETRIEVED,
      canSearch: false,
      ...extra,
    } as ListDataSource<Row>;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('renders nothing for the toolbar when there is no search and no template', () => {
    host.dataSource = makeDataSource();
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.left-slot')).toBeNull();
    expect(el.querySelector('.right-slot')).toBeNull();
    expect(el.querySelector('input')).toBeNull();
  });

  it('renders toolbarLeftTemplate before the search group', () => {
    host.dataSource = makeDataSource({ toolbarLeftTemplate: host.left, canSearch: true });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const left = el.querySelector('.left-slot');
    const search = el.querySelector('input');
    expect(left).not.toBeNull();
    expect(search).not.toBeNull();
    expect(left!.compareDocumentPosition(search!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('renders toolbarRightTemplate after the search field', () => {
    host.dataSource = makeDataSource({ toolbarRightTemplate: host.right, canSearch: true });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const right = el.querySelector('.right-slot');
    const search = el.querySelector('input');
    expect(right).not.toBeNull();
    expect(search!.compareDocumentPosition(right!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('still honours the deprecated toolbarTemplate, in the right slot', () => {
    host.dataSource = makeDataSource({ toolbarTemplate: host.legacy, canSearch: true });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const legacy = el.querySelector('.legacy-slot');
    const search = el.querySelector('input');
    expect(legacy).not.toBeNull();
    expect(search!.compareDocumentPosition(legacy!) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy();
  });

  it('prefers toolbarRightTemplate over the deprecated toolbarTemplate', () => {
    host.dataSource = makeDataSource({
      toolbarRightTemplate: host.right,
      toolbarTemplate: host.legacy,
    });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.right-slot')).not.toBeNull();
    expect(el.querySelector('.legacy-slot')).toBeNull();
  });

  it('renders both slots at once', () => {
    host.dataSource = makeDataSource({
      toolbarLeftTemplate: host.left,
      toolbarRightTemplate: host.right,
    });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    expect(el.querySelector('.left-slot')).not.toBeNull();
    expect(el.querySelector('.right-slot')).not.toBeNull();
  });
});

/**
 * The multi-select header checkbox is the one label mn-list renders on its own
 * behalf and no data source can supply, so until it went through `resolveLabel` a
 * consumer had no way at all to translate it — it was a literal in the template.
 */
describe('MnList select-all label', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  /** Translations the language stub reports as defined for the current test. */
  let bundle: Record<string, string>;

  /** The label rendered on the header checkbox, or null when it is not shown. */
  const selectAllLabel = (): string | null => {
    const el: HTMLElement | null = fixture.nativeElement.querySelector(
      'label[for="mn-list-select-all"], #mn-list-select-all',
    );
    return el ? (el.closest('label')?.textContent ?? el.textContent)?.trim() ?? null : null;
  };

  beforeEach(async () => {
    bundle = {};
    await TestBed.resetTestingModule()
      .configureTestingModule({
        imports: [HostComponent],
        providers: [
          {
            provide: MnLanguageService,
            useValue: {
              locale$: new BehaviorSubject<string>('en').asObservable(),
              translate: (key: string) => bundle[key] ?? key,
              t: (key: string) => bundle[key] ?? key,
              translateIfPresent: (key: string) => bundle[key],
            } as Partial<MnLanguageService>,
          },
        ],
      })
      .compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  /**
   * Builds a multi-select data source with one row.
   * @returns The data source.
   */
  function multiSelectSource(): ListDataSource<Row> {
    return {
      dataRows: new BehaviorSubject<Row[]>([{id: '1', name: 'Alpha'}]),
      itemTemplate: host.item,
      getID: (row: Row) => row.id,
      emptyMessage: '',
      state: MnCollectionState.RETRIEVED,
      canSearch: false,
      selectionMode: 'multi',
    } as ListDataSource<Row>;
  }

  it('falls back to English when the conventional key is not defined', () => {
    host.dataSource = multiSelectSource();
    fixture.detectChanges();

    expect(selectAllLabel()).toBe('Select all');
  });

  it('uses mnCollection.selectAll once the app defines it', () => {
    bundle = {'mnCollection.selectAll': 'Alles selecteren'};
    host.dataSource = multiSelectSource();
    fixture.detectChanges();

    expect(selectAllLabel()).toBe('Alles selecteren');
  });
});

/**
 * The toolbar search box follows the same auto-enable rule as mn-select's option
 * search: with `canSearch` unset it appears once the list holds 8 rows and a search
 * predicate exists. The rule itself is exercised in depth by the mn-table spec; this
 * proves the list template reads it.
 */
describe('MnList search auto-enable', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  /**
   * Builds a data source over `count` searchable rows with `canSearch` left unset.
   * @param count Number of rows to seed.
   */
  function makeDataSource(count: number): ListDataSource<Row> {
    return {
      dataRows: new BehaviorSubject<Row[]>(
        Array.from({length: count}, (_, i) => ({id: String(i + 1), name: `Row ${i + 1}`})),
      ),
      itemTemplate: host.item,
      getID: (row: Row) => row.id,
      emptyMessage: '',
      state: MnCollectionState.RETRIEVED,
      paginationMode: 'none',
      isInSearch: (row: Row, term: string) => row.name.toLowerCase().includes(term),
    } as ListDataSource<Row>;
  }

  beforeEach(async () => {
    await TestBed.configureTestingModule({ imports: [HostComponent] }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
  });

  it('hides the search box below 8 rows', () => {
    host.dataSource = makeDataSource(7);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('input[type="search"]')).toBeNull();
  });

  it('shows the search box from 8 rows', () => {
    host.dataSource = makeDataSource(8);
    fixture.detectChanges();

    expect(fixture.nativeElement.querySelector('input[type="search"]')).not.toBeNull();
  });
});
