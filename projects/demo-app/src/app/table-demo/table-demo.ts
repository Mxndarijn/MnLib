import {Component, OnInit, TemplateRef, viewChild} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {ColumnSortType, MnButton, MnCollectionState, MnTable, SortState, TableDataSource,} from 'mn-angular-lib';
import {
  LucideCopy,
  LucidePencil,
  LucideShare2,
  LucideShieldCheck,
  LucideShieldOff,
  LucideTrash2,
} from '@lucide/angular';
import {DemoPageComponent} from '../shared/demo-page.component';
import {DemoExampleComponent} from '../shared/demo-example.component';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  age: number;
  joinedAt: string;
};

const SAMPLE_USERS: User[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'Admin',
    age: 32,
    joinedAt: '2023-01-15',
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    role: 'Editor',
    age: 28,
    joinedAt: '2023-03-22',
  },
  {
    id: '3',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    role: 'Viewer',
    age: 45,
    joinedAt: '2022-11-01',
  },
  {
    id: '4',
    name: 'Diana Prince',
    email: 'diana@example.com',
    role: 'Admin',
    age: 30,
    joinedAt: '2024-06-10',
  },
  {
    id: '5',
    name: 'Eve Davis',
    email: 'eve@example.com',
    role: 'Editor',
    age: 27,
    joinedAt: '2024-01-05',
  },
];

const ALL_USERS: User[] = [
  {
    id: '1',
    name: 'Alice Johnson',
    email: 'alice@example.com',
    role: 'Admin',
    age: 32,
    joinedAt: '2023-01-15',
  },
  {
    id: '2',
    name: 'Bob Smith',
    email: 'bob@example.com',
    role: 'Editor',
    age: 28,
    joinedAt: '2023-03-22',
  },
  {
    id: '3',
    name: 'Charlie Brown',
    email: 'charlie@example.com',
    role: 'Viewer',
    age: 45,
    joinedAt: '2022-11-01',
  },
  {
    id: '4',
    name: 'Diana Prince',
    email: 'diana@example.com',
    role: 'Admin',
    age: 30,
    joinedAt: '2024-06-10',
  },
  {
    id: '5',
    name: 'Eve Davis',
    email: 'eve@example.com',
    role: 'Editor',
    age: 27,
    joinedAt: '2024-01-05',
  },
  {
    id: '6',
    name: 'Frank Miller',
    email: 'frank@example.com',
    role: 'Viewer',
    age: 38,
    joinedAt: '2024-08-20',
  },
  {
    id: '7',
    name: 'Grace Lee',
    email: 'grace@example.com',
    role: 'Editor',
    age: 29,
    joinedAt: '2024-09-12',
  },
  {
    id: '8',
    name: 'Hank Wilson',
    email: 'hank@example.com',
    role: 'Viewer',
    age: 41,
    joinedAt: '2023-05-18',
  },
  {
    id: '9',
    name: 'Ivy Chen',
    email: 'ivy@example.com',
    role: 'Admin',
    age: 26,
    joinedAt: '2024-02-14',
  },
  {
    id: '10',
    name: 'Jack Turner',
    email: 'jack@example.com',
    role: 'Editor',
    age: 35,
    joinedAt: '2023-07-30',
  },
  {
    id: '11',
    name: 'Karen White',
    email: 'karen@example.com',
    role: 'Viewer',
    age: 33,
    joinedAt: '2022-12-05',
  },
  {
    id: '12',
    name: 'Leo Martinez',
    email: 'leo@example.com',
    role: 'Admin',
    age: 40,
    joinedAt: '2023-09-01',
  },
  {
    id: '13',
    name: 'Mia Robinson',
    email: 'mia@example.com',
    role: 'Editor',
    age: 24,
    joinedAt: '2024-04-22',
  },
  {
    id: '14',
    name: 'Noah Clark',
    email: 'noah@example.com',
    role: 'Viewer',
    age: 37,
    joinedAt: '2023-11-10',
  },
  {
    id: '15',
    name: 'Olivia Hall',
    email: 'olivia@example.com',
    role: 'Admin',
    age: 31,
    joinedAt: '2024-07-03',
  },
  {
    id: '16',
    name: 'Paul Adams',
    email: 'paul@example.com',
    role: 'Editor',
    age: 29,
    joinedAt: '2023-02-28',
  },
  {
    id: '17',
    name: 'Quinn Baker',
    email: 'quinn@example.com',
    role: 'Viewer',
    age: 44,
    joinedAt: '2022-10-15',
  },
  {
    id: '18',
    name: 'Ruby Scott',
    email: 'ruby@example.com',
    role: 'Admin',
    age: 36,
    joinedAt: '2024-05-19',
  },
];

