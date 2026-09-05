export type JsonObject = Record<string, unknown>;

export type EntityId = string & { readonly __brand: "EntityId" };
