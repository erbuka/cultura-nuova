import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree } from '@angular/router';
import { Observable } from 'rxjs';
import { ContextService } from './context.service';
import { map } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ItemExistGuard implements CanActivate {

  constructor(private context: ContextService) { }

  canActivate(
    next: ActivatedRouteSnapshot,
    state: RouterStateSnapshot): Observable<boolean | UrlTree> | Promise<boolean | UrlTree> | boolean | UrlTree {

    let url = next.url.join("/").trim();

    return url ?
      this.context.getItem(next.url.join("/")).pipe(map(v => true)) :
      true;
  }

}
