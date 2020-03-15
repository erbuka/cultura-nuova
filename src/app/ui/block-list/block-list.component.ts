import { Component, OnInit, Input } from '@angular/core';
import { ContextService } from 'src/app/context.service';
import { BlockListItem } from 'src/app/types/block-list-item';


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
