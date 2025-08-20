import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QuestionsRepository } from '../infrastructure/questions.repository';
import { UUID } from 'crypto';

export class DeleteQuestionCommand {
  constructor(public id: UUID) {}
}

@CommandHandler(DeleteQuestionCommand)
export class DeleteQuestionCommandHandler
  implements ICommandHandler<DeleteQuestionCommand>
{
  constructor(private readonly questionsRepository: QuestionsRepository) {}

  async execute(command: DeleteQuestionCommand): Promise<void> {
    const question = await this.questionsRepository.getQuestionByIdOrFail(
      command.id,
    );
    await this.questionsRepository.deleteQuestion(question.id);
  }
}
