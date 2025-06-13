import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';

const EmployeeManagement = ({ tenantId, projectId }) => {
  console.log('EmployeeManagement tenantId:', tenantId);
  const [employees, setEmployees] = useState([]);
  const [form, setForm] = useState({ name: '', standard_rate: '', ot_rate: '', dt_rate: '', mob_rate: '', scope: 'project' });
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (tenantId) fetchEmployees();
  }, [tenantId, projectId]);

  const fetchEmployees = async () => {
    setLoading(true);
    setError('');
    try {
      let query = supabase
        .from('employees')
        .select('*')
        .eq('tenant_id', tenantId)
        .order('name', { ascending: true });
      if (projectId) {
        query = query.or(`project_id.eq.${projectId},project_id.is.null`);
      }
      const { data, error } = await query;
      if (error) {
        console.log('Supabase fetch error:', error);
        throw error;
      }
      setEmployees(data);
    } catch (err) {
      setError('Failed to load employees');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const project_id = form.scope === 'tenant' ? null : projectId;
      if (editingId) {
        // Update
        const { error } = await supabase
          .from('employees')
          .update({
            name: form.name,
            standard_rate: parseFloat(form.standard_rate),
            ot_rate: parseFloat(form.ot_rate),
            dt_rate: parseFloat(form.dt_rate),
            mob_rate: parseFloat(form.mob_rate),
            project_id: project_id,
            updated_at: new Date().toISOString(),
          })
          .eq('id', editingId);
        if (error) {
          console.log('Supabase update error:', error);
          throw error;
        }
      } else {
        // Insert
        const { data, error } = await supabase
          .from('employees')
          .insert([
            {
              tenant_id: tenantId,
              name: form.name,
              standard_rate: parseFloat(form.standard_rate),
              ot_rate: parseFloat(form.ot_rate),
              dt_rate: parseFloat(form.dt_rate),
              mob_rate: parseFloat(form.mob_rate),
              project_id: project_id,
            },
          ]);
        console.log('Supabase insert result:', { data, error });
        if (error) {
          console.log('Supabase insert error:', error);
          throw error;
        }
      }
      setForm({ name: '', standard_rate: '', ot_rate: '', dt_rate: '', mob_rate: '', scope: 'project' });
      setEditingId(null);
      fetchEmployees();
    } catch (err) {
      setError('Failed to save employee');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (emp) => {
    setForm({
      name: emp.name,
      standard_rate: emp.standard_rate,
      ot_rate: emp.ot_rate,
      dt_rate: emp.dt_rate,
      mob_rate: emp.mob_rate,
      scope: emp.project_id ? 'project' : 'tenant',
    });
    setEditingId(emp.id);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this employee?')) return;
    setLoading(true);
    setError('');
    try {
      const { error } = await supabase
        .from('employees')
        .delete()
        .eq('id', id);
      if (error) throw error;
      fetchEmployees();
    } catch (err) {
      setError('Failed to delete employee');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-4 bg-white rounded shadow">
      <h2 className="text-xl font-bold mb-4">Employee Management</h2>
      <form onSubmit={handleSubmit} className="mb-4 flex flex-wrap gap-2 items-end">
        <input
          name="name"
          value={form.name}
          onChange={handleChange}
          placeholder="Employee Name"
          required
          className="border p-2 rounded"
        />
        <input
          name="standard_rate"
          value={form.standard_rate}
          onChange={handleChange}
          placeholder="Standard Rate"
          type="number"
          step="0.01"
          required
          className="border p-2 rounded"
        />
        <input
          name="ot_rate"
          value={form.ot_rate}
          onChange={handleChange}
          placeholder="OT Rate"
          type="number"
          step="0.01"
          required
          className="border p-2 rounded"
        />
        <input
          name="dt_rate"
          value={form.dt_rate}
          onChange={handleChange}
          placeholder="DT Rate"
          type="number"
          step="0.01"
          required
          className="border p-2 rounded"
        />
        <input
          name="mob_rate"
          value={form.mob_rate}
          onChange={handleChange}
          placeholder="MOB Rate ($)"
          type="number"
          step="0.01"
          className="border p-2 rounded"
        />
        <label>Scope</label>
        <select name="scope" value={form.scope || 'project'} onChange={e => setForm({ ...form, scope: e.target.value })}>
          <option value="project">Project Only</option>
          <option value="tenant">Tenant-Wide</option>
        </select>
        <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">
          {editingId ? 'Update' : 'Add'}
        </button>
        {editingId && (
          <button type="button" onClick={() => { setForm({ name: '', standard_rate: '', ot_rate: '', dt_rate: '', mob_rate: '', scope: 'project' }); setEditingId(null); }} className="ml-2 px-4 py-2 rounded bg-gray-300">Cancel</button>
        )}
      </form>
      {error && <div className="text-red-600 mb-2">{error}</div>}
      <table className="min-w-full border">
        <thead>
          <tr>
            <th className="border px-2 py-1">Name</th>
            <th className="border px-2 py-1">Standard Rate</th>
            <th className="border px-2 py-1">OT Rate</th>
            <th className="border px-2 py-1">DT Rate</th>
            <th className="border px-2 py-1">MOB Rate</th>
            <th className="border px-2 py-1">Actions</th>
          </tr>
        </thead>
        <tbody>
          {employees.length === 0 && !error ? (
            <tr><td colSpan={5} className="text-center py-4 text-gray-500">No employees found. Add one above.</td></tr>
          ) : employees.map(emp => (
            <tr key={emp.id}>
              <td className="border px-2 py-1">{emp.name}</td>
              <td className="border px-2 py-1">${emp.standard_rate}</td>
              <td className="border px-2 py-1">${emp.ot_rate}</td>
              <td className="border px-2 py-1">${emp.dt_rate}</td>
              <td className="border px-2 py-1">${emp.mob_rate}</td>
              <td className="border px-2 py-1">
                <button onClick={() => handleEdit(emp)} className="text-blue-600 mr-2">Edit</button>
                <button onClick={() => handleDelete(emp.id)} className="text-red-600">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {loading && <div className="mt-2">Loading...</div>}
    </div>
  );
};

export default EmployeeManagement; 