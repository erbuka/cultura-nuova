import { Component, OnInit, Input } from '@angular/core';
import { SlideshowItem, ContextService, Item } from 'src/app/context.service';
import { ActivatedRoute, Router } from '@angular/router';

type Slide = {
  groupIndex: number;
  itemIndex: number;
}

@Component({
  selector: 'app-slideshow',
  templateUrl: './slideshow.component.html',
  styleUrls: ['./slideshow.component.scss']
})
export class SlideshowComponent implements OnInit {

  currentSlide: Slide = null;
  currentSlideItem: Item = null;
  @Input() item: SlideshowItem = null;


  constructor(private route: ActivatedRoute, private context: ContextService, private router: Router) { }

  ngOnInit() {
    this.route.queryParamMap.subscribe(paramMap => {
      if (paramMap.has("g") && paramMap.has("s")) {

        let groupIndex = parseInt(paramMap.get("g")),
          itemIndex = parseInt(paramMap.get("s"));

        if (itemIndex >= 0 && itemIndex < this.item.groups[groupIndex].items.length) {

          let url = this.context.resolveUrl(this.item.groups[groupIndex].items[itemIndex].href, this.item);

          this.context.getItem(url).subscribe(item => {
            this.currentSlide = {
              groupIndex: groupIndex,
              itemIndex: itemIndex
            };
            this.currentSlideItem = item;
          });
        }

      } else {
        this.currentSlide = null;
        this.currentSlideItem = null;
      }
    });
  }

  gotoSlide(groupIndex: number, itemIndex: number): void {
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: {
        g: groupIndex,
        s: itemIndex
      }
    });
  }

}
