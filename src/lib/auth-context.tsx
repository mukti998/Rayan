import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { useMutation } from "convex/react";
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
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
  hasRole: (...roles: string[]) => boolean;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  login: async () => {},
  logout: () => {},
  isLoading: true,
  hasRole: () => false,
});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const loginMutation = useMutation(api.auth.login);

  useEffect(() => {
    // Check stored session
    const stored = localStorage.getItem("clinic_session");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        setUser(parsed);
      } catch {
        localStorage.removeItem("clinic_session");
      }
    }
    setIsLoading(false);
  }, []);

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
    localStorage.setItem("clinic_session", JSON.stringify(authUser));
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("clinic_session");
  };

  const hasRole = (...roles: string[]) => {
    if (!user) return false;
    if (roles.includes("admin") && user.role === "admin") return true;
    return roles.includes(user.role);
  };

  return (
    <AuthContext.Provider value={{ user, login, logout, isLoading, hasRole }}>
      {children}
    </AuthContext.Provider>
  );
}
