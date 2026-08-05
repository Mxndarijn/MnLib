import {Component, OnInit, TemplateRef, viewChild} from '@angular/core';
import {MnDropdown, MnDropdownProps} from 'mn-angular-lib';
import {LucideCopy, LucidePencil, LucideShare2, LucideTrash2} from '@lucide/angular';
import {DemoPageComponent} from '../shared/demo-page.component';
import {DemoExampleComponent} from '../shared/demo-example.component';

@Component({
  selector: 'app-dropdown-demo',
  imports: [MnDropdown, DemoPageComponent, DemoExampleComponent, LucidePencil, LucideCopy, LucideShare2, LucideTrash2],
  templateUrl: './dropdown-demo.html',
})
export class DropdownDemo implements OnInit {
  /** Last chosen command, echoed in each example so the menu feels live. */
  lastAction = '—';

  readonly editIcon = viewChild.required<TemplateRef<unknown>>('editIcon');
  readonly duplicateIcon = viewChild.required<TemplateRef<unknown>>('duplicateIcon');
  readonly shareIcon = viewChild.required<TemplateRef<unknown>>('shareIcon');
  readonly deleteIcon = viewChild.required<TemplateRef<unknown>>('deleteIcon');

  // Built in ngOnInit so the icon templates (view queries) are resolved first.
  basicProps!: MnDropdownProps;
  iconProps!: MnDropdownProps;
  stateProps!: MnDropdownProps;
  labelledProps!: MnDropdownProps;
  i18nProps!: MnDropdownProps;
  textProps!: MnDropdownProps;
  textOnlyProps!: MnDropdownProps;
  textDotsProps!: MnDropdownProps;

  private pick(name: string): void {
    this.lastAction = name;
  }

  ngOnInit(): void {
    // Labels only — the leanest form.
    this.basicProps = {
      id: 'dd-basic',
      ariaLabel: 'Row actions',
      actions: [
        {label: 'Edit', run: () => this.pick('Edit')},
        {label: 'Duplicate', run: () => this.pick('Duplicate')},
        {label: 'Archive', run: () => this.pick('Archive')},
      ],
    };

    // With leading icons.
    this.iconProps = {
      id: 'dd-icons',
      ariaLabel: 'Row actions',
      actions: [
        {label: 'Edit', icon: this.editIcon(), run: () => this.pick('Edit')},
        {label: 'Duplicate', icon: this.duplicateIcon(), run: () => this.pick('Duplicate')},
        {label: 'Share', icon: this.shareIcon(), run: () => this.pick('Share')},
        {label: 'Delete', icon: this.deleteIcon(), danger: true, run: () => this.pick('Delete')},
      ],
    };

    // Danger + disabled states.
    this.stateProps = {
      id: 'dd-states',
      ariaLabel: 'Row actions',
      actions: [
        {label: 'Rename', icon: this.editIcon(), run: () => this.pick('Rename')},
        {label: 'Duplicate (disabled)', icon: this.duplicateIcon(), disabled: true, run: () => this.pick('Duplicate')},
        {label: 'Delete', icon: this.deleteIcon(), danger: true, run: () => this.pick('Delete')},
      ],
    };

    // A menu heading — always visible on mobile (the sheet covers its own trigger).
    this.labelledProps = {
      id: 'dd-labelled',
      ariaLabel: 'Row actions',
      menuLabel: 'Manage user',
      actions: [
        {label: 'View profile', run: () => this.pick('View profile')},
        {label: 'Reset password', run: () => this.pick('Reset password')},
        {label: 'Suspend', danger: true, run: () => this.pick('Suspend')},
      ],
    };

    // Text trigger: label + trailing chevron (the default when triggerLabel is set).
    this.textProps = {
      id: 'dd-text',
      triggerLabel: 'Actions',
      actions: [
        {label: 'Edit', icon: this.editIcon(), run: () => this.pick('Edit')},
        {label: 'Duplicate', icon: this.duplicateIcon(), run: () => this.pick('Duplicate')},
        {label: 'Delete', icon: this.deleteIcon(), danger: true, run: () => this.pick('Delete')},
      ],
    };

    // Text only — no glyph.
    this.textOnlyProps = {
      id: 'dd-text-only',
      triggerLabel: 'More',
      triggerIcon: 'none',
      actions: [
        {label: 'Rename', run: () => this.pick('Rename')},
        {label: 'Move', run: () => this.pick('Move')},
      ],
    };

    // Text plus the vertical dots instead of a chevron.
    this.textDotsProps = {
      id: 'dd-text-dots',
      triggerLabel: 'Options',
      triggerIcon: 'dots-vertical',
      actions: [
        {label: 'Settings', run: () => this.pick('Settings')},
        {label: 'Help', run: () => this.pick('Help')},
      ],
    };

    // Translation keys: resolved via MnLanguageService, falling back to `label` when the
    // key isn't translated (as here, since this demo registers no translations).
    this.i18nProps = {
      id: 'dd-i18n',
      ariaLabelKey: 'demo.dropdown.aria',
      ariaLabel: 'Row actions',
      actions: [
        {labelKey: 'demo.dropdown.edit', label: 'Edit', icon: this.editIcon(), run: () => this.pick('Edit')},
        {labelKey: 'demo.dropdown.delete', label: 'Delete', icon: this.deleteIcon(), danger: true, run: () => this.pick('Delete')},
      ],
    };
  }
}
