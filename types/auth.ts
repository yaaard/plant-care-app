import type { Session, User } from '@supabase/supabase-js';

export type AuthCredentials = {
  email: string;
  password: string;
};

export type SignUpResult = {
  needsEmailConfirmation: boolean;
};

export interface AuthContextValue {
  session: Session | null;
  user: User | null;
  loading: boolean;
  isConfigured: boolean;
  configurationError: string | null;
  signIn: (credentials: AuthCredentials) => Promise<void>;
  signUp: (credentials: AuthCredentials) => Promise<SignUpResult>;
  signOut: () => Promise<void>;
  refreshSession: () => Promise<void>;
}
