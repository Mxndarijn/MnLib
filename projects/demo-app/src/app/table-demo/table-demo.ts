import {Component, TemplateRef, viewChild} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {ColumnSortType, MnTable, SortState, TableDataSource} from 'mn-angular-lib';

interface User {
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
  {id: '16', name: 'Paul Adams', email: 'paul@example.com', role: 'Editor', age: 29, joinedAt: '2023-02-28'},
  {id: '17', name: 'Quinn Baker', email: 'quinn@example.com', role: 'Viewer', age: 44, joinedAt: '2022-10-15'},
  {id: '18', name: 'Ruby Scott', email: 'ruby@example.com', role: 'Admin', age: 36, joinedAt: '2024-05-19'},
];

@Component({
  selector: 'app-table-demo',
  standalone: true,
  imports: [MnTable],
  templateUrl: './table-demo.html',
})
export class TableDemo {
  selectedNames = 'none';

  readonly actionsTpl = viewChild.required<TemplateRef<any>>('actionsTpl');

  // ── Basic table ──
  basicDataSource: TableDataSource<User> = {
    dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
    getID: (row) => row.id,
    emptyMessage: 'No users found.',
    isDataLoading: false,
    canSearch: false,
    paginationMode: 'none',
    appearance: {hover: true, striped: true},
    columns: [
      {key: 'name', header: 'Name', cell: (row) => row.name, sortType: ColumnSortType.ALPHABETICAL},
      {key: 'email', header: 'Email', cell: (row) => row.email, sortType: ColumnSortType.ALPHABETICAL, hiddenBelow: 'sm'},
      {key: 'role', header: 'Role', cell: (row) => row.role, width: '100px', align: 'center'},
      {key: 'age', header: 'Age', cell: (row) => String(row.age), sortType: ColumnSortType.NUMERICAL, width: '80px', align: 'right'},
      {key: 'joined', header: 'Joined', cell: (row) => row.joinedAt, sortType: ColumnSortType.DATE, hiddenBelow: 'md'},
    ],
    defaultSort: {columnKey: 'name', direction: 'asc'},
  };
  // ── Selection table ──
  selectionDataSource: TableDataSource<User> = {
    dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
    getID: (row) => row.id,
    emptyMessage: 'No users found.',
    isDataLoading: false,
    canSearch: false,
    paginationMode: 'none',
    selectionMode: 'multi',
    selectedRows: new BehaviorSubject<User[]>([]),
    appearance: {hover: true},
    columns: [
      {key: 'name', header: 'Name', cell: (row) => row.name},
      {key: 'email', header: 'Email', cell: (row) => row.email},
      {key: 'role', header: 'Role', cell: (row) => row.role},
    ],
  };
  // ── Column filters table ──
  filterDataSource: TableDataSource<User> = {
    dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
    getID: (row) => row.id,
    emptyMessage: 'No users match the filters.',
    isDataLoading: false,
    canSearch: false,
    paginationMode: 'none',
    appearance: {hover: true, striped: true},
    columns: [
      {
        key: 'name',
        header: 'Name',
        cell: (row) => row.name,
        sortType: ColumnSortType.ALPHABETICAL,
        filterable: true,
        filterPlaceholder: 'Filter name…',
      },
      {
        key: 'email',
        header: 'Email',
        cell: (row) => row.email,
        filterable: true,
        filterPlaceholder: 'Filter email…',
      },
      {
        key: 'role',
        header: 'Role',
        cell: (row) => row.role,
        filterable: true,
        filterType: 'select',
        filterPlaceholder: 'All roles',
        filterOptions: [
          {label: 'Admin', value: 'Admin'},
          {label: 'Editor', value: 'Editor'},
          {label: 'Viewer', value: 'Viewer'},
        ],
      },
      {
        key: 'age',
        header: 'Age',
        cell: (row) => String(row.age),
        sortType: ColumnSortType.NUMERICAL,
        width: '80px',
        align: 'right',
      },
    ],
  };
  // ── Client-side paginated table ──
  clientPaginatedDataSource: TableDataSource<User> = {
    dataRows: new BehaviorSubject<User[]>([...ALL_USERS]),
    getID: (row) => row.id,
    emptyMessage: 'No users found.',
    isDataLoading: false,
    canSearch: true,
    searchPlaceholder: 'Search client-side...',
    isInSearch: (row, term) => row.name.toLowerCase().includes(term) || row.email.toLowerCase().includes(term),
    paginationMode: 'client-side-pagination',
    pageSize: 5,
    pageSizeOptions: [5, 10, 15],
    appearance: {hover: true, striped: true},
    columns: [
      {key: 'name', header: 'Name', cell: (row) => row.name, sortType: ColumnSortType.ALPHABETICAL},
      {key: 'email', header: 'Email', cell: (row) => row.email},
      {key: 'role', header: 'Role', cell: (row) => row.role, width: '100px', align: 'center'},
      {
        key: 'age',
        header: 'Age',
        cell: (row) => String(row.age),
        sortType: ColumnSortType.NUMERICAL,
        width: '80px',
        align: 'right'
      },
    ],
  };
  // ── Empty table ──
  emptyDataSource: TableDataSource<User> = {
    dataRows: new BehaviorSubject<User[]>([]),
    getID: (row) => row.id,
    emptyMessage: 'No data available. Try adding some users.',
    isDataLoading: false,
    canSearch: false,
    paginationMode: 'none',
    columns: [
      {key: 'name', header: 'Name', cell: (row) => row.name},
      {key: 'email', header: 'Email', cell: (row) => row.email},
    ],
  };
  // ── Actions table ──
  actionsDataSource!: TableDataSource<User>;
  // ── Server-side pagination state ──
  private paginatedPage = 1;
  private paginatedSize = 5;
  private paginatedSearch = '';
  // ── Paginated table (server-side) ──
  paginatedDataSource: TableDataSource<User> = {
    dataRows: new BehaviorSubject<User[]>([]),
    getID: (row) => row.id,
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
    appearance: {hover: true, striped: true},
    columns: [
      {key: 'name', header: 'Name', cell: (row) => row.name, sortType: ColumnSortType.ALPHABETICAL},
      {key: 'email', header: 'Email', cell: (row) => row.email, sortType: ColumnSortType.ALPHABETICAL, hiddenBelow: 'sm'},
      {key: 'role', header: 'Role', cell: (row) => row.role, width: '100px', align: 'center'},
      {key: 'age', header: 'Age', cell: (row) => String(row.age), sortType: ColumnSortType.NUMERICAL, width: '80px', align: 'right'},
      {key: 'joined', header: 'Joined', cell: (row) => row.joinedAt, sortType: ColumnSortType.DATE, hiddenBelow: 'md'},
    ],
    defaultSort: {columnKey: 'name', direction: 'asc'},
  };
  private loadMoreLoaded = 5;
  private loadMoreSearch = '';
  // ── Searchable + load more table (server-side) ──
  searchDataSource: TableDataSource<User> = {
    dataRows: new BehaviorSubject<User[]>([]),
    getID: (row) => row.id,
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
    appearance: {hover: true, compact: true},
    columns: [
      {key: 'name', header: 'Name', cell: (row) => row.name, sortType: ColumnSortType.ALPHABETICAL},
      {key: 'email', header: 'Email', cell: (row) => row.email},
      {key: 'role', header: 'Role', cell: (row) => row.role},
      {key: 'age', header: 'Age', cell: (row) => String(row.age), sortType: ColumnSortType.NUMERICAL, align: 'right'},
    ],
  };

  onAction(action: string, user: User): void {
    alert(`${action} ${user.name}`);
  }

  ngOnInit(): void {
    this.actionsDataSource = {
      dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
      getID: (row) => row.id,
      emptyMessage: 'No users found.',
      isDataLoading: false,
      canSearch: false,
      paginationMode: 'none',
      appearance: {hover: true, bordered: true},
      columns: [
        {key: 'name', header: 'Name', cell: (row) => row.name},
        {key: 'role', header: 'Role', cell: (row) => row.role},
        {key: 'actions', header: 'Actions', cell: this.actionsTpl(), align: 'right', width: '150px'},
      ],
    };

    // Initialize paginated table with first page
    this.fetchPaginatedPage();

    // Initialize load-more table with first batch
    this.fetchLoadMoreBatch(true);
  }

  onSortChange(sort: SortState | null): void {
    console.log('Sort changed:', sort);
  }

  onSelectionChange(selected: User[]): void {
    this.selectedNames = selected.length > 0 ? selected.map(u => u.name).join(', ') : 'none';
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
