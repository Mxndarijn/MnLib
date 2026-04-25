import { Component, TemplateRef, ViewChild } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Validators } from '@angular/forms';
import {
  MnButton,
  MnModalService,
  ModalBuilder,
  ModalSize,
  ConfirmationTone,
  ActionStyle,
  ModalCloseReason,
  FieldKind,
  FormLayoutMode,
  WizardFlowMode,
  StepState,
  ValidationStatus,
  CloseMode,
  ModalRef,
  TableDataSource,
  ColumnDefinition,
  ColumnSortType,
} from 'mn-angular-lib';
import { BehaviorSubject } from 'rxjs';

interface UserFormModel {
  firstName: string;
  lastName: string;
  email: string;
  age: number;
  newsletter: boolean;
  startDate: string;
  bio: string;
  appointmentTime: string;
  skills: string[];
  role: string;
  permissions: string[];
  password: string;
  confirmPassword: string;
  country: string;
  city: string;
}

@Component({
  selector: 'app-modal-demo',
  standalone: true,
  imports: [CommonModule, MnButton],
  templateUrl: './modal-demo.html',
  styleUrls: ['./modal-demo.css'],
})
export class ModalDemo {
  @ViewChild('customTemplate') customTemplate!: TemplateRef<unknown>;

  lastResult: string = '';

  sampleUsers = [
    { name: 'John Doe', email: 'john@example.com', role: 'Admin', status: 'Active' },
    { name: 'Jane Smith', email: 'jane@example.com', role: 'Editor', status: 'Active' },
    { name: 'Bob Wilson', email: 'bob@example.com', role: 'Viewer', status: 'Inactive' },
    { name: 'Alice Brown', email: 'alice@example.com', role: 'Editor', status: 'Active' },
    { name: 'Charlie Davis', email: 'charlie@example.com', role: 'Viewer', status: 'Inactive' },
  ];

  constructor(private modalService: MnModalService) {}

  // Confirmation Modal Demo
  openConfirmationModal() {
    const config = ModalBuilder.confirmation<boolean>()
      .title('Confirm Action')
      .message('Are you sure you want to proceed with this action?')
      .tone(ConfirmationTone.DEFAULT)
      .size(ModalSize.SM)
      .confirmAction({
        label: 'Yes, proceed',
        style: ActionStyle.PRIMARY,
      })
      .cancelAction({
        label: 'Cancel',
        style: ActionStyle.SECONDARY,
      })
      .build();

    const modalRef = this.modalService.open(config);

    modalRef.afterClosed$.subscribe((event) => {
      if (event.reason === ModalCloseReason.COMPLETED) {
        this.lastResult = `Confirmation Modal: Confirmed`;
      } else {
        this.lastResult = `Confirmation Modal: Cancelled (${event.reason})`;
      }
    });
  }

  // Danger Confirmation Modal (with close guard)
  openDangerConfirmation() {
    const config = ModalBuilder.confirmation<boolean>()
      .title('Delete Account')
      .message('This action cannot be undone. Are you sure you want to delete your account?')
      .tone(ConfirmationTone.DANGER)
      .size(ModalSize.SM)
      .closeMode(CloseMode.GUARDED)
      .closeGuard(() => window.confirm('Are you sure you want to close this dialog?'))
      .confirmAction({
        label: 'Delete Account',
        style: ActionStyle.DANGER,
      })
      .cancelAction({
        label: 'Keep Account',
        style: ActionStyle.SECONDARY,
      })
      .build();

    const modalRef = this.modalService.open(config);

    modalRef.afterClosed$.subscribe((event) => {
      this.lastResult = `Danger Confirmation: ${event.reason}`;
    });
  }

