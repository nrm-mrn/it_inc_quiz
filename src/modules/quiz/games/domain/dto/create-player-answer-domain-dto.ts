import { UUID } from 'crypto';

export class CreatePlayerAnswerDomainDto {
  playerId: UUID;
  questionId: UUID;
  status: boolean;
}
