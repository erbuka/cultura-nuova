import { Component, OnInit, ViewChild, TemplateRef } from '@angular/core';
import { ContextService } from './context.service';
import { MatDialog } from '@angular/material/dialog';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit {


  @ViewChild("errorDialog", { static: true }) errorDialogTemplate: TemplateRef<any> = null;

  constructor(public context: ContextService, private dialog: MatDialog) {

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
