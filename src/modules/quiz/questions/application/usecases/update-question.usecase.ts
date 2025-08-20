import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { QuestionsRepository } from '../infrastructure/questions.repository';
import { UUID } from 'crypto';

export class UpdateQuestionCommand {
  constructor(
    public id: UUID,
    public body: string,
    public answers: string[],
  ) {}
}

@CommandHandler(UpdateQuestionCommand)
export class UpdateQuestionCommandHandler
  implements ICommandHandler<UpdateQuestionCommand>
{
  constructor(private readonly questionsRepository: QuestionsRepository) {}

  async execute(command: UpdateQuestionCommand): Promise<void> {
    const question = await this.questionsRepository.getQuestionByIdOrFail(
      command.id,
    );
    question.update({
      body: command.body,
      answers: command.answers,
    });
    await this.questionsRepository.saveQuestion(question);
    return;
  }
}
