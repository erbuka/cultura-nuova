import { Directive, TemplateRef, Input } from '@angular/core';

@Directive({
  selector: '[appTemplateDef]'
})
export class TemplateDefDirective {
  @Input("appTemplateDef") name: string;
  constructor(public templateRef: TemplateRef<any>) { }
}
