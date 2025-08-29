import { MigrationInterface, QueryRunner } from 'typeorm';

export class GameTablesInit1756138485406 implements MigrationInterface {
  name = 'GameTablesInit1756138485406';

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(/*sql*/ `CREATE TABLE player_answer (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "deletedAt" timestamp,
  status boolean NOT NULL,
  "playerId" uuid,
  "questionId" uuid,
  CONSTRAINT "PK_ef764290b852c90cb6ab60f20e2" PRIMARY KEY (id)
)`);
    await queryRunner.query(/*sql*/ `CREATE TABLE player (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "deletedAt" timestamp,
  score integer NOT NULL,
  "userId" uuid,
  CONSTRAINT "PK_65edadc946a7faf4b638d5e8885" PRIMARY KEY (id)
)`);
    await queryRunner.query(/*sql*/ `CREATE TYPE public.game_status_enum AS ENUM (
  'pending', 'active', 'finished'
)`);
    await queryRunner.query(/*sql*/ `CREATE TABLE game (
  id uuid NOT NULL DEFAULT uuid_generate_v4(),
  "createdAt" timestamp NOT NULL DEFAULT now(),
  "updatedAt" timestamp NOT NULL DEFAULT now(),
  "deletedAt" timestamp,
  status public.game_status_enum NOT NULL,
  "player1Id" uuid,
  "player2Id" uuid,
  CONSTRAINT "REL_7b7f91302f66ab534423c96aa3" UNIQUE ("player1Id"),
  CONSTRAINT "REL_3b85329cbe5b9f9002f05018fa" UNIQUE ("player2Id"),
  CONSTRAINT "PK_352a30652cd352f552fef73dec5" PRIMARY KEY (id)
)`);
    await queryRunner.query(/*sql*/ `CREATE TABLE game_question (
  "gameId" uuid NOT NULL,
  "questionId" uuid NOT NULL,
  "order" integer NOT NULL,
  CONSTRAINT "PK_379d1e5aefdf901d5f7bff3fecd" PRIMARY KEY (
    "gameId", "questionId"
  )
)`);
    await queryRunner.query(/*sql*/ `ALTER TABLE player_answer
ADD CONSTRAINT "FK_76b8a29a2051312ee7cf28d568f" FOREIGN KEY (
  "playerId"
) REFERENCES player (id) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(/*sql*/ `ALTER TABLE player_answer
ADD CONSTRAINT "FK_9221b1116bbf449067600c94d52" FOREIGN KEY (
  "questionId"
) REFERENCES question (id) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(/*sql*/ `ALTER TABLE player
ADD CONSTRAINT "FK_7687919bf054bf262c669d3ae21" FOREIGN KEY (
  "userId"
) REFERENCES users (id) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(/*sql*/ `ALTER TABLE game
ADD CONSTRAINT "FK_7b7f91302f66ab534423c96aa34" FOREIGN KEY (
  "player1Id"
) REFERENCES player (id) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(/*sql*/ `ALTER TABLE game
ADD CONSTRAINT "FK_3b85329cbe5b9f9002f05018faf" FOREIGN KEY (
  "player2Id"
) REFERENCES player (id) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(/*sql*/ `ALTER TABLE game_question
ADD CONSTRAINT "FK_d35bdfc9ff116d456dcad4a580e" FOREIGN KEY (
  "gameId"
) REFERENCES game (id) ON DELETE NO ACTION ON UPDATE NO ACTION`);
    await queryRunner.query(/*sql*/ `ALTER TABLE game_question
ADD CONSTRAINT "FK_0040e663701d18ed9d1c49ecf6b" FOREIGN KEY (
  "questionId"
) REFERENCES question (id) ON DELETE NO ACTION ON UPDATE NO ACTION`);
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(
      /*sql*/ `ALTER TABLE game_question DROP CONSTRAINT "FK_0040e663701d18ed9d1c49ecf6b"`,
    );
    await queryRunner.query(
      /*sql*/ `ALTER TABLE game_question DROP CONSTRAINT "FK_d35bdfc9ff116d456dcad4a580e"`,
    );
    await queryRunner.query(
      /*sql*/ `ALTER TABLE game DROP CONSTRAINT "FK_3b85329cbe5b9f9002f05018faf"`,
    );
    await queryRunner.query(
      /*sql*/ `ALTER TABLE game DROP CONSTRAINT "FK_7b7f91302f66ab534423c96aa34"`,
    );
    await queryRunner.query(
      /*sql*/ `ALTER TABLE player DROP CONSTRAINT "FK_7687919bf054bf262c669d3ae21"`,
    );
    await queryRunner.query(
      /*sql*/ `ALTER TABLE player_answer DROP CONSTRAINT "FK_9221b1116bbf449067600c94d52"`,
    );
    await queryRunner.query(
      /*sql*/ `ALTER TABLE player_answer DROP CONSTRAINT "FK_76b8a29a2051312ee7cf28d568f"`,
    );
    await queryRunner.query(/*sql*/ `DROP TABLE game_question`);
    await queryRunner.query(/*sql*/ `DROP TABLE game`);
    await queryRunner.query(/*sql*/ `DROP TYPE public.game_status_enum`);
    await queryRunner.query(/*sql*/ `DROP TABLE player`);
    await queryRunner.query(/*sql*/ `DROP TABLE player_answer`);
  }
}
