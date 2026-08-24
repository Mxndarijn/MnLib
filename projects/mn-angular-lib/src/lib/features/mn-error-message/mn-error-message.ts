import {ChangeDetectionStrategy, Component, Input} from '@angular/core';

@Component({
  selector: 'mn-error-message',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [],
  templateUrl: './mn-error-message.html',
})
export class MnErrorMessage {
  @Input({ required: true }) errorMessage! :string;
  @Input({ required: true }) id!: string;
}
