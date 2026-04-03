# MnModal — Usage Guide

## Quick Start

```typescript
import { MnModalService, ModalBuilder, FieldKind, ModalSize } from 'mn-angular-lib';

constructor(private modalService: MnModalService) {}
```

---

## 1. Confirmation Modal

Simple yes/no dialogs.

```typescript
import { ConfirmationTone, ActionStyle, ModalCloseReason } from 'mn-angular-lib';

const config = ModalBuilder.confirmation<boolean>()
  .title('Delete Item')
  .message('Are you sure you want to delete this item?')
  .tone(ConfirmationTone.DANGER)
  .size(ModalSize.SM)
  .confirmAction({ label: 'Delete', style: ActionStyle.DANGER })
  .cancelAction({ label: 'Cancel', style: ActionStyle.SECONDARY })
  .build();

const ref = this.modalService.open(config);

ref.afterClosed$.subscribe(event => {
  if (event.reason === ModalCloseReason.COMPLETED) {
    console.log('Confirmed!');
  }
});
```

---

## 2. Form Modal

Single-step forms with validation, layout control, and dynamic fields.

### Basic Form

```typescript
import { Validators } from '@angular/forms';

interface UserModel {
  firstName: string;
  lastName: string;
  email: string;
}

const config = ModalBuilder.form<UserModel>()
  .title('Create User')
  .size(ModalSize.MD)
  .field({ kind: FieldKind.TEXT, key: 'firstName', label: 'First Name', validators: [Validators.required] })
  .field({ kind: FieldKind.TEXT, key: 'lastName', label: 'Last Name', validators: [Validators.required] })
  .field({ kind: FieldKind.TEXT, key: 'email', label: 'Email', validators: [Validators.required, Validators.email] })
  .initialValue({ firstName: 'John' })
  .onComplete({ handle: async (result) => console.log('Submitted:', result) })
  .build();

this.modalService.open(config);
```

### Row-Based Layout

Place multiple fields on one row using `.row()` and `.addToRow()`:

```typescript
const config = ModalBuilder.form<UserModel>()
  .title('User Info')
  // Two fields side by side
  .row(2)
    .addToRow({ kind: FieldKind.TEXT, key: 'firstName', label: 'First Name' })
    .addToRow({ kind: FieldKind.TEXT, key: 'lastName', label: 'Last Name' })
  // Full-width field
  .field({ kind: FieldKind.TEXT, key: 'email', label: 'Email' })
  .build();
```

### All Field Types

```typescript
FieldKind.TEXT          // Text input
FieldKind.NUMBER        // Number input (supports min, max, step)
FieldKind.PASSWORD      // Password input (masked)
FieldKind.SELECT        // Single-select dropdown
FieldKind.MULTI_SELECT  // Multi-select with checkboxes (supports searchable, maxSelections)
FieldKind.CHECKBOX      // Checkbox toggle
FieldKind.DATE          // Date picker (supports minDate, maxDate)
FieldKind.DATETIME      // Date+time picker (supports mode: 'date' | 'time' | 'datetime-local')
FieldKind.TEXTAREA      // Multi-line text (supports rows)
FieldKind.CUSTOM        // Custom Angular component
```

### Conditional Fields

Show/hide fields based on other field values:

```typescript
.field({
  kind: FieldKind.SELECT,
  key: 'role',
  label: 'Role',
  options: [{ label: 'User', value: 'user' }, { label: 'Admin', value: 'admin' }],
})
.field({
  kind: FieldKind.MULTI_SELECT,
  key: 'permissions',
  label: 'Permissions',
  options: [...],
  visible: (form) => form.role === 'admin',  // Only shown when role is admin
  validators: [Validators.required],          // Validators auto-cleared when hidden
})
```

### Cross-Field Validation

Validate across multiple fields using `formValidators`:

```typescript
.formValidators([
  (form) => {
    if (form.password !== form.confirmPassword) {
      return { confirmPassword: 'Passwords do not match' };
    }
    return null;
  },
])
```

### Angular FormGroup Validators

Apply standard Angular `ValidatorFn` to the entire FormGroup using `groupValidators`:

