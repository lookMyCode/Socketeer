import { ZodSchema, ZodError } from 'zod';
import { PipeTransform } from '../PipeTransform';
import { SocketContext } from '../../SocketContext';
export interface ZodValidationPipeOptions {
    onError?: (error: ZodError, context: SocketContext) => void;
}
export declare class ZodValidationPipe implements PipeTransform {
    private schema;
    private options;
    constructor(schema: ZodSchema, options?: ZodValidationPipeOptions);
    transform(value: any, context?: SocketContext): unknown;
}
