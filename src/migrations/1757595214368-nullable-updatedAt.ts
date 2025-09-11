import { MigrationInterface, QueryRunner } from "typeorm";

export class NullableUpdatedAt1757595214368 implements MigrationInterface {
    name = 'NullableUpdatedAt1757595214368'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "updatedAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "question" ALTER COLUMN "updatedAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "game" ALTER COLUMN "updatedAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TYPE "public"."game_status_enum" RENAME TO "game_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."game_status_enum" AS ENUM('pending', 'active', 'finished')`);
        await queryRunner.query(`ALTER TABLE "game" ALTER COLUMN "status" TYPE "public"."game_status_enum" USING "status"::"text"::"public"."game_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."game_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "player_answer" ALTER COLUMN "updatedAt" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "player" ALTER COLUMN "updatedAt" DROP NOT NULL`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "player" ALTER COLUMN "updatedAt" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "player_answer" ALTER COLUMN "updatedAt" SET NOT NULL`);
        await queryRunner.query(`CREATE TYPE "public"."game_status_enum_old" AS ENUM('pending', 'active', 'finished')`);
        await queryRunner.query(`ALTER TABLE "game" ALTER COLUMN "status" TYPE "public"."game_status_enum_old" USING "status"::"text"::"public"."game_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."game_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."game_status_enum_old" RENAME TO "game_status_enum"`);
        await queryRunner.query(`ALTER TABLE "game" ALTER COLUMN "updatedAt" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "question" ALTER COLUMN "updatedAt" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "users" ALTER COLUMN "updatedAt" SET NOT NULL`);
    }

}
