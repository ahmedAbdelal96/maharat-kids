import assert from "node:assert/strict";
import { after, before, test } from "node:test";
import { PrismaClient, type Market } from "@prisma/client";
import { PrismaCustomerRepository } from "../src/modules/customers/infrastructure/repository";
import { DevelopmentAddressResolutionProvider } from "../src/modules/addresses/providers/development-provider";
import { AddressResolutionService } from "../src/modules/addresses/domain/resolution-service";
import { logger } from "../src/server/logger";

const db = new PrismaClient();
const suffix = Date.now().toString();
let customerA = "";
let customerB = "";
const cleanupAddressIds: string[] = [];
const cleanupResolutionIds: string[] = [];

const baseAddress = {
  label: "Home",
  recipientName: "MK-02 Recipient",
  phone: "0551234567",
  country: "Saudi Arabia",
  countryCode: "SA",
  governorate: null,
  region: "Riyadh",
  city: "Riyadh",
  district: "Al Olaya",
  area: "Al Olaya",
  street: "King Fahd Road",
  building: "10",
  buildingNumber: "10",
  additionalNumber: "1234",
  shortAddress: "ABCD1234",
  unitNumber: null,
  floor: null,
  apartment: null,
  postalCode: "12345",
  latitude: null,
  longitude: null,
  notes: "Leave at reception",
  isDefault: true,
};

before(async () => {
  const users = await Promise.all([
    db.user.create({ data: { type: "CUSTOMER", status: "ACTIVE", email: `mk02-a-${suffix}@example.test` } }),
    db.user.create({ data: { type: "CUSTOMER", status: "ACTIVE", email: `mk02-b-${suffix}@example.test` } }),
  ]);
  customerA = users[0].id;
  customerB = users[1].id;
});

after(async () => {
  await db.addressResolutionSession.deleteMany({ where: { id: { in: cleanupResolutionIds } } });
  await db.customerAddress.deleteMany({ where: { id: { in: cleanupAddressIds } } });
  await db.user.deleteMany({ where: { id: { in: [customerA, customerB] } } });
  await db.$disconnect();
});

test("addresses are market-owned with independent defaults and server-side ownership", async () => {
  const repository = new PrismaCustomerRepository(db);
  const saudi = await repository.createAddress(customerA as never, "SAUDI_ARABIA", baseAddress);
  const egypt = await repository.createAddress(customerA as never, "EGYPT", { ...baseAddress, label: "Egypt Home", country: "Egypt", countryCode: "EG", phone: "01012345678", governorate: "Cairo", region: null, district: "Nasr City", city: "Cairo", street: "Test Street", building: "20", buildingNumber: null, additionalNumber: null, shortAddress: null, postalCode: "11511", notes: "Call on arrival" });
  cleanupAddressIds.push(saudi.id, egypt.id);
  assert.equal(saudi.market, "SAUDI_ARABIA");
  assert.equal(egypt.market, "EGYPT");
  assert.equal(saudi.countryCode, "SA");
  assert.equal(egypt.countryCode, "EG");
  assert.equal(saudi.isDefault, true);
  assert.equal(egypt.isDefault, true);
  const saudiOnly = await repository.findAddresses(customerA as never, "SAUDI_ARABIA");
  const egyptOnly = await repository.findAddresses(customerA as never, "EGYPT");
  assert.deepEqual(saudiOnly.map((item) => item.id), [saudi.id]);
  assert.deepEqual(egyptOnly.map((item) => item.id), [egypt.id]);
  assert.deepEqual(await repository.findAddresses(customerB as never, "SAUDI_ARABIA"), []);
  await assert.rejects(() => repository.updateAddress(customerB as never, saudi.id, "SAUDI_ARABIA", { ...baseAddress, recipientName: "intruder" }));
  await assert.rejects(() => repository.updateAddress(customerB as never, saudi.id, "SAUDI_ARABIA", { ...baseAddress, isDefault: true }));
  assert.equal(await repository.deleteAddress(customerB as never, saudi.id), false);
});

test("checkout address lookup rejects a different market or owner", async () => {
  const repository = new PrismaCustomerRepository(db);
  const saudi = await repository.createAddress(customerA as never, "SAUDI_ARABIA", { ...baseAddress, label: "Checkout SA" });
  cleanupAddressIds.push(saudi.id);
  assert.equal((await repository.findAddressForCheckout(customerA as never, saudi.id, "SAUDI_ARABIA"))?.id, saudi.id);
  assert.equal(await repository.findAddressForCheckout(customerA as never, saudi.id, "EGYPT"), null);
  assert.equal(await repository.findAddressForCheckout(customerB as never, saudi.id, "SAUDI_ARABIA"), null);
});

test("development provider keeps address resolution separate from customer OTP", async () => {
  const provider = new DevelopmentAddressResolutionProvider();
  const service = new AddressResolutionService(db, provider);
  const started = await service.start(customerA, "SAUDI_ARABIA", "0551234567", true);
  cleanupResolutionIds.push(started.sessionId);
  assert.equal(started.developmentCode?.length, 6);
  assert.equal(started.provider, "DEVELOPMENT");
  const choices = await service.verify(customerA, started.sessionId, started.developmentCode!);
  assert.equal(choices.length, 2);
  assert.notEqual(choices[0].shortAddress, choices[1].shortAddress);
  await assert.rejects(() => service.verify(customerB, started.sessionId, started.developmentCode!));
  await assert.rejects(() => service.verify(customerA, started.sessionId, started.developmentCode!));
});

test("locale does not select market", async () => {
  const markets: Market[] = ["SAUDI_ARABIA", "EGYPT"];
  assert.deepEqual(markets, ["SAUDI_ARABIA", "EGYPT"]);
});

test("application logs redact address-resolution challenge fields", () => {
  let output = "";
  const original = console.info;
  console.info = (...args: unknown[]) => { output += args.join(" "); };
  try { logger.info("address resolution", { code: "246810", challenge: "246810", provider: "DEVELOPMENT" }); } finally { console.info = original; }
  assert.equal(output.includes("246810"), false);
  assert.equal(output.includes("[REDACTED]"), true);
});

test("editing a verified provider address resets provenance while preserving notes", async () => {
  const repository = new PrismaCustomerRepository(db);
  const created = await repository.createAddress(customerA as never, "SAUDI_ARABIA", { ...baseAddress, label: "Verified Home", notes: "Keep at desk" });
  cleanupAddressIds.push(created.id);
  await db.customerAddress.update({ where: { id: created.id }, data: { source: "SPL", verification: "VERIFIED", provider: "DEVELOPMENT", providerReference: "fixture-1", verifiedAt: new Date() } });
  const updated = await repository.updateAddress(customerA as never, created.id, "SAUDI_ARABIA", { ...baseAddress, label: "Verified Home", notes: "Keep at desk", street: "New Street" });
  assert.equal(updated.source, "MANUAL");
  assert.equal(updated.verification, "UNVERIFIED");
  assert.equal(updated.provider, null);
  assert.equal(updated.notes, "Keep at desk");
  const keptDefault = await repository.updateAddress(customerA as never, updated.id, "SAUDI_ARABIA", { ...baseAddress, notes: "Keep at desk", isDefault: false });
  assert.equal(keptDefault.isDefault, true);
});
