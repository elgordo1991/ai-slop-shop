import React, { useEffect, useRef, useState } from 'react';
import { X } from 'lucide-react';
import { FunctionsHttpError } from '@supabase/supabase-js';
import { supabase } from '../lib/supabase';

const MAX = 280;

interface SuggestModalProps {
  onClose: () => void;
}

export function SuggestModal({ onClose }: SuggestModalProps) {
  const [text, setText] = useState('');
  const [name, setName] = useState('');
  const [website, setWebsite] = useState(''); // honeypot, hidden from people
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const [error, setError] = useState<string | null>(null);
  const textRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    textRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const trimmed = text.trim();
  const canSend = trimmed.length >= 2 && trimmed.length <= MAX && status === 'idle';

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSend) return;
    setStatus('sending');
    setError(null);
    const { error } = await supabase.functions.invoke('suggest-slop', {
      body: { text: trimmed, name: name.trim(), website },
    });
    if (error) {
      let message = 'something went wrong, try again';
      if (error instanceof FunctionsHttpError) {
        const body = await error.context.json().catch(() => null);
        if (body?.error) message = body.error;
      }
      setError(message);
      setStatus('idle');
      return;
    }
    setStatus('sent');
  };

  return (
    <div
      className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="suggest-title"
        className="bg-stone-50 w-full max-w-md max-h-[calc(100dvh-2rem)] overflow-y-auto p-8 relative"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          aria-label="close"
          className="absolute top-4 right-4 text-gray-400 hover:text-black transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {status === 'sent' ? (
          <div className="text-center py-6">
            <h2 className="text-2xl font-light mb-3 lowercase">got it.</h2>
            <p className="text-sm text-gray-500 mb-8 lowercase">thanks — your slop is in the pile.</p>
            <button onClick={onClose} className="minimal-button lowercase mx-auto">
              back to the shop
            </button>
          </div>
        ) : (
          <form onSubmit={submit}>
            <p className="text-xs text-gray-400 uppercase tracking-widest mb-2">slop</p>
            <h2 id="suggest-title" className="text-2xl font-light mb-2 lowercase">suggest your slop</h2>
            <p className="text-sm text-gray-500 mb-6 lowercase">what should we print next?</p>

            <label className="block">
              <span className="sr-only">your idea</span>
              <textarea
                ref={textRef}
                value={text}
                onChange={(e) => setText(e.target.value.slice(0, MAX))}
                maxLength={MAX}
                rows={4}
                placeholder="slop but make it..."
                className="w-full border border-stone-300 bg-white p-3 text-sm focus:outline-none focus:border-black resize-none lowercase placeholder:text-stone-400"
              />
            </label>
            <div className="flex justify-end text-xs text-gray-400 mt-1 mb-4">
              {text.length}/{MAX}
            </div>

            <label className="block mb-6">
              <span className="text-xs text-gray-500 lowercase">name or @ (optional)</span>
              <input
                value={name}
                onChange={(e) => setName(e.target.value.slice(0, 60))}
                maxLength={60}
                className="mt-1 w-full border border-stone-300 bg-white p-2 text-sm focus:outline-none focus:border-black"
              />
            </label>

            {/* Honeypot: hidden from people, bots tend to fill it */}
            <input
              type="text"
              name="website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              tabIndex={-1}
              autoComplete="off"
              aria-hidden="true"
              className="absolute -left-[9999px] w-px h-px opacity-0"
            />

            {error && <p className="text-sm text-red-600 mb-4 lowercase">{error}</p>}

            <button
              type="submit"
              disabled={!canSend}
              className={`w-full py-3 text-sm font-medium transition-all lowercase ${
                canSend ? 'minimal-button-full' : 'bg-stone-200 text-stone-400 cursor-not-allowed'
              }`}
            >
              {status === 'sending' ? 'sending...' : 'send it'}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
