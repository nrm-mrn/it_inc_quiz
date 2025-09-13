import { MigrationInterface, QueryRunner } from "typeorm";

export class GameStatusTypeAndCollation1757746479436 implements MigrationInterface {
    name = 'GameStatusTypeAndCollation1757746479436'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."game_status_enum"`);
        await queryRunner.query(`ALTER TABLE "game" ADD "status" character varying COLLATE "C" NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "status"`);
        await queryRunner.query(`CREATE TYPE "public"."game_status_enum" AS ENUM('pending', 'active', 'finished')`);
        await queryRunner.query(`ALTER TABLE "game" ADD "status" "public"."game_status_enum" NOT NULL`);
    }

}