```typescript
import { AbstractControl, ValidationErrors } from '@angular/forms';

function passwordMatchValidator(control: AbstractControl): ValidationErrors | null {
  const pw = control.get('password');
  const confirm = control.get('confirmPassword');
  return pw && confirm && pw.value !== confirm.value ? { mismatch: true } : null;
}

const config = ModalBuilder.form<MyModel>()
  .field({ kind: FieldKind.PASSWORD, key: 'password', label: 'Password' })
  .field({ kind: FieldKind.PASSWORD, key: 'confirmPassword', label: 'Confirm' })
  .groupValidators([passwordMatchValidator])
  .build();
```

### Async Data Sources

Load select options from an API:

```typescript
.field({
  kind: FieldKind.SELECT,
  key: 'country',
  label: 'Country',
  options: [],  // Initial empty — loaded by dataSource
  dataSource: {
    load: async () => {
      const res = await fetch('/api/countries');
      return res.json(); // [{ label: 'NL', value: 'nl' }, ...]
    },
  },
})
// Cascading: cities reload when country changes
.field({
  kind: FieldKind.SELECT,
  key: 'city',
  label: 'City',
  options: [],
  dataSource: {
    dependsOn: ['country'],
    load: async (formValue) => {
      if (!formValue?.country) return [];
      const res = await fetch(`/api/cities?country=${formValue.country}`);
      return res.json();
    },
  },
})
```

### Field Groups with Dynamic Visibility

Group fields under section headers, with optional visibility conditions:

```typescript
.field({ kind: FieldKind.SELECT, key: 'type', label: 'Type', options: [
  { label: 'Personal', value: 'personal' },
  { label: 'Business', value: 'business' },
]})
.fieldGroup({
  title: 'Business Information',
  description: 'Required for business accounts',
  visible: (form) => form.type === 'business',  // Entire group hidden/shown
  fields: [
    { kind: FieldKind.TEXT, key: 'companyName', label: 'Company', validators: [Validators.required] },
    { kind: FieldKind.TEXT, key: 'vatNumber', label: 'VAT Number', validators: [Validators.required] },
  ],
})
```

When a group is hidden, validators on its fields are automatically cleared so they don't block form submission.

### Read-Only Fields

```typescript
.field({ kind: FieldKind.TEXT, key: 'id', label: 'ID', readOnly: true })
.field({ kind: FieldKind.TEXT, key: 'status', label: 'Status', disabled: true })
```

---

## 3. Wizard Modal

Multi-step flows with navigation, validation, and data aggregation.

```typescript
import { WizardFlowMode, ValidationStatus } from 'mn-angular-lib';

const config = ModalBuilder.wizard()
  .title('Registration')
  .subtitle('Complete all steps')
  .size(ModalSize.LG)
  .flow(WizardFlowMode.LINEAR)
  .addStep('Account', (s) => {
    s.field({ kind: FieldKind.TEXT, key: 'email', label: 'Email', validators: [Validators.required, Validators.email] })
     .field({ kind: FieldKind.PASSWORD, key: 'password', label: 'Password', validators: [Validators.required] });
  }, 'account')
  .addStep('Profile', (s) => {
    s.row(2)
      .addToRow({ kind: FieldKind.TEXT, key: 'firstName', label: 'First Name', validators: [Validators.required] })
      .addToRow({ kind: FieldKind.TEXT, key: 'lastName', label: 'Last Name', validators: [Validators.required] })
     .guard({
       canEnter: () => true,
       canExit: () => true,
     });
  }, 'profile')
  .addStep('Done', (s) => {
    s.body('Registration complete!');
  }, 'done')
  .onStepChange({ handle: async (event) => console.log('Step:', event) })
  .onComplete({
    handle: async (result) => {
      // result.payload is namespaced by step ID:
      // { account: { email, password }, profile: { firstName, lastName } }
      console.log(result.payload);
    },
  })
  .build();

this.modalService.open(config);
```

### StepBuilder API

Inside `addStep(title, (s) => { ... })`, the StepBuilder uses the **same `.field()` API** as `FormModalBuilder`:

