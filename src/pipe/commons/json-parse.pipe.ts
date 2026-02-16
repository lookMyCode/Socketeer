import { PipeTransform } from '../PipeTransform';
import { BadRequestException } from '../../exception/BadRequestException';


export class JsonParsePipe implements PipeTransform {

  transform(value: any) {
    try {
      if (typeof value === 'object') return value;
      return JSON.parse(value);
    } catch (e) {
      throw new BadRequestException('Invalid JSON');
    }
  }
}
