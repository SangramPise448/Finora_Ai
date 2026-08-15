import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Star, MessageSquare, X, RefreshCw, CheckCircle2, AlertCircle } from 'lucide-react';
import { apiClient } from '../utils/apiClient';

interface FeedbackModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

const RATING_LABELS: Record<number, string> = {
  1: 'Very Poor',
  2: 'Poor',
  3: 'Average',
  4: 'Good',
  5: 'Excellent',
};

export default function FeedbackModal({ isOpen, onClose, onSuccess }: FeedbackModalProps) {
  const [rating, setRating] = useState<number>(0);
  const [hoverRating, setHoverRating] = useState<number>(0);
  const [suggestion, setSuggestion] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  const [submitted, setSubmitted] = useState<boolean>(false);

  // Reset form when modal opens
  useEffect(() => {
    if (isOpen) {
      setRating(0);
      setHoverRating(0);
      setSuggestion('');
      setError('');
      setLoading(false);
      setSubmitted(false);
    }
  }, [isOpen]);

  // ESC Key listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    // Client-side validations
    if (!rating || rating < 1 || rating > 5) {
      setError('Please select a rating.');
      return;
    }

    const cleanText = suggestion.trim();
    if (!cleanText) {
      setError('Please enter your suggestion or feedback.');
      return;
    }

    if (cleanText.length > 1000) {
      setError('Suggestion cannot exceed 1000 characters.');
      return;
    }

    setLoading(true);
    try {
      const res = await apiClient.post('/finance/feedback', {
        rating,
        suggestion: cleanText,
      });

      if (res.data && (res.data.success || res.data.message)) {
        setSubmitted(true);
        if (onSuccess) onSuccess();
        setTimeout(() => {
          onClose();
        }, 2200);
      } else {
        setError(res.data?.message || 'Unable to submit feedback right now. Please try again.');
      }
    } catch (err: any) {
      console.error('Feedback submission error:', err);
      const detail = err.response?.data?.detail;
      if (typeof detail === 'string') {
        setError(detail);
      } else if (Array.isArray(detail) && detail[0]?.msg) {
        setError(detail[0].msg);
      } else if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else {
        setError('Unable to submit feedback right now. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  const activeRating = hoverRating || rating;

  return (
    <AnimatePresence>
      <div 
        className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/70 backdrop-blur-md overflow-y-auto"
        onClick={(e) => {
          if (e.target === e.currentTarget && !loading) {
            onClose();
          }
        }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 15 }}
          transition={{ duration: 0.2, ease: 'easeOut' }}
          className="w-full max-w-lg glass-card p-6 md:p-8 border border-[var(--border-default)] rounded-3xl bg-[var(--bg-secondary)] shadow-2xl relative space-y-6 text-[var(--text-secondary)] font-sans"
        >
          {/* Header */}
          <div className="flex items-start justify-between border-b border-[var(--border-subtle)] pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-2xl bg-[var(--primary-subtle)]/30 text-[var(--primary-light)] border border-[var(--primary)]/20 shadow-md">
                <MessageSquare className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-lg md:text-xl font-black text-[var(--text-primary)] tracking-tight font-display">
                  Share Your Feedback
                </h2>
                <p className="text-xs text-[var(--text-dim)] font-medium mt-0.5">
                  Help us improve your Finora AI experience.
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              disabled={loading}
              className="p-1.5 rounded-xl text-[var(--text-dim)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-glass)] transition-colors cursor-pointer disabled:opacity-50"
              title="Close modal (Esc)"
              aria-label="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {submitted ? (
            /* Success View */
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="py-10 flex flex-col items-center text-center space-y-3"
            >
              <div className="w-16 h-16 rounded-full bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shadow-xl mb-2">
                <CheckCircle2 className="w-10 h-10 animate-bounce" />
              </div>
              <h3 className="text-xl font-extrabold text-[var(--text-primary)] font-display">
                Thank you for your feedback!
              </h3>
              <p className="text-xs text-[var(--text-dim)] max-w-xs leading-relaxed">
                Your feedback helps us continuously improve and refine Finora AI.
              </p>
            </motion.div>
          ) : (
            /* Feedback Form */
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Validation Error Alert */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-300 font-semibold flex items-center gap-2.5 shadow-sm"
                >
                  <AlertCircle className="w-4 h-4 text-rose-400 flex-none" />
                  <span>{error}</span>
                </motion.div>
              )}

              {/* Rating Section */}
              <div className="space-y-2.5">
                <label className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                  How would you rate your experience? <span className="text-rose-400">*</span>
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      type="button"
                      onClick={() => {
                        setRating(star);
                        setError('');
                      }}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      className="p-1 rounded-xl focus:outline-none focus:ring-2 focus:ring-[var(--primary)] transition-transform hover:scale-110 cursor-pointer"
                      aria-label={`Rate ${star} out of 5 stars`}
                      title={`Rate ${star} out of 5 (${RATING_LABELS[star]})`}
                    >
                      <Star
                        className={`w-7 h-7 md:w-8 md:h-8 transition-colors ${
                          star <= activeRating
                            ? 'text-amber-400 fill-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]'
                            : 'text-[var(--text-dim)] hover:text-amber-300'
                        }`}
                      />
                    </button>
                  ))}

                  {activeRating > 0 && (
                    <span className="ml-3 text-xs font-bold text-amber-400 font-mono tracking-wide bg-amber-400/10 px-2.5 py-1 rounded-lg border border-amber-400/20">
                      {RATING_LABELS[activeRating]}
                    </span>
                  )}
                </div>
              </div>

              {/* Suggestion Textarea */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label htmlFor="feedback-suggestion" className="block text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    Your Suggestion <span className="text-rose-400">*</span>
                  </label>
                  <span className={`text-[10px] font-mono font-bold ${
                    suggestion.length > 900 ? 'text-amber-400' : 'text-[var(--text-dim)]'
                  }`}>
                    {suggestion.length} / 1000
                  </span>
                </div>
                <textarea
                  id="feedback-suggestion"
                  rows={4}
                  maxLength={1000}
                  value={suggestion}
                  onChange={(e) => {
                    setSuggestion(e.target.value);
                    if (error) setError('');
                  }}
                  placeholder="Tell us what you liked, what could be improved, or any feature you would like to see..."
                  className="w-full p-3.5 rounded-2xl bg-[var(--surface-subtle)] border border-[var(--border-subtle)] text-[var(--text-primary)] placeholder-[var(--text-dim)] text-xs focus:outline-none focus:border-[var(--primary)] focus:ring-1 focus:ring-[var(--primary)] transition-all resize-none font-sans leading-relaxed"
                />
              </div>

              {/* Form Actions */}
              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-glass)] text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)] transition-colors font-semibold cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-6 py-2.5 rounded-xl fintech-button-primary font-bold text-xs uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer shadow-lg disabled:opacity-50"
                >
                  {loading ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>Submit Feedback</>
                  )}
                </button>
              </div>
            </form>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
