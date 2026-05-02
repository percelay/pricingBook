'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogClose,
} from '@/components/ui/dialog';
import { ExportOptions } from '@/lib/export';

interface ExportDialogProps {
  initial: ExportOptions;
  onConfirm: (options: ExportOptions) => void;
}

const OPTIONS: Array<{ key: keyof ExportOptions; label: string; description: string }> = [
  { key: 'teamAndFee', label: 'Team & Fee', description: 'Pricing model with line items, totals, and handoff notes' },
  { key: 'phasedPricing', label: 'Phased Pricing', description: 'Phase and deliverable pricing rows' },
  { key: 'weeklyAllocation', label: 'Weekly Allocation', description: 'Days-per-week breakdown by consultant' },
];

export default function ExportDialog({ initial, onConfirm }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const [options, setOptions] = useState<ExportOptions>(initial);

  const noneSelected = !options.teamAndFee && !options.weeklyAllocation && !options.phasedPricing;

  function toggle(key: keyof ExportOptions) {
    setOptions(prev => ({ ...prev, [key]: !prev[key] }));
  }

  function handleOpenChange(next: boolean) {
    setOpen(next);
    if (next) setOptions(initial);
  }

  function handleExport() {
    onConfirm(options);
    setOpen(false);
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger render={<Button variant="outline" size="sm" />}>
        <Download className="h-4 w-4 mr-1.5" />Export
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Select tabs to export</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col gap-2">
          {OPTIONS.map(opt => {
            const checked = options[opt.key];
            return (
              <label
                key={opt.key}
                className="flex items-start gap-3 rounded-lg border border-gray-200 p-3 cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt.key)}
                  className="mt-0.5 h-4 w-4 rounded border-gray-300 accent-[#5fa07a]"
                />
                <div className="flex-1">
                  <div className="text-sm font-medium text-gray-900">{opt.label}</div>
                  <div className="text-xs text-gray-500 mt-0.5">{opt.description}</div>
                </div>
              </label>
            );
          })}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={handleExport} disabled={noneSelected}>
            <Download className="h-4 w-4 mr-1.5" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
