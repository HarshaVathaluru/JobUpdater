"use client";

import React, { useState } from 'react';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { ResumeUpload } from '@/components/profile/resume-upload';
import { CandidateProfileDisplay } from '@/components/profile/candidate-profile-display';

export default function ResumePage() {
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleUploadSuccess = () => {
    setRefreshTrigger((prev) => prev + 1);
  };

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Master Resume & Profile Intelligence</h1>
        <p className="mt-1 text-sm text-gray-500">
          Upload your real PDF or DOCX resume. The system extracts factual profile data without inventing qualifications.
        </p>
      </div>

      <ResumeUpload onUploadSuccess={handleUploadSuccess} />

      <div className="pt-2">
        <CandidateProfileDisplay refreshTrigger={refreshTrigger} />
      </div>
    </div>
  );
}
