"use client";

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/auth-context';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardBody } from '@/components/ui/card';

export default function Register() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  
  const { register } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    
    try {
      await register(email, password, firstName, lastName);
      router.push('/dashboard');
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to register');
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
          Create candidate account
        </h2>
        <p className="text-xs text-slate-500 font-medium">
          Start autonomous matching and factual resume tailoring in seconds
        </p>
      </div>

      <div className="bg-white rounded-3xl border border-slate-200/90 shadow-xl p-8 space-y-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 px-4 py-3 rounded-2xl text-xs font-semibold">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="First name"
              value={firstName}
              placeholder="Harsha"
              onChange={(e) => setFirstName(e.target.value)}
            />
            <Input
              label="Last name"
              value={lastName}
              placeholder="Reddy"
              onChange={(e) => setLastName(e.target.value)}
            />
          </div>

          <Input
            label="Email address"
            type="email"
            required
            placeholder="vathaluruharshavardhan@gmail.com"
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

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-3 rounded-xl shadow-md transition-all"
              isLoading={isLoading}
            >
              Create Account & Start Onboarding →
            </Button>
          </div>

          <div className="text-xs text-center text-slate-500">
            Already have an account?{' '}
            <Link href="/login" className="font-bold text-blue-600 hover:underline">
              Sign In
            </Link>
          </div>
        </form>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-center gap-2 text-[11px] text-slate-400 font-medium">
          <span>🛡️</span>
          <span>Zero Hallucination Guaranteed • Privacy Protected</span>
        </div>
      </div>
    </div>
  );
}
