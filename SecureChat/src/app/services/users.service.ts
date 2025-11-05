import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, switchMap } from 'rxjs';
import { ProfileUser } from '../models/user-profile';
import { AuthenticationService } from './authentication.service';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class UsersService {
  get currentUserProfile$(): Observable<ProfileUser | null> {
    return this.authService.currentUser$.pipe(
      switchMap((user) => {
        if (!user?.uid) {
          return of(null);
        }
        return this.http.get<ProfileUser>(`${environment.apiBaseUrl}/users/${user.uid}`);
      })
    );
  }

  get allUsers$(): Observable<ProfileUser[]> {
    return this.http.get<ProfileUser[]>(`${environment.apiBaseUrl}/users`);
  }

  constructor(
    private http: HttpClient,
    private authService: AuthenticationService
  ) {}

  addUser(user: ProfileUser): Observable<any> {
    return this.http.post(`${environment.apiBaseUrl}/users`, user);
  }

  updateUser(user: ProfileUser): Observable<any> {
    return this.http.put(`${environment.apiBaseUrl}/users/${user.uid}`, user);
  }
}
