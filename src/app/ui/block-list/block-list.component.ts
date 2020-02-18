import { Component, OnInit, Input, Injectable } from '@angular/core';
import { BlockListItem, ContextService } from 'src/app/context.service';



@Component({
  selector: 'app-block-list',
  templateUrl: './block-list.component.html',
  styleUrls: ['./block-list.component.scss']
})
export class BlockListComponent implements OnInit {

  @Input() item: BlockListItem = null;

  constructor(private context:ContextService) { }

  ngOnInit() {
  }

}
