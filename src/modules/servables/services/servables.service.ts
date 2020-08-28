import { Injectable } from '@angular/core';
import { HS_BASE_URL } from '@core/base-url.token';
import { HttpService } from '@core/services/http';
import { Inject } from '@node_modules/@angular/core';
import { environment } from 'environments/environment';
import { Observable } from 'rxjs';
import { scan, finalize, publish, refCount } from 'rxjs/operators';
import { Deployable } from '../interfaces';
import { Servable } from '../models';

@Injectable({
  providedIn: 'root',
})
export class ServablesService {
  private readonly url: string;

  constructor(
    private http: HttpService,
    @Inject(HS_BASE_URL) private baseUrl: string
  ) {
    const { apiUrl, servableUrl } = environment;
    this.url = `${apiUrl}/${servableUrl}`;
  }

  getAll(): Observable<Servable[]> {
    return this.http.get(this.url);
  }

  deploy(requestBody: Deployable): Observable<Servable> {
    return this.http.post(this.url, requestBody) as Observable<Servable>;
  }

  delete(name: string) {
    return this.http.delete(`${this.url}/${name}`);
  }

  get(name: string) {
    return this.http.get<Servable>(`${this.url}/${name}`);
  }

  getLog(name: string): Observable<string[]> {
    let eventSource: EventSource;

    const logStream$ = new Observable<string>(subscribe => {
      const { apiUrl } = environment;

      const url = `${this.baseUrl}${apiUrl}/servable/${name}/logs?follow=true`;
      eventSource = new EventSource(url, {
        withCredentials: true,
      });

      eventSource.addEventListener('EndOfStream', () => {
        eventSource.close();
        subscribe.complete();
      });

      eventSource.onmessage = ({ data }) => {
        if (data) {
          subscribe.next(data);
        }
      };

      eventSource.onerror = err => {
        subscribe.error();
      };
    });

    return logStream$.pipe(
      scan((log, curString) => {
        return [...log, curString];
      }, []),
      publish(),
      refCount(),
      finalize(() => {
        eventSource.close();
      })
    );
  }
}
