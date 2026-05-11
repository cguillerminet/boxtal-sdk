import { TokenManager } from "./auth.js";
import { type BoxtalClientOptions, resolveConfig, type ResolvedConfig } from "./config.js";
import { HttpClient, type QueryValue } from "./http.js";
import { ContentCategoriesResource } from "./resources/contentCategory.js";
import { ParcelPointsResource } from "./resources/parcelPoints.js";
import { ShippingOrdersResource } from "./resources/shippingOrders.js";
import { SubscriptionsResource } from "./resources/subscriptions.js";

/**
 * Main entry point for the Boxtal API v3 SDK.
 *
 * @example
 *   const client = new BoxtalClient({
 *     accessKey: process.env.BOXTAL_ACCESS_KEY!,
 *     secretKey: process.env.BOXTAL_SECRET_KEY!,
 *     environment: "sandbox",
 *   });
 *   const categories = await client.contentCategories.list({ language: "fr" });
 */
export class BoxtalClient {
  readonly contentCategories: ContentCategoriesResource;
  readonly parcelPoints: ParcelPointsResource;
  readonly shippingOrders: ShippingOrdersResource;
  readonly subscriptions: SubscriptionsResource;

  private readonly http: HttpClient;
  private readonly tokens: TokenManager;
  private readonly cfg: ResolvedConfig;

  constructor(options: BoxtalClientOptions) {
    this.cfg = resolveConfig(options);
    this.http = new HttpClient(this.cfg);
    this.tokens = new TokenManager(this.cfg);
    this.contentCategories = new ContentCategoriesResource(this.http, this.tokens);
    this.parcelPoints = new ParcelPointsResource(this.http, this.tokens);
    this.shippingOrders = new ShippingOrdersResource(this.http, this.tokens);
    this.subscriptions = new SubscriptionsResource(this.http, this.tokens);
  }

  /** Base URL the client targets. */
  get baseUrl(): string {
    return this.cfg.baseUrl;
  }

  /**
   * Escape hatch for endpoints not (yet) covered by a typed resource. The path
   * is appended to the base URL; the `Authorization` header is added automatically.
   */
  request<T>(opts: {
    method: "GET" | "POST" | "PUT" | "PATCH" | "DELETE";
    path: string;
    query?: Record<string, QueryValue>;
    body?: unknown;
    headers?: Record<string, string>;
    timeoutMs?: number;
    signal?: AbortSignal;
  }): Promise<T> {
    return this.http.request<T>(opts, () => this.tokens.authorizationHeader());
  }

  /** Force a fresh access token on the next request. */
  invalidateToken(): void {
    this.tokens.invalidate();
  }
}
