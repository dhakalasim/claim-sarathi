export interface JwtPayload {
  sub: string;
  role: import("../constants/claim-stages.js").Role;
  locale: "en" | "ne";
}

export interface ApiErrorBody {
  error: string;
  message: string;
  details?: unknown;
}

export interface Paginated<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
}
