import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import { uid, money, pct, Badge, Toast, CrudPanel, FilterSelect } from '../seed';

/* ================================================================ */
/* Financial Management (Cost, Benefit, Budget Pages)               */
/* ================================================================ */

export function CostPlansPage({data, setData, projectFilter, setProjectFilter, onAdd, onUpdate, onDelete, lockProjectId}){ // Accepts lockProjectId!
  const [toast, setToast] = useState('');
  const rows = data.costPlan.filter(f=> projectFilter==='ALL' || f.projectId===projectFilter);
  const projMap = Object.fromEntries(data.projects.map(p=>[p.id,p]));
  
  // Maps standard project select options to show user-friendly codes instead of IDs! [5]
  const projectSelectOptions = data.projects.map(p => ({ value: p.id, label: p.code }));

  const convertToBudget = async (projectId)=>{
    const lines = data.costPlan.filter(c=>c.projectId===projectId && c.planOfRecord==='Yes');
    if(lines.length===0){ setToast('No Plan of Record lines for this project'); return; }
    const total = lines.reduce((s,l)=>s+l.plannedAmount,0);
    const proj = projMap[projectId];
    const budgetId = uid('BUD');
    const budget = {id:budgetId, projectId, name:`${proj?.name || projectId} — Budget`, totalAmount:total, approvedBy:'', approvedDate:'', status:'Draft', sourceNote:`Converted from ${lines.length} Plan of Record cost plan line(s).`};
    try {
      await setDoc(doc(db, 'budgets', budgetId), budget);
      setToast(`Budget created — ${money(total)}`);
    } catch (e) {
      console.error("Error creating budget:", e);
    }
  };
  const fields = [
    {key:'projectId', label:'Project', type:'select', options:projectSelectOptions, full:true},
    {key:'period', label:'Period (e.g. 2026 Q1)'}, {key:'category', label:'Category', type:'select', options:['Capex','Opex','Labor','Vendor']},
    {key:'planOfRecord', label:'Plan of Record', type:'select', options:['Yes','No']},
    {key:'plannedAmount', label:'Planned amount ($)', type:'number'}, {key:'committedAmount', label:'Committed amount ($)', type:'number'}, {key:'actualAmount', label:'Actual amount ($)', type:'number'},
  ];
  const columns = [
    {key:'projectId', label:'Project', strong:true, render:r=>projMap[r.projectId]?projMap[r.projectId].code:r.projectId},
    {key:'period', label:'Period'}, {key:'category', label:'Category', render:r=><Badge value={r.category}/>},
    {key:'planOfRecord', label:'PoR', render:r=><Badge value={r.planOfRecord==='Yes'?'Yes':'No'}/>},
    {key:'plannedAmount', label:'Planned', render:r=>money(r.plannedAmount)}, {key:'actualAmount', label:'Actual', render:r=>money(r.actualAmount)},
    {key:'convert', label:'', render:r=> r.planOfRecord==='Yes' ? <button className="btn btn-sm" onClick={()=>convertToBudget(r.projectId)}>→ Budget</button> : null},
  ];
  const planned = rows.reduce((s,r)=>s+r.plannedAmount,0), committed = rows.reduce((s,r)=>s+r.committedAmount,0), actual = rows.reduce((s,r)=>s+r.actualAmount,0);
  return (
    <div>
      <div className="grid grid-3" style={{marginBottom:14}}>
        <div className="metric-card"><div className="metric-label">Planned</div><div className="metric-value">{money(planned)}</div></div>
        <div className="metric-card"><div className="metric-label">Committed</div><div className="metric-value">{money(committed)}</div></div>
        <div className="metric-card"><div className="metric-label">Actual</div><div className="metric-value">{money(actual)}</div><div className="metric-sub">{pct(actual/(planned||1)*100)} of plan consumed</div></div>
      </div>
      <CrudPanel title="Cost plans" subtitle="Time-phased planned costs — mark as Plan of Record and convert to a budget" accent="teal"
        rows={rows} columns={columns} fields={fields} idPrefix="CP"
        lockProjectId={lockProjectId} // <-- Locks the Project Code dropdown on load! [11]
        extraHeader={<FilterSelect options={data.projects.map(p=>({id:p.id,label:`${p.code} — ${p.name}`}))} value={projectFilter} onChange={setProjectFilter} allLabel="All projects"/>}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
      <Toast msg={toast} onDone={()=>setToast('')}/>
    </div>
  );
}

