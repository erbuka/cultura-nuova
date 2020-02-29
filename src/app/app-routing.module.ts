import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { MainComponent } from './ui/main/main.component';
import { ItemExistGuard } from './item-exist.guard';


const routes: Routes = [
  {
    path: "**",
    component: MainComponent,
    canActivate: [ItemExistGuard]
  }
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule { }
