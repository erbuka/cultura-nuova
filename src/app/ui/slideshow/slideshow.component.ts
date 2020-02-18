import { Component, OnInit, Input } from '@angular/core';
import { SlideshowItem } from 'src/app/context.service';

@Component({
  selector: 'app-slideshow',
  templateUrl: './slideshow.component.html',
  styleUrls: ['./slideshow.component.scss']
})
export class SlideshowComponent implements OnInit {

  @Input() item: SlideshowItem = null;

  constructor() { }

  ngOnInit() {
  }

}
