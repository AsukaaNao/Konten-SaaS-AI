"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from "react";
import { onAuthStateChanged } from "firebase/auth";
import { auth, getUserProfile } from "../services/firebase";
import { FirebaseUser } from "../services/firebase";
import { UserProfile } from "../types/data";
import { User as AppUser } from "../types/index";

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  appUser: AppUser | null;
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({
  children,
}) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      try {
        if (firebaseUser) {
          setUser(firebaseUser);

          // Fetch profile safely
          const profile = await getUserProfile(firebaseUser.uid);
          setUserProfile(profile);

          // Build simplified app user
          setAppUser({
            uid: firebaseUser.uid,
            email: firebaseUser.email || "",
            displayName:
              profile?.displayName || firebaseUser.displayName || "User",
            isInstagramConnected: profile?.isInstagramConnected || false,
            avatarUrl:
              "https://static.vecteezy.com/system/resources/thumbnails/003/337/584/small_2x/default-avatar-photo-placeholder-profile-icon-vector.jpg",
          });
        } else {
          // Logged out
          setUser(null);
          setUserProfile(null);
          setAppUser(null);
        }
      } catch (error) {
        console.error("Error loading user profile:", error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen text-gray-600">
        <div className="text-center">
          <p className="text-lg font-medium">Memuat akun Anda...</p>
          <p className="text-sm text-gray-500">Harap tunggu sebentar.</p>
        </div>
      </div>
    );
  }

  return (
    <AuthContext.Provider value={{ user, userProfile, appUser, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
};
