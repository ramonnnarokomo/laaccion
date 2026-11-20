import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { ArticleDetail, ArticleSummary, Board, Category, Page, Poll } from './models';

export interface ArticleQuery {
  category?: string;
  tag?: string;
  page?: number;
  size?: number;
}

/** Lectura pública: lo que ve cualquier visitante. */
@Injectable({ providedIn: 'root' })
export class ContentService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1';

  articles(query: ArticleQuery = {}): Observable<Page<ArticleSummary>> {
    let params = new HttpParams()
      .set('page', query.page ?? 0)
      .set('size', query.size ?? 12);
    if (query.category) params = params.set('category', query.category);
    if (query.tag) params = params.set('tag', query.tag);
    return this.http.get<Page<ArticleSummary>>(`${this.base}/articles`, { params });
  }

  article(slug: string): Observable<ArticleDetail> {
    return this.http.get<ArticleDetail>(`${this.base}/articles/${encodeURIComponent(slug)}`);
  }

  categories(): Observable<Category[]> {
    return this.http.get<Category[]>(`${this.base}/categories`);
  }

  board(): Observable<Board> {
    return this.http.get<Board>(`${this.base}/announcements/board`);
  }

  polls(page = 0, size = 10): Observable<Page<Poll>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<Poll>>(`${this.base}/polls`, { params });
  }

  poll(id: number): Observable<Poll> {
    return this.http.get<Poll>(`${this.base}/polls/${id}`);
  }

  vote(pollId: number, optionId: number, captchaToken: string | null): Observable<Poll> {
    return this.http.post<Poll>(`${this.base}/polls/${pollId}/votes`, { optionId, captchaToken });
  }
}
