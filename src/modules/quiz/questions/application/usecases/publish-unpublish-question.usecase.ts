import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UUID } from 'crypto';
import { QuestionsRepository } from '../../infrastructure/questions.repository';

export class SetPublishCommand {
  constructor(
    public id: UUID,
    public published: boolean,
  ) {}
}

@CommandHandler(SetPublishCommand)
export class SetPublishQuestionCommandHandler
  implements ICommandHandler<SetPublishCommand>
{
  constructor(private readonly questionsRepository: QuestionsRepository) {}

  async execute(command: SetPublishCommand): Promise<void> {
    const question = await this.questionsRepository.getQuestionByIdOrFail(
      command.id,
    );
    question.setPublish(command.published);
    await this.questionsRepository.saveQuestion(question);
    return;
  }
}
