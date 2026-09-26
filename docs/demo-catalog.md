# Demo catalog seed

The client PDF reference is represented by a disposable, explicit demo seed. It is intentionally separate from `prisma/seed.ts` and refuses to run with `NODE_ENV=production`.

```powershell
$env:NODE_ENV = "development"
npm run seed:demo-catalog -- --confirm
npm run seed:demo-catalog -- --confirm   # safe, idempotent rerun
npm run seed:demo-catalog:clean -- --confirm
```

The seed creates 40 physical products and four digital products, with explicit Saudi Arabia and Egypt prices, dynamic catalog metadata, limited meaningful variants, 70 client-provided source images, and four original multi-page activity PDFs. Images are copied into the public media boundary; PDFs are stored under the private digital-asset boundary and are never written below `public/`.

`seed-assets/demo-catalog/product-source-map.json` records each product slug and the source image filenames used for its gallery. The competitor site was used only for broad category inspiration; no competitor copy or hotlinked media is included.

Cleanup is scoped to `MK-DEMO-*` products and refuses to delete anything referenced by order history.

After the demo seed exists, `npm run seed-media:migrate-r2 -- --dry-run` audits the 101 repository-owned public seed/demo images and the four protected demo PDFs before an operator runs the confirmed R2 migration. The source map and database relations remain the source of truth; R2 object keys are deterministic and the checked-in public assets remain a fallback for local/static deployments.
