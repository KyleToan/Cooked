// supabase.ts installs expo-sqlite's localStorage, which needs native SQLite. Tests run without a backend, so skip it.
jest.mock('expo-sqlite/localStorage/install', () => ({}));

// expo-crypto's native randomUUID isn't there under Jest; Node's gives each new row its own id.
jest.mock('expo-crypto', () => ({ randomUUID: () => require('crypto').randomUUID() }));
