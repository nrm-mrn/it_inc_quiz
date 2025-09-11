import { MigrationInterface, QueryRunner } from "typeorm";

export class DefaultNullUpdatedAt1757584511426 implements MigrationInterface {
    name = 'DefaultNullUpdatedAt1757584511426'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TYPE "public"."game_status_enum" RENAME TO "game_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."game_status_enum" AS ENUM('pending', 'active', 'finished')`);
        await queryRunner.query(`ALTER TABLE "game" ALTER COLUMN "status" TYPE "public"."game_status_enum" USING "status"::"text"::"public"."game_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."game_status_enum_old"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`CREATE TYPE "public"."game_status_enum_old" AS ENUM('pending', 'active', 'finished')`);
        await queryRunner.query(`ALTER TABLE "game" ALTER COLUMN "status" TYPE "public"."game_status_enum_old" USING "status"::"text"::"public"."game_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."game_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."game_status_enum_old" RENAME TO "game_status_enum"`);
    }

}
