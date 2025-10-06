"use client";

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, FirebaseUser } from '../services/firebase';
import { auth, getUserProfile } from '../services/firebase';
import { UserProfile } from '../types/data';
import { User as AppUser } from '../types/index';

interface AuthContextType {
  user: FirebaseUser | null;
  userProfile: UserProfile | null;
  appUser: AppUser | null; // The simplified User type for the app
  loading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [appUser, setAppUser] = useState<AppUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser);
        const profile = await getUserProfile(firebaseUser.uid);
        setUserProfile(profile);
        if (profile) {
            setAppUser({
                uid: profile.uid,
                email: profile.email,
                displayName: profile.displayName || 'User',
                isInstagramConnected: profile.isInstagramConnected,
                avatarUrl: `https://static.vecteezy.com/system/resources/thumbnails/003/337/584/small_2x/default-avatar-photo-placeholder-profile-icon-vector.jpg`
            });
        }
      } else {
        setUser(null);
        setUserProfile(null);
        setAppUser(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ user, userProfile, appUser, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
