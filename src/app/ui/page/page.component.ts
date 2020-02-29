import { Component, OnInit, Input, TemplateRef, OnChanges, SimpleChanges } from '@angular/core';
import { ContextService } from 'src/app/context.service';
import { PageItem } from 'src/app/types/page-item';

@Component({
  selector: 'app-page',
  templateUrl: './page.component.html',
  styleUrls: ['./page.component.scss']
})
export class PageComponent implements OnChanges {

  @Input() item: PageItem = null;

  template: TemplateRef<any> = null;
  templateContext: any;

  constructor(private context: ContextService) { }

  ngOnChanges(changes: SimpleChanges): void {
    this.template = this.context.getTemplate(this.item.template);
    this.templateContext = { $implicit: this.item.data, item: this.item };
  }



}
