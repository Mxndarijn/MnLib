import {Component, Input} from '@angular/core';

@Component({
  selector: 'lib-mn-error-message',
  imports: [],
  templateUrl: './mn-error-message.html',
})
export class MnErrorMessage {
  @Input({ required: true }) errorMessage! :string;
  @Input({ required: true }) id!: string;
}
