#!/usr/bin/env node

import fs from 'fs';
import path from 'path';

const files = [
  // Session components
  "components/session/ai-chat-sidebar.tsx",
  "components/session/quality-settings-modal.tsx",
  "components/session/message-thread-modal.tsx",
  "components/session/presenter-invite-modal.tsx",
  "components/session/hls-viewer.tsx",
  "components/session/ai-settings-modal.tsx",
  "components/session/chat-sidebar-enhanced.tsx",
  "components/session/obs-panel.tsx",
  "components/session/boost-session-modal.tsx",
  // Community
  "components/community/topic-feed.tsx",
  "components/community/topic-detail-modal.tsx",
  "components/community/topic-creation-modal.tsx",
  "components/community/room-chat.tsx",
  // Hooks
  "hooks/use-feature-intro.ts",
  "hooks/use-notifications.ts",
  "hooks/use-presence.ts",
  "hooks/use-token-refresh.ts",
  // Contexts
  "contexts/onboarding-context.tsx",
  // Settings & Profile
  "components/settings/change-email-modal.tsx",
  "components/settings/change-password-modal.tsx",
  "components/settings/delete-account-modal.tsx",
  "components/profile/profile-setup-modal.tsx",
  "components/profile/edit-profile-modal.tsx",
  "components/profile/my-invite-codes.tsx",
  // Lib
  "lib/notifications/service.ts",
  "lib/streaks/service.ts",
  "lib/utils/api.ts",
  "lib/badges/service.ts",
  "lib/ai/claude-service.ts",
  "lib/auth/phone-auth.ts",
  "lib/rate-limit.ts",
  "lib/badges/notifications.tsx",
  // Dashboard & Credits
  "components/dashboard/create-session-modal.tsx",
  "components/dashboard/session-card.tsx",
  "components/dashboard/search-bar.tsx",
  "components/dashboard/nav-bar.tsx",
  "components/credits/credits-overview.tsx",
  "components/credits/transaction-history.tsx",
  "components/credits/credits-leaderboard.tsx",
  "components/credits/credits-milestones.tsx",
  // Matchmaking
  "components/matchmaking/find-session-modal.tsx",
  "components/matchmaking/suggestion-modal.tsx",
  // Onboarding
  "components/onboarding/welcome-tour.tsx",
  "components/onboarding/feature-intro-modal.tsx",
  // Error boundary
  "components/error-boundary.tsx",
  // App pages
  "app/(dashboard)/dashboard/page.tsx",
  "app/(dashboard)/browse/page.tsx",
  "app/(dashboard)/search/page.tsx",
  "app/(dashboard)/community/page.tsx",
  "app/(dashboard)/community/[slug]/page.tsx",
  "app/(dashboard)/settings/page.tsx",
  "app/(dashboard)/settings/notifications/page.tsx",
  "app/(dashboard)/settings/privacy/page.tsx",
  "app/presenter-join/[token]/page.tsx",
  "app/error.tsx",
  "app/(auth)/signup/opengraph-image.tsx",
];

const baseDir = '/Users/galenoakes/Development/kulti';

function addLoggerImport(content) {
  if (content.includes("from '@/lib/logger'") || content.includes('from "@/lib/logger"')) {
    return content;
  }

  // Find the last import line
  const lines = content.split('\n');
  let lastImportIndex = -1;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) {
      lastImportIndex = i;
    }
  }

  if (lastImportIndex !== -1) {
    lines.splice(lastImportIndex + 1, 0, "import { logger } from '@/lib/logger'");
    return lines.join('\n');
  }

  return content;
}

function migrateConsoleStatements(content) {
  // Replace console.error
  content = content.replace(/console\.error\(/g, 'logger.error(');

  // Replace console.warn
  content = content.replace(/console\.warn\(/g, 'logger.warn(');

  // Replace console.log (convert to logger.info in app/components, logger.debug in lib)
  content = content.replace(/console\.log\(/g, 'logger.info(');

  return content;
}

let migratedCount = 0;
let totalConsoleStatements = 0;

console.log('Starting migration...\n');

for (const file of files) {
  const filePath = path.join(baseDir, file);

  if (!fs.existsSync(filePath)) {
    console.log(`⚠ Skipped: ${file} (not found)`);
    continue;
  }

  let content = fs.readFileSync(filePath, 'utf-8');

  // Count console statements in this file
  const consoleCount = (content.match(/console\.(error|warn|log|info|debug)/g) || []).length;

  if (consoleCount === 0) {
    continue;
  }

  totalConsoleStatements += consoleCount;

  // Add logger import
  content = addLoggerImport(content);

  // Replace console statements
  content = migrateConsoleStatements(content);

  // Write back
  fs.writeFileSync(filePath, content, 'utf-8');

  migratedCount++;
  console.log(`✓ ${file} (${consoleCount} statements)`);
}

console.log(`\n========================================`);
console.log(`Migration complete!`);
console.log(`Files migrated: ${migratedCount}`);
console.log(`Console statements migrated: ${totalConsoleStatements}`);
console.log(`========================================\n`);
