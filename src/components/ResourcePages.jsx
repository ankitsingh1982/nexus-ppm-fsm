import React, { useState } from 'react';
import { uid, money, pct, Badge, SimpleTimeline, CrudPanel, FilterSelect, Tabs } from '../seed';

/* ================================================================ */
/* Resource Management Pages                                        */
/* ================================================================ */

export function StaffingPage({data, setData, projectFilter, onAdd, onUpdate, onDelete, lockProjectId}){ // <-- FIXED: Accepts lockProjectId
  const [tab, setTab] = useState('grid');
  const projMap = Object.fromEntries(data.projects.map(p=>[p.id,p]));
  
  // Maps standard project select options to show user-friendly codes instead of IDs! [5]
  const projectSelectOptions = data.projects.map(p => ({ value: p.id, label: p.code }));

  const fields = [
    {key:'name', label:'Resource name', full:true}, 
    {key:'role', label:'Role', type: 'select', options: ['Project Manager', 'Resource Manager', 'Executive', 'Field Technician', 'Network Architect', 'UX Lead', 'Full-stack Engineer', 'Field Ops Manager', 'Financial Analyst']}, 
    {key:'skill', label:'Primary skill'},
    {key:'rate', label:'Hourly rate ($)', type:'number'}, 
    {key:'capacity', label:'Weekly capacity (hrs)', type:'number'},
    {key:'allocatedProjectId', label:'Allocated to project', type:'select', options:projectSelectOptions}, // <-- Mapped to Project Code! [5]
    {key:'allocationPct', label:'Allocation %', type:'number'},
  ];
  
  const columns = [
    {key:'name', label:'Name', strong:true}, {key:'role', label:'Role'},
    {key:'allocatedProjectId', label:'Project', render:r=> r.allocatedProjectId && projMap[r.allocatedProjectId] ? projMap[r.allocatedProjectId].code : <span className="cell-muted">Unassigned</span>},
    {key:'allocationPct', label:'Allocation', render:r=> r.allocatedProjectId? pct(r.allocationPct) : '—'}, {key:'rate', label:'Rate', render:r=>`${money(r.rate)}/hr`},
  ];
  
  const activeRows = data.resources.filter(r => !projectFilter || projectFilter === 'ALL' || r.allocatedProjectId === projectFilter);
  const timelineItems = activeRows.filter(r=>r.allocatedProjectId).map(r=>{ const proj = projMap[r.allocatedProjectId]; return {id:r.id, label:r.name, start:proj?.startDate, end:proj?.endDate, badge:`${r.allocationPct}%`}; });
  
  return (
    <div>
      <div style={{marginBottom:14}}><Tabs tabs={[{key:'grid',label:'Staff Grid'},{key:'timeline',label:'Allocations Timeline'}]} active={tab} onChange={setTab}/></div>
      {tab==='grid' && (
        <CrudPanel title="Staffing" subtitle="Centralized workspace for resource allocation and staffing analysis" accent="purple"
          rows={activeRows} columns={columns} fields={fields} idPrefix="RES"
          lockProjectId={lockProjectId} // <-- FIXED: Auto-locks the project on creation! [11]
          onAdd={onAdd}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      )}
      {tab==='timeline' && <div className="panel"><div className="panel-head"><div><div className="panel-title">Allocation timeline</div><div className="panel-sub">Resource commitments plotted against project duration</div></div></div><div className="panel-body"><SimpleTimeline items={timelineItems} colorFor={()=>'var(--purple-500)'}/></div></div>}
    </div>
  );
}

export function TimesheetsPage({data, setData, onAdd, onUpdate, onDelete}){
  const resMap = Object.fromEntries(data.resources.map(r=>[r.id,r])); const taskMap = Object.fromEntries(data.tasks.map(t=>[t.id,t]));
  
  const fields = [
    {key:'resourceId', label:'Resource', type:'select', options:data.resources.map(r=>({ value: r.id, label: r.name })), full:true},
    {key:'taskId', label:'Task / investment', type:'select', options:data.tasks.map(t=>({ value: t.id, label: t.name })), full:true},
    {key:'weekOf', label:'Week of', type:'date'}, {key:'hours', label:'Hours', type:'number'}, {key:'status', label:'Status', type:'select', options:['Draft','Submitted','Approved']},
  ];
  const columns = [
    {key:'resourceId', label:'Resource', strong:true, render:r=>resMap[r.resourceId]?resMap[r.resourceId].name:r.resourceId},
    {key:'taskId', label:'Task', render:r=>taskMap[r.taskId]?taskMap[r.taskId].name:r.taskId}, {key:'weekOf', label:'Week of'},
    {key:'hours', label:'Hours', render:r=>`${r.hours} hrs`}, {key:'status', label:'Status', render:r=><Badge value={r.status}/>},
  ];
  return (
    <CrudPanel title="Timesheets" subtitle="Track hours worked on tasks and investments, with team-level entry and approvals" accent="purple"
      rows={data.timesheets} columns={columns} fields={fields} idPrefix="TS"
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  );
}

export function WorkforcePlansPage({data}){
  const byRole = {};
  data.resources.forEach(r=>{ byRole[r.role] = byRole[r.role] || {count:0, alloc:0}; byRole[r.role].count++; byRole[r.role].alloc += r.allocationPct||0; });
  const totalHours = data.timesheets.reduce((s,t)=>s+t.hours,0);
  const avgAlloc = Math.round(data.resources.reduce((s,r)=>s+(r.allocationPct||0),0)/(data.resources.length||1));
  return (
    <div className="card-grid">
      <div className="report-card"><div className="report-card-head"><div className="report-card-title">Headcount by role</div><Badge value="Resources"/></div><div className="report-card-desc">Distribution of the resource pool by role.</div>
        {Object.entries(byRole).map(([role,v])=>(<div key={role} className="bar-row"><div className="bar-label">{role}</div><div className="bar-track"><div className="bar-fill" style={{width:pct(v.count/data.resources.length*100), background:'var(--purple-500)'}}></div></div><div className="bar-val">{v.count}</div></div>))}
      </div>
      <div className="report-card"><div className="report-card-head"><div className="report-card-title">Utilization</div><Badge value="Allocation"/></div><div className="report-card-desc">Average allocation across all resources.</div><div className="metric-value" style={{fontSize:30}}>{avgAlloc}%</div><div className="metric-sub">across {data.resources.length} resources</div></div>
      <div className="report-card"><div className="report-card-head"><div className="report-card-title">Hours logged</div><Badge value="Timesheets"/></div><div className="report-card-desc">Total recorded hours across all timesheets.</div><div className="metric-value" style={{fontSize:30}}>{totalHours}</div><div className="metric-sub">hours this period</div></div>
    </div>
  );
}