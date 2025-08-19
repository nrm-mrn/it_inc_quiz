import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { GetUsersQueryParams } from './input-dto/get-users-query-params.input-dto';
import { PaginatedViewDto } from 'src/core/dto/base.paginated.view-dto';
import { UserViewDto } from './view-dto/users.view-dto';
import { BasicAuthGuard } from '../guards/basic/basic-auth.guard';
import { CreateUserInputDto } from './input-dto/create-user.input-dto';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import { CreateUserByAdminCommand } from '../application/usecases/create-user.usecase';
import { DeleteUserCommand } from '../application/usecases/delete-user.usecase';
import { GetAllUsersQuery } from '../application/query/get-all-users.query';
import { GetUserQuery } from '../application/query/get-user.query';
import { UuidValidationPipe } from 'src/core/pipes/uuid-validation-pipe.service';
import { CreateUserDto } from '../dto/create-user.dto';
import { UUID } from 'crypto';

@Controller('sa/users')
@UseGuards(BasicAuthGuard)
export class UsersController {
  constructor(
    private readonly commandBus: CommandBus,
    private readonly queryBus: QueryBus,
  ) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createUser(@Body() body: CreateUserInputDto): Promise<UserViewDto> {
    const input: CreateUserDto = {
      login: body.login,
      email: body.email,
      password: body.password,
    };
    const { userId } = await this.commandBus.execute<
      CreateUserByAdminCommand,
      { userId: UUID }
    >(new CreateUserByAdminCommand(input.login, input.password, input.email));
    const user = await this.queryBus.execute<GetUserQuery, UserViewDto>(
      new GetUserQuery(userId),
    );
    return user;
  }

  @Get()
  @HttpCode(HttpStatus.OK)
  async getAllUsers(
    @Query() query: GetUsersQueryParams,
  ): Promise<PaginatedViewDto<UserViewDto[]>> {
    return this.queryBus.execute(new GetAllUsersQuery(query));
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteUser(@Param('id', UuidValidationPipe) id: UUID) {
    return this.commandBus.execute<DeleteUserCommand, void>(
      new DeleteUserCommand(id),
    );
  }
}
