import { Component, TemplateRef, ViewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { BehaviorSubject } from 'rxjs';

import { MnList } from './mn-list.component';
import { ListDataSource } from './mn-list.types';
import { MnCollectionState } from '../mn-collection';

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
