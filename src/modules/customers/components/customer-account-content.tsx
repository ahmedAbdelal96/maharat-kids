"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { motion, useReducedMotion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { Bell, ChevronDown, Heart, MapPin, Pencil, Plus, RotateCcw, ShieldCheck, ShoppingBag, Trash2, UserRound, Star } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Textarea } from "@/components/ui/textarea";
import { formatDate, formatMoney } from "@/lib/formatters";
import { formatCustomerAddress } from "../address";
import { changeCustomerPassword, createCustomerAddress, deleteCustomerAddress, updateCustomerAddress, updateCustomerProfile } from "../server/actions";
import type { AddressFormInput, CustomerAccountData, CustomerAddress } from "../types";
import { CustomerFavoritesSection } from "@/modules/favorites/components/customer-favorites-section";
import { CustomerNotificationsSection } from "@/modules/notifications/components/customer-notifications-section";
import { CustomerReviewsSection } from "@/modules/reviews/components/customer-reviews-section";

export type AccountSection = "profile" | "addresses" | "favorites" | "orders" | "reviews" | "notifications" | "security";

const emptyAddress: AddressFormInput = {
  label: "Home",
  recipientName: "",
  phone: "",
  fullAddress: "",
  country: "Egypt",
  governorate: null,
  city: null,
  area: null,
  street: null,
  building: null,
  floor: null,
  apartment: null,
  postalCode: null,
  notes: null,
  isDefault: false,
};

const navigation: Array<{ id: AccountSection; label: string; description: string; icon: LucideIcon }> = [
  { id: "profile", label: "Profile", description: "Your personal details", icon: UserRound },
  { id: "addresses", label: "Addresses", description: "Delivery locations", icon: MapPin },
  { id: "favorites", label: "Favorites", description: "Products you saved", icon: Heart },
  { id: "orders", label: "Orders", description: "Order history and tracking", icon: ShoppingBag },
  { id: "reviews", label: "Reviews", description: "Your product feedback", icon: Star },
  { id: "notifications", label: "Notifications", description: "Order and payment updates", icon: Bell },
  { id: "security", label: "Security", description: "Password and access", icon: ShieldCheck },
];

function formError(result: { success: boolean; error?: { message: string } }) {
  return result.success ? "" : result.error?.message ?? "The request could not be completed.";
}

function addressToForm(address: CustomerAddress): AddressFormInput {
  return {
    label: address.label,
    recipientName: address.recipientName,
    phone: address.phone,
    fullAddress: formatCustomerAddress(address),
    country: address.country,
    governorate: address.governorate,
    city: address.city,
    area: address.area,
    street: address.street,
    building: address.building,
    floor: address.floor,
    apartment: address.apartment,
    postalCode: address.postalCode,
    notes: address.notes,
    isDefault: address.isDefault,
  };
}

function orderVariant(status: string): "success" | "warning" | "destructive" {
  if (["DELIVERED", "COMPLETED"].includes(status)) return "success";
  if (status === "CANCELLED") return "destructive";
  return "warning";
}

