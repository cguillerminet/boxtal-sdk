import type { HttpClient } from "../http.js";
import type { TokenManager } from "../auth.js";
import type {
  CreateShippingOrderRequest,
  CreateShippingOrderResponse,
  PackageTrackingListResponse,
  ShippingDocumentListResponse,
  ShippingOrderResponse,
} from "../types.js";

export class ShippingOrdersResource {
  constructor(
    private readonly http: HttpClient,
    private readonly auth: TokenManager,
  ) {}

  /** POST /shipping/v3.1/shipping-order — create and order a new shipment. */
  create(body: CreateShippingOrderRequest): Promise<CreateShippingOrderResponse> {
    return this.http.request<CreateShippingOrderResponse>(
      { method: "POST", path: "/shipping/v3.1/shipping-order", body, noRetry: true },
      () => this.auth.authorizationHeader(),
    );
  }

  /** GET /shipping/v3.1/shipping-order/{id} */
  get(id: string): Promise<ShippingOrderResponse> {
    return this.http.request<ShippingOrderResponse>(
      { method: "GET", path: `/shipping/v3.1/shipping-order/${encodeURIComponent(id)}` },
      () => this.auth.authorizationHeader(),
    );
  }

  /** DELETE /shipping/v3.1/shipping-order/{id} — cancel a shipping order. */
  cancel(id: string): Promise<void> {
    return this.http.request<void>(
      {
        method: "DELETE",
        path: `/shipping/v3.1/shipping-order/${encodeURIComponent(id)}`,
        noRetry: true,
      },
      () => this.auth.authorizationHeader(),
    );
  }

  /** GET /shipping/v3.1/shipping-order/{id}/shipping-document */
  getDocuments(id: string): Promise<ShippingDocumentListResponse> {
    return this.http.request<ShippingDocumentListResponse>(
      {
        method: "GET",
        path: `/shipping/v3.1/shipping-order/${encodeURIComponent(id)}/shipping-document`,
      },
      () => this.auth.authorizationHeader(),
    );
  }

  /** GET /shipping/v3.1/shipping-order/{id}/tracking */
  getTracking(id: string): Promise<PackageTrackingListResponse> {
    return this.http.request<PackageTrackingListResponse>(
      {
        method: "GET",
        path: `/shipping/v3.1/shipping-order/${encodeURIComponent(id)}/tracking`,
      },
      () => this.auth.authorizationHeader(),
    );
  }
}
