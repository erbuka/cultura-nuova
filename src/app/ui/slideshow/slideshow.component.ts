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

  direction: "forward" | "backward" | "none" = "forward";

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

          this.currentSlide = {
            groupIndex: groupIndex,
            itemIndex: itemIndex
          };


          if (this.item.groups[groupIndex].items[itemIndex].href) {
            let url = this.context.resolveUrl(this.item.groups[groupIndex].items[itemIndex].href, this.item);
            this.context.getItem(url).subscribe(
              item => this.currentSlideItem = item,
              _ => this.currentSlideItem = null
            );
          }
        }

      } else {
        this.currentSlide = null;
        this.currentSlideItem = null;
      }
    });
  }



  clearSlide(): void {
    this.router.navigate([], { relativeTo: this.route });
  }

  nextSlide(): void {
    let cs = this.currentSlide;

    this.direction = "forward";

    if (cs.itemIndex === this.getCurrentGroup().items.length - 1 && cs.groupIndex < this.getGroupCount() - 1) {
      cs.groupIndex++;
      cs.itemIndex = 0;
    } else if (cs.itemIndex < this.getCurrentGroup().items.length - 1) {
      cs.itemIndex++;
    }

    this.gotoSlide(this.currentSlide.groupIndex, this.currentSlide.itemIndex);
  }


  previousSlide(): void {
    let cs = this.currentSlide;

    this.direction = "backward";

    if (cs.itemIndex === 0 && cs.groupIndex > 0) {
      cs.groupIndex--;
      cs.itemIndex = this.getCurrentGroup().items.length - 1;
    } else if (cs.itemIndex > 0) {
      cs.itemIndex--;
    }

    this.gotoSlide(this.currentSlide.groupIndex, this.currentSlide.itemIndex);
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

  getGroupCount(): number { return this.item.groups.length; }
  getGroup(idx: number) { return this.item.groups[idx] }
  getCurrentGroup() { return this.getGroup(this.currentSlide.groupIndex); }


}
