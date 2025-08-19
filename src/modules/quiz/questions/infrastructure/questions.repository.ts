import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Question } from '../domain/question.schema';
import { Repository } from 'typeorm';

@Injectable()
export class QuestionsRepository {
  constructor(
    @InjectRepository(Question)
    private readonly questionsRepository: Repository<Question>,
  ) {}

  async saveQuestion(question: Question): Promise<{ id: string }> {
    const id = await this.questionsRepository
      .save(question)
      .then((question) => question.id);
    return { id };
  }
}
