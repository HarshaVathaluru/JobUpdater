"use client";

import React, { useEffect, useState } from 'react';

interface RealisticProcessModalProps {
  isOpen: boolean;
  title: string;
  subtitle: string;
  steps: string[];
  currentStepIndex: number;
  progressPercent: number;
  icon?: string;
  onClose?: () => void;
  resultData?: any;
  resultStatus?: 'success' | 'review' | 'failure';
}

export function RealisticProcessModal({
  isOpen,
  title,
  subtitle,
  steps,
  currentStepIndex,
  progressPercent,
  icon = "⚡",
  onClose,
  resultData,
  resultStatus = 'success',
}: RealisticProcessModalProps) {
  if (!isOpen) return null;

  const isCompleted = progressPercent >= 100;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-100 max-w-lg w-full overflow-hidden transition-all transform scale-100 animate-in zoom-in-95 duration-200">
        {/* Top Gradient Banner */}
        <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 p-6 text-white relative">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-xl shadow-inner">
              {icon}
            </div>
            <div>
              <h3 className="text-lg font-bold tracking-tight">{title}</h3>
              <p className="text-xs text-blue-100/90 mt-0.5">{subtitle}</p>
            </div>
          </div>
        </div>

        {/* Body Content */}
        <div className="p-6 space-y-6">
          {/* Animated Progress Bar */}
          <div>
            <div className="flex justify-between items-center text-xs font-semibold text-slate-600 mb-2">
              <span>{isCompleted ? (resultStatus === 'success' ? 'Confirmed' : resultStatus === 'review' ? 'Review required' : 'Failed') : 'Working'}</span>
              <span className="text-indigo-600 font-bold">{Math.round(progressPercent)}%</span>
            </div>
            <div className="w-full h-2.5 bg-slate-100 rounded-full overflow-hidden p-0.5 shadow-inner">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  !isCompleted ? "shimmer-bar" : resultStatus === 'success' ? "bg-emerald-500" : resultStatus === 'review' ? "bg-amber-500" : "bg-red-500"
                }`}
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>

          {/* Step Sequence Details */}
          <div className="space-y-3 bg-slate-50/70 p-4 rounded-xl border border-slate-100">
            {steps.map((step, idx) => {
              const isPast = idx < currentStepIndex && (!isCompleted || resultStatus === 'success');
              const isCurrent = idx === currentStepIndex && !isCompleted;

              return (
                <div key={idx} className="flex items-center gap-3 text-xs">
                  <div className="w-5 h-5 flex-shrink-0 flex items-center justify-center">
                    {isPast ? (
                      <span className="w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-[10px]">
                        ✓
                      </span>
                    ) : isCompleted && idx >= currentStepIndex ? (
                      <span className={`w-5 h-5 rounded-full flex items-center justify-center font-bold text-[10px] ${resultStatus === 'review' ? 'bg-amber-100 text-amber-800' : 'bg-red-100 text-red-700'}`}>{resultStatus === 'review' ? '!' : '×'}</span>
                    ) : isCurrent ? (
                      <span className="w-4 h-4 rounded-full border-2 border-indigo-600 border-t-transparent animate-spin" />
                    ) : (
                      <span className="w-2 h-2 rounded-full bg-slate-300" />
                    )}
                  </div>
                  <span
                    className={`transition-colors ${
                      isPast
                        ? "text-slate-800 font-medium"
                        : isCurrent
                        ? "text-indigo-600 font-semibold"
                        : "text-slate-400"
                    }`}
                  >
                    {step}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Results Summary if completed */}
          {isCompleted && resultData && (
            <div className={`p-4 rounded-xl border text-xs space-y-1.5 animate-in fade-in ${resultStatus === 'success' ? 'bg-emerald-50/80 border-emerald-200 text-emerald-900' : resultStatus === 'review' ? 'bg-amber-50 border-amber-300 text-amber-950' : 'bg-red-50 border-red-200 text-red-900'}`}>
              <div className={`font-bold flex items-center gap-1.5 ${resultStatus === 'success' ? 'text-emerald-800' : resultStatus === 'review' ? 'text-amber-900' : 'text-red-800'}`}>
                <span>{resultStatus === 'success' ? '✓' : resultStatus === 'review' ? '!' : '×'}</span> {resultStatus === 'success' ? 'Result Summary:' : resultStatus === 'review' ? 'Action needed:' : 'Submission failed:'}
              </div>
              <p className={`leading-relaxed ${resultStatus === 'success' ? 'text-emerald-700' : resultStatus === 'review' ? 'text-amber-800' : 'text-red-700'}`}>{resultData}</p>
            </div>
          )}

          {/* Action button */}
          {isCompleted && onClose && (
            <div className="pt-2">
              <button
                onClick={onClose}
                className="w-full py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-semibold shadow-md hover:shadow-lg transition-all"
              >
                Done & View Details
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
