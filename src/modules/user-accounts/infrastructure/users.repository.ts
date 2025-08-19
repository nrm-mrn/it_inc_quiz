import { Injectable } from '@nestjs/common';
import { DomainException } from 'src/core/exceptions/domain-exceptions';
import { DomainExceptionCode } from 'src/core/exceptions/domain-exception-codes';
import { UUID } from 'crypto';
import { User } from '../domain/user.schema';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { PasswordRecovery } from '../domain/passwordRecovery.schema';
import { DeviceAuthSession } from '../domain/session.schema';

@Injectable()
export class UsersRepository {
  constructor(
    @InjectRepository(User) private readonly usersRepository: Repository<User>,
    @InjectRepository(PasswordRecovery)
    private readonly passRecoveryRepository: Repository<PasswordRecovery>,
    @InjectRepository(DeviceAuthSession)
    private readonly sessionsRepository: Repository<DeviceAuthSession>,
  ) {}

  async saveUser(user: User): Promise<User> {
    return this.usersRepository.save<User>(user);
  }

  async findById(userId: UUID): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { id: userId },
    });
  }

  async findOrNotFoundFail(userId: UUID): Promise<User> {
    const user = await this.usersRepository.findOne({
      where: { id: userId },
    });
    if (!user) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'User not found',
      });
    }
    return user;
  }

  async deleteUser(userId: UUID) {
    await this.usersRepository.delete(userId);
  }

  async deletePassRecovery(passwordRecovery: PasswordRecovery) {
    await this.passRecoveryRepository.delete(passwordRecovery);
  }

  async deleteSessions(sessions: DeviceAuthSession[]) {
    await this.sessionsRepository.delete(sessions.map((s) => s.id));
  }

  async findUserByLoginOrEmail(input: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: [{ login: input }, { email: input }],
      relations: { sessions: true },
    });
  }

  async findUserByEmail(input: string): Promise<User | null> {
    return this.usersRepository.findOne({
      where: { email: input },
      relations: { emailConfirmation: true, passwordRecovery: true },
    });
  }

  async findUserByEmailConfirmation(code: UUID): Promise<User | null> {
    return this.usersRepository.findOne({
      where: {
        emailConfirmation: {
          confirmationCode: code,
        },
      },
      relations: {
        emailConfirmation: true,
      },
    });
  }

  async findUserByPassRecovery(code: UUID): Promise<User | null> {
    return this.usersRepository.findOne({
      relations: {
        passwordRecovery: true,
      },
      where: {
        passwordRecovery: {
          confirmationCode: code,
        },
      },
    });
  }

  async findUserBySessionOrFail(deviceId: UUID, iat: number): Promise<User> {
    const session = await this.sessionsRepository.findOne({
      where: {
        id: deviceId,
        iat,
      },
    });
    if (!session) {
      throw new DomainException({
        code: DomainExceptionCode.Unauthorized,
        message: 'Session does not exist or already expired',
      });
    }

    const user = await this.usersRepository.findOne({
      relations: { sessions: true },
      where: {
        id: session.userId,
      },
    });
    if (!user) {
      throw new DomainException({
        code: DomainExceptionCode.InternalServerError,
        message: 'Could not find user for an existing session',
      });
    }
    return user;
  }

  async findUserByDeviceIdOrFail(deviceId: UUID): Promise<User> {
    const user = await this.usersRepository.findOne({
      relations: { sessions: true },
      where: {
        sessions: {
          id: deviceId,
        },
      },
    });
    if (!user) {
      throw new DomainException({
        code: DomainExceptionCode.NotFound,
        message: 'Session does not exist or already expired',
      });
    }
    return user;
  }
}
