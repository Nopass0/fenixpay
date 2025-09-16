# Wellbit API Documentation

The Wellbit API reference is available through the admin dashboard and can be accessed without authentication.

- **Backend endpoint:** [`/wellbit/openapi.yaml`](http://localhost:3000/wellbit/openapi.yaml)
- **Frontend page:** [`/wellbit/docs`](http://localhost:3001/wellbit/docs)

The page embeds Swagger UI so you can try requests directly in the browser.

## Request Signing

All Wellbit requests are signed using an HMAC-SHA256 hash. To produce the
signature:

1. Parse the JSON body of the request.
2. Sort all object keys alphabetically (recursively).
3. Stringify the result with no whitespace.
4. Calculate `HMAC_SHA256(canonical_json, privateKey)` and hex encode it.

Include the resulting value in the `x-api-token` header. The public API key is
sent in `x-api-key`.
