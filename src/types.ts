/** Types mirroring the Boxtal API v3 OpenAPI specification (openapi 3.0.1, version 3.1.0). */

// ─── Common ──────────────────────────────────────────────────────────────────

export interface BaseResponse {
  status?: number;
  timestamp?: string;
}

export interface ApiErrorEntry {
  code?: string;
  parameters?: ApiErrorParameter[];
}

export interface ApiErrorParameter {
  code?: string;
  field?: string;
  value?: string;
  parameters?: string;
}

export interface ApiError {
  errors?: ApiErrorEntry[];
}

export type Currency = "EUR";

export interface Money {
  value?: number;
  currency?: Currency;
}

export interface Position {
  /** The OpenAPI spec declares `string` but the live API returns a number. */
  latitude: number;
  longitude: number;
}

export interface Location {
  number?: string;
  street: string;
  city: string;
  state?: string;
  postalCode?: string;
  countryIsoCode?: string;
  position?: Position;
}

export interface Contact {
  firstName: string;
  lastName: string;
  email: string;
  /** Format: +CCCNNNNNNN... */
  phone: string;
  company?: string;
}

export type AddressType = "RESIDENTIAL" | "BUSINESS";

export interface Address {
  type: AddressType;
  contact: Contact;
  location: Location;
  additionalInformation?: string;
}

// ─── Token (POST /iam/account-app/token) ─────────────────────────────────────

export interface TokenResponse {
  accessToken: string;
  /** Always "Bearer" in practice, but typed permissively in case the server adds variants. */
  tokenType: string;
  expiresIn: number;
}

// ─── Content category ────────────────────────────────────────────────────────

export interface ContentCategory {
  id?: string;
  label?: string;
}

export interface ContentCategoryListResponse extends BaseResponse {
  content?: ContentCategory[];
}

// ─── Parcel points ───────────────────────────────────────────────────────────

/**
 * Carrier-defined network identifier for a parcel point (e.g. "MONR", "UPSE", …).
 * The OpenAPI spec declares this as a free-form string.
 */
export type ParcelPointNetwork = string;

export type ParcelPointStatus = "AVAILABLE" | "UNAVAILABLE";

export type Weekday =
  | "MONDAY"
  | "TUESDAY"
  | "WEDNESDAY"
  | "THURSDAY"
  | "FRIDAY"
  | "SATURDAY"
  | "SUNDAY";

export interface OpeningPeriod {
  openingTime?: string;
  closingTime?: string;
}

export type OpeningDays = Partial<Record<Weekday, OpeningPeriod[]>>;

export interface ParcelPoint {
  code?: string;
  name?: string;
  status?: ParcelPointStatus;
  network?: ParcelPointNetwork;
  location?: Location;
  openingDays?: OpeningDays;
}

export interface NearbyParcelPoint {
  /**
   * The live API returns this field as `parcelPoint` (camelCase), even though
   * the published OpenAPI spec uses `parcelpoint`. We mirror the wire format.
   */
  parcelPoint?: ParcelPoint;
  distanceFromSearchLocation?: number;
}

export interface ParcelPointSearchResponse extends BaseResponse {
  content?: NearbyParcelPoint[];
}

export interface ParcelPointV2 {
  code?: string;
  name?: string;
  location?: Location;
  openingDays?: OpeningDays;
  compatibleNetworks?: ParcelPointNetwork[];
}

export interface NearbyParcelPointV2 {
  /** See note on `NearbyParcelPoint.parcelPoint` — same wire-format casing. */
  parcelPoint?: ParcelPointV2;
  distanceFromSearchLocation?: number;
}

export interface ParcelPointSearchResponseV2 extends BaseResponse {
  content?: NearbyParcelPointV2[];
}

// ─── Shipment ────────────────────────────────────────────────────────────────

export interface Content {
  id: string;
  description: string;
}

export type PackageType = "PARCEL" | "LETTER" | "PALLET";

export interface Package {
  id?: string;
  type?: PackageType;
  value: Money;
  width: number;
  height?: number;
  length: number;
  weight: number;
  content?: Content;
  stackable?: boolean;
  externalId?: string;
}

export type CustomsDeclarationReason =
  | "SALE"
  | "REPAIR"
  | "RETURN"
  | "GIFT"
  | "SAMPLE"
  | "DOCUMENTS"
  | "PERSONAL_USE"
  | "OTHER";

export interface Article {
  quantity: number;
  unitValue: Money;
  unitWeight: number;
  description: string;
  tariffNumber?: string;
  originCountry: string;
  packageExternalId?: string;
}

export interface CustomsDeclaration {
  reason?: CustomsDeclarationReason;
  articles?: Article[];
}

