import { Injectable } from '@nestjs/common';
import { User } from '../domain/user.schema';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UUID } from 'crypto';

@Injectable()
export class UsersExternalService {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  async findUserById(id: UUID): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id },
    });
  }
}
