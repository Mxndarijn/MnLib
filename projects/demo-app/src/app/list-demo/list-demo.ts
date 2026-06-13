import {Component, OnInit, TemplateRef, viewChild} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {ListDataSource, MnList} from 'mn-angular-lib';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  age: number;
  joinedAt: string;
}

const SAMPLE_USERS: User[] = [
  {id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', age: 32, joinedAt: '2023-01-15'},
  {id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'Editor', age: 28, joinedAt: '2023-03-22'},
  {id: '3', name: 'Charlie Brown', email: 'charlie@example.com', role: 'Viewer', age: 45, joinedAt: '2022-11-01'},
  {id: '4', name: 'Diana Prince', email: 'diana@example.com', role: 'Admin', age: 30, joinedAt: '2024-06-10'},
  {id: '5', name: 'Eve Davis', email: 'eve@example.com', role: 'Editor', age: 27, joinedAt: '2024-01-05'},
];

const ALL_USERS: User[] = [
  {id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin', age: 32, joinedAt: '2023-01-15'},
  {id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'Editor', age: 28, joinedAt: '2023-03-22'},
  {id: '3', name: 'Charlie Brown', email: 'charlie@example.com', role: 'Viewer', age: 45, joinedAt: '2022-11-01'},
  {id: '4', name: 'Diana Prince', email: 'diana@example.com', role: 'Admin', age: 30, joinedAt: '2024-06-10'},
  {id: '5', name: 'Eve Davis', email: 'eve@example.com', role: 'Editor', age: 27, joinedAt: '2024-01-05'},
  {id: '6', name: 'Frank Miller', email: 'frank@example.com', role: 'Viewer', age: 38, joinedAt: '2024-08-20'},
  {id: '7', name: 'Grace Lee', email: 'grace@example.com', role: 'Editor', age: 29, joinedAt: '2024-09-12'},
  {id: '8', name: 'Hank Wilson', email: 'hank@example.com', role: 'Viewer', age: 41, joinedAt: '2023-05-18'},
  {id: '9', name: 'Ivy Chen', email: 'ivy@example.com', role: 'Admin', age: 26, joinedAt: '2024-02-14'},
  {id: '10', name: 'Jack Turner', email: 'jack@example.com', role: 'Editor', age: 35, joinedAt: '2023-07-30'},
  {id: '11', name: 'Karen White', email: 'karen@example.com', role: 'Viewer', age: 33, joinedAt: '2022-12-05'},
  {id: '12', name: 'Leo Martinez', email: 'leo@example.com', role: 'Admin', age: 40, joinedAt: '2023-09-01'},
  {id: '13', name: 'Mia Robinson', email: 'mia@example.com', role: 'Editor', age: 24, joinedAt: '2024-04-22'},
  {id: '14', name: 'Noah Clark', email: 'noah@example.com', role: 'Viewer', age: 37, joinedAt: '2023-11-10'},
  {id: '15', name: 'Olivia Hall', email: 'olivia@example.com', role: 'Admin', age: 31, joinedAt: '2024-07-03'},
];

@Component({
  selector: 'app-list-demo',
  standalone: true,
  imports: [MnList],
  templateUrl: './list-demo.html',
})
export class ListDemo implements OnInit {
  selectedNames = 'none';

  readonly basicItemTpl = viewChild.required<TemplateRef<unknown>>('basicItemTpl');
  readonly selectionItemTpl = viewChild.required<TemplateRef<unknown>>('selectionItemTpl');
  readonly searchItemTpl = viewChild.required<TemplateRef<unknown>>('searchItemTpl');
  readonly paginatedItemTpl = viewChild.required<TemplateRef<unknown>>('paginatedItemTpl');
  readonly clientPaginatedItemTpl = viewChild.required<TemplateRef<unknown>>('clientPaginatedItemTpl');
  // ── Searchable + load more list (server-side) ──
  searchDataSource!: ListDataSource<User>;
  // ── Paginated list (server-side) ──
  paginatedDataSource!: ListDataSource<User>;
  // ── Client-side paginated list ──
  clientPaginatedDataSource!: ListDataSource<User>;
  // ── Server-side pagination state ──
  private paginatedPage = 1;
  private paginatedSize = 5;

  // ── Basic list ──
  basicDataSource!: ListDataSource<User>;

  // ── Selection list ──
  selectionDataSource!: ListDataSource<User>;
  private paginatedSearch = '';
  private loadMoreLoaded = 5;
  private loadMoreSearch = '';

  // ── Empty list ──
  emptyDataSource!: ListDataSource<User>;

  ngOnInit(): void {
    this.basicDataSource = {
      dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
      getID: (row) => row.id,
      itemTemplate: this.basicItemTpl(),
      emptyMessage: 'No users found.',
      isDataLoading: false,
      canSearch: false,
      paginationMode: 'none',
      appearance: {hover: true, dividers: true},
    };

    this.selectionDataSource = {
      dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
      getID: (row) => row.id,
      itemTemplate: this.selectionItemTpl(),
      emptyMessage: 'No users found.',
      isDataLoading: false,
      canSearch: false,
      paginationMode: 'none',
      selectionMode: 'multi',
      selectedRows: new BehaviorSubject<User[]>([]),
      appearance: {hover: true, dividers: true},
    };

    this.searchDataSource = {
      dataRows: new BehaviorSubject<User[]>([]),
      getID: (row) => row.id,
      itemTemplate: this.searchItemTpl(),
      emptyMessage: 'No users match your search.',
      isDataLoading: false,
      canSearch: true,
      searchPlaceholder: 'Search users...',
      paginationMode: 'load-more',
      totalItems: ALL_USERS.length,
      onLoadMore: () => this.fetchLoadMoreBatch(false),
      onServerSearch: (term) => {
        this.loadMoreSearch = term;
        this.loadMoreLoaded = 5;
        this.fetchLoadMoreBatch(true);
      },
      appearance: {hover: true, compact: true, dividers: true},
    };

    this.paginatedDataSource = {
      dataRows: new BehaviorSubject<User[]>([]),
      getID: (row) => row.id,
      itemTemplate: this.paginatedItemTpl(),
      emptyMessage: 'No users found.',
      isDataLoading: false,
      canSearch: true,
      searchPlaceholder: 'Search paginated users...',
      paginationMode: 'paginated',
      pageSize: 5,
      pageSizeOptions: [5, 10, 15],
      totalItems: ALL_USERS.length,
      onPageChange: (page) => {
        this.paginatedPage = page;
        this.fetchPaginatedPage();
      },
      onPageSizeChange: (size) => {
        this.paginatedSize = size;
        this.paginatedPage = 1;
        this.fetchPaginatedPage();
      },
      onServerSearch: (term) => {
        this.paginatedSearch = term;
        this.paginatedPage = 1;
        this.fetchPaginatedPage();
      },
      appearance: {hover: true, dividers: true, bordered: true},
    };

    this.clientPaginatedDataSource = {
      dataRows: new BehaviorSubject<User[]>([...ALL_USERS]),
      getID: (row) => row.id,
      itemTemplate: this.clientPaginatedItemTpl(),
      emptyMessage: 'No users found.',
      isDataLoading: false,
      canSearch: true,
      searchPlaceholder: 'Search client-side...',
      isInSearch: (row, term) => row.name.toLowerCase().includes(term) || row.email.toLowerCase().includes(term),
      paginationMode: 'client-side-pagination',
      pageSize: 5,
      pageSizeOptions: [5, 10, 15],
      appearance: {hover: true, dividers: true, bordered: true},
    };

    this.emptyDataSource = {
      dataRows: new BehaviorSubject<User[]>([]),
      getID: (row) => row.id,
      itemTemplate: this.basicItemTpl(),
      emptyMessage: 'No data available. Try adding some users.',
      isDataLoading: false,
      canSearch: false,
      paginationMode: 'none',
    };

    // Initialize server-side data
    this.fetchPaginatedPage();
    this.fetchLoadMoreBatch(true);
  }

  onSelectionChange(selected: User[]): void {
    this.selectedNames = selected.length > 0 ? selected.map(u => u.name).join(', ') : 'none';
  }

  onItemClicked(user: User): void {
    console.log('Item clicked:', user.name);
  }

  // ── Server-side simulation helpers ──

  private getFilteredUsers(search: string): User[] {
    if (!search) return ALL_USERS;
    const term = search.toLowerCase();
    return ALL_USERS.filter(u => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term));
  }

  private fetchPaginatedPage(): void {
    const filtered = this.getFilteredUsers(this.paginatedSearch);
    const start = (this.paginatedPage - 1) * this.paginatedSize;
    const page = filtered.slice(start, start + this.paginatedSize);
    this.paginatedDataSource.totalItems = filtered.length;
    this.paginatedDataSource.dataRows.next(page);
  }

  private fetchLoadMoreBatch(reset: boolean): void {
    const filtered = this.getFilteredUsers(this.loadMoreSearch);
    if (reset) {
      const batch = filtered.slice(0, this.loadMoreLoaded);
      this.searchDataSource.totalItems = filtered.length;
      this.searchDataSource.dataRows.next(batch);
    } else {
      const nextBatch = filtered.slice(this.loadMoreLoaded, this.loadMoreLoaded + 5);
      this.loadMoreLoaded += nextBatch.length;
      const current = this.searchDataSource.dataRows.value;
      this.searchDataSource.totalItems = filtered.length;
      this.searchDataSource.dataRows.next([...current, ...nextBatch]);
    }
  }
}
