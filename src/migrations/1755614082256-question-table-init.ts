import { MigrationInterface, QueryRunner } from 'typeorm';

export class QuestionTableInit1755614082256 implements MigrationInterface {
  name = 'QuestionTableInit1755614082256';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      /*sql*/
      `CREATE TABLE question (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "deletedAt" timestamp,
  body text COLLATE "C" NOT NULL,
  published boolean NOT NULL,
  "correctAnswers" jsonb NOT NULL,
  CONSTRAINT "PK_21e5786aa0ea704ae185a79b2d5" PRIMARY KEY (id)
)`,
    );
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(/*sql*/ `DROP TABLE question`);
  }
}
