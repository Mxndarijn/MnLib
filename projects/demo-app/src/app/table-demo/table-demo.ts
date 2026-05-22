import {Component, TemplateRef, viewChild} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {MnTable, TableDataSource, ColumnSortType, SortState} from 'mn-angular-lib';

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

const PAGINATED_USERS: User[] = [
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

const EXTRA_USERS: User[] = [
  {id: '6', name: 'Frank Miller', email: 'frank@example.com', role: 'Viewer', age: 38, joinedAt: '2024-08-20'},
  {id: '7', name: 'Grace Lee', email: 'grace@example.com', role: 'Editor', age: 29, joinedAt: '2024-09-12'},
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

  // ── Actions table ──
  actionsDataSource!: TableDataSource<User>;

  ngOnInit(): void {
    this.actionsDataSource = {
      dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
      getID: (row) => row.id,
      emptyMessage: 'No users found.',
      isDataLoading: false,
      canSearch: false,
      appearance: {hover: true, bordered: true},
      columns: [
        {key: 'name', header: 'Name', cell: (row) => row.name},
        {key: 'role', header: 'Role', cell: (row) => row.role},
        {key: 'actions', header: 'Actions', cell: this.actionsTpl(), align: 'right', width: '150px'},
      ],
    };
  }

  onAction(action: string, user: User): void {
    alert(`${action} ${user.name}`);
  }

  // ── Selection table ──
  selectionDataSource: TableDataSource<User> = {
    dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
    getID: (row) => row.id,
    emptyMessage: 'No users found.',
    isDataLoading: false,
    canSearch: false,
    selectionMode: 'multi',
    selectedRows: new BehaviorSubject<User[]>([]),
    appearance: {hover: true},
    columns: [
      {key: 'name', header: 'Name', cell: (row) => row.name},
      {key: 'email', header: 'Email', cell: (row) => row.email},
      {key: 'role', header: 'Role', cell: (row) => row.role},
    ],
  };

  // ── Searchable + load more table ──
  searchDataSource: TableDataSource<User> = {
    dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
    getID: (row) => row.id,
    emptyMessage: 'No users match your search.',
    isDataLoading: false,
    canSearch: true,
    searchPlaceholder: 'Search users...',
    isInSearch: (row, term) => row.name.toLowerCase().includes(term) || row.email.toLowerCase().includes(term),
    paginationMode: 'load-more',
    loadAdditionalRows: () => new Promise(resolve => setTimeout(() => resolve(EXTRA_USERS), 800)),
    appearance: {hover: true, compact: true},
    columns: [
      {key: 'name', header: 'Name', cell: (row) => row.name, sortType: ColumnSortType.ALPHABETICAL},
      {key: 'email', header: 'Email', cell: (row) => row.email},
      {key: 'role', header: 'Role', cell: (row) => row.role},
      {key: 'age', header: 'Age', cell: (row) => String(row.age), sortType: ColumnSortType.NUMERICAL, align: 'right'},
    ],
  };

  // ── Column filters table ──
  filterDataSource: TableDataSource<User> = {
    dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
    getID: (row) => row.id,
    emptyMessage: 'No users match the filters.',
    isDataLoading: false,
    canSearch: false,
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

  // ── Paginated table ──
  paginatedDataSource: TableDataSource<User> = {
    dataRows: new BehaviorSubject<User[]>([...PAGINATED_USERS]),
    getID: (row) => row.id,
    emptyMessage: 'No users found.',
    isDataLoading: false,
    canSearch: true,
    searchPlaceholder: 'Search paginated users...',
    isInSearch: (row, term) => row.name.toLowerCase().includes(term) || row.email.toLowerCase().includes(term),
    paginationMode: 'paginated',
    pageSize: 5,
    pageSizeOptions: [5, 10, 15],
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

  // ── Empty table ──
  emptyDataSource: TableDataSource<User> = {
    dataRows: new BehaviorSubject<User[]>([]),
    getID: (row) => row.id,
    emptyMessage: 'No data available. Try adding some users.',
    isDataLoading: false,
    canSearch: false,
    columns: [
      {key: 'name', header: 'Name', cell: (row) => row.name},
      {key: 'email', header: 'Email', cell: (row) => row.email},
    ],
  };

  onSortChange(sort: SortState | null): void {
    console.log('Sort changed:', sort);
  }

  onSelectionChange(selected: User[]): void {
    this.selectedNames = selected.length > 0 ? selected.map(u => u.name).join(', ') : 'none';
  }
}
