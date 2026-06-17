import {Component, OnInit, TemplateRef, viewChild} from '@angular/core';
import {BehaviorSubject} from 'rxjs';
import {GridDataSource, MnButton, MnGrid, MnSkeleton} from 'mn-angular-lib';

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
}

const SAMPLE_USERS: User[] = [
  {id: '1', name: 'Alice Johnson', email: 'alice@example.com', role: 'Admin'},
  {id: '2', name: 'Bob Smith', email: 'bob@example.com', role: 'Editor'},
  {id: '3', name: 'Charlie Brown', email: 'charlie@example.com', role: 'Viewer'},
  {id: '4', name: 'Diana Prince', email: 'diana@example.com', role: 'Admin'},
  {id: '5', name: 'Eve Davis', email: 'eve@example.com', role: 'Editor'},
  {id: '6', name: 'Frank Miller', email: 'frank@example.com', role: 'Viewer'},
];

const ALL_USERS: User[] = [
  ...SAMPLE_USERS,
  {id: '7', name: 'Grace Lee', email: 'grace@example.com', role: 'Editor'},
  {id: '8', name: 'Hank Wilson', email: 'hank@example.com', role: 'Viewer'},
  {id: '9', name: 'Ivy Chen', email: 'ivy@example.com', role: 'Admin'},
  {id: '10', name: 'Jack Turner', email: 'jack@example.com', role: 'Editor'},
  {id: '11', name: 'Karen White', email: 'karen@example.com', role: 'Viewer'},
  {id: '12', name: 'Leo Martinez', email: 'leo@example.com', role: 'Admin'},
  {id: '13', name: 'Mia Robinson', email: 'mia@example.com', role: 'Editor'},
  {id: '14', name: 'Noah Clark', email: 'noah@example.com', role: 'Viewer'},
];

@Component({
  selector: 'app-grid-demo',
  standalone: true,
  imports: [MnGrid, MnButton, MnSkeleton],
  templateUrl: './grid-demo.html',
})
export class GridDemo implements OnInit {
  readonly cardTpl = viewChild.required<TemplateRef<unknown>>('cardTpl');
  readonly actionsCardTpl = viewChild.required<TemplateRef<unknown>>('actionsCardTpl');
  readonly skeletonTpl = viewChild.required<TemplateRef<unknown>>('skeletonTpl');
  readonly toolbarTpl = viewChild.required<TemplateRef<unknown>>('toolbarTpl');

  clickedName = 'none';
  // ── Built in ngOnInit (they reference card/skeleton/toolbar templates) ──
  basicDataSource!: GridDataSource<User>;
  autoFitDataSource!: GridDataSource<User>;
  previewDataSource!: GridDataSource<User>;
  defaultSkeletonDataSource!: GridDataSource<User>;
  customSkeletonDataSource!: GridDataSource<User>;
  searchPaginatedDataSource!: GridDataSource<User>;
  clickDataSource!: GridDataSource<User>;
  actionsDataSource!: GridDataSource<User>;
  emptyDataSource!: GridDataSource<User>;
  private readonly avatarColors = ['#0ea5e9', '#16a34a', '#7c3aed', '#db2777', '#ea580c', '#0d9488'];

  /** Deterministic avatar background color derived from the user id. */
  avatarColor(user: User): string {
    return this.avatarColors[Number(user.id) % this.avatarColors.length];
  }

  /** Uppercase initials for the avatar placeholder. */
  initials(user: User): string {
    return user.name.split(' ').map(part => part.charAt(0)).join('').slice(0, 2).toUpperCase();
  }

