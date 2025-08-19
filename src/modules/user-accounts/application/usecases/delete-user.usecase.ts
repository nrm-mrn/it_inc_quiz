import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { UsersRepository } from '../../infrastructure/users.repository';
import { UUID } from 'crypto';

export class DeleteUserCommand {
  constructor(public userId: UUID) {}
}

@CommandHandler(DeleteUserCommand)
export class DeleteUserHandler implements ICommandHandler<DeleteUserCommand> {
  constructor(private readonly usersRepository: UsersRepository) {}
  async execute(command: DeleteUserCommand): Promise<any> {
    const user = await this.usersRepository.findOrNotFoundFail(command.userId);
    await this.usersRepository.deleteUser(user.id);
  }
}
