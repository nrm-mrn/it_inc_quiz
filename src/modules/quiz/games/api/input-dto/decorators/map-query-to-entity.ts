import { Transform } from 'class-transformer';

export const MapQueryToEntity = () =>
  Transform(({ value }) => {
    switch (value) {
      case 'pairCreatedDate':
        return 'createdAt';
      case 'startGameDate':
        return 'startedAt';
      case 'finishGameDate':
        return 'finishedAt';
      default:
        // eslint-disable-next-line @typescript-eslint/no-unsafe-return
        return value;
    }
  });
