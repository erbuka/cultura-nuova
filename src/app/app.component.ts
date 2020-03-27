import { Component } from '@angular/core';
import { ContextService } from './context.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  constructor(public context: ContextService) { }
}
