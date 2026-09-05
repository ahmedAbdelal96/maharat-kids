# ADR 005: Simple store settings

## Status

Accepted for the backend foundation phase.

## Decision

Store configuration is represented by one `StoreSetting` table. Each row has a
unique key and a JSON value, together with its timestamps. The model describes
settings for one ecommerce application and one store.

## Why a simple model

This framework creates independent ecommerce stores, not a SaaS platform. A
single key/value model is easy to query, easy to migrate, and sufficient for
settings such as store identity, checkout behavior, shipping thresholds, and
SEO defaults.

We deliberately do not add configuration groups, persisted type descriptors,
editable flags, or a form rendering layer. Known setting usage is validated
with small concrete Zod rules in the store domain service.

## Future dashboard usage

The future dashboard will read settings through the store queries and update
them through the store service/actions. Reads require `settings.view`; writes
require `settings.update` through the existing Identity & Access service.

Adding a setting does not require a new database column. Add a key/value to the
store seed and, when its value needs special validation, add one focused rule
for that setting.

## Caching

Store setting mutations revalidate the shared `store-settings` cache tag.
Read caching can be added at the query composition boundary without introducing
a separate configuration framework.
