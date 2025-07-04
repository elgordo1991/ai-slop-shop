import React, { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../../lib/firebase';

interface LoginFormProps {
  onSuccess: () => void;
  onSwitchToSignup: () => void;
}

export function LoginForm({ onSuccess, onSwitchToSignup }: LoginFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      onSuccess();
    } catch (err: any) {
      setError(err.message || 'An error occurred during sign in');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto bg-white p-8 border border-stone-300">
      <h2 className="text-2xl font-light mb-6 text-center lowercase">sign in</h2>
      
      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 text-red-700 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium mb-2 lowercase">email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-stone-300 focus:border-black focus:outline-none transition-colors bg-white"
            placeholder="your@email.com"
          />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 lowercase">password</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-4 py-3 border border-stone-300 focus:border-black focus:outline-none transition-colors bg-white"
            placeholder="••••••••"
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className={`w-full py-3 text-sm font-medium transition-all lowercase ${
            loading
              ? 'bg-stone-200 text-stone-400 cursor-not-allowed'
              : 'minimal-button-full'
          }`}
        >
          {loading ? 'signing in...' : 'sign in'}
        </button>
      </form>

      <div className="mt-6 text-center">
        <button
          onClick={onSwitchToSignup}
          className="text-sm text-gray-600 hover:text-black transition-colors lowercase"
        >
          don't have an account? sign up
        </button>
      </div>
    </div>
  );
}