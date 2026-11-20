/** Tipos de la API v1 del backend (mismos nombres de campo que los DTO de Spring). */

export interface Page<T> {
  content: T[];
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export interface CategoryRef {
  name: string;
  slug: string;
}

export interface Category extends CategoryRef {
  id: number;
  description: string | null;
  sortOrder: number;
}

export interface Tag {
  name: string;
  slug: string;
}

export interface ArticleSummary {
  slug: string;
  title: string;
  dek: string | null;
  summary: string;
  category: CategoryRef;
  author: string;
  imageUrl: string | null;
  imageAlt: string | null;
  imageWidth: number | null;
  imageHeight: number | null;
  readingMinutes: number;
  publishedAt: string;
  featured: boolean;
}

export interface ArticleDetail extends ArticleSummary {
  contentHtml: string;
  tags: Tag[];
  updatedAt: string;
}

export type Tone = 'IVORY' | 'RED' | 'GOLD' | 'DARK';

export interface Announcement {
  id: number;
  section: string;
  title: string;
  description: string;
  details: string | null;
  url: string | null;
  eventDate: string;
  stamp: string;
  tone: Tone;
}

export interface Board {
  today: string;
  active: Announcement[];
  expired: Announcement[];
}

export type PollStatus = 'DRAFT' | 'OPEN' | 'CLOSED';

export interface PollOption {
  id: number;
  label: string;
  votes: number;
  percentage: number;
}

export interface Poll {
  id: number;
  question: string;
  description: string | null;
  videoUrl: string | null;
  status: PollStatus;
  closesAt: string | null;
  totalVotes: number;
  options: PollOption[];
  createdAt: string;
}

// ---------------------------------------------------------------- Panel

export type Role = 'ADMIN' | 'EDITOR';

export interface Me {
  id: number;
  email: string;
  displayName: string;
  role: Role;
}

export type ArticleStatus = 'DRAFT' | 'SCHEDULED' | 'PUBLISHED';

export interface ArticleAdminSummary {
  id: number;
  slug: string;
  title: string;
  status: ArticleStatus;
  publishedAt: string | null;
  categoryName: string;
  authorId: number;
  authorName: string;
  featured: boolean;
  updatedAt: string;
}

export interface ArticleAdmin {
  id: number;
  slug: string;
  title: string;
  dek: string | null;
  summary: string;
  contentHtml: string;
  status: ArticleStatus;
  publishedAt: string | null;
  categoryId: number;
  categoryName: string;
  tags: string[];
  featuredImageId: number | null;
  featuredImageUrl: string | null;
  featuredImageAlt: string | null;
  byline: string | null;
  featured: boolean;
  authorId: number;
  authorName: string;
  readingMinutes: number;
  createdAt: string;
  updatedAt: string;
}

export interface ArticleRequest {
  title: string;
  slug?: string | null;
  dek?: string | null;
  summary: string;
  contentHtml: string;
  status: ArticleStatus;
  publishedAt?: string | null;
  categoryId: number;
  tags?: string[];
  featuredImageId?: number | null;
  featuredImageAlt?: string | null;
  byline?: string | null;
  featured?: boolean;
}

export interface CategoryRequest {
  name: string;
  slug?: string | null;
  description?: string | null;
  sortOrder?: number;
}

export type AnnouncementState = 'ACTIVE' | 'EXPIRED' | 'HIDDEN';

export interface AnnouncementAdmin extends Announcement {
  visible: boolean;
  state: AnnouncementState;
  updatedAt: string;
}

export interface AnnouncementMetrics {
  total: number;
  active: number;
  expired: number;
  hidden: number;
}

export interface AnnouncementRequest {
  section: string;
  title: string;
  description: string;
  details?: string | null;
  url?: string | null;
  eventDate: string;
  stamp?: string | null;
  tone?: Tone;
  visible?: boolean;
}

export interface PollRequest {
  question: string;
  description?: string | null;
  videoUrl?: string | null;
  closesAt?: string | null;
  options: string[];
}

export interface ImageInfo {
  id: number;
  url: string;
  contentType: string;
  sizeBytes: number;
  width: number | null;
  height: number | null;
  createdAt: string;
}

export interface User {
  id: number;
  email: string;
  displayName: string;
  role: Role;
  enabled: boolean;
  lastLoginAt: string | null;
  createdAt: string;
}

export interface CreateUserRequest {
  email: string;
  displayName: string;
  password: string;
  role: Role;
}

export interface UpdateUserRequest {
  displayName: string;
  role: Role;
  enabled: boolean;
}

export interface AuditEntry {
  id: number;
  actorId: number | null;
  actorEmail: string | null;
  action: string;
  entityType: string | null;
  entityId: string | null;
  summary: string | null;
  createdAt: string;
}

/** Error de la API (RFC 9457, application/problem+json). */
export interface Problem {
  title?: string;
  status?: number;
  detail?: string;
  errors?: { field: string; message: string }[];
}
