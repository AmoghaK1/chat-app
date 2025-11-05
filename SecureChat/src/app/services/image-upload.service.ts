import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ImageUploadService {
  constructor(private http: HttpClient) {}

  uploadImage(image: File, _path: string): Observable<string> {
    const form = new FormData();
    form.append('file', image);
    return this.http
      .post<{ url: string }>(`${environment.apiBaseUrl}/upload`, form)
      .pipe(map((res) => `${environment.apiBaseUrl.replace('/api', '')}${res.url}`));
  }
}

