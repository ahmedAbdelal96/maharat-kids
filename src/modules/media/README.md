# Media Foundation

This module owns uploaded public media for the single-store application.

The browser sends a file to a server action. The action validates the file, the media service stores it through the consolidated `PUBLIC_MEDIA` object-storage policy, and the database stores only safe public metadata plus the provider key. Product, category, promotion, and blog records reference `Media` rather than implementing filesystem logic themselves.

Local development uses `public/uploads`; production uses the configured S3-compatible public bucket. The provider interface is replaceable without changing Product or catalog domain code. Private PDFs and bank proofs use the separate `PRIVATE_ASSET` provider and never pass through this module.

Media deletion is reference-safe. Product and Category services remove their
relations first, then ask the Media service to delete only unreferenced records
and files. Product image ordering always promotes another image when the
current primary is removed; products without images use the existing
placeholder behavior.
