import React, { useState } from 'react';
import { registerUser, loginUser, signInWithGoogle } from '../services/firebase';
import { Icons, Button, Input } from '../constants';

export const LoginPage: React.FC = () => {
  const [isLoginView, setIsLoginView] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);
    try {
      if (isLoginView) {
        await loginUser(email, password);
      } else {
        if (!displayName) {
            throw new Error("Display name is required for registration.");
        }
        await registerUser(email, password, displayName);
      }
      // On success, the AuthProvider will handle the redirect.
    } catch (err: any) {
      setError(err.message || 'An unknown error occurred.');
    }
    setIsLoading(false);
  };
  
  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      await signInWithGoogle();
      // On success, the AuthProvider will handle the redirect.
    } catch (err: any) {
      if (err.code === 'auth/popup-closed-by-user') {
        // Don't show an error message, just stop loading.
      } else {
        setError(err.message || 'An unknown error occurred during Google sign-in.');
      }
    }
    setIsLoading(false);
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-2xl shadow-xl">
        <div className="text-center">
          <Icons.logo className="mx-auto h-12 w-12 text-[#5890AD]" />
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            {isLoginView ? 'Welcome Back!' : 'Create Account'}
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            {isLoginView ? 'Login to continue to KontenAI' : 'Get started with AI-powered ads.'}
          </p>
        </div>
        
        {error && <p className="text-center text-sm text-red-600 bg-red-100 p-3 rounded-md">{error}</p>}

        <form className="space-y-6" onSubmit={handleSubmit}>
          <div className="rounded-md shadow-sm space-y-4">
            {!isLoginView && (
              <Input
                id="display-name"
                name="displayName"
                type="text"
                required
                placeholder="Your Name"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="text-gray-900"
              />
            )}
            <Input
              id="email-address"
              name="email"
              type="email"
              autoComplete="email"
              required
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="text-gray-900"
            />
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="text-gray-900"
            />
          </div>

          <div>
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Processing...' : (isLoginView ? 'Login' : 'Create Account')}
            </Button>
          </div>
        </form>

        <div className="relative">
          <div className="absolute inset-0 flex items-center" aria-hidden="true">
            <div className="w-full border-t border-gray-300" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">
              Or continue with
            </span>
          </div>
        </div>
        
        <div>
            <Button variant="secondary" className="w-full gap-3" onClick={handleGoogleSignIn} disabled={isLoading}>
                <Icons.google className="h-5 w-5" />
                <span>Sign in with Google</span>
            </Button>
        </div>

        <div className="text-center text-sm">
            <a href="#" onClick={(e) => { e.preventDefault(); setIsLoginView(!isLoginView); setError(null); }} className="font-medium text-[#5890AD] hover:text-[#4A7A91]">
              {isLoginView ? "Don't have an account? Register" : "Already have an account? Login"}
            </a>
        </div>
      </div>
    </div>
  );
};

