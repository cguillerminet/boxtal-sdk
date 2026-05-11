import type { HttpClient } from "../http.js";
import type { TokenManager } from "../auth.js";
import type {
  Subscription,
  SubscriptionListResponse,
  SubscriptionResponse,
  UpdateSubscriptionRequest,
} from "../types.js";

export class SubscriptionsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly auth: TokenManager,
  ) {}

  /** GET /shipping/v3.1/subscription — list webhook subscriptions. */
  list(): Promise<SubscriptionListResponse> {
    return this.http.request<SubscriptionListResponse>(
      { method: "GET", path: "/shipping/v3.1/subscription" },
      () => this.auth.authorizationHeader(),
    );
  }

  /** POST /shipping/v3.1/subscription — create a new webhook subscription. */
  create(body: Subscription): Promise<SubscriptionResponse> {
    return this.http.request<SubscriptionResponse>(
      { method: "POST", path: "/shipping/v3.1/subscription", body, noRetry: true },
      () => this.auth.authorizationHeader(),
    );
  }

  /**
   * PUT /shipping/v3.1/subscription/{id} — update an existing subscription.
   *
   * Note: the live API only allows `callbackUrl` to be modified through this
   * endpoint. Sending `webhookSecret`, `eventType`, etc. is rejected with 422
   * (`field cannot be modified using this endpoint`). Use the dedicated
   * endpoint(s) on the developer portal to rotate the secret.
   */
  update(id: string, body: UpdateSubscriptionRequest): Promise<SubscriptionResponse> {
    return this.http.request<SubscriptionResponse>(
      {
        method: "PUT",
        path: `/shipping/v3.1/subscription/${encodeURIComponent(id)}`,
        body,
        noRetry: true,
      },
      () => this.auth.authorizationHeader(),
    );
  }

  /** DELETE /shipping/v3.1/subscription/{id} */
  delete(id: string): Promise<void> {
    return this.http.request<void>(
      {
        method: "DELETE",
        path: `/shipping/v3.1/subscription/${encodeURIComponent(id)}`,
        noRetry: true,
      },
      () => this.auth.authorizationHeader(),
    );
  }
}