  // Form Modal Demo
  openFormModal() {
    const config = ModalBuilder.form<UserFormModel, UserFormModel>()
      .title('User Information')
      .size(ModalSize.LG)
      .addRow(2, (row) => {
        row.add({
          kind: FieldKind.TEXT,
          key: 'firstName',
          label: 'First Name',
          placeholder: 'Enter first name',
          validators: [Validators.required],
        });
        row.add({
          kind: FieldKind.TEXT,
          key: 'lastName',
          label: 'Last Name',
          placeholder: 'Enter last name',
          validators: [Validators.required],
        });
      })
      // Email full width
      .field({
        kind: FieldKind.TEXT,
        key: 'email',
        label: 'Email Address',
        placeholder: 'user@example.com',
        validators: [Validators.required, Validators.email],
      })
      // Password + Confirm Password (cross-field validation demo) — uses FieldKind.PASSWORD
      .row(2)
        .addToRow({
          kind: FieldKind.PASSWORD,
          key: 'password',
          label: 'Password',
          placeholder: '********',
          validators: [Validators.required, Validators.minLength(8)],
        })
        .addToRow({
          kind: FieldKind.PASSWORD,
          key: 'confirmPassword',
          label: 'Confirm Password',
          placeholder: '********',
          validators: [Validators.required],
        })
      // Role select — conditional field demo: permissions only visible when role=admin
      .field({
        kind: FieldKind.SELECT,
        key: 'role',
        label: 'Role',
        options: [
          { label: 'User', value: 'user' },
          { label: 'Editor', value: 'editor' },
          { label: 'Admin', value: 'admin' },
        ],
        validators: [Validators.required],
      })
      // Conditional field: only visible when role === 'admin'
      .field({
        kind: FieldKind.MULTI_SELECT,
        key: 'permissions',
        label: 'Admin Permissions',
        options: [
          { label: 'Manage Users', value: 'manage_users' },
          { label: 'Manage Content', value: 'manage_content' },
          { label: 'View Analytics', value: 'view_analytics' },
          { label: 'System Settings', value: 'system_settings' },
        ],
        searchable: true,
        validators: [Validators.required],
        visible: (form) => form.role === 'admin',
      })
      // Async data source demo: country loads cities
      .field({
        kind: FieldKind.SELECT,
        key: 'country',
        label: 'Country',
        options: [],
        dataSource: {
          load: async () => {
            // Simulate API call
            await new Promise(r => setTimeout(r, 800));
            return [
              { label: 'Netherlands', value: 'nl' },
              { label: 'Germany', value: 'de' },
              { label: 'Belgium', value: 'be' },
            ];
          },
        },
      })
      // Cascading select: cities depend on country
      .field({
        kind: FieldKind.SELECT,
        key: 'city',
        label: 'City',
        options: [],
        dataSource: {
          dependsOn: ['country'],
          load: async (formValue) => {
            if (!formValue?.country) return [];
            await new Promise(r => setTimeout(r, 500));
            const cities: Record<string, { label: string; value: string }[]> = {
              nl: [{ label: 'Amsterdam', value: 'ams' }, { label: 'Rotterdam', value: 'rtd' }, { label: 'Utrecht', value: 'utr' }],
              de: [{ label: 'Berlin', value: 'ber' }, { label: 'Munich', value: 'muc' }, { label: 'Hamburg', value: 'ham' }],
              be: [{ label: 'Brussels', value: 'bru' }, { label: 'Antwerp', value: 'ant' }, { label: 'Ghent', value: 'gnt' }],
            };
            return cities[formValue.country as string] || [];
          },
        },
      })
      // Age full width
      .field({
        kind: FieldKind.NUMBER,
        key: 'age',
        label: 'Age',
        placeholder: '18',
        min: 18,
        max: 120,
        validators: [Validators.required],
      })
      .initialValue({
        firstName: 'John',
        lastName: 'Doe',
      })
      // Cross-field validation: passwords must match
      .formValidators([
        (form) => {
          if (form.password && form.confirmPassword && form.password !== form.confirmPassword) {
            return { confirmPassword: 'Passwords do not match' };
          }
          return null;
        },
      ])
      .onComplete({
        handle: async (result) => {
          console.log('Form submitted:', result);
          this.lastResult = `Form Submitted: ${JSON.stringify(result)}`;
        },
      })
      .build();

    this.modalService.open(config);
  }

