import { BrowserModule, HammerModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { FormsModule } from '@angular/forms';

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

import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatSliderModule } from '@angular/material/slider';
import { MatSelectModule } from '@angular/material/select';
import { MatMenuModule } from '@angular/material/menu';

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
  ],
  imports: [
    BrowserModule,
    HttpClientModule,
    AppRoutingModule,
    BrowserAnimationsModule,
    FormsModule,

    MatButtonModule,
    MatIconModule,
    MatDialogModule,
    MatSliderModule,
    MatSelectModule,
    MatMenuModule,

    HammerModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
