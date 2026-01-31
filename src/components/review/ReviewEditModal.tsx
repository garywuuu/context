'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input, Textarea, Label } from '@/components/ui/Input';
import type { ExtractedDecision } from '@/types/v1';

export interface ReviewEditModalProps {
  item: ExtractedDecision;
  onSave: (edits: {
    title?: string;
    rationale?: string;
    participants?: string[];
    alternatives?: { option: string; reason_rejected?: string }[];
  }) => void;
  onClose: () => void;
}

export default function ReviewEditModal({ item, onSave, onClose }: ReviewEditModalProps) {
  const [title, setTitle] = useState(item.title);
  const [rationale, setRationale] = useState(item.rationale || '');
  const [participantsStr, setParticipantsStr] = useState(item.participants.join(', '));
  const [alternatives, setAlternatives] = useState<
    { option: string; reason_rejected?: string }[]
  >(
    item.alternatives && item.alternatives.length > 0
      ? item.alternatives.map((a) => ({ ...a }))
      : []
  );
  const [saving, setSaving] = useState(false);

  const handleAddAlternative = () => {
    setAlternatives([...alternatives, { option: '', reason_rejected: '' }]);
  };

  const handleRemoveAlternative = (index: number) => {
    setAlternatives(alternatives.filter((_, i) => i !== index));
  };

  const handleAlternativeChange = (
    index: number,
    field: 'option' | 'reason_rejected',
    value: string
  ) => {
    const updated = [...alternatives];
    updated[index] = { ...updated[index], [field]: value };
    setAlternatives(updated);
  };

  const handleSave = () => {
    setSaving(true);
    const participants = participantsStr
      .split(',')
      .map((p) => p.trim())
      .filter((p) => p.length > 0);

    // Filter out empty alternatives
    const filteredAlternatives = alternatives.filter((a) => a.option.trim().length > 0);

    onSave({
      title: title.trim() || undefined,
      rationale: rationale.trim() || undefined,
      participants: participants.length > 0 ? participants : undefined,
      alternatives: filteredAlternatives.length > 0 ? filteredAlternatives : undefined,
    });
  };

  // Close on backdrop click
  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={handleBackdropClick}
    >
      <div className="bg-zinc-900 border border-zinc-800 rounded-lg w-full max-w-lg max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-zinc-800/60">
          <h2 className="text-sm font-semibold text-zinc-100">Edit Decision</h2>
          <button
            onClick={onClose}
            className="text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="p-4 space-y-4">
          {/* Title */}
          <div>
            <Label required>Title</Label>
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Decision title"
            />
          </div>

          {/* Rationale */}
          <div>
            <Label>Rationale</Label>
            <Textarea
              value={rationale}
              onChange={(e) => setRationale(e.target.value)}
              placeholder="Why was this decision made?"
              rows={3}
            />
          </div>

          {/* Participants */}
          <div>
            <Label>Participants (comma-separated)</Label>
            <Input
              value={participantsStr}
              onChange={(e) => setParticipantsStr(e.target.value)}
              placeholder="Alice, Bob, Charlie"
            />
          </div>

          {/* Alternatives */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <Label className="mb-0">Alternatives</Label>
              <button
                type="button"
                onClick={handleAddAlternative}
                className="text-[10px] text-cyan-500 hover:text-cyan-400 transition-colors"
              >
                + Add alternative
              </button>
            </div>
            {alternatives.length === 0 ? (
              <p className="text-[10px] text-zinc-600">No alternatives. Click above to add.</p>
            ) : (
              <div className="space-y-2">
                {alternatives.map((alt, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-2 p-2 border border-zinc-800/60 rounded-md bg-zinc-900/50"
                  >
                    <div className="flex-1 space-y-1.5">
                      <Input
                        value={alt.option}
                        onChange={(e) =>
                          handleAlternativeChange(idx, 'option', e.target.value)
                        }
                        placeholder="Option name"
                      />
                      <Input
                        value={alt.reason_rejected || ''}
                        onChange={(e) =>
                          handleAlternativeChange(idx, 'reason_rejected', e.target.value)
                        }
                        placeholder="Reason rejected (optional)"
                      />
                    </div>
                    <button
                      type="button"
                      onClick={() => handleRemoveAlternative(idx)}
                      className="text-zinc-600 hover:text-red-400 transition-colors mt-1.5"
                    >
                      <svg
                        className="w-3.5 h-3.5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={1.5}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 p-4 border-t border-zinc-800/60">
          <Button variant="ghost" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSave}
            loading={saving}
            disabled={!title.trim()}
          >
            Save & Confirm
          </Button>
        </div>
      </div>
    </div>
  );
}
