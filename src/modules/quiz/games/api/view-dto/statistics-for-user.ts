import { RawStatisticsDb } from '../../application/queries/get-statistics-for-user';

export class StatisticsForUserViewDto {
  sumScore: number;
  avgScores: number;
  gamesCount: number;
  winsCount: number;
  lossesCount: number;
  drawsCount: number;

  static CreateZeroes() {
    return {
      sumScore: 0,
      avgScores: 0,
      gamesCount: 0,
      winsCount: 0,
      lossesCount: 0,
      drawsCount: 0,
    };
  }

  static MapToView(dto: RawStatisticsDb): StatisticsForUserViewDto {
    return {
      sumScore: Number(dto.sumScore),
      avgScores: Number(dto.avgScores),
      gamesCount: Number(dto.gamesCount),
      winsCount: Number(dto.winsCount),
      lossesCount: Number(dto.lossesCount),
      drawsCount: Number(dto.drawsCount),
    };
  }
}