  // Wizard Modal Demo
  openWizardModal() {
    const config = ModalBuilder.wizard()
      .title('Registration Wizard')
      .subtitle('Complete all steps to create your account')
      .description('Please fill in the required information in each step.')
      .size(ModalSize.LG)
      .flow(WizardFlowMode.LINEAR)
      .addStep('Account Information', (s) => {
        s.field({ kind: FieldKind.TEXT, key: 'email', label: 'Email Address', placeholder: 'user@example.com', validators: [Validators.required, Validators.email] })
        .field({ kind: FieldKind.PASSWORD, key: 'password', label: 'Password', placeholder: '********', validators: [Validators.required, Validators.minLength(8)] });
      }, 'account')
      .addStep('Profile Details', (s) => {
        s.row(2)
          .addToRow({ kind: FieldKind.TEXT, key: 'firstName', label: 'First Name', validators: [Validators.required] })
          .addToRow({ kind: FieldKind.TEXT, key: 'lastName', label: 'Last Name', validators: [Validators.required] })
        .guard({
          canEnter: () => {
            console.log('Checking if can enter Profile Step...');
            return true;
          },
          canExit: () => {
            console.log('Checking if can exit Profile Step...');
            return true;
          }
        });
      }, 'profile')
      .addStep('Verification', (s) => {
        s.body('Verify your email address. (Step 3)')
        .validators([
          {
            validate: async () => {
              console.log('Simulating Async Verification...');
              await new Promise(resolve => setTimeout(resolve, 1000));
              return { status: ValidationStatus.VALID };
            }
          }
        ]);
      }, 'verification')
      .addStep('Complete', (s) => {
        s.body('Thank you for registering! You can now finish the wizard.');
      }, 'complete')
      .onStepChange({
        handle: async (event) => {
          console.log('Step changed:', event);
        },
      })
      .onComplete({
        handle: async (result) => {
          console.log('Wizard completed:', result);
          this.lastResult = `Wizard Completed: visited ${result.visitedStepIds.join(', ')}`;
        },
      })
      .build();

    this.modalService.open(config);
  }

  // Custom Template Modal
  openCustomModal() {
    const config = ModalBuilder.custom()
      .title('User Overview')
      .subtitle('Manage your team members')
      .size(ModalSize.LG)
      .template(this.customTemplate)
      .build();

    const modalRef = this.modalService.open(config);

    modalRef.afterClosed$.subscribe((event) => {
      this.lastResult = `Custom Modal: ${event.reason}`;
    });
  }

  // Large Modal Demo
  openLargeModal() {
    const config = ModalBuilder.confirmation()
      .title('Large Modal Example')
      .size(ModalSize.XL)
      .message('This is a large modal that takes up more screen space. It can be useful for displaying more content or complex forms.')
      .confirmAction({
        label: 'Got it',
        style: ActionStyle.PRIMARY,
      })
      .build();

    this.modalService.open(config);
  }

  // View Reservation Modal — Multiple Footer Actions Demo
  openMultiActionModal() {
    const config = ModalBuilder.custom()
      .title('Track Reservation Details')
      .subtitle('Reservation #1234')
      .size(ModalSize.MD)
      .footerActions([
        {
          label: 'Close',
          style: ActionStyle.SECONDARY,
          position: 'left',
          closesModal: true,
          closeReason: ModalCloseReason.CANCELLED,
        },
        {
          label: 'Edit',
          style: ActionStyle.PRIMARY,
          position: 'right',
          handler: async (ref: ModalRef<unknown>) => {
            this.lastResult = 'Multi-Action: Edit clicked';
            ref.dismiss(ModalCloseReason.DISMISSED);
          },
        },
        {
          label: 'Delete Single',
          style: ActionStyle.DANGER,
          position: 'right',
          handler: async (ref: ModalRef<unknown>) => {
            this.lastResult = 'Multi-Action: Delete Single clicked';
            ref.dismiss(ModalCloseReason.DISMISSED);
          },
        },
        {
          label: 'Delete Series',
          style: ActionStyle.DANGER,
          position: 'right',
          handler: async (ref: ModalRef<unknown>) => {
            this.lastResult = 'Multi-Action: Delete Series clicked';
            ref.dismiss(ModalCloseReason.DISMISSED);
          },
        },
      ])
      .template(this.customTemplate)
      .build();

    this.modalService.open(config);
  }