export function BenefitPlansPage({data, setData, projectFilter, setProjectFilter, onAdd, onUpdate, onDelete, lockProjectId}){ // Accepts lockProjectId!
  const rows = data.benefitPlans.filter(f=> projectFilter==='ALL' || f.projectId===projectFilter);
  const projMap = Object.fromEntries(data.projects.map(p=>[p.id,p]));
  const projectSelectOptions = data.projects.map(p => ({ value: p.id, label: p.code }));

  const fields = [
    {key:'projectId', label:'Project / investment', type:'select', options:projectSelectOptions, full:true}, {key:'period', label:'Period'},
    {key:'benefitType', label:'Benefit type', type:'select', options:['Revenue','Cost Savings','Productivity','Risk Reduction']},
    {key:'plannedAmount', label:'Planned amount ($)', type:'number'}, {key:'realizedAmount', label:'Realized amount ($)', type:'number'},
    {key:'status', label:'Status', type:'select', options:['Forecast','Committed','Realized']},
  ];
  const columns = [
    {key:'benefitType', label:'Benefit type', strong:true, render:r=><Badge value={r.benefitType}/>}, {key:'projectId', label:'Project', render:r=>projMap[r.projectId]?projMap[r.projectId].code:r.projectId},
    {key:'period', label:'Period'}, {key:'plannedAmount', label:'Planned', render:r=>money(r.plannedAmount)}, {key:'realizedAmount', label:'Realized', render:r=>money(r.realizedAmount)}, {key:'status', label:'Status', render:r=><Badge value={r.status}/>},
  ];
  const totalPlanned = rows.reduce((s,r)=>s+r.plannedAmount,0), totalRealized = rows.reduce((s,r)=>s+r.realizedAmount,0);
  return (
    <div>
      <div className="grid grid-3" style={{marginBottom:14}}>
        <div className="metric-card"><div className="metric-label">Planned benefit</div><div className="metric-value">{money(totalPlanned)}</div></div>
        <div className="metric-card"><div className="metric-label">Realized</div><div className="metric-value">{money(totalRealized)}</div><div className="metric-sub">{pct(totalRealized/(totalPlanned||1)*100)} realized</div></div>
      </div>
      <CrudPanel title="Benefit plans" subtitle="Planned and realized benefits tied to investments" accent="teal"
        rows={rows} columns={columns} fields={fields} idPrefix="BP"
        lockProjectId={lockProjectId} // <-- Locks the Project Code dropdown on load! [11]
        extraHeader={<FilterSelect options={data.projects.map(p=>({id:p.id,label:`${p.code} — ${p.name}`}))} value={projectFilter} onChange={setProjectFilter} allLabel="All projects"/>}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </div>
  );
}

export function BudgetsPage({data, setData, projectFilter, setProjectFilter, onAdd, onUpdate, onDelete, lockProjectId}){ // Accepts lockProjectId!
  const rows = data.budgets.filter(f=> projectFilter==='ALL' || f.projectId===projectFilter);
  const projMap = Object.fromEntries(data.projects.map(p=>[p.id,p]));
  const projectSelectOptions = data.projects.map(p => ({ value: p.id, label: p.code }));

  const fields = [
    {key:'projectId', label:'Project', type:'select', options:projectSelectOptions, full:true}, {key:'name', label:'Budget name', full:true},
    {key:'totalAmount', label:'Total amount ($)', type:'number'}, {key:'approvedBy', label:'Approved by'}, {key:'approvedDate', label:'Approved date', type:'date'},
    {key:'status', label:'Status', type:'select', options:['Draft','Approved','Active','Closed']}, {key:'sourceNote', label:'Source note', type:'textarea', full:true},
  ];
  const columns = [
    {key:'name', label:'Budget', strong:true}, {key:'projectId', label:'Project', render:r=>projMap[r.projectId]?projMap[r.projectId].code:r.projectId},
    {key:'totalAmount', label:'Total', render:r=>money(r.totalAmount)}, {key:'approvedBy', label:'Approved by'}, {key:'status', label:'Status', render:r=><Badge value={r.status}/>}, {key:'sourceNote', label:'Source'},
  ];
  return (
    <CrudPanel title="Budgets" subtitle="Approved funding, typically converted from a Plan of Record cost plan" accent="teal"
      rows={rows} columns={columns} fields={fields} idPrefix="BUD"
      lockProjectId={lockProjectId} // <-- Locks the Project Code dropdown on load! [11]
      extraHeader={<FilterSelect options={data.projects.map(p=>({id:p.id,label:`${p.code} — ${p.name}`}))} value={projectFilter} onChange={setProjectFilter} allLabel="All projects"/>}
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  );
}