import { Directive } from '@angular/core';

@Directive({
  selector: 'mn-icon[mnIconPistol], mn-icon[mnIconPending]',
  standalone: true,
})
export class MnIconAttributes {}
