import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { DomainException } from '../exceptions/domain-exceptions';
import { DomainExceptionCode } from '../exceptions/domain-exception-codes';
import { isUUID } from 'class-validator';
import { UUID } from 'crypto';

@Injectable()
export class UuidValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    if (!isUUID(value)) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: `invalid UUID: ${value}`,
      });
    }

    return value as UUID;
  }
}