export interface Shipment {
  id?: string;
  packages: Package[];
  toAddress: Address;
  externalId?: string;
  fromAddress: Address;
  returnAddress?: Address;
  pickupPointCode?: string;
  dropOffPointCode?: string;
  customsDeclaration?: CustomsDeclaration;
}

// ─── Shipping order ──────────────────────────────────────────────────────────

export type LabelType = "PDF_A4" | "PDF_10x15";

export interface CreateShippingOrderRequest {
  insured?: boolean;
  shipment?: Shipment;
  labelType?: LabelType;
  shippingOfferId?: string;
  shippingOfferCode?: string;
  expectedTakingOverDate?: string;
}

export type ShippingOrderStatus = "PENDING" | "REQUESTED" | "CONFIRMED" | "CANCELLED";

export interface ShippingOrder {
  id?: string;
  status?: ShippingOrderStatus;
  shipmentId?: string;
  deliveryPriceExclTax?: Money;
  estimatedDeliveryDate?: string;
  insurancePriceExclTax?: Money;
  expectedTakingOverDate?: string;
}

export interface CreateShippingOrderResponse extends BaseResponse {
  content?: ShippingOrder;
}

export interface ShippingOrderResponse extends BaseResponse {
  content?: ShippingOrder;
}

// ─── Shipping document ───────────────────────────────────────────────────────

export type ShippingDocumentType = "LABEL" | "PROFORMA" | "CN23" | "VOUCHER";
export type ShippingDocumentFormat = "PDF_A4" | "PDF_10x15";

export interface ShippingDocument {
  url?: string;
  type?: ShippingDocumentType;
  format?: ShippingDocumentFormat;
}

export interface ShippingDocumentListResponse extends BaseResponse {
  content?: ShippingDocument[];
}

// ─── Tracking ────────────────────────────────────────────────────────────────

export type PackageTrackingStatus =
  | "ANNOUNCED"
  | "SHIPPED"
  | "IN_TRANSIT"
  | "OUT_FOR_DELIVERY"
  | "FAILED_ATTEMPT"
  | "REACHED_DELIVERY_PICKUP_POINT"
  | "DELIVERED"
  | "RETURNED"
  | "EXCEPTION";

export interface PackageTrackingDetail {
  status?: PackageTrackingStatus;
  isFinal?: boolean;
  message?: string;
  trackingDateTime?: string;
}

export interface PackageTracking {
  status?: PackageTrackingStatus;
  history?: PackageTrackingDetail[];
  isFinal?: boolean;
  message?: string;
  packageId?: string;
  trackingNumber?: string;
  trackingDateTime?: string;
  packageExternalId?: string;
  packageTrackingUrl?: string;
}

export interface PackageTrackingListResponse extends BaseResponse {
  content?: PackageTracking[];
}

// ─── Subscriptions ───────────────────────────────────────────────────────────

export type SubscriptionStatus = "ACTIVE" | "INACTIVE" | "SUSPENDED";
export type WebhookEventType = "DOCUMENT_CREATED" | "TRACKING_CHANGED";

export interface Subscription {
  id?: string;
  appId?: string;
  status?: SubscriptionStatus;
  createdAt?: string;
  eventType: WebhookEventType;
  callbackUrl: string;
  webhookSecret: string;
}

export interface SubscriptionResponse extends BaseResponse {
  content?: Subscription;
}

/**
 * Body accepted by `PUT /shipping/v3.1/subscription/{id}`.
 *
 * The live API requires `eventType` and `callbackUrl`, and rejects
 * `webhookSecret` (it can only be rotated through a dedicated endpoint on the
 * developer portal). Pass the existing `eventType` of the subscription you're
 * updating.
 */
export interface UpdateSubscriptionRequest {
  eventType: WebhookEventType;
  callbackUrl: string;
}

export interface SubscriptionListResponse extends BaseResponse {
  content?: Subscription[];
}

// ─── Webhook payloads (POST'd to your callback URL) ──────────────────────────

export interface WebhookEventDocumentCreated {
  id?: string;
  type?: "DOCUMENT_CREATED";
  shippingOrderId?: string;
  shipmentExternalId?: string;
  payload?: {
    documents?: ShippingDocument[];
  };
}

export interface WebhookEventTrackingChanged {
  id?: string;
  type?: "TRACKING_CHANGED";
  shippingOrderId?: string;
  shipmentExternalId?: string;
  payload?: {
    trackings?: PackageTracking[];
  };
}

export type WebhookEventPayload =
  | WebhookEventDocumentCreated
  | WebhookEventTrackingChanged;
