import { Transform, TransformFnParams } from 'class-transformer';

export const Upper = () =>
  Transform(({ value }: TransformFnParams) =>
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return
    typeof value === 'string' ? value.trim().toUpperCase() : value,
  );
