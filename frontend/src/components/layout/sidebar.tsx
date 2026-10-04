"use client";

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export function Sidebar() {
  const pathname = usePathname();

  const navigation = [
    { name: 'Dashboard', href: '/dashboard', icon: '📊' },
    { name: 'Jobs', href: '/jobs', icon: '💼' },
    { name: 'Applications', href: '/applications', icon: '📋' },
    { name: 'Resume', href: '/resume', icon: '📄' },
    { name: 'Preferences', href: '/preferences', icon: '⚙️' },
    { name: 'Profile', href: '/profile', icon: '👤' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-slate-200/80 bg-white/90 backdrop-blur-md h-full min-h-screen shadow-sm">
      <div className="flex-1 flex flex-col pt-6 pb-6 px-3 overflow-y-auto">
        <div className="px-3 mb-4">
          <p className="text-[10px] font-bold tracking-wider text-slate-400 uppercase">
            Platform Menu
          </p>
        </div>
        <nav className="space-y-1.5">
          {navigation.map((item) => {
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.name}
                href={item.href}
                className={`group flex items-center gap-3 px-3.5 py-2.5 text-xs font-semibold rounded-xl transition-all duration-200 ${
                  isActive
                    ? 'bg-blue-600 text-white shadow-md shadow-blue-500/20 translate-x-0.5'
                    : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                }`}
              >
                <span className="text-base">{item.icon}</span>
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
