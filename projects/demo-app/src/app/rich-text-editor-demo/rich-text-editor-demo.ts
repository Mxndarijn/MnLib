import {Component, signal} from '@angular/core';
import {CommonModule} from '@angular/common';
import {MnButton, MnRichTextEditor, MnRichTextEditorLabels} from 'mn-angular-lib';
import {DemoPageComponent} from '../shared/demo-page.component';
import {DemoExampleComponent} from '../shared/demo-example.component';

/** A seed a visitor can push into the editor from outside it. */
type Seed = {
  /** Button caption. */
  name: string;
  /** HTML pushed into the editor. */
  html: string;
};

@Component({
  selector: 'app-rich-text-editor-demo',
  standalone: true,
  imports: [CommonModule, MnRichTextEditor, MnButton, DemoPageComponent, DemoExampleComponent],
  templateUrl: './rich-text-editor-demo.html',
  styles: [
    `
      /* The app's reset strips heading margins, so the page sets its own rhythm. */
      h2 {
        font-size: 24px;
        font-weight: 700;
        margin: 0 0 8px;
      }
      h3 {
        font-size: 17px;
        font-weight: 600;
        margin: 0 0 6px;
      }
      .seeds {
        display: flex;
        flex-wrap: wrap;
        gap: 8px;
        margin-top: 12px;
      }
      .readout {
        margin-top: 12px;
        padding: 12px;
        border: 1px solid var(--color-base-300);
        border-radius: var(--mn-radius, 12px);
        font-family: ui-monospace, monospace;
        font-size: 12px;
        white-space: pre-wrap;
        word-break: break-all;
        opacity: 0.75;
      }
    `,
  ],
})
export class RichTextEditorDemo {
  /** What the editor currently holds, echoed back under it. */
  readonly content = signal<string>('<p>Type here, or push one of the seeds below.</p>');

  /** Content of the second editor, which carries Dutch toolbar labels. */
  readonly translatedContent = signal<string>('');

  /** Seeds shown as buttons, to show that reseeding never fights the caret. */
  readonly seeds: Seed[] = [
    {name: 'Agenda outline', html: '<h2>Opening</h2><p><br></p><h2>Closing</h2>'},
    {name: 'Empty', html: ''},
  ];

  /** Literal Dutch labels for the second editor's toolbar. */
  readonly dutchLabels: MnRichTextEditorLabels = {
    textStyle: 'Tekststijl',
    bold: 'Vet',
    italic: 'Schuin',
    underline: 'Onderstreept',
    strike: 'Doorgehaald',
    orderedList: 'Genummerde lijst',
    bulletList: 'Opsomming',
    blockquote: 'Citaat',
    codeBlock: 'Codeblok',
    link: 'Koppeling',
    clean: 'Opmaak wissen',
  };
}
