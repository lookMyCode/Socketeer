import { PipeTransform } from '../PipeTransform';


export class BufferToStringPipe implements PipeTransform {

  transform(value: any): string {
    if (Buffer.isBuffer(value)) return value.toString();
    if (value instanceof ArrayBuffer || Array.isArray(value)) return Buffer.from(value as any).toString();
    return String(value);
  }
}
