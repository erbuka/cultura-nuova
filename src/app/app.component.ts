import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { ContextService, Item, Config } from './context.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  item: Item = null;
  config: Config;

  constructor(private context: ContextService, private route: ActivatedRoute, private router: Router, private location: Location) { }

  ngOnInit(): void {
    this.context.getConfig().subscribe(cfg => this.config = cfg);


    this.location.onUrlChange((url) => {
      console.log(this.location.path());
      this.context.getItem(url).subscribe((item: Item) => {
        this.item = item;
      });
    })
  }

  goBack(): void {
    this.location.back();
  }

  goUp(): void {
    this.router.navigate(this.context.resolveUrl("..").split("/"));
  }

}