  // Polling Modal Demo
  openPollingModal() {
    let pollCount = 0;
    const config = ModalBuilder.confirmation<boolean>()
      .title('Email Verification')
      .subtitle('Checking your email status...')
      .message('We sent a verification email. This modal will auto-close once verified.')
      .size(ModalSize.SM)
      .polling({
        interval: 2000,
        maxAttempts: 10,
        onPoll: async (ref: ModalRef<boolean>) => {
          pollCount++;
          console.log(`Poll attempt ${pollCount}`);
          // Simulate: verified after 3 polls
          if (pollCount >= 3) {
            this.lastResult = `Polling: Verified after ${pollCount} attempts`;
            ref.close(true);
            return true; // stop polling
          }
          return false;
        },
      })
      .confirmAction({ label: 'Resend Email', style: ActionStyle.PRIMARY })
      .cancelAction({ label: 'Cancel', style: ActionStyle.SECONDARY })
      .build();

    this.modalService.open(config);
  }

  // Read-Only / Field Groups Demo
  openReadOnlyGroupedModal() {
    interface WeaponInfo {
      name: string;
      serialNumber: string;
      brand: string;
      model: string;
      caliber: string;
      status: string;
      lastMaintenance: string;
      notes: string;
    }

    const config = ModalBuilder.form<WeaponInfo, WeaponInfo>()
      .title('Weapon Information')
      .subtitle('View weapon details')
      .size(ModalSize.LG)
      .fieldGroup('General Information', 'Basic weapon identification details', (g) => {
        g.addRow(2, (row) => {
          row.add({ kind: FieldKind.TEXT, key: 'name', label: 'Weapon Name', readOnly: true });
          row.add({ kind: FieldKind.TEXT, key: 'serialNumber', label: 'Serial Number', readOnly: true });
        });
      })
      .fieldGroup('Specifications', (g) => {
        g.addRow(3, (row) => {
          row.add({ kind: FieldKind.TEXT, key: 'brand', label: 'Brand', readOnly: true });
          row.add({ kind: FieldKind.TEXT, key: 'model', label: 'Model', readOnly: true });
          row.add({ kind: FieldKind.TEXT, key: 'caliber', label: 'Caliber', readOnly: true });
        });
      })
      .fieldGroup('Status & Maintenance', 'Current status and maintenance notes', (g) => {
        g.field({ kind: FieldKind.TEXT, key: 'status', label: 'Status', disabled: true })
         .field({ kind: FieldKind.TEXT, key: 'lastMaintenance', label: 'Last Maintenance', readOnly: true })
         .field({ kind: FieldKind.TEXTAREA, key: 'notes', label: 'Notes', readOnly: true, rows: 3 });
      })
      .initialValue({
        name: 'Glock 17 Gen5',
        serialNumber: 'GLK-2024-00142',
        brand: 'Glock',
        model: '17 Gen5',
        caliber: '9x19mm',
        status: 'Active',
        lastMaintenance: '2024-12-15',
        notes: 'Regular maintenance completed. All parts in good condition.',
      })
      .build();

    this.modalService.open(config);
  }

  // Multi-Select Table Modal Demo
  openMultiSelectTableModal() {
    interface TeamMember {
      id: string;
      name: string;
      email: string;
      role: string;
      department: string;
    }

    const members: TeamMember[] = [
      { id: '1', name: 'John Doe', email: 'john@example.com', role: 'Developer', department: 'Engineering' },
      { id: '2', name: 'Jane Smith', email: 'jane@example.com', role: 'Designer', department: 'Design' },
      { id: '3', name: 'Bob Wilson', email: 'bob@example.com', role: 'Manager', department: 'Engineering' },
      { id: '4', name: 'Alice Brown', email: 'alice@example.com', role: 'Developer', department: 'Engineering' },
      { id: '5', name: 'Charlie Davis', email: 'charlie@example.com', role: 'QA Engineer', department: 'Quality' },
      { id: '6', name: 'Diana Prince', email: 'diana@example.com', role: 'Designer', department: 'Design' },
    ];

    const columns: ColumnDefinition<TeamMember>[] = [
      { key: 'name', header: 'Name', cell: (r) => r.name, sortType: ColumnSortType.ALPHABETICAL },
      { key: 'email', header: 'Email', cell: (r) => r.email },
      { key: 'role', header: 'Role', cell: (r) => r.role, sortType: ColumnSortType.ALPHABETICAL },
      { key: 'department', header: 'Department', cell: (r) => r.department, sortType: ColumnSortType.ALPHABETICAL },
    ];

    const dataSource: TableDataSource<TeamMember> = {
      dataRows: new BehaviorSubject<TeamMember[]>(members),
      columns,
      getID: (r) => r.id,
      emptyMessage: 'No team members found',
      isDataLoading: false,
      canSearch: true,
      searchPlaceholder: 'Search members...',
      isInSearch: (row, term) =>
        row.name.toLowerCase().includes(term) ||
        row.email.toLowerCase().includes(term) ||
        row.role.toLowerCase().includes(term),
      appearance: { striped: true, hover: true },
    };

    interface AssignModel {
      teamName: string;
      members: string[];
    }

    const config = ModalBuilder.form<AssignModel, AssignModel>()
      .title('Assign Team Members')
      .subtitle('Select members for the project team')
      .size(ModalSize.LG)
      .field({
        kind: FieldKind.TEXT,
        key: 'teamName',
        label: 'Team Name',
        placeholder: 'Enter team name',
        validators: [Validators.required],
      })
      .field({
        kind: FieldKind.MULTI_SELECT_TABLE,
        key: 'members',
        label: 'Team Members',
        tableDataSource: dataSource,
        getRowValue: (row: TeamMember) => row.id,
        validators: [Validators.required],
      })
      .onComplete({
        handle: async (result) => {
          console.log('Team assigned:', result);
          this.lastResult = `Team "${result.teamName}" assigned with ${result.members.length} members: ${result.members.join(', ')}`;
        },
      })
      .build();

    this.modalService.open(config);
  }