  ngOnInit(): void {
    const card = this.cardTpl();

    // Explicit per-breakpoint columns: 1 / 2 / 3.
    this.basicDataSource = {
      dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
      getID: (row) => row.id,
      cardTemplate: card,
      emptyMessage: 'No users found.',
      isDataLoading: false,
      canSearch: false,
      paginationMode: 'none',
      layout: {cols: {base: 1, sm: 2, lg: 3}, gap: '1rem'},
    };

    // Auto-fit: cards wrap to fill the row based on a minimum width.
    this.autoFitDataSource = {
      dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
      getID: (row) => row.id,
      cardTemplate: card,
      emptyMessage: 'No users found.',
      isDataLoading: false,
      canSearch: false,
      paginationMode: 'none',
      layout: {minCardWidth: '16rem', gap: '1rem'},
    };

    // Preview cap: only the first 3 cards, with a toolbar "view all" affordance.
    this.previewDataSource = {
      dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
      getID: (row) => row.id,
      cardTemplate: card,
      emptyMessage: 'No users found.',
      isDataLoading: false,
      canSearch: false,
      paginationMode: 'none',
      toolbarTemplate: this.toolbarTpl(),
      layout: {cols: {base: 1, sm: 2, lg: 3}, gap: '1rem', maxItems: 3},
    };

    // Loading: default card skeleton (no skeleton field).
    this.defaultSkeletonDataSource = {
      dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
      getID: (row) => row.id,
      cardTemplate: card,
      emptyMessage: 'No users found.',
      isDataLoading: true,
      skeletonRowCount: 6,
      canSearch: false,
      paginationMode: 'none',
      layout: {cols: {base: 1, sm: 2, lg: 3}, gap: '1rem'},
    };

    // Loading: consumer-profiled skeleton matching the card's shape.
    this.customSkeletonDataSource = {
      dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
      getID: (row) => row.id,
      cardTemplate: card,
      emptyMessage: 'No users found.',
      isDataLoading: true,
      skeletonRowCount: 6,
      skeleton: this.skeletonTpl(),
      canSearch: false,
      paginationMode: 'none',
      layout: {cols: {base: 1, sm: 2, lg: 3}, gap: '1rem'},
    };

    // Search + client-side pagination over the full set.
    this.searchPaginatedDataSource = {
      dataRows: new BehaviorSubject<User[]>([...ALL_USERS]),
      getID: (row) => row.id,
      cardTemplate: card,
      emptyMessage: 'No users match your search.',
      isDataLoading: false,
      canSearch: true,
      searchPlaceholder: 'Search users...',
      isInSearch: (row, term) => row.name.toLowerCase().includes(term) || row.email.toLowerCase().includes(term),
      paginationMode: 'client-side-pagination',
      pageSize: 6,
      pageSizeOptions: [6, 9, 12],
      layout: {cols: {base: 1, sm: 2, lg: 3}, gap: '1rem'},
    };

    // Whole-card click.
    this.clickDataSource = {
      dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
      getID: (row) => row.id,
      cardTemplate: card,
      emptyMessage: 'No users found.',
      isDataLoading: false,
      canSearch: false,
      paginationMode: 'none',
      onItemClick: (user) => this.onCardClick(user),
      layout: {cols: {base: 1, sm: 2, lg: 3}, gap: '1rem'},
    };

    // In-card action buttons (stopPropagation) alongside a card click.
    this.actionsDataSource = {
      dataRows: new BehaviorSubject<User[]>([...SAMPLE_USERS]),
      getID: (row) => row.id,
      cardTemplate: this.actionsCardTpl(),
      emptyMessage: 'No users found.',
      isDataLoading: false,
      canSearch: false,
      paginationMode: 'none',
      onItemClick: (user) => this.onCardClick(user),
      layout: {cols: {base: 1, sm: 2, lg: 3}, gap: '1rem'},
    };

    // Empty state.
    this.emptyDataSource = {
      dataRows: new BehaviorSubject<User[]>([]),
      getID: (row) => row.id,
      cardTemplate: card,
      emptyMessage: 'No data available. Try adding some users.',
      isDataLoading: false,
      canSearch: false,
      paginationMode: 'none',
      layout: {cols: {base: 1, sm: 2, lg: 3}, gap: '1rem'},
    };
  }

  toggleSkeletonLoading(): void {
    const loading = !this.defaultSkeletonDataSource.isDataLoading;
    // mn-grid is OnPush: replace the dataSource reference so the new isDataLoading is detected.
    this.defaultSkeletonDataSource = {...this.defaultSkeletonDataSource, isDataLoading: loading};
    this.customSkeletonDataSource = {...this.customSkeletonDataSource, isDataLoading: loading};
  }

  onCardClick(user: User): void {
    this.clickedName = user.name;
  }

  onItemClick(user: User): void {
    this.clickedName = user.name;
  }

  onAction(action: string, user: User): void {
    alert(`${action} ${user.name}`);
  }

  onToolbarAction(): void {
    alert('View all clicked!');
  }
}
