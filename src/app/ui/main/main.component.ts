import { Component, OnInit } from '@angular/core';
import { Item, ContextService } from 'src/app/context.service';
import { Config } from 'protractor';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  selector: 'app-main',
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss']
})
export class MainComponent implements OnInit {

  item: Item = null;
  config: Config;

  constructor(private context: ContextService, private route: ActivatedRoute, private router: Router, private location: Location) { }

  ngOnInit(): void {

    this.context.getConfig().subscribe(cfg => {

      this.config = cfg;

      this.route.url.subscribe(v => {

        if (v.length === 0) {
          this.context.getItem(this.config.entry).subscribe(item => this.item = item);
        } else {
          let url = this.context.joinUrl("/", ...v.map(x => x.path));
          this.context.getItem(url).subscribe(item => this.item = item);
        }
      });


    })



  }

  goHome():void {
    this.router.navigateByUrl("/");
  }

  goBack(): void {
    this.location.back();
  }

  goUp(): void {
    this.router.navigateByUrl(this.context.resolveUrl("..", this.item));
  }
}