```typescript
// Fields (same API as FormModalBuilder)
s.field({ kind: FieldKind.TEXT, key: 'email', label: 'Email', validators: [Validators.required] })
s.field({ kind: FieldKind.PASSWORD, key: 'password', label: 'Password', validators: [Validators.required] })
s.field({ kind: FieldKind.SELECT, key: 'role', label: 'Role', options: [...] })

// Row layouts
s.row(2)
  .addToRow({ kind: FieldKind.TEXT, key: 'firstName', label: 'First Name' })
  .addToRow({ kind: FieldKind.TEXT, key: 'lastName', label: 'Last Name' })

// Field groups with section headers
s.fieldGroup({
  title: 'Address',
  fields: [
    { kind: FieldKind.TEXT, key: 'street', label: 'Street' },
    { kind: FieldKind.TEXT, key: 'city', label: 'City' },
  ],
  visible: (form) => form.hasAddress === true,
})

// Cross-field validation within a step
s.formValidators([(form) => form.pw !== form.confirm ? { confirm: 'Mismatch' } : null])

// Angular FormGroup-level validators
s.groupValidators([myGroupValidator])

// Pre-fill step form data
s.initialValue({ email: 'default@example.com' })

// Non-form steps
s.body('Plain text content')

// Navigation guards
s.guard({ canEnter: () => true, canExit: () => true })

// Step-level validators (async supported)
s.validators([{ validate: () => ({ status: ValidationStatus.VALID }) }])
```

---

## 4. Custom Modal

Inject your own Angular component or template:

```typescript
// With a template
const config = ModalBuilder.custom()
  .title('Custom Content')
  .size(ModalSize.LG)
  .template(this.myTemplateRef)
  .build();

// With a component
const config = ModalBuilder.custom()
  .title('Dashboard')
  .component(MyDashboardComponent)
  .inputs({ userId: 123 })
  .build();
```

In templates, `modalRef` is available:

```html
<ng-template #myTemplate let-modalRef="modalRef">
  <button (click)="modalRef.close('done')">Close</button>
</ng-template>
```

---

## 5. Shared Options (All Modal Types)

These methods are available on every builder:

```typescript
.title('Modal Title')
.subtitle('Subtitle text')
.description('Longer description')
.size(ModalSize.SM | MD | LG | XL | FULL)
.closeMode(CloseMode.ALLOWED | GUARDED | DISABLED)
.closeGuard(() => window.confirm('Are you sure?'))
.backdrop(BackdropMode.HIDE | STATIC | CLOSABLE)
.keyboard(KeyboardMode.ENABLED | DISABLED)
.intent(ModalIntent.NEUTRAL | INFO | SUCCESS | WARNING | DANGER)
```

### Custom Footer Actions

Override the default footer buttons:

```typescript
.footerActions([
  { label: 'Close', style: ActionStyle.SECONDARY, position: 'left', closesModal: true, closeReason: ModalCloseReason.CANCELLED },
  { label: 'Edit', style: ActionStyle.PRIMARY, position: 'right', handler: (ref) => openEditModal() },
  { label: 'Delete', style: ActionStyle.DANGER, position: 'right', handler: async (ref) => { await deleteItem(); ref.close(); } },
])
```

### Polling / Async Operations

Auto-poll while the modal is open:

```typescript
.polling({
  interval: 3000,
  maxAttempts: 10,
  onPoll: async (ref) => {
    const status = await checkStatus();
    if (status === 'verified') {
      ref.close('verified');
      return true; // Stop polling
    }
  },
})
```

---

## 6. ModalRef API

`MnModalService.open()` returns a `ModalRef<TResult>`:

```typescript
const ref = this.modalService.open(config);

// Listen for close
ref.afterClosed$.subscribe(event => {
  console.log(event.reason); // 'completed' | 'cancelled' | 'dismissed' | ...
  console.log(event.result); // Typed result
});

// Programmatic control
ref.close(result);                          // Close with COMPLETED
ref.dismiss(ModalCloseReason.CANCELLED);    // Dismiss with reason
ref.update({ title: 'New Title' });         // Update config (triggers re-render)
```

---

## 7. Accessibility

The modal system includes:
- `role="dialog"` and `aria-modal="true"` on the container
- `aria-labelledby` linked to the title
- `aria-describedby` linked to the description
- **Focus trapping**: Tab/Shift+Tab cycles within the modal
- Focus is auto-set on open and restored to the previously focused element on close
- Escape key support (configurable via `KeyboardMode`)
