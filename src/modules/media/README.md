# Media Foundation

This module owns uploaded product and category images for the single-store application.

The browser sends a file to a server action. The action validates the file, the media service stores it through `LocalStorageProvider`, and the database stores only safe public metadata plus the provider path. Product and category records reference `Media` rather than implementing filesystem logic themselves.

Current storage is local under `public/uploads/products` and `public/uploads/categories`. The provider interface is replaceable later without changing Product or Category domain code.

Media deletion is reference-safe. Product and Category services remove their
relations first, then ask the Media service to delete only unreferenced records
and files. Product image ordering always promotes another image when the
current primary is removed; products without images use the existing
placeholder behavior.
