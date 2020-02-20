import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Location } from '@angular/common';
import { ContextService, Item, Config } from './context.service';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {

  @ViewChild("errorDialog", { static: true }) errorDialogTemplate: TemplateRef<any> = null;

  constructor(private context: ContextService, private dialog: MatDialog) {

  }

  ngOnInit() {
    this.context.onError.subscribe(e => {
      this.dialog.open(this.errorDialogTemplate, {
        width: "80%",
        data: e
      });
    });
  }
}
