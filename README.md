# Chase Payment Platform

This repository hosts the Chase P2P payment platform. See `SETUP.md` for
development environment instructions.

## SSL Certificate Setup

For production deployment, SSL certificates are required. The nginx container
automatically creates a fullchain certificate from individual certificate files.
See [docs/SSL_CERTIFICATE_SETUP.md](docs/SSL_CERTIFICATE_SETUP.md) for details.

## Wellbit API Keys

Admin endpoints allow viewing and regenerating the API keys for the Wellbit
merchant. Details are documented in [docs/wellbit-keys.md](docs/wellbit-keys.md).
