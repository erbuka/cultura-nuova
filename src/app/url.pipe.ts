import { Pipe, PipeTransform } from '@angular/core';
import { ContextService, Item } from './context.service';

@Pipe({
  name: 'cnUrl'
})
export class UrlPipe implements PipeTransform {

  constructor(private context:ContextService) {}

  transform(value: any, ...args: any[]): any {
    return this.context.resolveUrl(value, args[0]);
  }

}
