import { ArgumentMetadata, Injectable, PipeTransform } from '@nestjs/common';
import { DomainException } from '../exceptions/domain-exceptions';
import { DomainExceptionCode } from '../exceptions/domain-exception-codes';

@Injectable()
export class IntValidationPipe implements PipeTransform {
  transform(value: any, metadata: ArgumentMetadata) {
    const number = Number(value);
    if (isNaN(number)) {
      throw new DomainException({
        code: DomainExceptionCode.BadRequest,
        message: `Invalid number: ${value}`,
      });
    }
    return number;
  }
}
