import { DateTime } from 'luxon';
import { DeviceAuthSession } from '../../domain/session.schema';

export class SessionViewDto {
  ip: string;
  title: string;
  lastActiveDate: string;
  deviceId: string;

  static mapToView(session: DeviceAuthSession) {
    const dto = new SessionViewDto();
    dto.ip = session.ip;
    dto.title = session.title;
    dto.lastActiveDate = DateTime.fromSeconds(session.iat).toUTC().toISO();
    dto.deviceId = session.id;
    return dto;
  }
}
