import {Component, TemplateRef, viewChild} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {MnList, ListDataSource} from 'mn-angular-lib';

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
];

const EXTRA_USERS: User[] = [
  {id: '6', name: 'Frank Miller', email: 'frank@example.com', role: 'Viewer', age: 38, joinedAt: '2024-08-20'},
  {id: '7', name: 'Grace Lee', email: 'grace@example.com', role: 'Editor', age: 29, joinedAt: '2024-09-12'},
];

@Component({
  selector: 'app-list-demo',
  standalone: true,
  imports: [MnList],
  templateUrl: './list-demo.html',
})
export class ListDemo {
  selectedNames = 'none';

  readonly basicItemTpl = viewChild.required<TemplateRef<any>>('basicItemTpl');
  readonly selectionItemTpl = viewChild.required<TemplateRef<any>>('selectionItemTpl');
  readonly searchItemTpl = viewChild.required<TemplateRef<any>>('searchItemTpl');
  readonly paginatedItemTpl = viewChild.required<TemplateRef<any>>('paginatedItemTpl');

  // ── Basic list ──
  basicDataSource!: ListDataSource<User>;

  // ── Selection list ──
  selectionDataSource!: ListDataSource<User>;

  // ── Searchable + load more list ──
  searchDataSource!: ListDataSource<User>;

  // ── Paginated list ──
  paginatedDataSource!: ListDataSource<User>;

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
      appearance: {hover: true, dividers: true},
    };

    this.selectionDataSource = {
      dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
      getID: (row) => row.id,
      itemTemplate: this.selectionItemTpl(),
      emptyMessage: 'No users found.',
      isDataLoading: false,
      canSearch: false,
      selectionMode: 'multi',
      selectedRows: new BehaviorSubject<User[]>([]),
      appearance: {hover: true, dividers: true},
    };

    this.searchDataSource = {
      dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
      getID: (row) => row.id,
      itemTemplate: this.searchItemTpl(),
      emptyMessage: 'No users match your search.',
      isDataLoading: false,
      canSearch: true,
      searchPlaceholder: 'Search users...',
      isInSearch: (row, term) => row.name.toLowerCase().includes(term) || row.email.toLowerCase().includes(term),
      paginationMode: 'load-more',
      loadAdditionalRows: () => new Promise(resolve => setTimeout(() => resolve(EXTRA_USERS), 800)),
      appearance: {hover: true, compact: true, dividers: true},
    };

    this.paginatedDataSource = {
      dataRows: new BehaviorSubject<User[]>([...PAGINATED_USERS]),
      getID: (row) => row.id,
      itemTemplate: this.paginatedItemTpl(),
      emptyMessage: 'No users found.',
      isDataLoading: false,
      canSearch: true,
      searchPlaceholder: 'Search paginated users...',
      isInSearch: (row, term) => row.name.toLowerCase().includes(term) || row.email.toLowerCase().includes(term),
      paginationMode: 'paginated',
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
    };
  }

  onSelectionChange(selected: User[]): void {
    this.selectedNames = selected.length > 0 ? selected.map(u => u.name).join(', ') : 'none';
  }

  onItemClicked(user: User): void {
    console.log('Item clicked:', user.name);
  }
}
