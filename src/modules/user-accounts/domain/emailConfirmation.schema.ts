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
import { CreateEmailConfirmationDomainDto } from './dto/create-email-confirmation-domain-dto';

@Entity()
export class EmailConfirmation {
  @PrimaryGeneratedColumn('identity')
  id: number;

  @Column({
    type: 'uuid',
    unique: true,
    nullable: true,
  })
  confirmationCode: UUID | null;

  @Column({
    type: 'timestamptz',
    nullable: true,
  })
  expirationDate: Date | null;

  @Column({
    type: 'boolean',
  })
  isConfirmed: boolean;

  @OneToOne(() => User, (user) => user.emailConfirmation, {
    onDelete: 'CASCADE',
  })
  @JoinColumn()
  user: Relation<User>;

  @Column({ type: 'uuid' })
  userId: UUID;

  static create(dto: CreateEmailConfirmationDomainDto) {
    const confirmation = new this();
    confirmation.expirationDate = dto.expiration;
    confirmation.confirmationCode = dto.code;
    confirmation.isConfirmed = dto.isConfirmed;

    return confirmation;
  }
}
