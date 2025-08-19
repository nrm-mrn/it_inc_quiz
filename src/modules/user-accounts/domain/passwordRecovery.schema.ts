import { UUID } from 'crypto';
import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryGeneratedColumn,
  Relation,
} from 'typeorm';
import { User } from './user.schema';
import { CreatePassRecoveryDomainDto } from './dto/create-pass-recovery-domain-dto';

@Entity()
export class PasswordRecovery {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({ type: 'uuid', unique: true })
  confirmationCode: UUID;

  @Column({ type: 'timestamptz' })
  expirationDate: Date;

  @OneToOne(() => User, (user) => user.passwordRecovery, {
    onDelete: 'CASCADE',
    orphanedRowAction: 'delete',
  })
  @JoinColumn()
  user: Relation<User>;

  @Column({ type: 'uuid', nullable: true })
  userId: UUID;

  static create(dto: CreatePassRecoveryDomainDto) {
    const rec = new this();
    rec.confirmationCode = dto.code;
    rec.expirationDate = dto.expiration;
    return rec;
  }
}
