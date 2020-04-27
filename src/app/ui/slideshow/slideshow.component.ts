import { Component, OnInit, Input } from '@angular/core';
import { ContextService } from 'src/app/context.service';
import { ActivatedRoute, Router } from '@angular/router';
import {
  trigger,
  state,
  style,
  animate,
  transition,
  query,
  group
} from '@angular/animations';
import { Item } from 'src/app/types/item';
import { SlideshowItem } from 'src/app/types/slideshow-item';



@Component({
  selector: 'app-slideshow',
  templateUrl: './slideshow.component.html',
  styleUrls: ['./slideshow.component.scss'],
  animations: [
    trigger('slideAnimation', [
      transition(':increment',
        group([
          query(":enter", [
            style({ transform: "translateX(100%)" }),
            animate("0.25s", style({ transform: "translateX(0)" }))
          ]),
          query(":leave", [
            animate("0.25s", style({ transform: "translateX(-100%)" }))
          ], { optional: true }),
        ])
      ),
      transition(':decrement',
        group([
          query(":enter", [
            style({ transform: "translateX(-100%)" }),
            animate("0.25s", style({ transform: "translateX(0)" }))
          ]),
          query(":leave", [
            animate("0.25s", style({ transform: "translateX(100%)" }))
          ], { optional: true }),
        ])
      )
    ])
  ]
})
export class SlideshowComponent implements OnInit {

  @Input() item: SlideshowItem = null;

  direction: "forward" | "backward" | "none" = "forward";
  currentSlideIndex: number = null;
  slideItemsCache: Item[] = null;

  constructor(private route: ActivatedRoute, private context: ContextService, private router: Router) { }

  ngOnInit() {

    this.slideItemsCache = new Array<Item>(this.item.slides.length);
    this.slideItemsCache.fill(null, 0, this.slideItemsCache.length);

    this.route.queryParamMap.subscribe(paramMap => {

      if (paramMap.has("s")) {

        let slideIndex = parseInt(paramMap.get("s"));

        if (slideIndex >= 0) {

          this.currentSlideIndex = slideIndex;

          if (this.item.slides[slideIndex].href && this.slideItemsCache[slideIndex] === null) {
            let url = this.context.resolveUrl(this.item.slides[slideIndex].href, this.item);
            this.context.getItem(url).subscribe(item => this.slideItemsCache[slideIndex] = item);
          }

        }

      } else {
        this.currentSlideIndex = null;
      }
    });
  }

  clearSlide(): void {
    this.router.navigate([], { relativeTo: this.route });
  }

  nextSlide(): void {
    let idx = Math.min(this.currentSlideIndex + 1, this.item.slides.length - 1);
    this.gotoSlide(idx, true);
  }


  previousSlide(): void {
    let idx = Math.max(0, this.currentSlideIndex - 1);
    this.gotoSlide(idx, true);
  }

  gotoSlide(s: number | object, replaceUrl: boolean = false): void {
    let idx = typeof s === "number" ? s : this.item.slides.findIndex(x => x === s);
    this.router.navigate([], {
      relativeTo: this.route,
      queryParams: { s: idx },
      replaceUrl: replaceUrl
    });
  }

  getSlidesForGroup(group: string) {
    return this.item.slides.filter(s => s.group === group);
  }

  trackByIdx(idx: number): number {
    return idx;
  }

}
