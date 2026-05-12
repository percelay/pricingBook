'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { Check, ChevronDown, Search } from 'lucide-react';
import { Employee } from '@/lib/types';
import { employeeLabel } from '@/lib/employees';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';

type Props = {
  employees: Employee[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function EmployeeSelector({ employees, value, onChange, className }: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value);
  const [activeIndex, setActiveIndex] = useState(0);

  const sortedEmployees = useMemo(
    () => [...employees].sort((a, b) => a.name.localeCompare(b.name)),
    [employees]
  );

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    }

    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  const normalizedQuery = query.trim().toLowerCase();
  const matches = sortedEmployees.filter(employee => {
    if (!normalizedQuery) return true;
    return [
      employee.name,
      employee.group,
      employee.role ?? '',
      employeeLabel(employee),
    ].some(part => part.toLowerCase().includes(normalizedQuery));
  });

  const selectedEmployee = sortedEmployees.find(employee => {
    const label = employeeLabel(employee);
    return label === value || employee.name === value;
  });

  function choose(employee: Employee) {
    onChange(employeeLabel(employee));
    setQuery(employeeLabel(employee));
    setOpen(false);
    inputRef.current?.blur();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(index => Math.min(index + 1, Math.max(matches.length - 1, 0)));
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      setOpen(true);
      setActiveIndex(index => Math.max(index - 1, 0));
      return;
    }

    if (event.key === 'Enter' && open && matches[activeIndex]) {
      event.preventDefault();
      choose(matches[activeIndex]);
      return;
    }

    if (event.key === 'Escape') {
      setOpen(false);
      setQuery(value);
    }
  }

  function handleInput(value: string) {
    setQuery(value);
    setOpen(true);
    setActiveIndex(0);
  }

  return (
    <div ref={rootRef} className="relative min-w-0">
      <div className="relative">
        <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-gray-400" />
        <Input
          ref={inputRef}
          role="combobox"
          aria-expanded={open}
          aria-autocomplete="list"
          placeholder="Search employees..."
          value={open ? query : value}
          onFocus={() => {
            setQuery(value);
            setOpen(true);
          }}
          onChange={event => handleInput(event.target.value)}
          onKeyDown={handleKeyDown}
          className={cn('h-8 min-w-0 pl-7 pr-7 text-sm', className)}
        />
        <button
          type="button"
          aria-label="Show employees"
          onClick={() => {
            setOpen(next => !next);
            inputRef.current?.focus();
          }}
          className="absolute right-1 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center text-gray-400 hover:text-gray-700"
        >
          <ChevronDown className="h-3.5 w-3.5" />
        </button>
      </div>

      {open && (
        <div className="absolute z-50 mt-1 max-h-56 w-full min-w-60 overflow-y-auto border border-gray-200 bg-white p-1 text-sm shadow-lg">
          {matches.length === 0 ? (
            <div className="px-2 py-2 text-xs text-gray-400">No matching employees</div>
          ) : (
            matches.map((employee, index) => {
              const label = employeeLabel(employee);
              const selected = selectedEmployee?.id === employee.id;
              return (
                <button
                  key={employee.id}
                  type="button"
                  onMouseEnter={() => setActiveIndex(index)}
                  onMouseDown={event => event.preventDefault()}
                  onClick={() => choose(employee)}
                  className={cn(
                    'flex w-full items-center justify-between gap-3 px-2 py-1.5 text-left hover:bg-gray-100',
                    activeIndex === index && 'bg-gray-100'
                  )}
                >
                  <span className="min-w-0">
                    <span className="block truncate font-medium text-gray-800">{employee.name}</span>
                    <span className="block truncate text-[11px] text-gray-400">
                      [{employee.group}]{employee.role ? ` - ${employee.role}` : ''}
                    </span>
                  </span>
                  {selected ? <Check className="h-3.5 w-3.5 shrink-0 text-[#5fa07a]" /> : <span className="shrink-0 text-xs text-gray-400">{label.match(/\[[A-Z]+\]$/)?.[0]}</span>}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
