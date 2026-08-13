import React, { useState } from 'react';
import { Toast } from '../seed';

export function ProjectPropertiesPage({ project, onUpdate }) {
  // Clone current project into local form state
  const [form, setForm] = useState({ ...project });
  const [toast, setToast] = useState('');

  // Local helper update dispatches to maintain nested map structures
  const updateSummary = (key, val) => {
    setForm(prev => ({ ...prev, summary: { ...prev.summary, [key]: val } }));
  };

  const updateSchedule = (key, val) => {
    setForm(prev => ({ ...prev, schedule: { ...prev.schedule, [key]: val } }));
  };

  const updateObs = (key, val) => {
    setForm(prev => ({ ...prev, obs: { ...prev.obs, [key]: val } }));
  };

  const updateErp = (key, val) => {
    setForm(prev => ({ ...prev, erp: { ...prev.erp, [key]: val } }));
  };

  const updateRisk = (key, val) => {
    setForm(prev => ({ ...prev, riskRating: { ...prev.riskRating, [key]: val } }));
  };

  const handleSave = async () => {
    await onUpdate(form);
    setToast('Project properties successfully saved to Cloud!');
  };

  const RISK_CATEGORIES = [
    { key: 'compliance', label: 'Compliance Risk' },
    { key: 'contractAndLegal', label: 'Contract & Legal Issues' },
    { key: 'costsAndEstimates', label: 'Costs & Cost Estimates' },
    { key: 'customerAndUser', label: 'Customer & User Risk' },
    { key: 'finance', label: 'Finance Risk' },
    { key: 'newFactors', label: 'New Factors Risk' },
    { key: 'safety', label: 'Safety Risk' },
    { key: 'security', label: 'Security Risk' },
    { key: 'serviceAndOpex', label: 'Service, Operation & Maintenance' },
    { key: 'structureAndGovernance', label: 'Structure, Governance & Comm.' },
    { key: 'scopeAndDeadline', label: 'Scope, Scale & Deadline' },
    { key: 'technologyAndProducts', label: 'Technology, Products & Dev' }
  ];

  const RISK_LEVELS = ['None', 'Low', 'Medium', 'High'];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
      {/* Top action header panel */}
      <div className="panel" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div className="panel-title">Project Details & Properties</div>
          <div className="panel-sub">Edit summary, ERP coordinates, OBS mapping, and comprehensive risk ratings.</div>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>Save Project Properties</button>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
        {/* Left Column: Project Summary & Schedule */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Summary Panel */}
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Project Summary</div></div>
            <div className="panel-body grid grid-2">
              <div className="field"><label>Project Name</label><input value={form.summary?.name || ''} onChange={e => updateSummary('name', e.target.value)} /></div>
              <div className="field"><label>Project ID</label><input value={form.summary?.code || ''} disabled style={{ background: 'var(--slate-100)', cursor: 'not-allowed' }} /></div>
              <div className="field"><label>Start Date</label><input type="date" value={form.summary?.startDate || ''} onChange={e => updateSummary('startDate', e.target.value)} /></div>
              <div className="field"><label>Finish Date</label><input type="date" value={form.summary?.endDate || ''} onChange={e => updateSummary('endDate', e.target.value)} /></div>
              <div className="field"><label>Project Manager</label><input value={form.summary?.manager || ''} onChange={e => updateSummary('manager', e.target.value)} /></div>
              <div className="field"><label>Project Coordinator</label><input value={form.summary?.coordinator || ''} onChange={e => updateSummary('coordinator', e.target.value)} /></div>
              <div className="field field-full"><label>Objective</label><textarea value={form.summary?.objective || ''} onChange={e => updateSummary('objective', e.target.value)} /></div>
              <div className="field field-full"><label>Link to Document Repository (URL)</label><input value={form.summary?.docRepoUrl || ''} onChange={e => updateSummary('docRepoUrl', e.target.value)} /></div>
            </div>
          </div>

          {/* Schedule Panel */}
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Schedule & Status Indicators</div></div>
            <div className="panel-body grid grid-2">
              <div className="field"><label>% Complete</label><input type="number" value={form.schedule?.pctComplete || 0} onChange={e => updateSchedule('pctComplete', Number(e.target.value))} /></div>
              <div className="field"><label>% Complete Calculation Method</label><input value={form.schedule?.pctCompleteMethod || ''} onChange={e => updateSchedule('pctCompleteMethod', e.target.value)} /></div>
              <div className="field"><label>As Of (Date)</label><input type="date" value={form.schedule?.asOfDate || ''} onChange={e => updateSchedule('asOfDate', e.target.value)} /></div>
              <div className="field"><label>Status Indicator</label><select value={form.schedule?.statusIndicator || ''} onChange={e => updateSchedule('statusIndicator', e.target.value)}><option>Green</option><option>Amber</option><option>Red</option></select></div>
              <div className="field"><label>Scheduler Format</label><input value={form.schedule?.schedulerFormat || ''} onChange={e => updateSchedule('schedulerFormat', e.target.value)} /></div>
              <div className="field"><label>Priority (Numeric)</label><input type="number" value={form.schedule?.priority || 0} onChange={e => updateSchedule('priority', Number(e.target.value))} /></div>
            </div>
          </div>

        </div>

        {/* Right Column: OBS Alignment, ERP Alignment, Risk Ratings */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* OBS & ERP Panel */}
          <div className="panel">
            <div className="panel-head"><div className="panel-title">OBS & ERP Alignment</div></div>
            <div className="panel-body grid grid-2">
              <div className="field"><label>OBS Department</label><input value={form.obs?.department || ''} onChange={e => updateObs('department', e.target.value)} /></div>
              <div className="field"><label>OBS Region</label><input value={form.obs?.region || ''} onChange={e => updateObs('region', e.target.value)} /></div>
              <div className="field"><label>OBS Unit</label><input value={form.obs?.unit || ''} onChange={e => updateObs('unit', e.target.value)} /></div>
              <div className="field"><label>SAP Project Code</label><input value={form.erp?.sapProjectCode || ''} onChange={e => updateErp('sapProjectCode', e.target.value)} /></div>
              <div className="field field-full"><label>Cost Center</label><input value={form.erp?.costCenter || ''} onChange={e => updateErp('costCenter', e.target.value)} /></div>
            </div>
          </div>

          {/* Risk Ratings Panel */}
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Risk Rating Sub-Categories</div></div>
            <div className="panel-body grid grid-2">
              <div className="field field-full"><label style={{ color: 'var(--navy-950)', fontWeight: 700 }}>Overall Risk Rating</label><select value={form.riskRating?.overall || ''} onChange={e => updateRisk('overall', e.target.value)}>{RISK_LEVELS.map(l => <option key={l}>{l}</option>)}</select></div>
              
              {/* Maps out all 12 individual risk sub-dropdowns dynamically! */}
              {RISK_CATEGORIES.map(rc => (
                <div className="field" key={rc.key}>
                  <label>{rc.label}</label>
                  <select value={form.riskRating?.[rc.key] || 'None'} onChange={e => updateRisk(rc.key, e.target.value)}>
                    {RISK_LEVELS.map(l => <option key={l}>{l}</option>)}
                  </select>
                </div>
              ))}
            </div>
          </div>

        </div>
      </div>
      <Toast msg={toast} onDone={() => setToast('')} />
    </div>
  );
}