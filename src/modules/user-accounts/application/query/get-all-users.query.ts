import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { GetUsersQueryParams } from '../../api/input-dto/get-users-query-params.input-dto';
import { PaginatedViewDto } from 'src/core/dto/base.paginated.view-dto';
import { UserViewDto } from '../../api/view-dto/users.view-dto';
import { User } from '../../domain/user.schema';
import { InjectRepository } from '@nestjs/typeorm';
import { ILike, Repository } from 'typeorm';
import { RawUser } from '../../domain/dto/raw-user-domain-dto';

export class GetAllUsersQuery {
  constructor(public params: GetUsersQueryParams) {}
}

@QueryHandler(GetAllUsersQuery)
export class GetAllUsersQueryHandler
  implements IQueryHandler<GetAllUsersQuery, PaginatedViewDto<UserViewDto[]>>
{
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
  ) {}

  async execute(
    query: GetAllUsersQuery,
  ): Promise<PaginatedViewDto<UserViewDto[]>> {
    const q = this.usersRepository
      .createQueryBuilder('user')
      .select([
        'id',
        'login',
        'email',
        '"passHash"',
        '"createdAt"',
        '"updatedAt"',
        '"deletedAt"',
      ]);
    if (
      'searchLoginTerm' in query.params &&
      query.params.searchLoginTerm !== null
    ) {
      q.where({ login: ILike(`%${query.params.searchLoginTerm}%`) });
    }
    if (
      'searchEmailTerm' in query.params &&
      query.params.searchEmailTerm !== null
    ) {
      if (
        'searchLoginTerm' in query.params &&
        query.params.searchLoginTerm !== null
      ) {
        q.orWhere({ email: ILike(`%${query.params.searchEmailTerm}%`) });
      } else {
        q.where({ email: ILike(`%${query.params.searchEmailTerm}%`) });
      }
    }
    q.orderBy(`"user"."${query.params.sortBy}"`, query.params.sortDirection);
    q.skip(query.params.calculateSkip());
    q.take(query.params.pageSize);

    const total = await q.getCount();
    const users = await q.getRawMany<RawUser>();
    const usersView = users.map((user) => {
      return UserViewDto.mapToView(user);
    });
    return PaginatedViewDto.mapToView({
      items: usersView,
      page: query.params.pageNumber,
      size: query.params.pageSize,
      totalCount: total,
    });
  }
}
