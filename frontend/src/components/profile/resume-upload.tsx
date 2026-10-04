"use client";

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardBody, CardHeader } from '@/components/ui/card';
import { api } from '@/lib/api-client';
import { useToast } from '@/components/ui/toast';

export function ResumeUpload({ onUploadSuccess }: { onUploadSuccess?: () => void }) {
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const { success, error: toastError } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setFile(e.target.files[0]);
      setErrorMsg(null);
      setSuccessMsg(null);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMsg('Please select a valid PDF or DOCX file to upload.');
      toastError('Please select a file first.');
      return;
    }

    setUploading(true);
    setErrorMsg(null);
    setSuccessMsg(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      await api.post('/resume/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      const msg = 'Resume successfully parsed and candidate profile updated!';
      setSuccessMsg(msg);
      success(msg, 'Profile Updated');
      setFile(null);
      if (onUploadSuccess) onUploadSuccess();
    } catch (err: any) {
      const errText = err.response?.data?.message || 'Failed to upload or parse resume. Please ensure file format is valid.';
      setErrorMsg(errText);
      toastError(errText, 'Upload Error');
    } finally {
      setUploading(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-blue-600"></span>
          <h3 className="text-lg leading-6 font-semibold text-gray-900">Upload Master Resume</h3>
        </div>
      </CardHeader>
      <CardBody>
        <div className="space-y-4">
          <p className="text-sm text-gray-500 leading-relaxed">
            Upload your master resume (<span className="font-semibold text-gray-700">PDF or DOCX</span>). Our intelligence parser extracts your verified name, contact information, skills, work history, projects, and achievements into your candidate profile.
          </p>

          {/* Clean inline alert messages */}
          {errorMsg && (
            <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/70 text-rose-800 text-sm flex items-start gap-3 transition-all animate-in fade-in">
              <span className="w-5 h-5 rounded-full bg-rose-200 text-rose-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">✕</span>
              <div className="flex-1">
                <h6 className="font-semibold text-xs text-rose-900">Upload Issue</h6>
                <p className="text-xs text-rose-700 mt-0.5">{errorMsg}</p>
              </div>
            </div>
          )}

          {successMsg && (
            <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/70 text-emerald-800 text-sm flex items-start gap-3 transition-all animate-in fade-in">
              <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-700 flex items-center justify-center font-bold text-xs flex-shrink-0 mt-0.5">✓</span>
              <div className="flex-1">
                <h6 className="font-semibold text-xs text-emerald-900">Success</h6>
                <p className="text-xs text-emerald-700 mt-0.5">{successMsg}</p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-2">
            <label className="flex-1 relative cursor-pointer">
              <input
                type="file"
                accept=".pdf,.docx,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2.5 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-all cursor-pointer border border-gray-200 rounded-xl"
              />
            </label>
            <Button onClick={handleUpload} isLoading={uploading} disabled={!file} className="sm:w-32 py-2.5 rounded-xl font-medium shadow-sm">
              Upload
            </Button>
          </div>
        </div>
      </CardBody>
    </Card>
  );
}
