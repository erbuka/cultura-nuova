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


  private currentFileChooserEvent: FileChooserEvent = null;

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

  fileChooserChange(files: File[]) {
    const evt = this.currentFileChooserEvent;

    if(files.length === 0)
      evt.reject();
    
    let file = files[0];

    if(evt.config.type === "arraybuffer") {
      let reader = new FileReader();
      reader.addEventListener("load", _ => evt.resolve(reader.result));
      reader.readAsArrayBuffer(file);
    } else {
      evt.reject();
    }
    
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
    let element = this.fileChooser.nativeElement as HTMLInputElement;
    
    this.context.onFileChoose.subscribe((e: FileChooserEvent) => {
      this.currentFileChooserEvent = e;
      element.accept = e.config.accept;
      element.value = null;
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
