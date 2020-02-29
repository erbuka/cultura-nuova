import { Pipe, PipeTransform } from '@angular/core';
import { ContextService } from './context.service';

@Pipe({
  name: 'cnUrl'
})
export class UrlPipe implements PipeTransform {

  constructor(private context:ContextService) {}

  transform(value: any, ...args: any[]): any {
    let routerUrl = args.length >= 2 && args[1] === true;
    let url = this.context.resolveUrl(value, args[0]);
    return routerUrl ? this.context.joinUrl("/", url) : url;
  }

}
