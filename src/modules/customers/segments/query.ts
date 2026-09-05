import { customerSegmentKeys, type CustomerSegmentConsent, type CustomerSegmentKey, type CustomerSegmentQuery, type CustomerSegmentSort } from "./types";

const sortOptions: CustomerSegmentSort[] = ["newest", "oldest", "highest_spent", "lowest_spent", "most_orders", "recent_login"];
const consentOptions: CustomerSegmentConsent[] = ["OPTED_IN", "NOT_OPTED_IN"];

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function positiveNumber(value: string | undefined) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
}

function decimalText(value: string | undefined) {
  if (!value?.trim()) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed.toFixed(2) : undefined;
}

export function parseCustomerSegmentQuery(input: URLSearchParams | Record<string, string | string[] | undefined>): CustomerSegmentQuery {
  const get = (key: string) => input instanceof URLSearchParams ? input.get(key) ?? undefined : first(input[key]);
  const segmentValue = get("segment");
  const segment = customerSegmentKeys.includes(segmentValue as CustomerSegmentKey) ? segmentValue as CustomerSegmentKey : "all";
  const consentValue = get("consent");
  const sortValue = get("sort");
  const page = positiveNumber(get("page"));
  return {
    segment,
    page,
    search: get("search")?.trim() || undefined,
    consent: consentOptions.includes(consentValue as CustomerSegmentConsent) ? consentValue as CustomerSegmentConsent : undefined,
    registeredDays: positiveNumber(get("registeredDays")),
    lastLoginDays: positiveNumber(get("lastLoginDays")),
    minSpend: decimalText(get("minSpend")),
    maxSpend: decimalText(get("maxSpend")),
    minOrders: positiveNumber(get("minOrders")),
    maxOrders: positiveNumber(get("maxOrders")),
    highValueThreshold: decimalText(get("threshold")),
    inactiveDays: positiveNumber(get("days")),
    sort: sortOptions.includes(sortValue as CustomerSegmentSort) ? sortValue as CustomerSegmentSort : "newest",
  };
}

export function customerSegmentQueryString(query: CustomerSegmentQuery, overrides: Record<string, string | undefined> = {}) {
  const params = new URLSearchParams();
  const values: Record<string, string | undefined> = {
    segment: query.segment,
    page: query.page && query.page > 1 ? String(query.page) : undefined,
    search: query.search,
    consent: query.consent,
    registeredDays: query.registeredDays ? String(query.registeredDays) : undefined,
    lastLoginDays: query.lastLoginDays ? String(query.lastLoginDays) : undefined,
    minSpend: query.minSpend,
    maxSpend: query.maxSpend,
    minOrders: query.minOrders ? String(query.minOrders) : undefined,
    maxOrders: query.maxOrders ? String(query.maxOrders) : undefined,
    threshold: query.highValueThreshold,
    days: query.inactiveDays ? String(query.inactiveDays) : undefined,
    sort: query.sort && query.sort !== "newest" ? query.sort : undefined,
    ...overrides,
  };
  for (const [key, value] of Object.entries(values)) if (value) params.set(key, value);
  return params.toString();
}
