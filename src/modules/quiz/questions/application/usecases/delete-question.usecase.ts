import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UUID } from 'crypto';
import { QuestionsRepository } from '../../infrastructure/questions.repository';

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
