export class TopUserViewDto {
  sumScore: number;
  avgScores: number;
  gamesCount: number;
  winsCount: number;
  lossesCount: number;
  drawsCount: number;
  player: {
    id: string;
    login: string;
  };

  static MapToView(dto: RawTopUserDb): TopUserViewDto {
    return {
      sumScore: Number(dto.sumScore),
      avgScores: Number(dto.avgScores),
      gamesCount: Number(dto.gamesCount),
      winsCount: Number(dto.gamesCount),
      lossesCount: Number(dto.lossesCount),
      drawsCount: Number(dto.drawsCount),
      player: {
        id: dto.player.id,
        login: dto.player.login,
      },
    };
  }
}

export class RawTopUserDb {
  sumScore: string;
  avgScores: string;
  gamesCount: string;
  winsCount: string;
  lossesCount: string;
  drawsCount: string;
  player: {
    id: string;
    login: string;
  };
}
