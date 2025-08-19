import { Column, Entity, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import { User } from './user.schema';
import { UUID } from 'crypto';
import { CreateSessionDomainDto } from './dto/create-session-domain-dto';
import { RefreshSessionDomainDto } from './dto/refresh-session-domain-dto';

@Entity()
export class DeviceAuthSession {
  @PrimaryColumn({
    type: 'uuid',
  })
  id: UUID;

  @Column({
    type: 'int',
  })
  iat: number;

  @Column({
    type: 'timestamptz',
  })
  expiration: Date;

  @Column({
    type: 'varchar',
    length: 39,
  })
  ip: string;

  @Column({
    type: 'text',
  })
  title: string; //NOTE: user-agent header

  @ManyToOne(() => User, (user) => user.sessions, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  user: Relation<User> | null;

  //better to specify the column to be able to access it from the class
  @Column({ type: 'uuid' })
  userId: UUID;

  static create(input: CreateSessionDomainDto) {
    const session = new this();
    session.id = input.deviceId;
    session.iat = input.iat;
    session.expiration = input.expiration;
    session.ip = input.ip;
    session.title = input.title;
    session.userId = input.userId;
    return session;
  }

  public refresh(input: RefreshSessionDomainDto) {
    this.iat = input.iat;
    this.expiration = input.expiration;
  }
}
