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
        <Download className="h-3.5 w-3.5" /> Export
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Export · Select Tabs</DialogTitle>
        </DialogHeader>
        <div className="flex flex-col">
          {OPTIONS.map((opt, idx) => {
            const checked = options[opt.key];
            const isLast = idx === OPTIONS.length - 1;
            return (
              <label
                key={opt.key}
                className={`flex items-start gap-4 border-l border-r border-t border-[#292929] p-4 cursor-pointer transition-colors hover:bg-[#292929] hover:text-[#ffffff] ${
                  isLast ? 'border-b' : ''
                }`}
              >
                <input
                  type="checkbox"
                  checked={checked}
                  onChange={() => toggle(opt.key)}
                  className="mt-1 h-4 w-4 cursor-pointer accent-[#292929]"
                />
                <div className="flex-1">
                  <div className="font-mono text-[12px] font-medium uppercase tracking-[0.2em]">
                    {opt.label}
                  </div>
                  <div className="mt-1 text-[12px] tracking-[-0.02em] opacity-70">
                    {opt.description}
                  </div>
                </div>
              </label>
            );
          })}
        </div>
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Cancel</DialogClose>
          <Button onClick={handleExport} disabled={noneSelected}>
            <Download className="h-3.5 w-3.5" />
            Export
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
