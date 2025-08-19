import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { UserViewDto } from '../../api/view-dto/users.view-dto';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { User } from '../../domain/user.schema';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RawUser } from '../../domain/dto/raw-user-domain-dto';

export class GetUserQuery {
  constructor(public userId: string) {}
}

@QueryHandler(GetUserQuery)
export class GetUserQueryHandler
  implements IQueryHandler<GetUserQuery, UserViewDto>
{
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  async execute(query: GetUserQuery): Promise<UserViewDto> {
    const user = await this.usersRepository
      .createQueryBuilder('user')
      .select([
        'id',
        'login',
        'email',
        '"passHash"',
        '"createdAt"',
        '"updatedAt"',
        '"deletedAt"',
      ])
      .where({ id: query.userId })
      .getRawOne<RawUser>();
    if (!user) {
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'User not found after creation',
      });
    }
    return UserViewDto.mapToView(user);
  }
}
