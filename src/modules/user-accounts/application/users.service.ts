import { Injectable } from '@nestjs/common';
import { UsersRepository } from '../infrastructure/users.repository';

@Injectable()
export class UsersService {
  constructor(private readonly usersRepository: UsersRepository) {}

  async isLoginUnique(login: string): Promise<boolean> {
    const loginRes = await this.usersRepository.findUserByLoginOrEmail(login);
    if (loginRes) {
      return false;
    }
    return true;
  }

  async isEmailUnique(email: string): Promise<boolean> {
    const emailRes = await this.usersRepository.findUserByLoginOrEmail(email);
    if (emailRes) {
      return false;
    }
    return true;
  }
}
