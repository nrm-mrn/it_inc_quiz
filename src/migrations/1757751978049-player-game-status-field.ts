import { MigrationInterface, QueryRunner } from "typeorm";

export class PlayerGameStatusField1757751978049 implements MigrationInterface {
    name = 'PlayerGameStatusField1757751978049'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "player" ADD "status" character varying COLLATE "C"`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "player" DROP COLUMN "status"`);
    }

}
