import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Id } from "../../convex/_generated/dataModel";

interface AuthUser {
  userId: Id<"users">;
  username: string;
  name: string;
  role: string;
  department?: string;
}

interface AuthContextType {
  user: AuthUser | null;
  sessionToken: string | null;
  login: (username: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isLoading: boolean;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  sessionToken: null,
  login: async () => {},
  logout: async () => {},
  isLoading: true,
  hasRole: () => false,
});

export function useAuth() {
  return useContext(AuthContext);
}

interface StoredSession {
  user: AuthUser;
  sessionToken: string;
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [sessionToken, setSessionToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loginMutation = useMutation(api.auth.login);
  const logoutMutation = useMutation(api.auth.logout);

  // Validate existing session on mount
  const storedSession = (() => {
    try {
      const raw = localStorage.getItem("clinic_session");
      if (!raw) return null;
      return JSON.parse(raw) as StoredSession;
    } catch {
      localStorage.removeItem("clinic_session");
      return null;
    }
  })();

  const validSession = useQuery(
    api.auth.validateSession,
    storedSession?.sessionToken ? { sessionToken: storedSession.sessionToken } : "skip"
  );

  useEffect(() => {
    if (validSession === undefined) {
      // Still loading validation
      return;
    }

    if (validSession && storedSession) {
      // Session is still valid on the server
      setUser(validSession);
      setSessionToken(storedSession.sessionToken);
    } else {
      // Session expired or invalid — clear it
      localStorage.removeItem("clinic_session");
      setUser(null);
      setSessionToken(null);
    }

    setIsLoading(false);
  }, [validSession, storedSession]);

  const login = async (username: string, password: string) => {
    const result = await loginMutation({ username, password });
    const authUser: AuthUser = {
      userId: result.userId,
      username: result.username,
      name: result.name,
      role: result.role,
      department: result.department,
    };
    setUser(authUser);
    setSessionToken(result.sessionToken);
    localStorage.setItem(
      "clinic_session",
      JSON.stringify({ user: authUser, sessionToken: result.sessionToken })
    );
  };

  const logout = async () => {
    if (sessionToken) {
      try {
        await logoutMutation({ sessionToken });
      } catch {
        // Session may already be expired — just clear locally
      }
    }
    setUser(null);
    setSessionToken(null);
    localStorage.removeItem("clinic_session");
  };

  const hasRole = (...roles: string[]) => {
    if (!user) return false;
    if (roles.includes("admin") && user.role === "admin") return true;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, sessionToken, login, logout, isLoading, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}