@Component({
  selector: 'app-table-demo',
  standalone: true,
  imports: [
    MnTable,
    MnButton,
    DemoPageComponent,
    DemoExampleComponent,
    LucidePencil,
    LucideCopy,
    LucideShare2,
    LucideTrash2,
  ],
  templateUrl: './table-demo.html',
})
export class TableDemo implements OnInit {
  // ── Loading skeleton: default (no per-column customization) ──
  defaultSkeletonDataSource: TableDataSource<User> = {
    dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
    getID: (row) => row.id,
    emptyMessage: 'No users found.',
    state: MnCollectionState.LOADING,
    skeletonRowCount: 4,
    canSearch: false,
    paginationMode: 'none',
    appearance: {hover: true, striped: true},
    columns: [
      {key: 'name', header: 'Name', cell: (row) => row.name},
      {key: 'email', header: 'Email', cell: (row) => row.email, hiddenBelow: 'sm'},
      {key: 'role', header: 'Role', cell: (row) => row.role, width: '120px'},
    ],
  };

  selectedNames = 'none';

  readonly editIcon = viewChild.required<TemplateRef<unknown>>('editIcon');
  readonly duplicateIcon = viewChild.required<TemplateRef<unknown>>('duplicateIcon');
  readonly shareIcon = viewChild.required<TemplateRef<unknown>>('shareIcon');
  readonly deleteIcon = viewChild.required<TemplateRef<unknown>>('deleteIcon');
  readonly toolbarRightTpl = viewChild.required<TemplateRef<unknown>>('toolbarRightTpl');
  readonly avatarTpl = viewChild.required<TemplateRef<unknown>>('avatarTpl');
  readonly roleBadgeTpl = viewChild.required<TemplateRef<unknown>>('roleBadgeTpl');
  // ── Basic table ──
  basicDataSource: TableDataSource<User> = {
    dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
    getID: (row) => row.id,
    emptyMessage: 'No users found.',
    state: MnCollectionState.RETRIEVED,
    canSearch: false,
    paginationMode: 'none',
    appearance: {hover: true, striped: true},
    columns: [
      {
        key: 'name',
        header: 'Name',
        cell: (row) => row.name,
        sortType: ColumnSortType.ALPHABETICAL,
      },
      {
        key: 'email',
        header: 'Email',
        cell: (row) => row.email,
        sortType: ColumnSortType.ALPHABETICAL,
        hiddenBelow: 'sm',
      },
      {key: 'role', header: 'Role', cell: (row) => row.role, width: '100px', align: 'center'},
      {
        key: 'age',
        header: 'Age',
        cell: (row) => String(row.age),
        sortType: ColumnSortType.NUMERICAL,
        width: '80px',
        align: 'right',
      },
      {
        key: 'joined',
        header: 'Joined',
        cell: (row) => row.joinedAt,
        sortType: ColumnSortType.DATE,
        hiddenBelow: 'md',
      },
    ],
    defaultSort: {columnKey: 'name', direction: 'asc'},
  };
  // ── Loading skeleton: custom user-profile skeletons (built in ngOnInit for the cell templates) ──
  profileSkeletonDataSource!: TableDataSource<User>;
  // ── Client-side paginated table ──
  clientPaginatedDataSource: TableDataSource<User> = {
    dataRows: new BehaviorSubject<User[]>([...ALL_USERS]),
    getID: (row) => row.id,
    emptyMessage: 'No users found.',
    state: MnCollectionState.RETRIEVED,
    canSearch: true,
    searchPlaceholder: 'Search client-side...',
    isInSearch: (row, term) =>
        row.name.toLowerCase().includes(term) || row.email.toLowerCase().includes(term),
    paginationMode: 'client-side-pagination',
    pageSize: 5,
    pageSizeOptions: [5, 10, 15],
    appearance: {hover: true, striped: true},
    columns: [
      {
        key: 'name',
        header: 'Name',
        cell: (row) => row.name,
        sortType: ColumnSortType.ALPHABETICAL,
      },
      {key: 'email', header: 'Email', cell: (row) => row.email},
      {key: 'role', header: 'Role', cell: (row) => row.role, width: '100px', align: 'center'},
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
  // ── Selection table ──
  selectionDataSource: TableDataSource<User> = {
    dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
    getID: (row) => row.id,
    emptyMessage: 'No users found.',
    state: MnCollectionState.RETRIEVED,
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

  /** Deterministic avatar background color derived from the user id. */
  avatarColor(user: User): string {
    return this.avatarColors[Number(user.id) % this.avatarColors.length];
  }
  // ── Paginated table (server-side) ──
  paginatedDataSource: TableDataSource<User> = {
    dataRows: new BehaviorSubject<User[]>([]),
    getID: (row) => row.id,
    emptyMessage: 'No users found.',
    state: MnCollectionState.RETRIEVED,
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
      {
        key: 'name',
        header: 'Name',
        cell: (row) => row.name,
        sortType: ColumnSortType.ALPHABETICAL,
      },
      {
        key: 'email',
        header: 'Email',
        cell: (row) => row.email,
        sortType: ColumnSortType.ALPHABETICAL,
        hiddenBelow: 'sm',
      },
      {key: 'role', header: 'Role', cell: (row) => row.role, width: '100px', align: 'center'},
      {
        key: 'age',
        header: 'Age',
        cell: (row) => String(row.age),
        sortType: ColumnSortType.NUMERICAL,
        width: '80px',
        align: 'right',
      },
      {
        key: 'joined',
        header: 'Joined',
        cell: (row) => row.joinedAt,
        sortType: ColumnSortType.DATE,
        hiddenBelow: 'md',
      },
    ],
    defaultSort: {columnKey: 'name', direction: 'asc'},
  };
  // ── Column filters table ──
  filterDataSource: TableDataSource<User> = {
    dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
    getID: (row) => row.id,
    emptyMessage: 'No users match the filters.',
    state: MnCollectionState.RETRIEVED,
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
  /**
   * An actions column declared entirely in TypeScript: the icons are lucide *data*
   * (`LucidePencil.icon`) instead of `TemplateRef`s, so this component owns no
   * `<ng-template>` stubs and no `viewChild` for them. The first action also derives its
   * label, icon and colour from the row, which is what lets one action cover both sides
   * of a toggle instead of two `hidden`-gated twins.
   *
   * Built in {@link ngOnInit} rather than as a field initializer: it reads
   * {@link roleRows}, and lint's member ordering is free to sort that private field
   * below this one, which would leave `dataRows` undefined.
   */
  dataIconActionsDataSource!: TableDataSource<User>;
  // ── Empty table ──
  emptyDataSource: TableDataSource<User> = {
    dataRows: new BehaviorSubject<User[]>([]),
    getID: (row) => row.id,
    emptyMessage: 'No data available. Try adding some users.',
    state: MnCollectionState.RETRIEVED,
    canSearch: false,
    paginationMode: 'none',
    columns: [
      {key: 'name', header: 'Name', cell: (row) => row.name},
      {key: 'email', header: 'Email', cell: (row) => row.email},
    ],
  };
  // ── Searchable + load more table (server-side) ──
  searchDataSource: TableDataSource<User> = {
    dataRows: new BehaviorSubject<User[]>([]),
    getID: (row) => row.id,
    emptyMessage: 'No users match your search.',
    state: MnCollectionState.RETRIEVED,
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
      {
        key: 'name',
        header: 'Name',
        cell: (row) => row.name,
        sortType: ColumnSortType.ALPHABETICAL,
      },
      {key: 'email', header: 'Email', cell: (row) => row.email},
      {key: 'role', header: 'Role', cell: (row) => row.role},
      {
        key: 'age',
        header: 'Age',
        cell: (row) => String(row.age),
        sortType: ColumnSortType.NUMERICAL,
        align: 'right',
      },
    ],
  };
  // ── Actions table ──
  actionsDataSource!: TableDataSource<User>;

  /** Own row stream for the data-icon demo, so promoting a user repaints the table. */
  private roleRows = new BehaviorSubject<User[]>([...SAMPLE_USERS]);
  private readonly avatarColors = [
    '#0ea5e9',
    '#16a34a',
    '#7c3aed',
    '#db2777',
    '#ea580c',
    '#0d9488',
  ];

  /** Uppercase initials for the avatar placeholder. */
  initials(user: User): string {
    return user.name
        .split(' ')
        .map((part) => part.charAt(0))
        .join('')
        .slice(0, 2)
        .toUpperCase();
  }
  // ── Server-side pagination state ──
  private paginatedPage = 1;
  private paginatedSize = 5;
  private paginatedSearch = '';

  ngOnInit(): void {
    this.toolbarRightDataSource = {
      dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
      getID: (row) => row.id,
      emptyMessage: 'No users found.',
      state: MnCollectionState.RETRIEVED,
      canSearch: true,
      searchPlaceholder: 'Search users...',
      paginationMode: 'none',
      toolbarRightTemplate: this.toolbarRightTpl(),
      appearance: {hover: true, striped: true},
      isInSearch: (row, term) =>
          row.name.toLowerCase().includes(term) || row.email.toLowerCase().includes(term),
      columns: [
        {
          key: 'name',
          header: 'Name',
          cell: (row) => row.name,
          sortType: ColumnSortType.ALPHABETICAL,
        },
        {key: 'email', header: 'Email', cell: (row) => row.email},
        {key: 'role', header: 'Role', cell: (row) => row.role, width: '100px', align: 'center'},
      ],
    };
    this.actionsDataSource = {
      dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
      getID: (row) => row.id,
      emptyMessage: 'No users found.',
      state: MnCollectionState.RETRIEVED,
      canSearch: false,
      paginationMode: 'none',
      appearance: {hover: true, bordered: true},
      columns: [
        {key: 'name', header: 'Name', cell: (row) => row.name},
        {key: 'role', header: 'Role', cell: (row) => row.role},
        {
          key: 'actions',
          header: 'Actions',
          align: 'right',
          // Icon-only inline on a wide table; the collapsed ⋯ menu shows full labels.
          actionsInline: 'icon',
          // Four actions, with per-row visibility: Viewers are read-only (no actions at
          // all → empty cell, no ⋯), and only Admins may delete.
          actions: [
            {
              label: 'Edit',
              icon: this.editIcon(),
              hidden: (row) => row.role === 'Viewer',
              run: (row) => this.onAction('Edit', row),
            },
            {
              label: 'Duplicate',
              icon: this.duplicateIcon(),
              hidden: (row) => row.role === 'Viewer',
              run: (row) => this.onAction('Duplicate', row),
            },
            {
              label: 'Share',
              icon: this.shareIcon(),
              hidden: (row) => row.role === 'Viewer',
              run: (row) => this.onAction('Share', row),
            },
            {
              label: 'Delete',
              icon: this.deleteIcon(),
              danger: true,
              hidden: (row) => row.role !== 'Admin',
              run: (row) => this.onAction('Delete', row),
            },
          ],
        },
      ],
    };

    this.dataIconActionsDataSource = {
      dataRows: this.roleRows,
      getID: (row) => row.id,
      emptyMessage: 'No users found.',
      state: MnCollectionState.RETRIEVED,
      canSearch: false,
      paginationMode: 'none',
      appearance: {hover: true},
      columns: [
        {
          key: 'name',
          header: 'Name',
          cell: (row) => row.name,
          sortType: ColumnSortType.ALPHABETICAL,
        },
        {key: 'role', header: 'Role', cell: (row) => row.role},
        {
          key: 'actions',
          header: 'Actions',
          align: 'right',
          sortType: ColumnSortType.NONE,
          actions: [
            // One action for both sides of the toggle: label, icon and colour all come
            // from the row, so there is no second `hidden`-gated twin to keep in sync.
            {
              label: (row) => (row.role === 'Admin' ? 'Demote' : 'Promote'),
              icon: (row) => (row.role === 'Admin' ? LucideShieldOff.icon : LucideShieldCheck.icon),
              color: (row) => (row.role === 'Admin' ? 'warning' : 'success'),
              run: (row) => this.toggleRole(row),
            },
            // Data icons: no <ng-template> stub and no viewChild backing these.
            {label: 'Edit', icon: LucidePencil.icon, run: (row) => this.onAction('Edit', row)},
            {
              label: 'Delete',
              icon: LucideTrash2.icon,
              danger: true,
              run: (row) => this.onAction('Delete', row),
            },
          ],
        },
      ],
    };

    this.profileSkeletonDataSource = {
      dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
      getID: (row) => row.id,
      emptyMessage: 'No users found.',
      state: MnCollectionState.LOADING,
      skeletonRowCount: 4,
      canSearch: false,
      paginationMode: 'none',
      appearance: {hover: true},
      columns: [
        // Profile picture → circular skeleton.
        {
          key: 'avatar',
          header: '',
          cell: this.avatarTpl(),
          width: '64px',
          skeleton: {shape: 'circle', width: '40px', height: '40px'},
        },
        // Name → wider text bar.
        {key: 'name', header: 'Name', cell: (row) => row.name, skeleton: {width: '70%'}},
        // Email → near-full-width text bar.
        {
          key: 'email',
          header: 'Email',
          cell: (row) => row.email,
          hiddenBelow: 'sm',
          skeleton: {width: '90%'},
        },
        // Role badge → small rounded rectangle matching the badge footprint.
        {
          key: 'role',
          header: 'Role',
          cell: this.roleBadgeTpl(),
          width: '120px',
          skeleton: {shape: 'rectangle', width: '64px', height: '22px'},
        },
      ],
    };

    // Initialize paginated table with first page
    this.fetchPaginatedPage();

    // Initialize load-more table with first batch
    this.fetchLoadMoreBatch(true);
  }
  private loadMoreLoaded = 5;
  private loadMoreSearch = '';
  protected readonly CollectionState = MnCollectionState;

  onToolbarAction(): void {
    alert('Toolbar button clicked!');
  }

  onAction(action: string, user: User): void {
    alert(`${action} ${user.name}`);
  }

  toolbarRightDataSource!: TableDataSource<User>;

  toggleSkeletonLoading(): void {
    const loading = this.defaultSkeletonDataSource.state !== MnCollectionState.LOADING;
    // mn-table is OnPush: replace the dataSource reference so the new state is detected.
    this.defaultSkeletonDataSource = {
      ...this.defaultSkeletonDataSource,
      state: loading ? MnCollectionState.LOADING : MnCollectionState.RETRIEVED,
    };
    this.profileSkeletonDataSource = {
      ...this.profileSkeletonDataSource,
      state: loading ? MnCollectionState.LOADING : MnCollectionState.RETRIEVED,
    };
  }

  onSortChange(sort: SortState | null): void {
    console.log('Sort changed:', sort);
  }

  onSelectionChange(selected: User[]): void {
    this.selectedNames = selected.length > 0 ? selected.map((u) => u.name).join(', ') : 'none';
  }

  /**
   * Flips a user between Admin and Editor, re-emitting the rows so the derived label,
   * icon and colour of the toggle action are re-evaluated.
   * @param user The user whose role to flip.
   */
  private toggleRole(user: User): void {
    this.roleRows.next(
      this.roleRows.value.map((row) =>
          row.id === user.id ? {...row, role: row.role === 'Admin' ? 'Editor' : 'Admin'} : row,
      ),
    );
  }

  /** Removes the last row of the client-paginated table (demonstrates the no-jump fix). */
  removeClientRow(): void {
    const rows = this.clientPaginatedDataSource.dataRows.value;
    if (rows.length === 0) return;
    this.clientPaginatedDataSource.dataRows.next(rows.slice(0, -1));
  }

  /** Restores the full client-paginated dataset. */
  resetClientRows(): void {
    this.clientPaginatedDataSource.dataRows.next([...ALL_USERS]);
  }

  // ── Server-side simulation helpers ──

  private getFilteredUsers(search: string): User[] {
    if (!search) return ALL_USERS;
    const term = search.toLowerCase();
    return ALL_USERS.filter(
        (u) => u.name.toLowerCase().includes(term) || u.email.toLowerCase().includes(term),
    );
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
