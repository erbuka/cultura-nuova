import { Component, OnInit, ViewChild, ElementRef, TemplateRef } from '@angular/core';
import { ContextService, FileChooserEvent, ErrorEvent, TextEditEvent } from 'src/app/context.service';
import { MatDialog } from '@angular/material/dialog';
import { LocalizedText } from 'src/app/types/item';

@Component({
  selector: 'app-dialogs',
  templateUrl: './dialogs.component.html'
})
export class DialogsComponent implements OnInit {

  @ViewChild("fileChooser", { static: true, read: ElementRef }) fileChooser: ElementRef;
  @ViewChild("errorDialogTmpl", { static: true }) errorDialogTmpl: TemplateRef<ErrorEvent> = null;
  @ViewChild("textEditDialogTmpl", { static: true, read: TemplateRef }) textEditDialogTmpl: TemplateRef<TextEditEvent & { closeDialog: () => void }> = null;

  constructor(public context: ContextService, private dialog: MatDialog) { }

  ngOnInit(): void {
    this.initErrorDialog();
    this.initFileChooser();
    this.initTextEditor();
  }

  isMultilanguage(txt: LocalizedText): boolean {
    return typeof txt === "object";
  }

  multilanguageToggle(evt: TextEditEvent): void {
    if (this.isMultilanguage(evt.text)) {
      evt.text = "";
    } else {
      evt.text = {}
    }
  }

  getTextLocales(txt: LocalizedText): string[] {
    let locales: string[] = [];
    for (let localeId in <object>txt) {
      locales.push(localeId);
    }
    return locales;
  }

  private initTextEditor(): void {
    this.context.onTextEdit.subscribe(evt => {
      let ref = this.dialog.open(this.textEditDialogTmpl, {
        maxWidth: "800px",
        width: "80%",
        data: Object.assign({}, evt, { closeDialog: () => ref.close() })
      });
    });
  }

  private initFileChooser(): void {
    this.context.onFileChoose.subscribe((e: FileChooserEvent) => {
      let element = this.fileChooser.nativeElement as HTMLInputElement;
      element.accept = e.config.accept;

      let listener = () => {

        let files = element.files;

        if (files.length > 0) {

          let file = files[0];

          let reader = new FileReader();

          if (e.config.type === "arraybuffer") {
            reader.addEventListener("load", (evt) => e.resolve(reader.result))
            reader.readAsArrayBuffer(file);
          } else {
            e.reject();
          }

        } else {
          e.reject();
        }

        element.removeEventListener("change", listener);
        element.value = null;

      };

      element.addEventListener("change", listener)

      element.click();

    });
  }

  private initErrorDialog(): void {
    this.context.onError.subscribe(e => {
      this.dialog.open(this.errorDialogTmpl, {
        width: "80%",
        data: e
      });
    });
  }

}
