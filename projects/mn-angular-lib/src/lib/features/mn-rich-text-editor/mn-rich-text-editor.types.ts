/**
 * One control on the editor's default toolbar.
 *
 * The list doubles as the key space for {@link MnRichTextEditorLabels}: a label
 * can only be given for a control the default toolbar actually renders.
 */
export type MnRichTextEditorControl =
  | 'textStyle'
  | 'bold'
  | 'italic'
  | 'underline'
  | 'strike'
  | 'orderedList'
  | 'bulletList'
  | 'blockquote'
  | 'codeBlock'
  | 'link'
  | 'clean';

/**
 * Hover labels for the toolbar controls.
 *
 * Values are either literal text (`labels`) or translation keys resolved through
 * `MnLanguageService` (`labelKeys`); anything left out falls back to the
 * component's built-in English label.
 */
export type MnRichTextEditorLabels = Partial<Record<MnRichTextEditorControl, string>>;

/**
 * A Quill toolbar definition: rows of control descriptors, exactly as Quill's
 * `modules.toolbar` option takes them.
 *
 * Typed loosely on purpose — Quill accepts strings (`'bold'`) and objects
 * (`{ header: [2, 3, false] }`) in the same row, and the library does not export
 * a type for it.
 */
export type MnRichTextEditorToolbar = readonly (readonly unknown[])[];
