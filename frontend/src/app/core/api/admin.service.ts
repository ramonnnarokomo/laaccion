import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  AiAssistRequest, AiAssistResponse, AnnouncementAdmin, AnnouncementMetrics, AnnouncementRequest, AnnouncementState, ArticleAdmin,
  ArticleAdminSummary, ArticleRequest, ArticleStatus, AuditEntry, Category, CategoryRequest,
  CreateUserRequest, ImageInfo, Page, Poll, PollRequest, UpdateUserRequest, User,
} from './models';

function pageParams(page: number, size: number, extra: Record<string, string | null | undefined> = {}): HttpParams {
  let params = new HttpParams().set('page', page).set('size', size);
  for (const [key, value] of Object.entries(extra)) {
    if (value) params = params.set(key, value);
  }
  return params;
}

/** Endpoints del panel editorial (/api/v1/admin/**). Requieren sesión. */
@Injectable({ providedIn: 'root' })
export class AdminService {
  private readonly http = inject(HttpClient);
  private readonly base = '/api/v1/admin';

  // Artículos
  articles(status: ArticleStatus | null, page = 0, size = 20): Observable<Page<ArticleAdminSummary>> {
    return this.http.get<Page<ArticleAdminSummary>>(`${this.base}/articles`, { params: pageParams(page, size, { status }) });
  }
  article(id: number): Observable<ArticleAdmin> {
    return this.http.get<ArticleAdmin>(`${this.base}/articles/${id}`);
  }
  createArticle(body: ArticleRequest): Observable<ArticleAdmin> {
    return this.http.post<ArticleAdmin>(`${this.base}/articles`, body);
  }
  updateArticle(id: number, body: ArticleRequest): Observable<ArticleAdmin> {
    return this.http.put<ArticleAdmin>(`${this.base}/articles/${id}`, body);
  }
  deleteArticle(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/articles/${id}`);
  }

  // Secciones (la lectura es pública)
  categories(): Observable<Category[]> {
    return this.http.get<Category[]>('/api/v1/categories');
  }
  createCategory(body: CategoryRequest): Observable<Category> {
    return this.http.post<Category>(`${this.base}/categories`, body);
  }
  updateCategory(id: number, body: CategoryRequest): Observable<Category> {
    return this.http.put<Category>(`${this.base}/categories/${id}`, body);
  }
  deleteCategory(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/categories/${id}`);
  }

  // Tablón
  announcements(state: AnnouncementState | null, page = 0, size = 20): Observable<Page<AnnouncementAdmin>> {
    return this.http.get<Page<AnnouncementAdmin>>(`${this.base}/announcements`, { params: pageParams(page, size, { state }) });
  }
  announcementMetrics(): Observable<AnnouncementMetrics> {
    return this.http.get<AnnouncementMetrics>(`${this.base}/announcements/metrics`);
  }
  createAnnouncement(body: AnnouncementRequest): Observable<AnnouncementAdmin> {
    return this.http.post<AnnouncementAdmin>(`${this.base}/announcements`, body);
  }
  updateAnnouncement(id: number, body: AnnouncementRequest): Observable<AnnouncementAdmin> {
    return this.http.put<AnnouncementAdmin>(`${this.base}/announcements/${id}`, body);
  }
  deleteAnnouncement(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/announcements/${id}`);
  }

  // Encuestas
  polls(page = 0, size = 20): Observable<Page<Poll>> {
    return this.http.get<Page<Poll>>(`${this.base}/polls`, { params: pageParams(page, size) });
  }
  poll(id: number): Observable<Poll> {
    return this.http.get<Poll>(`${this.base}/polls/${id}`);
  }
  createPoll(body: PollRequest): Observable<Poll> {
    return this.http.post<Poll>(`${this.base}/polls`, body);
  }
  updatePoll(id: number, body: PollRequest): Observable<Poll> {
    return this.http.put<Poll>(`${this.base}/polls/${id}`, body);
  }
  openPoll(id: number): Observable<Poll> {
    return this.http.post<Poll>(`${this.base}/polls/${id}/open`, null);
  }
  closePoll(id: number): Observable<Poll> {
    return this.http.post<Poll>(`${this.base}/polls/${id}/close`, null);
  }
  deletePoll(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/polls/${id}`);
  }

  // Imágenes
  images(page = 0, size = 24): Observable<Page<ImageInfo>> {
    return this.http.get<Page<ImageInfo>>(`${this.base}/images`, { params: pageParams(page, size) });
  }
  // Asistente de redacción
  aiStatus(): Observable<{ enabled: boolean }> {
    return this.http.get<{ enabled: boolean }>(`${this.base}/ai/status`);
  }
  aiAssist(request: AiAssistRequest): Observable<AiAssistResponse> {
    return this.http.post<AiAssistResponse>(`${this.base}/ai/assist`, request);
  }

  uploadImage(file: File): Observable<ImageInfo> {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<ImageInfo>(`${this.base}/images`, form);
  }
  deleteImage(id: number): Observable<void> {
    return this.http.delete<void>(`${this.base}/images/${id}`);
  }

  // Usuarios (solo ADMIN)
  users(page = 0, size = 50): Observable<Page<User>> {
    return this.http.get<Page<User>>(`${this.base}/users`, { params: pageParams(page, size) });
  }
  createUser(body: CreateUserRequest): Observable<User> {
    return this.http.post<User>(`${this.base}/users`, body);
  }
  updateUser(id: number, body: UpdateUserRequest): Observable<User> {
    return this.http.put<User>(`${this.base}/users/${id}`, body);
  }
  resetPassword(id: number, newPassword: string): Observable<void> {
    return this.http.post<void>(`${this.base}/users/${id}/password`, { newPassword });
  }

  // Auditoría (solo ADMIN)
  audit(page = 0, size = 50): Observable<Page<AuditEntry>> {
    return this.http.get<Page<AuditEntry>>(`${this.base}/audit`, { params: pageParams(page, size) });
  }
}