export function CustomerAccountContent({ initialData, currency = "USD", initialSection = "profile" }: { initialData: CustomerAccountData; currency?: string; initialSection?: AccountSection }) {
  const reduceMotion = useReducedMotion();
  const [activeSection, setActiveSection] = useState<AccountSection>(initialSection);
  const [profile, setProfile] = useState(initialData.profile);
  const [addresses, setAddresses] = useState(initialData.addresses);
  const [profileForm, setProfileForm] = useState({ name: initialData.profile.name ?? "", email: initialData.profile.email, phone: initialData.profile.phone ?? "", marketingConsent: initialData.profile.marketingConsent });
  const [profileEdit, setProfileEdit] = useState(false);
  const [profileMessage, setProfileMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");
  const [addressMessage, setAddressMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [addressModal, setAddressModal] = useState<"create" | CustomerAddress | null>(null);
  const [deleteAddressTarget, setDeleteAddressTarget] = useState<CustomerAddress | null>(null);
  const [deleteErrorMessage, setDeleteErrorMessage] = useState("");
  const [isDeletingAddress, setIsDeletingAddress] = useState(false);
  const [addressForm, setAddressForm] = useState<AddressFormInput>(emptyAddress);
  const [advancedAddressDetails, setAdvancedAddressDetails] = useState(false);
  const [passwordForm, setPasswordForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [passwordMessage, setPasswordMessage] = useState("");

  function selectSection(section: AccountSection) {
    setActiveSection(section);
    setProfileEdit(false);
    setErrorMessage("");
    setProfileMessage("");
    setAddressMessage("");
    setPasswordMessage("");
  }

  function openCreateAddress() {
    setErrorMessage("");
    setAddressMessage("");
    setAddressForm({ ...emptyAddress, recipientName: profile.name ?? "", phone: profile.phone ?? "" });
    setAdvancedAddressDetails(false);
    setAddressModal("create");
  }

  function openEditAddress(address: CustomerAddress) {
    setErrorMessage("");
    setAddressMessage("");
    setAddressForm(addressToForm(address));
    setAdvancedAddressDetails(Boolean(address.governorate || address.city || address.area || address.building || address.floor || address.apartment || address.postalCode));
    setAddressModal(address);
  }

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true); setErrorMessage(""); setProfileMessage("");
    const result = await updateCustomerProfile(profileForm);
    if (result.success) { setProfile(result.data); setProfileMessage("Profile updated successfully."); setProfileEdit(false); }
    else setErrorMessage(formError(result));
    setIsSaving(false);
  }

  async function saveAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true); setErrorMessage("");
    const result = addressModal === "create" ? await createCustomerAddress(addressForm) : await updateCustomerAddress({ ...addressForm, addressId: addressModal?.id });
    if (result.success) {
      setAddresses((current) => addressModal === "create" ? [...current, result.data].sort((a, b) => Number(b.isDefault) - Number(a.isDefault)) : current.map((address) => address.id === result.data.id ? result.data : address).sort((a, b) => Number(b.isDefault) - Number(a.isDefault)));
      setAddressModal(null);
    } else setErrorMessage(formError(result));
    setIsSaving(false);
  }

  function requestDeleteAddress(address: CustomerAddress) {
    setDeleteErrorMessage("");
    setAddressMessage("");
    setDeleteAddressTarget(address);
  }

  async function confirmDeleteAddress() {
    if (!deleteAddressTarget || isDeletingAddress) return;

    const addressId = deleteAddressTarget.id;
    setIsDeletingAddress(true);
    setDeleteErrorMessage("");
    const result = await deleteCustomerAddress({ addressId });

    if (result.success) {
      setAddresses((current) => current.filter((address) => address.id !== addressId));
      setDeleteAddressTarget(null);
      setAddressMessage("Address deleted successfully.");
    } else {
      setDeleteErrorMessage(formError(result));
    }

    setIsDeletingAddress(false);
  }

  async function makeDefault(address: CustomerAddress) {
    setIsSaving(true); setErrorMessage("");
    const result = await updateCustomerAddress({ ...addressToForm(address), addressId: address.id, isDefault: true });
    if (result.success) setAddresses((current) => current.map((item) => ({ ...item, isDefault: item.id === address.id })).sort((a, b) => Number(b.isDefault) - Number(a.isDefault)));
    else setErrorMessage(formError(result));
    setIsSaving(false);
  }

  async function savePassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true); setErrorMessage(""); setPasswordMessage("");
    const result = await changeCustomerPassword(passwordForm);
    if (result.success) { setPasswordForm({ currentPassword: "", newPassword: "", confirmPassword: "" }); setPasswordMessage("Password changed successfully. Other sessions were signed out."); }
    else setErrorMessage(formError(result));
    setIsSaving(false);
  }

  const activeNavigation = navigation.find((item) => item.id === activeSection) ?? navigation[0];
  const contentMotion = reduceMotion ? {} : { initial: { opacity: 0, y: 8 }, animate: { opacity: 1, y: 0 }, transition: { duration: 0.24 } };

  return (
    <div className="grid gap-6 lg:grid-cols-[220px_minmax(0,1fr)] lg:items-start">
      <aside className="lg:sticky lg:top-24">
        <div className="mb-3 flex items-end justify-between lg:block"><div><p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--text-muted)]">Account</p><p className="mt-1 text-sm text-[var(--text-secondary)]">Manage your store experience.</p></div></div>
        <nav aria-label="Account sections" className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-1 lg:gap-1.5">
          {navigation.map((item) => { const Icon = item.icon; const selected = item.id === activeSection; return <button key={item.id} type="button" aria-current={selected ? "page" : undefined} onClick={() => selectSection(item.id)} className={`flex min-h-16 items-center gap-3 rounded-[var(--radius-md)] border p-3 text-left transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] lg:min-h-0 ${selected ? "border-[var(--primary)]/25 bg-[var(--primary-soft)] text-[var(--text-primary)]" : "border-[var(--border)] bg-[var(--surface-card)] text-[var(--text-secondary)] hover:border-[var(--primary)]/40 hover:text-[var(--text-primary)]"}`}><span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] ${selected ? "bg-[var(--primary)] text-[var(--primary-foreground)]" : "bg-[var(--surface-muted)] text-[var(--text-muted)]"}`}><Icon className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-xs font-bold">{item.label}</span><span className="hidden truncate text-[10px] lg:block">{item.description}</span></span>{item.id === "addresses" && addresses.length > 0 && <span className="ml-auto text-[10px] font-bold text-[var(--text-muted)]">{addresses.length}</span>}{item.id === "orders" && initialData.orders && initialData.orders.length > 0 && <span className="ml-auto text-[10px] font-bold text-[var(--text-muted)]">{initialData.orders.length}</span>}</button>; })}
          <Link href="/account/returns" className="flex min-h-16 items-center gap-3 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-card)] p-3 text-left text-[var(--text-secondary)] transition-all hover:border-[var(--primary)]/40 hover:text-[var(--text-primary)] lg:min-h-0"><span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-[var(--radius-sm)] bg-[var(--surface-muted)] text-[var(--text-muted)]"><RotateCcw className="h-4 w-4" /></span><span className="min-w-0"><span className="block text-xs font-bold">Returns</span><span className="hidden truncate text-[10px] lg:block">Return requests and refunds</span></span></Link>
        </nav>
      </aside>

      <motion.div key={activeSection} {...contentMotion} className="min-w-0 space-y-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="text-xs font-semibold text-[var(--primary)]">{activeNavigation.label}</p><h2 className="mt-1 text-2xl font-extrabold tracking-tight text-[var(--text-primary)]">{activeSection === "profile" ? "Your profile" : activeSection === "addresses" ? "Delivery addresses" : activeSection === "favorites" ? "Saved favorites" : activeSection === "orders" ? "Your orders" : activeSection === "reviews" ? "Your reviews" : activeSection === "notifications" ? "Notifications" : "Account security"}</h2><p className="mt-1 text-sm text-[var(--text-secondary)]">{activeNavigation.description}</p></div>{activeSection === "profile" && !profileEdit && <Button size="sm" variant="outline" className="gap-1.5 self-start" onClick={() => setProfileEdit(true)}><Pencil className="h-3.5 w-3.5" />Edit Profile</Button>}{activeSection === "addresses" && <Button size="sm" className="gap-1.5 self-start" onClick={openCreateAddress}><Plus className="h-4 w-4" />Add Address</Button>}</div>
         {(errorMessage || profileMessage || addressMessage || passwordMessage) && <p role="alert" className={`rounded-[var(--radius-md)] border px-3 py-2 text-xs font-medium ${errorMessage ? "border-[var(--destructive)]/20 bg-[var(--destructive-subtle)] text-[var(--destructive)]" : "border-[var(--success)]/20 bg-[var(--success)]/10 text-[var(--success)]"}`}>{errorMessage || profileMessage || addressMessage || passwordMessage}</p>}

        {activeSection === "profile" && <Card><CardHeader><CardTitle className="flex items-center gap-2"><UserRound className="h-4 w-4 text-[var(--primary)]" />Personal information</CardTitle><CardDescription>{profileEdit ? "Update the details used for your account and deliveries." : "Your saved customer details."}</CardDescription></CardHeader><CardContent>{profileEdit ? <form onSubmit={saveProfile} className="max-w-xl space-y-4"><label className="block text-xs font-semibold">Name<Input value={profileForm.name} onChange={(event) => setProfileForm((current) => ({ ...current, name: event.target.value }))} placeholder="Your name" /></label><label className="block text-xs font-semibold">Email<Input type="email" required value={profileForm.email} onChange={(event) => setProfileForm((current) => ({ ...current, email: event.target.value }))} /></label><label className="block text-xs font-semibold">Phone<Input value={profileForm.phone} onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))} placeholder="010xxxxxxxx" /></label><label className="flex items-start gap-2 rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3 text-xs font-semibold"><input type="checkbox" checked={profileForm.marketingConsent} onChange={(event) => setProfileForm((current) => ({ ...current, marketingConsent: event.target.checked }))} className="mt-0.5 h-4 w-4 accent-[var(--primary)]" /><span>Receive offers and store updates <span className="font-normal text-[var(--text-muted)]">(optional)</span></span></label><div className="flex flex-wrap gap-2"><Button type="submit" isLoading={isSaving}>Save Changes</Button><Button type="button" variant="outline" disabled={isSaving} onClick={() => { setProfileEdit(false); setProfileForm({ name: profile.name ?? "", email: profile.email, phone: profile.phone ?? "", marketingConsent: profile.marketingConsent }); }}>Cancel</Button></div></form> : <div className="grid gap-4 sm:grid-cols-3"><div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4"><p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Name</p><p className="mt-1 text-sm font-bold">{profile.name || "Not provided"}</p></div><div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4"><p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Email</p><p className="mt-1 break-all text-sm font-bold">{profile.email}</p></div><div className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-4"><p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Phone</p><p className="mt-1 text-sm font-bold">{profile.phone || "Not provided"}</p></div></div>}</CardContent></Card>}

        {activeSection === "addresses" && <div className="space-y-4">{addresses.length === 0 ? <Card><CardContent className="flex flex-col items-center px-6 py-12 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]"><MapPin className="h-5 w-5" /></div><h3 className="mt-4 text-base font-bold">Add your first delivery address</h3><p className="mt-1 max-w-sm text-sm text-[var(--text-secondary)]">Save an address once and use it for faster checkout next time.</p><Button className="mt-5 gap-1.5" onClick={openCreateAddress}><Plus className="h-4 w-4" />Add Address</Button></CardContent></Card> : <div className="grid gap-4 sm:grid-cols-2">{addresses.map((address) => <Card key={address.id}><CardContent className="space-y-4 p-5"><div className="flex items-start justify-between gap-3"><div className="flex items-center gap-2"><MapPin className="h-4 w-4 text-[var(--primary)]" /><h3 className="font-bold">{address.label}</h3></div>{address.isDefault && <Badge variant="secondary" size="sm">Default</Badge>}</div><div className="text-xs leading-5 text-[var(--text-secondary)]"><p className="font-semibold text-[var(--text-primary)]">{address.recipientName}</p><p>{address.phone}</p><p>{formatCustomerAddress(address)}</p>{address.notes && <p className="mt-1"><span className="font-semibold text-[var(--text-primary)]">Notes:</span> {address.notes}</p>}</div><div className="flex flex-wrap gap-2 border-t border-[var(--border)] pt-3"><Button variant="ghost" size="sm" onClick={() => openEditAddress(address)}><Pencil className="h-3.5 w-3.5" />Edit</Button>{!address.isDefault && <Button variant="outline" size="sm" disabled={isSaving} onClick={() => makeDefault(address)}>Make Default</Button>}<Button variant="ghost" size="icon" aria-label={`Delete ${address.label}`} disabled={isSaving || isDeletingAddress} onClick={() => requestDeleteAddress(address)}><Trash2 className="h-4 w-4 text-[var(--destructive)]" /></Button></div></CardContent></Card>)}</div>}</div>}

        {activeSection === "favorites" && <CustomerFavoritesSection favorites={initialData.favorites ?? []} currency={currency} />}

        {activeSection === "notifications" && <CustomerNotificationsSection initialNotifications={initialData.notifications ?? []} initialUnreadCount={initialData.unreadNotificationCount ?? 0} />}

        {activeSection === "reviews" && initialData.reviewData && <CustomerReviewsSection data={initialData.reviewData} />}

        {activeSection === "orders" && <Card><CardContent className="p-4 sm:p-6">{!initialData.orders?.length ? <div className="flex flex-col items-center py-10 text-center"><div className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary-soft)] text-[var(--primary)]"><ShoppingBag className="h-5 w-5" /></div><h3 className="mt-4 text-base font-bold">You do not have any orders yet</h3><p className="mt-1 text-sm text-[var(--text-secondary)]">Find something you love and your orders will appear here.</p><Link href="/products"><Button className="mt-5">Browse Products</Button></Link></div> : <div className="grid gap-3">{initialData.orders.map((order) => <Link key={order.id} href={`/account/orders/${encodeURIComponent(order.orderNumber)}`} className="group rounded-[var(--radius-lg)] border border-[var(--border)] p-4 transition-colors hover:border-[var(--primary)]/50 hover:bg-[var(--surface-muted)]/40"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-bold text-[var(--text-primary)]">Order #{order.orderNumber}</p><p className="mt-1 text-[11px] text-[var(--text-secondary)]">{formatDate(order.createdAt)} · {order.paymentMethodName}</p></div><Badge variant={orderVariant(order.status)} size="sm">{order.status}</Badge></div><div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4"><div><p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Total</p><p className="mt-1 text-sm font-extrabold">{formatMoney(order.total, order.currency)}</p></div><div><p className="text-[10px] font-semibold uppercase tracking-wide text-[var(--text-muted)]">Payment</p><p className="mt-1 text-xs font-semibold">{order.paymentStatus}</p></div><div className="col-span-2 flex items-end justify-end"><span className="text-xs font-bold text-[var(--primary)] transition-transform group-hover:translate-x-0.5">View Order →</span></div></div></Link>)}</div>}</CardContent></Card>}

        {activeSection === "security" && <Card><CardHeader><CardTitle className="flex items-center gap-2"><ShieldCheck className="h-4 w-4 text-[var(--primary)]" />Password</CardTitle><CardDescription>Keep your account protected with a strong password.</CardDescription></CardHeader><CardContent>{initialData.hasLocalPassword ? <form onSubmit={savePassword} className="max-w-xl space-y-4"><p className="rounded-[var(--radius-md)] bg-[var(--surface-muted)] p-3 text-xs text-[var(--text-secondary)]">Changing your password signs out other active sessions.</p><label className="block text-xs font-semibold">Current Password<Input type="password" required value={passwordForm.currentPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, currentPassword: event.target.value }))} /></label><label className="block text-xs font-semibold">New Password<Input type="password" required minLength={12} value={passwordForm.newPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, newPassword: event.target.value }))} /></label><label className="block text-xs font-semibold">Confirm New Password<Input type="password" required minLength={12} value={passwordForm.confirmPassword} onChange={(event) => setPasswordForm((current) => ({ ...current, confirmPassword: event.target.value }))} /></label><Button type="submit" isLoading={isSaving}>Change Password</Button></form> : <p className="text-sm text-[var(--text-secondary)]">This account uses Google Sign-In and does not have a local password.</p>}</CardContent></Card>}
      </motion.div>

      <Modal isOpen={addressModal !== null} onClose={() => { if (!isSaving) setAddressModal(null); }} title={addressModal === "create" ? "Add Address" : "Edit Address"} description="Add a delivery address in a few quick details." maxWidth="2xl"><form onSubmit={saveAddress} className="max-h-[70vh] space-y-4 overflow-y-auto"><div className="grid gap-3 sm:grid-cols-2"><label className="block text-xs font-semibold">Recipient Name<Input value={addressForm.recipientName} onChange={(event) => setAddressForm((current) => ({ ...current, recipientName: event.target.value }))} placeholder="Ahmed" required /></label><label className="block text-xs font-semibold">Phone<Input value={addressForm.phone} onChange={(event) => setAddressForm((current) => ({ ...current, phone: event.target.value }))} placeholder="010xxxxxxxx" required /></label><label className="block text-xs font-semibold sm:col-span-2">Full Address<Textarea value={addressForm.fullAddress} onChange={(event) => setAddressForm((current) => ({ ...current, fullAddress: event.target.value }))} placeholder="Cairo, Nasr City, Abbas El Akkad Street, Building 10" rows={3} required /></label><label className="block text-xs font-semibold sm:col-span-2">Delivery Notes <span className="font-normal text-[var(--text-muted)]">(optional)</span><Textarea value={addressForm.notes ?? ""} onChange={(event) => setAddressForm((current) => ({ ...current, notes: event.target.value }))} placeholder="Second floor, next to the pharmacy" rows={2} /></label></div><button type="button" aria-expanded={advancedAddressDetails} onClick={() => setAdvancedAddressDetails((current) => !current)} className="flex w-full items-center justify-between rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-muted)] px-3 py-2.5 text-left text-xs font-semibold text-[var(--text-primary)] transition-colors hover:border-[var(--primary)]/50"><span>Add more details <span className="font-normal text-[var(--text-muted)]">(optional)</span></span><ChevronDown className={`h-4 w-4 transition-transform ${advancedAddressDetails ? "rotate-180" : ""}`} /></button>{advancedAddressDetails && <div className="grid gap-3 rounded-[var(--radius-md)] border border-[var(--border)] p-3 sm:grid-cols-2">{([['country','Country'],['governorate','Governorate / State'],['city','City'],['area','Area'],['street','Street'],['building','Building'],['floor','Floor'],['apartment','Apartment'],['postalCode','Postal Code']] as const).map(([key, label]) => <label key={key} className="block text-xs font-semibold">{label}<Input value={addressForm[key] ?? ""} onChange={(event) => setAddressForm((current) => ({ ...current, [key]: event.target.value }))} /></label>)}</div>}<label className="flex items-center gap-2 text-xs font-semibold"><input type="checkbox" checked={addressForm.isDefault === true} onChange={(event) => setAddressForm((current) => ({ ...current, isDefault: event.target.checked }))} />Make this my default address</label><div className="flex justify-end"><Button type="submit" isLoading={isSaving}>{addressModal === "create" ? "Add Address" : "Save Address"}</Button></div></form></Modal>

      <Modal isOpen={deleteAddressTarget !== null} onClose={() => { if (!isDeletingAddress) { setDeleteAddressTarget(null); setDeleteErrorMessage(""); } }} title="Delete address?" description={deleteAddressTarget ? `“${deleteAddressTarget.label}” will be permanently removed.` : undefined} maxWidth="sm"><div className="space-y-5"><p className="text-sm leading-6 text-[var(--text-secondary)]">This address will be removed from your account and will no longer be available at checkout.</p>{deleteErrorMessage && <p role="alert" className="rounded-[var(--radius-md)] border border-[var(--destructive)]/20 bg-[var(--destructive-subtle)] px-3 py-2 text-xs font-medium text-[var(--destructive)]">{deleteErrorMessage}</p>}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={isDeletingAddress} onClick={() => { setDeleteAddressTarget(null); setDeleteErrorMessage(""); }}>Cancel</Button><Button type="button" variant="destructive" isLoading={isDeletingAddress} onClick={confirmDeleteAddress}>Delete Address</Button></div></div></Modal>
    </div>
  );
}
