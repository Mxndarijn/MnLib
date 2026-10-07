import { Component, provideZonelessChangeDetection, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient, withXhr } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { BehaviorSubject } from 'rxjs';
import { ColumnDefinition, MnTable, TableDataSource } from 'mn-angular-lib';

/** A row with one column a phone shows and one only the sheet lists. */
type Row = { id: string; name: string; notes: string };

/** Hosts the table at phone width with a signal-bound data source, the way a zoneless app does. */
@Component({
  standalone: true,
  imports: [MnTable],
  template: `<div style="width: 375px"><mn-table [dataSource]="source()"></mn-table></div>`,
})
class HostComponent {
  readonly source = signal<TableDataSource<Row>>({
    dataRows: new BehaviorSubject<Row[]>([
      { id: '1', name: 'Ada Lovelace', notes: 'Keyholder' },
      { id: '2', name: 'Alan Turing', notes: '' },
    ]),
    getID: (row) => row.id,
    emptyMessage: 'Empty',
    canSearch: false,
    columns: [
      { key: 'name', header: 'Name', cell: (row) => row.name },
      { key: 'notes', header: 'Notes', cell: (row) => row.notes, hiddenBelow: 'lg' },
      { key: 'actions', header: 'Actions', actions: [{ label: 'Edit', run: () => undefined }] } as ColumnDefinition<Row>,
    ],
  });
}

/**
 * The detail sheet clears itself after an `await` (its exit animation), with no event behind
 * the clearing. In a zoneless app an OnPush view nobody marked is skipped, so without its own
 * markForCheck the sheet would stay on screen. Nothing here calls `detectChanges()` after the act.
 */
describe('MnTable row mode (zoneless change detection)', () => {
  let fixture: ComponentFixture<HostComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideZonelessChangeDetection(), provideHttpClient(withXhr()), provideHttpClientTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    fixture.autoDetectChanges();
    await fixture.whenStable();
  });

  afterEach(() => fixture.destroy());

  /**
   * Waits until a condition holds, letting Angular's scheduler and the sheet's exit run.
   * @param condition The condition.
   * @returns Whether it held within the time allowed.
   */
  async function waitFor(condition: () => boolean): Promise<boolean> {
    for (let i = 0; i < 40; i++) {
      await fixture.whenStable();
      if (condition()) return true;
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    return condition();
  }

  /** @returns The open bottom sheet, or null. */
  function sheet(): HTMLElement | null {
    return document.querySelector('mn-bottom-sheet');
  }

  it('opens the sheet on a tap and removes it again after Escape', async () => {
    const open = fixture.nativeElement.querySelector('li button[aria-haspopup="dialog"]') as HTMLButtonElement;
    expect(open).not.toBeNull();
    open.click();
    expect(await waitFor(() => sheet() !== null)).toBeTrue();

    const heading = sheet()!.querySelector('h2') as HTMLElement;
    heading.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));

    expect(await waitFor(() => sheet() === null)).toBeTrue();
  });
});
