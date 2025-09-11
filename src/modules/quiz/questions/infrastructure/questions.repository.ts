import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Question } from '../domain/question.schema';
import { EntityManager, Repository } from 'typeorm';
import { UUID } from 'crypto';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';

@Injectable()
export class QuestionsRepository {
  constructor(
    @InjectRepository(Question)
    private readonly questionsRepository: Repository<Question>,
  ) {}

  private getQuestionsRepo(manager?: EntityManager) {
    return manager ? manager.getRepository(Question) : this.questionsRepository;
  }

  async saveQuestion(question: Question): Promise<{ id: UUID }> {
    const id = await this.questionsRepository
      .save(question)
      .then((question) => question.id);
    return { id };
  }

  async getQuestionById(id: UUID): Promise<Question | null> {
    return this.questionsRepository.findOneBy({ id });
  }

  async getQuestionByIdOrFail(
    id: UUID,
    manager?: EntityManager,
  ): Promise<Question> {
    const question = await this.getQuestionsRepo(manager).findOneBy({ id });
    if (!question) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Question was not found',
      });
    }
    return question;
  }

  async deleteQuestion(id: UUID): Promise<void> {
    await this.questionsRepository.softDelete({ id });
  }

  async getRandomQuestionsForGame(): Promise<UUID[]> {
    const questions = await this.questionsRepository
      .createQueryBuilder('q')
      .where(`q.published = :published`, { published: true })
      .orderBy('RANDOM()')
      .take(5)
      .getMany();

    if (questions.length < 5) {
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message:
          'Not enough questions exist in db to generate a game, add at least 5',
      });
    }
    return questions.map((q) => q.id);
  }
}
