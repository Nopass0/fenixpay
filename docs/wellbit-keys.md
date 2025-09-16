# Wellbit API Keys

This guide explains how to manage the API keys used for the Wellbit integration.

## View Current Keys

```bash
curl -H "x-admin-key: <ADMIN_TOKEN>" \
  http://localhost:3000/api/admin/merchants/wellbit/keys
```

The response contains `apiKeyPublic` and `apiKeyPrivate`.

## Regenerate Keys

Generate a new pair of keys (the Wellbit merchant will be created if missing):

```bash
curl -X POST -H "x-admin-key: <ADMIN_TOKEN>" \
  http://localhost:3000/api/admin/merchants/wellbit/regenerate
```

Update your Wellbit integration with the returned values.
