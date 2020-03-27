import { Component, OnInit, Output, Input, EventEmitter, HostListener } from '@angular/core';
import { LocalizedText } from 'src/app/types/item';
import { ContextService } from 'src/app/context.service';

@Component({
  selector: 'app-editable-localized-text',
  templateUrl: './editable-localized-text.component.html',
  styleUrls: ['./editable-localized-text.component.scss']
})
export class EditableLocalizedTextComponent implements OnInit {

  @Input() data: LocalizedText;
  @Output() dataChange: EventEmitter<LocalizedText> = new EventEmitter();

  @Input() set multiline(v: string | boolean) {
    this._multiline = typeof v === "boolean" ? v : (v === "false" ? false : true);
  }

  private _multiline: boolean = false;

  constructor(private context: ContextService) { }

  ngOnInit(): void {
  }

  @HostListener("click")
  async editText(): Promise<void> {
    try {
      let newText = await this.context.editText(this.data, this._multiline);
      this.dataChange.emit(newText);
    }
    catch (e) { }
  }


}
