import { MigrationInterface, QueryRunner } from 'typeorm';

export class UsersTableInit1755361727322 implements MigrationInterface {
  name = 'UsersTableInit1755361727322';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      /*sql*/
      `CREATE TABLE users (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "deletedAt" timestamp,
  login character varying COLLATE "C" NOT NULL,
  email character varying NOT NULL,
  "passHash" character varying(72) NOT NULL,
  CONSTRAINT "UQ_97672ac88f789774dd47f7c8be3" UNIQUE (email),
  CONSTRAINT "PK_a3ffb1c0c8416b9fc6f907b7433" PRIMARY KEY (id)
)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`DROP TABLE "users"`);
  }
}
