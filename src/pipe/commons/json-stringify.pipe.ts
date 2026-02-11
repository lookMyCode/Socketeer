import { PipeTransform } from '../PipeTransform';

export class JsonStringifyPipe implements PipeTransform {
  
  transform(value: any) {
    if (typeof value === 'string') return value;
    return JSON.stringify(value);
  }
}
