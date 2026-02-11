import { ZodSchema, ZodError } from 'zod';
import { PipeTransform } from '../PipeTransform';
import { SocketContext } from '../../SocketContext';
import { BadRequestException } from '../../exception/BadRequestException';


export interface ZodValidationPipeOptions {
  onError?: (error: ZodError, context: SocketContext) => void | Promise<void>;
}


export class ZodValidationPipe implements PipeTransform {

  constructor(
    private schema: ZodSchema,
    private options: ZodValidationPipeOptions = {}
  ) {}

  async transform(value: any, context?: SocketContext) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      if (this.options.onError && context) {
        await this.options.onError(result.error, context);
        throw new BadRequestException('Validation Handled');
      }

      throw new BadRequestException(JSON.stringify(result.error.issues));
    }

    return result.data;
  }
}
