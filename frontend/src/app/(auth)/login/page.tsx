"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardBody } from '@/components/ui/card';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { login } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await login(email, password);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto w-full space-y-6">
      <div className="text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2 text-2xl font-black text-slate-900 tracking-tight">
          <span className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-md">
            A
          </span>
          <span>AutoApply<span className="text-blue-600">ForJob</span></span>
        </Link>
        <h2 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
          Welcome back
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Sign in to access your autonomous job matches and application tracker
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 space-y-6">
        <form className="space-y-5" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-xs font-semibold">
              {error}
            </div>
          )}

          <Input
            label="Email address"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <Input
            label="Password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <div>
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all"
              isLoading={isLoading}
            >
              Sign In to Command Center →
            </Button>
          </div>

          <div className="text-xs text-center text-slate-500">
            Don't have an account?{' '}
            <Link href="/register" className="font-bold text-blue-600 hover:underline">
              Create Account
            </Link>
          </div>
        </form>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
          <span>🛡️</span>
          <span>Factual Grounding • Zero-Hallucination Guarantee</span>
        </div>
      </div>
    </div>
  );
}
