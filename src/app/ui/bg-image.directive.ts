import { Directive, ElementRef, OnInit, OnChanges, SimpleChanges, Renderer2, Input } from '@angular/core';

@Directive({
  selector: '[appBgImage]'
})
export class BgImageDirective implements OnChanges {

  @Input("appBgImage") url: string = "";

  constructor(private element: ElementRef, private renderer: Renderer2) { }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['url']) {
      this.renderer.setStyle(this.element.nativeElement, "background-image", `url('${this.url}')`)
    }
  }

}
