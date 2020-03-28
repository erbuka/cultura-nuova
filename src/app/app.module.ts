import { BrowserModule, HammerModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';
import { DragDropModule } from '@angular/cdk/drag-drop';

import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSliderModule } from '@angular/material/slider';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatDividerModule } from '@angular/material/divider';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatSnackBarModule, MAT_SNACK_BAR_DEFAULT_OPTIONS } from '@angular/material/snack-bar';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { BlockListComponent } from './ui/block-list/block-list.component';
import { BgImageDirective } from './ui/bg-image.directive';
import { PageComponent } from './ui/page/page.component';
import { TemplatesComponent } from './templates/templates.component';
import { TemplateDefDirective } from './template-def.directive';
import { UrlPipe } from './url.pipe';
import { ItemComponent } from './ui/item/item.component';
import { SlideshowComponent } from './ui/slideshow/slideshow.component';
import { MainComponent } from './ui/main/main.component';
import { LeafletDeepZoomComponent } from './ui/deep-zoom/leaflet-deep-zoom/leaflet-deep-zoom.component';
import { ThreeViewerComponent } from './ui/three-viewer/three-viewer.component';
import { CanvasDeepZoomComponent } from './ui/deep-zoom/canvas-deep-zoom/canvas-deep-zoom.component';
import { NavigatorComponent } from './ui/deep-zoom/navigator/navigator.component';
import { LocalizedTextPipe } from './localized-text.pipe';
import { VectorInputComponent } from './ui/three-viewer/vector-input/vector-input.component';
import { DialogsComponent } from './ui/dialogs/dialogs.component';
import { MAT_FORM_FIELD_DEFAULT_OPTIONS } from '@angular/material/form-field';
import { EditableLocalizedTextComponent } from './ui/editable-localized-text/editable-localized-text.component';
import { MaterialEditorComponent } from './ui/three-viewer/material-editor/material-editor.component';



@NgModule({
  declarations: [
    AppComponent,
    BlockListComponent,
    BgImageDirective,
    PageComponent,
    TemplatesComponent,
    TemplateDefDirective,
    UrlPipe,
    ItemComponent,
    SlideshowComponent,
    MainComponent,
    LeafletDeepZoomComponent,
    CanvasDeepZoomComponent,
    NavigatorComponent,
    LocalizedTextPipe,
    ThreeViewerComponent,
    VectorInputComponent,
    DialogsComponent,
    EditableLocalizedTextComponent,
    MaterialEditorComponent
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,
    HammerModule,
    DragDropModule,

    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSliderModule,
    MatSelectModule,
    MatMenuModule,
    MatToolbarModule,
    MatDividerModule,
    MatSlideToggleModule,
    MatInputModule,
    MatCheckboxModule,
    MatSnackBarModule,
  ],
  providers: [
    { provide: MAT_FORM_FIELD_DEFAULT_OPTIONS, useValue: { appearance: "outline", floatLabel: "always" } },
    { provide: MAT_SNACK_BAR_DEFAULT_OPTIONS, useValue: { duration: 2500 } }
  ],
  bootstrap: [AppComponent]
})
export class AppModule { }
