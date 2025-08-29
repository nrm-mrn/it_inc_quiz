import { UUID } from 'crypto';

export class CreateGameQuestionDomainDto {
  gameId: UUID;
  questionIds: UUID[];
}
