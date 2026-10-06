export type MnSkeletonShape = 'rectangle' | 'circle' | 'text';

export type MnSkeletonProps = {
  shape?: MnSkeletonShape;
  animated?: boolean;
  width?: string;
  height?: string;
  /**
   * How long the placeholder stays invisible before it fades in, in ms. Default 300: a load
   * that finishes sooner never shows a skeleton at all, so a fast page does not flash grey
   * bars before its content. 0 starts its 150 ms fade-in at once.
   */
  appearDelay?: number;
};
