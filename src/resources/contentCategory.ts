import type { HttpClient } from "../http.js";
import type { TokenManager } from "../auth.js";
import type { ContentCategoryListResponse } from "../types.js";

export interface ListContentCategoriesParams {
  /** ISO 639-1 language code for the labels (e.g. "fr", "en"). */
  language?: string;
}

export class ContentCategoriesResource {
  constructor(
    private readonly http: HttpClient,
    private readonly auth: TokenManager,
  ) {}

  /** GET /shipping/v3.1/content-category */
  list(params: ListContentCategoriesParams = {}): Promise<ContentCategoryListResponse> {
    const query: Record<string, string> = {};
    if (params.language !== undefined) query.language = params.language;
    return this.http.request<ContentCategoryListResponse>(
      { method: "GET", path: "/shipping/v3.1/content-category", query },
      () => this.auth.authorizationHeader(),
    );
  }
}
