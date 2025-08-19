import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UsersRepository } from '../../infrastructure/users.repository';
import { UsersService } from '../users.service';
import { HashService } from '../passHash.service';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';
import {
  DomainException,
  Extension,
} from 'src/core/exceptions/domain-exceptions';
import { User } from '../../domain/user.schema';

export class CreateUserByAdminCommand {
  constructor(
    public login: string,
    public password: string,
    public email: string,
  ) {}
}

@CommandHandler(CreateUserByAdminCommand)
export class CreateUserByAdminHandler
  implements ICommandHandler<CreateUserByAdminCommand, { userId: string }>
{
  constructor(
    private readonly usersRepository: UsersRepository,
    private readonly usersService: UsersService,
    private readonly hashService: HashService,
  ) {}

  async execute(
    command: CreateUserByAdminCommand,
  ): Promise<{ userId: string }> {
    const uniqueLogin = await this.usersService.isLoginUnique(command.login);
    if (!uniqueLogin) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'Login already exists',
        extensions: [new Extension('Login already exist', 'login')],
      });
    }
    const uniqueEmail = await this.usersService.isEmailUnique(command.email);
    if (!uniqueEmail) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: 'Email already exists',
        extensions: [new Extension('Email already exist', 'email')],
      });
    }

    const hash = await this.hashService.createHash(command.password);
    const user = User.createUserByAdmin({
      email: command.email,
      login: command.login,
      passwordHash: hash,
    });
    const userEntity = await this.usersRepository.saveUser(user);
    return { userId: userEntity.id };
  }
}
