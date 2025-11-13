/**
 * Seed Data for Community Rooms
 *
 * Creates initial community rooms across different categories
 * Only run this once during initial setup
 */

-- Insert community rooms
-- Note: created_by should be set to an admin user ID (replace with actual admin ID)
INSERT INTO community_rooms (slug, name, description, category, icon_emoji, tags) VALUES
  -- General
  (
    'general-chat',
    'General Chat',
    'General discussions about coding, tech, and life. A place for everyone to hang out and chat.',
    'general',
    '💬',
    ARRAY['general', 'chat', 'casual']
  ),
  (
    'introductions',
    'Introductions',
    'New to Kulti? Introduce yourself here! Share what you''re working on and what you want to learn.',
    'general',
    '👋',
    ARRAY['welcome', 'new-members', 'introductions']
  ),

  -- Web Development
  (
    'web-development',
    'Web Development',
    'Discuss web technologies, frameworks, and best practices. React, Vue, Angular, and more.',
    'web-dev',
    '🌐',
    ARRAY['frontend', 'backend', 'fullstack', 'javascript', 'typescript']
  ),
  (
    'react-nextjs',
    'React & Next.js',
    'Deep dive into React and Next.js development. Share patterns, discuss hooks, and solve problems together.',
    'web-dev',
    '⚛️',
    ARRAY['react', 'nextjs', 'frontend', 'ssr']
  ),

  -- Mobile Development
  (
    'mobile-dev',
    'Mobile Development',
    'iOS, Android, React Native, Flutter - discuss mobile app development across all platforms.',
    'mobile-dev',
    '📱',
    ARRAY['ios', 'android', 'react-native', 'flutter']
  ),

  -- Backend & DevOps
  (
    'backend-engineering',
    'Backend Engineering',
    'Backend architecture, databases, APIs, and scalability discussions.',
    'backend',
    '⚙️',
    ARRAY['backend', 'api', 'database', 'architecture']
  ),
  (
    'devops-cloud',
    'DevOps & Cloud',
    'CI/CD, Docker, Kubernetes, AWS, GCP, Azure - infrastructure and deployment topics.',
    'devops',
    '☁️',
    ARRAY['devops', 'cloud', 'docker', 'kubernetes', 'ci-cd']
  ),

  -- AI & ML
  (
    'ai-machine-learning',
    'AI & Machine Learning',
    'Discuss AI, ML, deep learning, LLMs, and the future of intelligent systems.',
    'ai-ml',
    '🤖',
    ARRAY['ai', 'ml', 'deep-learning', 'llm', 'gpt']
  ),

  -- Data Science
  (
    'data-science',
    'Data Science',
    'Data analysis, visualization, statistics, and data engineering topics.',
    'data-science',
    '📊',
    ARRAY['data', 'analytics', 'visualization', 'statistics']
  ),

  -- Design
  (
    'design-ux',
    'Design & UX',
    'UI/UX design, design systems, accessibility, and creating beautiful user experiences.',
    'design',
    '🎨',
    ARRAY['design', 'ux', 'ui', 'figma', 'accessibility']
  ),

  -- Game Development
  (
    'game-dev',
    'Game Development',
    'Game engines, game design, Unity, Unreal, and indie game development.',
    'game-dev',
    '🎮',
    ARRAY['games', 'unity', 'unreal', 'godot', 'indie']
  ),

  -- Blockchain
  (
    'blockchain-web3',
    'Blockchain & Web3',
    'Smart contracts, DeFi, NFTs, and decentralized applications.',
    'blockchain',
    '⛓️',
    ARRAY['blockchain', 'web3', 'ethereum', 'solidity', 'defi']
  ),

  -- Security
  (
    'security',
    'Security',
    'Application security, ethical hacking, cryptography, and secure coding practices.',
    'security',
    '🔒',
    ARRAY['security', 'hacking', 'crypto', 'auth']
  ),

  -- Help & Support
  (
    'help-debugging',
    'Help & Debugging',
    'Stuck on a problem? Ask for help here! Share errors, get debugging tips, and solve issues together.',
    'help',
    '🆘',
    ARRAY['help', 'debugging', 'questions', 'support']
  ),
  (
    'career-advice',
    'Career Advice',
    'Job hunting, interviews, career growth, and professional development discussions.',
    'help',
    '💼',
    ARRAY['career', 'jobs', 'interviews', 'growth']
  ),

  -- Announcements
  (
    'announcements',
    'Announcements',
    'Official Kulti announcements, updates, and platform news.',
    'announcements',
    '📢',
    ARRAY['announcements', 'news', 'updates']
  )
ON CONFLICT (slug) DO NOTHING;

-- Print success message
DO $$
BEGIN
  RAISE NOTICE 'Community rooms seeded successfully!';
END $$;
