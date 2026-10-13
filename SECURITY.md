# Security and privacy

This application is a browser-local self-study tool. It has no authentication, database, analytics integration or server-side user accounts. All hosted files are public assets from the perspective of the application itself; access controls, if any, belong to the hosting provider.

Do not store secrets, access tokens, private student records or medical information in the curriculum or browser storage. Backups include the optional display name and learning activity dates. Share them only when you intend to share those details.

The import parser accepts only version 1 progress fields and known content IDs. It does not execute imported code or merge arbitrary object keys. Names and search text are escaped when displayed. Native browser confirmation is required before a progress import or reset replaces current data.

The local HTTP server restricts files to `dist/`, accepts only GET/HEAD, sets MIME types and a restrictive CSP, and binds to loopback. It is a development preview server rather than a production application server.

If reporting a problem, provide a minimal reproduction without personal progress files or credentials. There is no dedicated private security inbox specified for this repository.
