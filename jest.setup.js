// supabase.ts installs expo-sqlite's localStorage, which needs native SQLite. Tests run without a backend, so skip it.
jest.mock('expo-sqlite/localStorage/install', () => ({}));
