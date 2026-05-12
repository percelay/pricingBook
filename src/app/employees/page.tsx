'use client';

import { useMemo, useState } from 'react';
import { Edit2, Plus, Search, Trash2, Users } from 'lucide-react';
import { deleteEmployee, getEmployees, upsertEmployee } from '@/lib/store';
import { seedDemoData } from '@/lib/seed';
import { Employee, EmployeeGroup, ROLES, Role } from '@/lib/types';
import { employeeLabel } from '@/lib/employees';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const GROUPS: EmployeeGroup[] = ['CYB', 'TECH', 'BUS'];

type FormState = {
  name: string;
  group: EmployeeGroup;
  role: Role | '';
};

function emptyForm(): FormState {
  return { name: '', group: 'TECH', role: '' };
}

function loadEmployees() {
  seedDemoData();
  return getEmployees();
}

export default function EmployeesPage() {
  const [employees, setEmployees] = useState<Employee[]>(loadEmployees);
  const [search, setSearch] = useState('');
  const [groupFilter, setGroupFilter] = useState('all');
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Employee | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm());

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return employees
      .filter(employee => groupFilter === 'all' || employee.group === groupFilter)
      .filter(employee => {
        if (!q) return true;
        return employee.name.toLowerCase().includes(q) || employee.group.toLowerCase().includes(q) || employee.role?.toLowerCase().includes(q);
      })
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [employees, groupFilter, search]);

  function reload() {
    setEmployees(loadEmployees());
  }

  function openCreate() {
    setEditing(null);
    setForm(emptyForm());
    setOpen(true);
  }

  function openEdit(employee: Employee) {
    setEditing(employee);
    setForm({ name: employee.name, group: employee.group, role: employee.role ?? '' });
    setOpen(true);
  }

  function handleSave() {
    const name = form.name.trim();
    if (!name) return;
    const now = new Date().toISOString();
    upsertEmployee({
      id: editing?.id ?? crypto.randomUUID(),
      name,
      group: form.group,
      role: form.role || undefined,
      createdAt: editing?.createdAt ?? now,
      updatedAt: now,
    });
    reload();
    setOpen(false);
  }

  function handleDelete(employee: Employee) {
    if (!confirm(`Delete ${employee.name} from employees?`)) return;
    deleteEmployee(employee.id);
    reload();
  }

  return (
    <div className="w-full max-w-[1180px] px-4 py-4 sm:px-5 sm:py-6 lg:px-6 lg:py-7">
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Employees</h1>
          <p className="mt-1 text-sm text-gray-500">Company roster used by pricing book consultant dropdowns.</p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="mr-2 h-4 w-4" />
          New Employee
        </Button>
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <div className="relative min-w-64 flex-1 sm:max-w-sm">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <Input
            placeholder="Search employees..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={groupFilter} onValueChange={v => setGroupFilter(v ?? 'all')}>
          <SelectTrigger className="h-9 w-36">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Groups</SelectItem>
            {GROUPS.map(group => <SelectItem key={group} value={group}>[{group}]</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-sm font-semibold text-gray-700">
            <Users className="h-4 w-4 text-[#5fa07a]" />
            Roster
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filtered.length === 0 ? (
            <div className="border-2 border-dashed border-gray-200 py-12 text-center text-sm text-gray-400">
              No employees found
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {filtered.map(employee => (
                <div key={employee.id} className="grid grid-cols-1 gap-2 py-3 sm:grid-cols-[minmax(0,1fr)_120px_140px_72px] sm:items-center sm:gap-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-gray-900">{employee.name}</p>
                    <p className="mt-0.5 truncate text-xs text-gray-400">{employeeLabel(employee)}</p>
                  </div>
                  <Badge variant="secondary" className="w-fit">[{employee.group}]</Badge>
                  <span className="truncate text-sm text-gray-500">{employee.role ?? 'Unassigned'}</span>
                  <div className="flex justify-start gap-1 sm:justify-end">
                    <Button size="icon" variant="ghost" onClick={() => openEdit(employee)} className="h-8 w-8">
                      <Edit2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button size="icon" variant="ghost" onClick={() => handleDelete(employee)} className="h-8 w-8 text-gray-300 hover:bg-red-50 hover:text-red-500">
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit Employee' : 'New Employee'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label>Name</Label>
              <Input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))} placeholder="Employee name" />
            </div>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Group</Label>
                <Select value={form.group} onValueChange={v => v && setForm(f => ({ ...f, group: v as EmployeeGroup }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {GROUPS.map(group => <SelectItem key={group} value={group}>[{group}]</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label>Role</Label>
                <Select value={form.role || 'none'} onValueChange={v => setForm(f => ({ ...f, role: v === 'none' ? '' : v as Role }))}>
                  <SelectTrigger className="w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Unassigned</SelectItem>
                    {ROLES.map(role => <SelectItem key={role} value={role}>{role}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!form.name.trim()}>
              {editing ? 'Update' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
