export type MnSkeletonShape = 'rectangle' | 'circle' | 'text';

export type MnSkeletonProps = {
  shape?: MnSkeletonShape;
  animated?: boolean;
  width?: string;
  height?: string;
};
