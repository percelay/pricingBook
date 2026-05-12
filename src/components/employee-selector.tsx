'use client';

import { Employee } from '@/lib/types';
import { employeeLabel, employeeSelectValue } from '@/lib/employees';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

type Props = {
  employees: Employee[];
  value: string;
  onChange: (value: string) => void;
  className?: string;
};

export default function EmployeeSelector({ employees, value, onChange, className }: Props) {
  const sortedEmployees = [...employees].sort((a, b) => a.name.localeCompare(b.name));
  const selectValue = employeeSelectValue(employees, value);

  function handleChange(employeeId: string) {
    const employee = sortedEmployees.find(e => e.id === employeeId);
    if (employee) onChange(employeeLabel(employee));
  }

  return (
    <Select value={selectValue} onValueChange={v => v && handleChange(v)}>
      <SelectTrigger className={className ?? 'h-8 min-w-0 w-full text-sm'}>
        <SelectValue placeholder="Select employee">
          {(id: string) => {
            const employee = employees.find(e => e.id === id);
            return employee ? employeeLabel(employee) : value || 'Select employee';
          }}
        </SelectValue>
      </SelectTrigger>
      <SelectContent className="min-w-56">
        {sortedEmployees.map(employee => (
          <SelectItem key={employee.id} value={employee.id}>
            {employeeLabel(employee)}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}
