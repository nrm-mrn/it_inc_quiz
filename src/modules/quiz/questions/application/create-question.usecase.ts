import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { Question } from '../domain/question.schema';
import { QuestionsRepository } from '../infrastructure/questions.repository';

export class CreateQuestionCommand {
  constructor(
    public body: string,
    public answers: string[],
  ) {}
}

@CommandHandler(CreateQuestionCommand)
export class CreateQuestionCommandHandler
  implements ICommandHandler<CreateQuestionCommand, { questionId: string }>
{
  constructor(private readonly questionsRepository: QuestionsRepository) {}

  async execute(
    command: CreateQuestionCommand,
  ): Promise<{ questionId: string }> {
    const question = Question.create({
      body: command.body,
      answers: command.answers,
    });
    const { id } = await this.questionsRepository.saveQuestion(question);
    return { questionId: id };
  }
}