  // Full Screen Modal Demo
  openFullScreenModal() {
    const config = ModalBuilder.confirmation()
      .title('Full Screen Modal')
      .size(ModalSize.FULL)
      .message('This modal takes up 95% of the screen, useful for immersive experiences or complex workflows.')
      .confirmAction({
        label: 'Close',
        style: ActionStyle.PRIMARY,
      })
      .build();

    this.modalService.open(config);
  }

  @ViewChild('customHeader', { static: true }) customHeader!: TemplateRef<any>;
  @ViewChild('confirmationDetail', { static: true }) confirmationDetail!: TemplateRef<any>;
  @ViewChild('wizardHeader', { static: true }) wizardHeader!: TemplateRef<any>;

  openHybridModal() {
    interface HybridModel {
      email: string;
    }
    const config = ModalBuilder.form<HybridModel>()
      .title('Hybrid Modal')
      .size(ModalSize.MD)
      .template(this.customHeader)
      .field({
        kind: FieldKind.TEXT,
        key: 'email',
        label: 'Email Address',
        placeholder: 'Enter your email',
        validators: [Validators.required, Validators.email]
      })
      .onComplete({
        handle: async (result) => {
          this.lastResult = `Hybrid Form Result: ${JSON.stringify(result)}`;
        }
      })
      .build();

    this.modalService.open(config);
  }

  openHybridConfirmationModal() {
    const config = ModalBuilder.confirmation()
      .title('Confirm with details')
      .size(ModalSize.MD)
      .template(this.confirmationDetail)
      .fieldGroup('Verification Details', 'Please provide additional context for this action', (g) => {
        g.addRow(2, (row) => {
          row.add({
            kind: FieldKind.TEXT,
            key: 'reason',
            label: 'Reason',
            placeholder: 'Why are you doing this?',
            validators: [Validators.required]
          });
          row.add({
            kind: FieldKind.SELECT,
            key: 'priority',
            label: 'Priority',
            options: [
              { label: 'Low', value: 'low' },
              { label: 'Medium', value: 'medium' },
              { label: 'High', value: 'high' }
            ],
            validators: [Validators.required]
          });
        });
      })
      .field({
        kind: FieldKind.CHECKBOX,
        key: 'acknowledged',
        label: 'I acknowledge that I have read and understood the implications of this action',
        validators: [Validators.requiredTrue]
      })
      .confirmAction({
        label: 'Confirm All',
        style: ActionStyle.PRIMARY,
      })
      .build();

    this.modalService.open(config);
  }

