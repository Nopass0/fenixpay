#!/bin/bash

# Script to commit the dispute status fixes

echo "Staging changes..."
git add frontend/package.json
git add frontend/components/trader/disputes/deal-disputes-list.tsx
git add frontend/components/admin/dispute-details.tsx
git add frontend/components/admin/disputes-list.tsx
git add frontend/components/merchant/deal-disputes-list.tsx
git add frontend/components/trader/disputes/payout-disputes-list.tsx
git add frontend/components/disputes/dispute-messages-realtime.tsx
git add install-socket-io.sh

echo "Committing changes..."
git commit -m "$(cat <<'EOF'
fix: Correct dispute status logic and add real-time chat support

- Fixed dispute status logic across all components:
  - RESOLVED_SUCCESS now correctly shows "resolved in favor of merchant"
  - RESOLVED_FAIL now correctly shows "resolved in favor of trader"
- Updated status colors, badges, and filters to match correct logic
- Added socket.io-client dependency for real-time chat
- Implemented DisputeMessagesRealtime component with WebSocket support
- Added protection against null/undefined values in dispute lists
- Temporarily disabled WebSocket imports until socket.io-client is installed
- Added installation script for socket.io-client package

🤖 Generated with [Claude Code](https://claude.ai/code)

Co-Authored-By: Claude <noreply@anthropic.com>
EOF
)"

echo "Changes committed successfully!"