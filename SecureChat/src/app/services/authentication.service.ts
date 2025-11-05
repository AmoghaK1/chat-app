import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface AuthUser {
  uid: string;
  email?: string;
  displayName?: string;
  photoURL?: string;
}

@Injectable({
  providedIn: 'root',
})
export class AuthenticationService {
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(
    JSON.parse(localStorage.getItem('auth_user') || 'null')
  );
  currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient) {
    const token = localStorage.getItem('auth_token');
    if (token) {
      this.http.get<AuthUser>(`${environment.apiBaseUrl}/auth/me`, {
        headers: { Authorization: `Bearer ${token}` },
      }).subscribe({
        next: (user) => {
          localStorage.setItem('auth_user', JSON.stringify(user));
          this.currentUserSubject.next(user);
        },
        error: () => {
          this.clearAuth();
        },
      });
    }
  }

  private storeAuth(token: string, user: AuthUser) {
    localStorage.setItem('auth_token', token);
    localStorage.setItem('auth_user', JSON.stringify(user));
    this.currentUserSubject.next(user);
  }

  private clearAuth() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('auth_user');
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!localStorage.getItem('auth_token');
  }

  login(email: string, password: string) {
    return this.http
      .post<{ token: string; user: AuthUser }>(`${environment.apiBaseUrl}/auth/login`, { email, password })
      .pipe(tap((res) => this.storeAuth(res.token, res.user)));
  }

  signUp(email: string, password: string, name?: string) {
    return this.http
      .post<{ token: string; user: AuthUser }>(`${environment.apiBaseUrl}/auth/signup`, { email, password, name })
      .pipe(tap((res) => this.storeAuth(res.token, res.user)));
  }

  updateProfileData(_profileData: any): Observable<any> {
    // Profile updates handled via UsersService; keep API for compatibility
    return of(null);
  }

  logout() {
    this.clearAuth();
    return of(true);
  }
}
