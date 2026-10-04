"use client";

import React, { useEffect, useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { Loading } from '@/components/ui/loading';
import { api } from '@/lib/api-client';
import { Button } from '@/components/ui/button';
import Link from 'next/link';

export default function Dashboard() {
  const [stats, setStats] = useState({
    jobs: 0,
    matches: 0,
    applications: 0,
    submitted: 0,
    failed: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // In a real app, we would have a dedicated /dashboard endpoint
    // We are simulating aggregation by fetching basic counts
    const fetchDashboardStats = async () => {
      try {
        const [jobsRes, appsRes]: [any, any] = await Promise.all([
          api.get('/jobs'),
          api.get('/applications'),
        ]);
        
        const jobsList = Array.isArray(jobsRes) ? jobsRes : jobsRes?.data || [];
        const appsList = Array.isArray(appsRes) ? appsRes : appsRes?.data || [];

        setStats({
          jobs: jobsList.length,
          matches: 0,
          applications: appsList.length,
          submitted: appsList.filter((a: any) => a.status === 'SUBMITTED' || a.status === 'VERIFIED').length,
          failed: appsList.filter((a: any) => a.status === 'FAILED').length,
        });
      } catch (err) {
        console.error('Failed to load dashboard', err);
      } finally {
        setLoading(false);
      }
    };
    fetchDashboardStats();
  }, []);

  if (loading) {
    return <Card><CardBody><Loading /></CardBody></Card>;
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
      
      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardBody className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">Discovered Jobs</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.jobs}</dd>
          </CardBody>
        </Card>
        
        <Card>
          <CardBody className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">Active Applications</dt>
            <dd className="mt-1 text-3xl font-semibold text-gray-900">{stats.applications}</dd>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">Successfully Submitted</dt>
            <dd className="mt-1 text-3xl font-semibold text-green-600">{stats.submitted}</dd>
          </CardBody>
        </Card>

        <Card>
          <CardBody className="p-5">
            <dt className="text-sm font-medium text-gray-500 truncate">Failed / Attention Needed</dt>
            <dd className="mt-1 text-3xl font-semibold text-red-600">{stats.failed}</dd>
          </CardBody>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Quick Actions</h3>
          </CardHeader>
          <CardBody className="space-y-4">
            <Link href="/jobs" className="block w-full text-center px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              Discover New Jobs
            </Link>
            <Link href="/profile" className="block w-full text-center px-4 py-2 border border-gray-300 rounded shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50">
              Update Master Resume
            </Link>
            <Link href="/applications" className="block w-full text-center px-4 py-2 border border-transparent rounded shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700">
              Review Pending Applications
            </Link>
          </CardBody>
        </Card>

        <Card>
          <CardHeader>
            <h3 className="text-lg font-medium text-gray-900">Recent Activity</h3>
          </CardHeader>
          <CardBody>
            <p className="text-sm text-gray-500">Welcome to AutoApplyForJob! Check your Jobs tab to trigger discovery and start applying automatically using the AI agent.</p>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

