import { Component, ViewChildren, QueryList, TemplateRef, AfterViewInit, Renderer2 } from '@angular/core';
import { ContextService } from '../context.service';
import { TemplateDefDirective } from '../template-def.directive';

@Component({
  selector: 'app-templates',
  templateUrl: './templates.component.html'
})
export class TemplatesComponent implements AfterViewInit {

  @ViewChildren(TemplateDefDirective) templates: QueryList<TemplateDefDirective>;

  constructor(private context: ContextService, private renderer: Renderer2) { }

  ngAfterViewInit(): void {
    this.templates.forEach(t => this.context.registerTemplate(t.name, t.templateRef));
  }

}
