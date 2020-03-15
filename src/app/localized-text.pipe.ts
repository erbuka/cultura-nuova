import { Pipe, PipeTransform } from '@angular/core';
import { ContextService } from './context.service';
import { LocalizedText } from './types/item';

@Pipe({
  name: 'cnLocalizedText'
})
export class LocalizedTextPipe implements PipeTransform {


  constructor(private context: ContextService) {  }

  transform(value: LocalizedText, ...args: unknown[]): string {
    return this.context.translate(value);
  }

}
