import { MigrationInterface, QueryRunner } from "typeorm";

export class CreateUpdateTimezone1757594621859 implements MigrationInterface {
    name = 'CreateUpdateTimezone1757594621859'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "question" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "question" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "question" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "question" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "game" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "game" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TYPE "public"."game_status_enum" RENAME TO "game_status_enum_old"`);
        await queryRunner.query(`CREATE TYPE "public"."game_status_enum" AS ENUM('pending', 'active', 'finished')`);
        await queryRunner.query(`ALTER TABLE "game" ALTER COLUMN "status" TYPE "public"."game_status_enum" USING "status"::"text"::"public"."game_status_enum"`);
        await queryRunner.query(`DROP TYPE "public"."game_status_enum_old"`);
        await queryRunner.query(`ALTER TABLE "player_answer" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "player_answer" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "player_answer" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "player_answer" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "player" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "player" ADD "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "player" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "player" ADD "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "player" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "player" ADD "updatedAt" TIMESTAMP DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "player" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "player" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "player_answer" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "player_answer" ADD "updatedAt" TIMESTAMP DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "player_answer" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "player_answer" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`CREATE TYPE "public"."game_status_enum_old" AS ENUM('pending', 'active', 'finished')`);
        await queryRunner.query(`ALTER TABLE "game" ALTER COLUMN "status" TYPE "public"."game_status_enum_old" USING "status"::"text"::"public"."game_status_enum_old"`);
        await queryRunner.query(`DROP TYPE "public"."game_status_enum"`);
        await queryRunner.query(`ALTER TYPE "public"."game_status_enum_old" RENAME TO "game_status_enum"`);
        await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "game" ADD "updatedAt" TIMESTAMP DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "game" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "game" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "question" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "question" ADD "updatedAt" TIMESTAMP DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "question" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "question" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "updatedAt"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "updatedAt" TIMESTAMP DEFAULT now()`);
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "createdAt"`);
        await queryRunner.query(`ALTER TABLE "users" ADD "createdAt" TIMESTAMP NOT NULL DEFAULT now()`);
    }

}
