import { Employee } from './types';

export function employeeLabel(employee: Employee): string {
  return `${employee.name} [${employee.group}]`;
}

export function employeeSelectValue(employees: Employee[], lineItemName: string): string {
  const selected = employees.find(employee => {
    return employeeLabel(employee) === lineItemName || employee.name === lineItemName;
  });
  return selected?.id ?? '';
}
