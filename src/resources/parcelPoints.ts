import type { HttpClient } from "../http.js";
import type { TokenManager } from "../auth.js";
import type {
  ParcelPointNetwork,
  ParcelPointSearchResponse,
  ParcelPointSearchResponseV2,
} from "../types.js";

export interface SearchParcelPointsParams {
  countryIsoCode: string;
  number?: string;
  street?: string;
  city?: string;
  postalCode?: string;
  state?: string;
  searchNetworks?: ParcelPointNetwork[];
}

export interface SearchParcelPointsByNetworkParams {
  countryIsoCode: string;
  searchNetworks: ParcelPointNetwork[];
  number?: string;
  street?: string;
  city?: string;
  postalCode?: string;
}

/**
 * Operation type for the v3.2 `parcel-point-by-shipping-offer` endpoint.
 * The server validates this against the pattern `DEPARTURE|ARRIVAL`
 * (`DEPARTURE` = sender drop-off, `ARRIVAL` = recipient pickup).
 */
export type OperationType = "DEPARTURE" | "ARRIVAL";
export const OPERATION_TYPES = ["DEPARTURE", "ARRIVAL"] as const;

export interface SearchParcelPointsByShippingOfferParams {
  countryIsoCode: string;
  operationType: OperationType;
  shippingOfferCode: string;
  number?: string;
  street?: string;
  city?: string;
  postalCode?: string;
}

export class ParcelPointsResource {
  constructor(
    private readonly http: HttpClient,
    private readonly auth: TokenManager,
  ) {}

  /** GET /shipping/v3.1/parcel-point — search nearby parcel points. */
  search(params: SearchParcelPointsParams): Promise<ParcelPointSearchResponse> {
    return this.http.request<ParcelPointSearchResponse>(
      { method: "GET", path: "/shipping/v3.1/parcel-point", query: { ...params } },
      () => this.auth.authorizationHeader(),
    );
  }

  /** GET /shipping/v3.2/parcel-point-by-network — search filtered by carrier networks. */
  searchByNetwork(
    params: SearchParcelPointsByNetworkParams,
  ): Promise<ParcelPointSearchResponseV2> {
    return this.http.request<ParcelPointSearchResponseV2>(
      {
        method: "GET",
        path: "/shipping/v3.2/parcel-point-by-network",
        query: { ...params },
      },
      () => this.auth.authorizationHeader(),
    );
  }

  /** GET /shipping/v3.2/parcel-point-by-shipping-offer — search filtered by a shipping offer + operation type. */
  searchByShippingOffer(
    params: SearchParcelPointsByShippingOfferParams,
  ): Promise<ParcelPointSearchResponseV2> {
    return this.http.request<ParcelPointSearchResponseV2>(
      {
        method: "GET",
        path: "/shipping/v3.2/parcel-point-by-shipping-offer",
        query: { ...params },
      },
      () => this.auth.authorizationHeader(),
    );
  }
}
