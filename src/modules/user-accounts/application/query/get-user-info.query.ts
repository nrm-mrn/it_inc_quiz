import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { MeViewDto } from '../../api/view-dto/users.view-dto';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { User } from '../../domain/user.schema';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RawUser } from '../../domain/dto/raw-user-domain-dto';

export class GetUserInfoQuery {
  constructor(public userId: string) {}
}

@QueryHandler(GetUserInfoQuery)
export class GetUserInfoQueryHandler
  implements IQueryHandler<GetUserInfoQuery, MeViewDto>
{
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  async execute(query: GetUserInfoQuery): Promise<MeViewDto> {
    const user = await this.usersRepository
      .createQueryBuilder('users')
      .select('users.*')
      .where('users.id = :id', { id: query.userId })
      .getRawOne<RawUser>();
    if (!user) {
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'user not found by access token info',
      });
    }
    return MeViewDto.mapToView(user);
  }
}
