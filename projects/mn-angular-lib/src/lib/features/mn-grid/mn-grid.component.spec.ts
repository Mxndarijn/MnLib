import { Component, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { MnGrid } from './mn-grid.component';
import { GridDataSource } from './mn-grid.types';
import { MnCollectionState } from '../mn-collection';

/** One row of test data. */
type Row = { id: string; name: string };

/**
 * Host that supplies the grid with a card template plus the three toolbar
 * templates, so a test can assign any combination to the data source.
 */
@Component({
  standalone: true,
  imports: [MnGrid],
  template: `
    <ng-template #card let-row>
      <span class="card">{{ row.name }}</span>
    </ng-template>
    <ng-template #left><span class="left-slot">left</span></ng-template>
    <ng-template #right><span class="right-slot">right</span></ng-template>
    <ng-template #legacy><span class="legacy-slot">legacy</span></ng-template>
    <mn-grid [dataSource]="dataSource"></mn-grid>
  `,
})
class HostComponent {
  @ViewChild('card', { static: true }) card!: TemplateRef<unknown>;
  @ViewChild('left', { static: true }) left!: TemplateRef<unknown>;
  @ViewChild('right', { static: true }) right!: TemplateRef<unknown>;
  @ViewChild('legacy', { static: true }) legacy!: TemplateRef<unknown>;

  dataSource!: GridDataSource<Row>;
}

describe('MnGrid toolbar slots', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  /**
   * Builds a minimal valid data source.
   * @param extra Fields to merge over the defaults.
   * @returns The data source.
   */
  function makeDataSource(extra: Partial<GridDataSource<Row>> = {}): GridDataSource<Row> {
    return {
      dataRows: new BehaviorSubject<Row[]>([{ id: '1', name: 'Alpha' }]),
      cardTemplate: host.card,
      getID: (row: Row) => row.id,
      emptyMessage: '',
      state: MnCollectionState.RETRIEVED,
      canSearch: false,
      ...extra,
    } as GridDataSource<Row>;
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
    expect(el.querySelector('input[type="search"]')).toBeNull();
  });

  it('renders toolbarLeftTemplate before the search group', () => {
    host.dataSource = makeDataSource({ toolbarLeftTemplate: host.left, canSearch: true });
    fixture.detectChanges();

    const el: HTMLElement = fixture.nativeElement;
    const left = el.querySelector('.left-slot');
    const search = el.querySelector('input');
    expect(left).not.toBeNull();
    expect(search).not.toBeNull();
    // The left slot must precede the search field in document order.
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
