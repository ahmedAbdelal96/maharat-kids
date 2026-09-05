export function reviewCustomerName(name: string | null, email: string) {
  return name?.trim() || email.split("@")[0] || "Verified customer";
}
