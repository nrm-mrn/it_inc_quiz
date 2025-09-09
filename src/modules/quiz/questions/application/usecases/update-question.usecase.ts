import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UUID } from 'crypto';
import { QuestionsRepository } from '../../infrastructure/questions.repository';
import {
  DomainException,
  Extension,
} from 'src/core/exceptions/domain-exceptions';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';

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
    if (command.answers.length === 0 && question.published) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'Published question should have at least one answer',
        extensions: [
          new Extension('Answer should not be empty', 'correctAnswers'),
        ],
      });
    }
    question.update({
      body: command.body,
      answers: command.answers,
    });
    await this.questionsRepository.saveQuestion(question);
    return;
  }
}
