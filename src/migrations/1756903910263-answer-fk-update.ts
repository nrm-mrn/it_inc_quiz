import { MigrationInterface, QueryRunner } from "typeorm";

export class AnswerFkUpdate1756903910263 implements MigrationInterface {
    name = 'AnswerFkUpdate1756903910263'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."game_status_enum" RENAME TO "game_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."game_status_enum" AS ENUM('pending', 'active', 'finished')`);
        await queryRunner.query(`ALTER TABLE "game" ALTER COLUMN "status" TYPE "public"."game_status_enum" USING "status"::"text"::"public"."game_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."game_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "player_answer" DROP CONSTRAINT "FK_76b8a29a2051312ee7cf28d568f"`);
        await queryRunner.query(`ALTER TABLE "player_answer" DROP CONSTRAINT "FK_9221b1116bbf449067600c94d52"`);
        await queryRunner.query(`ALTER TABLE "player_answer" ALTER COLUMN "playerId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "player_answer" ALTER COLUMN "questionId" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "player_answer" ADD CONSTRAINT "FK_76b8a29a2051312ee7cf28d568f" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "player_answer" ADD CONSTRAINT "FK_9221b1116bbf449067600c94d52" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "player_answer" DROP CONSTRAINT "FK_9221b1116bbf449067600c94d52"`);
        await queryRunner.query(`ALTER TABLE "player_answer" DROP CONSTRAINT "FK_76b8a29a2051312ee7cf28d568f"`);
        await queryRunner.query(`ALTER TABLE "player_answer" ALTER COLUMN "questionId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "player_answer" ALTER COLUMN "playerId" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "player_answer" ADD CONSTRAINT "FK_9221b1116bbf449067600c94d52" FOREIGN KEY ("questionId") REFERENCES "question"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "player_answer" ADD CONSTRAINT "FK_76b8a29a2051312ee7cf28d568f" FOREIGN KEY ("playerId") REFERENCES "player"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`CREATE TYPE "public"."game_status_enum_old" AS ENUM('pending', 'active', 'finished')`);
        await queryRunner.query(`ALTER TABLE "game" ALTER COLUMN "status" TYPE "public"."game_status_enum_old" USING "status"::"text"::"public"."game_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."game_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."game_status_enum_old" RENAME TO "game_status_enum"`);
    }

}
