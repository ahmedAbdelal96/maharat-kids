export type CustomerAddressLike = {
  country?: string | null;
  governorate?: string | null;
  city?: string | null;
  area?: string | null;
  street?: string | null;
  building?: string | null;
  floor?: string | null;
  apartment?: string | null;
  postalCode?: string | null;
  region?: string | null;
  district?: string | null;
  buildingNumber?: string | null;
  additionalNumber?: string | null;
  shortAddress?: string | null;
  unitNumber?: string | null;
};

export function formatCustomerAddress(address: CustomerAddressLike) {
  return [
    address.shortAddress,
    address.region,
    address.district,
    address.street,
    address.buildingNumber,
    address.additionalNumber,
    address.building,
    address.unitNumber,
    address.floor,
    address.apartment,
    address.area,
    address.city,
    address.governorate,
    address.country,
    address.postalCode,
  ]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(", ");
}
