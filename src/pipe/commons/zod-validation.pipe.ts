import { ZodSchema, ZodError } from 'zod';
import { PipeTransform } from '../PipeTransform';
import { SocketContext } from '../../SocketContext';
import { SocketeerException } from '../../exception/SocketeerException';

export interface ZodValidationPipeOptions {
  onError?: (error: ZodError, context: SocketContext) => void;
}

export class ZodValidationPipe implements PipeTransform {
  constructor(
    private schema: ZodSchema,
    private options: ZodValidationPipeOptions = {}
  ) { }

  transform(value: any, context?: SocketContext) {
    const result = this.schema.safeParse(value);

    if (!result.success) {
      if (this.options.onError && context) {
        this.options.onError(result.error, context);
        // Throw handled exception (silent failure for main flow)
        throw new SocketeerException('Validation Handled', 400, false);
      }
      throw new SocketeerException(JSON.stringify(result.error.issues), 400, false);
    }

    return result.data;
  }
}
