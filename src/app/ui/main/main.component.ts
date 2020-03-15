import { Component, OnInit } from '@angular/core';
import { ContextService, ConfigLocale } from 'src/app/context.service';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { Item } from 'src/app/types/item';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {

  locales: ConfigLocale[] = null;
  item: Item = null;

  constructor(public context: ContextService, private route: ActivatedRoute, private router: Router, private location: Location) { }

  ngOnInit(): void {

    this.locales = this.context.getLocales();

    this.route.url.subscribe(v => {

      if (v.length === 0) {
        this.context.getItem(this.context.config.entry).subscribe(item => this.item = item);
      } else {
        let url = this.context.joinUrl(...v.map(x => x.path));
        this.context.getItem(url).subscribe(item => this.item = item);
      }

    });

  }

  goHome(): void {
    this.router.navigateByUrl("/");
  }

  goBack(): void {
    this.location.back();
  }

  goUp(): void {
    this.router.navigateByUrl(this.context.resolveUrl("..", this.item));
  }

}