  openWizardWithCustomHeader() {
    interface WizardHeaderModel {
      data1: string;
      data2: string;
    }
    const config = ModalBuilder.wizard<WizardHeaderModel>()
      .title('Wizard with Custom Visualization')
      .template(this.wizardHeader)
      .addStep<WizardHeaderModel>('Step 1', (s) => {
        s.body('This wizard has a custom header visualization across all steps.')
         .field({ kind: FieldKind.TEXT, key: 'data1', label: 'Field 1' })
         .nextLabel('Go to Step 2');
      })
      .addStep<WizardHeaderModel>('Step 2', (s) => {
        s.body('Still here!')
         .field({ kind: FieldKind.TEXT, key: 'data2', label: 'Field 2' })
         .backLabel('Go back to 1')
         .nextLabel('Finish');
      })
      .build();

    this.modalService.open(config);
  }

  openAdvancedFormFeatures() {
    interface AdvancedModel {
      phone: string;
      taxId: string;
      deferred: string;
      autoFocused: string;
    }

    const config = ModalBuilder.form<AdvancedModel>()
      .title('Advanced Form Features')
      .subtitle('Showcase of masking, updateOn, and auto-focus')
      .size(ModalSize.MD)
      .field({
        kind: FieldKind.TEXT,
        key: 'autoFocused',
        label: 'Auto-Focused Field',
        placeholder: 'I should be focused on open',
        autoFocus: true
      })
      .field({
        kind: FieldKind.TEXT,
        key: 'phone',
        label: 'Phone Number (Masked)',
        placeholder: '(000) 000-0000',
        mask: '(000) 000-0000',
        validators: [Validators.required, Validators.pattern(/^\(\d{3}\) \d{3}-\d{4}$/)]
      })
      .field({
        kind: FieldKind.TEXT,
        key: 'taxId',
        label: 'Tax ID (Mixed Mask)',
        placeholder: 'AA-000-**',
        mask: 'AA-000-**',
        validators: [Validators.required, Validators.pattern(/^[a-zA-Z]{2}-\d{3}-.{2}$/)]
      })
      .field({
        kind: FieldKind.TEXT,
        key: 'deferred',
        label: 'Deferred Validation (updateOn: blur)',
        placeholder: 'Validation runs only on blur',
        updateOn: 'blur',
        validators: [Validators.required, Validators.minLength(5)]
      })
      .onComplete({
        handle: async (result) => {
          this.lastResult = `Advanced Form Result: ${JSON.stringify(result)}`;
        }
      })
      .build();

    this.modalService.open(config);
  }

  openStackedModalDemo() {
    const openSecond = () => {
      interface SecondModel {
        note: string;
      }
      const config2 = ModalBuilder.form<SecondModel>()
        .title('Second Modal')
        .subtitle('This modal is stacked on top of the first one.')
        .size(ModalSize.SM)
        .animation('zoom')
        .field({
          kind: FieldKind.TEXT,
          key: 'note',
          label: 'A note in the second modal',
          placeholder: 'Type something...'
        })
        .onComplete({
          handle: async (res) => console.log('Second modal complete', res)
        })
        .build();
      this.modalService.open(config2);
    };

    interface FirstModel {
      input1: string;
    }
    const config = ModalBuilder.form<FirstModel>()
      .title('First Modal')
      .subtitle('Click the button below to open another modal on top.')
      .size(ModalSize.MD)
      .animation('fade')
      .field({
        kind: FieldKind.TEXT,
        key: 'input1',
        label: 'Input in first modal',
        placeholder: 'First modal input'
      })
      .footerActions([
        {
          label: 'Cancel',
          style: ActionStyle.SECONDARY,
          closesModal: true,
          closeReason: ModalCloseReason.CANCELLED
        },
        {
          label: 'Open Second Modal',
          style: ActionStyle.PRIMARY,
          handler: () => openSecond()
        }
      ])
      .build();

    this.modalService.open(config);
  }

  openFluentValidationDemo() {
    interface FluentModel {
      email: string;
      password: string;
    }
    const config = ModalBuilder.form<FluentModel>()
      .title('Fluent Validation Demo')
      .size(ModalSize.MD)
      .fieldWithValidators({
        kind: FieldKind.TEXT,
        key: 'email',
        label: 'Email Address'
      })
        .required()
        .email()
        .done()
      .fieldWithValidators({
        kind: FieldKind.PASSWORD,
        key: 'password',
        label: 'Password'
      })
        .required()
        .minLength(8)
        .done()
      .build();

    this.modalService.open(config);
  }
}
