import { Transform } from 'class-transformer';

export const QueryToArray = () =>
  Transform(({ value }) => {
    if (Array.isArray(value)) {
      // eslint-disable-next-line @typescript-eslint/no-unsafe-return
      return value;
    } else if (typeof value === 'string') {
      return [value];
    }
    return [];
  });
