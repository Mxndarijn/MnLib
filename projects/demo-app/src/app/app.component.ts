import {Component, computed, signal} from '@angular/core';
import {RouterLink, RouterLinkActive, RouterOutlet} from '@angular/router';
import {ThemeToggleComponent} from './shared/theme-toggle.component';
import {DEMOS, groupDemos} from './shared/demo-catalog';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterLink, RouterLinkActive, ThemeToggleComponent],
  templateUrl: './app.component.html',
  styleUrl: './app.component.css',
})
export class AppComponent {
  readonly total = DEMOS.length;

  /** Current sidebar search query. */
  query = signal('');

  /** Whether the off-canvas sidebar is open (mobile only). */
  navOpen = signal(false);

  /** The nav shelves filtered by the current search query. */
  filteredGroups = computed(() => {
    const q = this.query().toLowerCase().trim();
    const matches = q
      ? DEMOS.filter(
        (d) => d.title.toLowerCase().includes(q) || d.description.toLowerCase().includes(q),
      )
      : DEMOS;
    return groupDemos(matches);
  });

  onSearch(event: Event): void {
    this.query.set((event.target as HTMLInputElement).value);
  }

  closeNav(): void {
    this.navOpen.set(false);
  }
}
