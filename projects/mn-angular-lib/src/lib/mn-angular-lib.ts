import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'mn-lib',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  template: `
    <p>
      mn-angular-lib works!
    </p>
  `,
  styles: ``,
})
export class MnAngularLib {

}
