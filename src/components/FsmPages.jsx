import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import { money, pct, Badge, CrudPanel, FilterSelect, Tabs, uid, Toast } from '../seed';

/* ================================================================ */
/* Field Service Management                                         */
/* ================================================================ */

export function WorkOrdersPage({data, setData, onAdd, onUpdate, onDelete}){
  const taskMap = Object.fromEntries(data.tasks.map(t=>[t.id,t]));
  const fields = [
    {key:'code', label:'Task code'}, {key:'title', label:'Task title', full:true},
    {key:'linkedTaskId', label:'Linked PM task (optional)', type:'select', options:data.tasks.map(t=>t.id), full:true},
    {key:'site', label:'Site / location'}, {key:'type', label:'Task type', type:'select', options:['Installation','Repair','Preventive Maintenance','Inspection','Decommission']},
    {key:'priority', label:'Priority', type:'select', options:['Low','Medium','High','Critical']}, {key:'status', label:'Status', type:'select', options:['New','Scheduled','Dispatched','In Progress','Completed','Closed']},
  ];
  const columns = [
    {key:'code', label:'Code', strong:true}, {key:'title', label:'Task'}, {key:'site', label:'Site'},
    {key:'priority', label:'Priority', render:r=><Badge value={r.priority}/>}, {key:'status', label:'Status', render:r=><Badge value={r.status}/>},
    {key:'link', label:'PM link', render:r=> r.linkedTaskId && taskMap[r.linkedTaskId] ? <span className="link-chip">⇄ {taskMap[r.linkedTaskId].name}</span> : <span className="link-chip none">Not linked</span>},
  ];
  return (
    <CrudPanel title="Work order management" subtitle="Create, assign, and track service jobs" accent="amber"
      rows={data.fieldTasks} columns={columns} fields={fields} idPrefix="FT"
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  );
}

export function SchedulingDispatchPage({
  data, setData, 
  onAdd, onUpdate, onDelete,
  onAddAlloc, onUpdateAlloc, onDeleteAlloc
}){
  const [tab, setTab] = useState('schedule');
  const ftMap = Object.fromEntries(data.fieldTasks.map(t=>[t.id,t])), techMap = Object.fromEntries(data.fieldResources.map(t=>[t.id,t]));
  const schFields = [
    {key:'fieldTaskId', label:'Field task', type:'select', options:data.fieldTasks.map(t=>t.id), full:true},
    {key:'technicianId', label:'Assigned resource', type:'select', options:data.fieldResources.map(t=>t.id)},
    {key:'date', label:'Scheduled date', type:'date'}, {key:'window', label:'Time window (e.g. 08:00–12:00)'}, {key:'status', label:'Status', type:'select', options:['Scheduled','Confirmed','Rescheduled']},
  ];
  const schColumns = [
    {key:'fieldTaskId', label:'Field task', strong:true, render:r=>ftMap[r.fieldTaskId]?ftMap[r.fieldTaskId].code:r.fieldTaskId},
    {key:'technicianId', label:'Resource', render:r=>techMap[r.technicianId]?techMap[r.technicianId].name:r.technicianId},
    {key:'date', label:'Date'}, {key:'window', label:'Window'}, {key:'status', label:'Status', render:r=><Badge value={r.status}/>},
  ];
  const allocFields = [
    {key:'fieldTaskId', label:'Field task', type:'select', options:data.fieldTasks.map(t=>t.id), full:true},
    {key:'technicianId', label:'Resource', type:'select', options:data.fieldResources.map(t=>t.id)}, {key:'hoursAllocated', label:'Hours allocated', type:'number'},
  ];
  const allocColumns = [
    {key:'fieldTaskId', label:'Field task', strong:true, render:r=>ftMap[r.fieldTaskId]?ftMap[r.fieldTaskId].code:r.fieldTaskId},
    {key:'technicianId', label:'Resource', render:r=>techMap[r.technicianId]?techMap[r.technicianId].name:r.technicianId}, {key:'hoursAllocated', label:'Hours', render:r=>`${r.hoursAllocated} hrs`},
  ];
  return (
    <div>
      <div style={{marginBottom:14}}><Tabs tabs={[{key:'schedule',label:'Schedule'},{key:'allocation',label:'Allocation'}]} active={tab} onChange={setTab}/></div>
      {tab==='schedule' && <CrudPanel title="Schedule & dispatch" subtitle="Calendar assignment of technicians and equipment to field tasks" accent="amber" rows={data.schedule} columns={schColumns} fields={schFields} idPrefix="SCH"
        onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete}/>}
      {tab==='allocation' && <CrudPanel title="Task allocation" subtitle="Effort and resource-hours committed against each field task" accent="amber" rows={data.allocations} columns={allocColumns} fields={allocFields} idPrefix="ALC"
        onAdd={onAddAlloc} onUpdate={onUpdateAlloc} onDelete={onDeleteAlloc}/>}
    </div>
  );
}

export function AssetInventoryPage({
  data, setData, 
  onAdd, onUpdate, onDelete,
  onAddBoq, onUpdateBoq, onDeleteBoq
}){
  const [tab, setTab] = useState('resources');
  const ftMap = Object.fromEntries(data.fieldTasks.map(t=>[t.id,t]));
  const resFields = [
    {key:'name', label:'Resource name', full:true}, {key:'type', label:'Type', type:'select', options:['Technician','Equipment','Vehicle']},
    {key:'skill', label:'Skill / capability'}, {key:'status', label:'Status', type:'select', options:['Available','Busy','Off Duty']}, {key:'homeBase', label:'Home base / depot'},
  ];
  const resColumns = [ {key:'name', label:'Resource', strong:true}, {key:'type', label:'Type'}, {key:'skill', label:'Skill'}, {key:'homeBase', label:'Depot'}, {key:'status', label:'Status', render:r=><Badge value={r.status}/>} ];
  const boqFields = [
    {key:'fieldTaskId', label:'Field task', type:'select', options:data.fieldTasks.map(t=>t.id), full:true}, {key:'item', label:'Item / material', full:true}, {key:'uom', label:'Unit of measure'},
    {key:'plannedQty', label:'Planned quantity', type:'number'}, {key:'usedQty', label:'Used quantity', type:'number'}, {key:'unitCost', label:'Unit cost ($)', type:'number'},
  ];
  const boqColumns = [
    {key:'item', label:'Item', strong:true}, {key:'fieldTaskId', label:'Field task', render:r=>ftMap[r.fieldTaskId]?ftMap[r.fieldTaskId].code:r.fieldTaskId}, {key:'plannedQty', label:'Planned', render:r=>`${r.plannedQty} ${r.uom}`},
    {key:'usedQty', label:'Used', render:r=>`${r.usedQty} ${r.uom}`}, {key:'cost', label:'Est. cost', render:r=>money(r.usedQty*r.unitCost)},
  ];
  return (
    <div>
      <div style={{marginBottom:14}}><Tabs tabs={[{key:'resources',label:'Resources & Assets'},{key:'materials',label:'Materials (BOQ)'}]} active={tab} onChange={setTab}/></div>
      {tab==='resources' && <CrudPanel title="Resources & assets" subtitle="Technicians, equipment, and vehicles available for dispatch" accent="amber" rows={data.fieldResources} columns={resColumns} fields={resFields} idPrefix="TEC"
        onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete}/>}
      {tab==='materials' && <CrudPanel title="Materials & bill of quantities" subtitle="Parts and materials planning and consumption per field task" accent="amber" rows={data.boq} columns={boqColumns} fields={boqFields} idPrefix="BOQ"
        onAdd={onAddBoq} onUpdate={onUpdateBoq} onDelete={onDeleteBoq}/>}
    </div>
  );
}

export function MobileFieldAccessPage({
  data, setData, 
  onAdd, onUpdate, onDelete,
  onAddReport, onUpdateReport, onDeleteReport,
  onAddDevice, onUpdateDevice, onDeleteDevice
}){
  const [tab, setTab] = useState('execution');
  const ftMap = Object.fromEntries(data.fieldTasks.map(t=>[t.id,t])); const techMap = Object.fromEntries(data.fieldResources.map(t=>[t.id,t]));
  const exeFields = [
    {key:'fieldTaskId', label:'Field task', type:'select', options:data.fieldTasks.map(t=>t.id), full:true}, {key:'status', label:'Execution status', type:'select', options:['Not Started','Started','Paused','Completed']},
    {key:'startedAt', label:'Started at (date/time)'}, {key:'completedAt', label:'Completed at (date/time)'}, {key:'notes', label:'Field notes', type:'textarea', full:true},
  ];
  const exeColumns = [
    {key:'fieldTaskId', label:'Field task', strong:true, render:r=>ftMap[r.fieldTaskId]?ftMap[r.fieldTaskId].code:r.fieldTaskId}, {key:'status', label:'Status', render:r=><Badge value={r.status}/>},
    {key:'startedAt', label:'Started'}, {key:'completedAt', label:'Completed'}, {key:'notes', label:'Notes'},
  ];
  const rptFields = [
    {key:'fieldTaskId', label:'Field task', type:'select', options:data.fieldTasks.map(t=>t.id), full:true}, {key:'submittedBy', label:'Submitted by'}, {key:'date', label:'Report date', type:'date'},
    {key:'summary', label:'Completion summary', type:'textarea', full:true}, {key:'signOff', label:'Customer sign-off obtained', type:'select', options:['Yes','No']},
  ];
  const rptColumns = [
    {key:'fieldTaskId', label:'Field task', strong:true, render:r=>ftMap[r.fieldTaskId]?ftMap[r.fieldTaskId].code:r.fieldTaskId}, {key:'submittedBy', label:'Submitted by'}, {key:'date', label:'Date'}, {key:'signOff', label:'Sign-off', render:r=><Badge value={r.signOff}/>},
  ];
  const devFields = [
    {key:'technicianId', label:'Assigned technician', type:'select', options:data.fieldResources.filter(r=>r.type==='Technician').map(t=>t.id), full:true}, {key:'model', label:'Device model', full:true},
    {key:'imei', label:'IMEI / serial'}, {key:'os', label:'OS version'}, {key:'status', label:'Status', type:'select', options:['Active','Inactive','Lost']}, {key:'lastSync', label:'Last sync (date/time)'},
  ];
  const devColumns = [
    {key:'model', label:'Device', strong:true}, {key:'technicianId', label:'Technician', render:r=>techMap[r.technicianId]?techMap[r.technicianId].name:r.technicianId},
    {key:'imei', label:'IMEI', render:r=><span className="mono cell-muted">{r.imei}</span>}, {key:'status', label:'Status', render:r=><Badge value={r.status}/>}, {key:'lastSync', label:'Last sync'},
  ];
  return (
    <div>
      <div style={{marginBottom:14}}><Tabs tabs={[{key:'execution',label:'Execution'},{key:'reports',label:'Task Reports'},{key:'devices',label:'Devices'}]} active={tab} onChange={setTab}/></div>
      {tab==='execution' && <CrudPanel title="Task execution & control" subtitle="Real-time status tracking of work in progress in the field" accent="amber" rows={data.execution} columns={exeColumns} fields={exeFields} idPrefix="EXE"
        onAdd={onAdd} onUpdate={onUpdate} onDelete={onDelete}/>}
      {tab==='reports' && <CrudPanel title="Task completion reports" subtitle="Field-submitted completion evidence — signatures and sign-off" accent="amber" rows={data.reports} columns={rptColumns} fields={rptFields} idPrefix="RPT"
        onAdd={onAddReport} onUpdate={onUpdateReport} onDelete={onDeleteReport}/>}
      {tab==='devices' && <CrudPanel title="Mobile devices" subtitle="Handheld and rugged devices issued to field crews" accent="amber" rows={data.devices} columns={devColumns} fields={devFields} idPrefix="DEV"
        onAdd={onAddDevice} onUpdate={onUpdateDevice} onDelete={onDeleteDevice}/>}
    </div>
  );
}

export function CustomerSlaPage({data, setData, onAdd, onUpdate, onDelete}){
  const ftMap = Object.fromEntries(data.fieldTasks.map(t=>[t.id,t]));
  const fields = [
    {key:'customer', label:'Customer', full:true}, {key:'fieldTaskId', label:'Field task', type:'select', options:data.fieldTasks.map(t=>t.id), full:true},
    {key:'slaTarget', label:'SLA target', full:true}, {key:'responseTimeHrs', label:'Actual response time (hrs)', type:'number'}, {key:'resolutionTimeHrs', label:'Actual resolution time (hrs)', type:'number'},
    {key:'status', label:'Status', type:'select', options:['Met','At Risk','Breached']},
  ];
  const columns = [
    {key:'customer', label:'Customer', strong:true}, {key:'fieldTaskId', label:'Field task', render:r=>ftMap[r.fieldTaskId]?ftMap[r.fieldTaskId].code:r.fieldTaskId},
    {key:'slaTarget', label:'SLA target'}, {key:'responseTimeHrs', label:'Response', render:r=>`${r.responseTimeHrs} hrs`}, {key:'resolutionTimeHrs', label:'Resolution', render:r=>`${r.resolutionTimeHrs} hrs`}, {key:'status', label:'Status', render:r=><Badge value={r.status}/>},
  ];
  return (
    <CrudPanel title="Customer & SLA management" subtitle="Monitor service level agreements and customer commitments" accent="amber"
      rows={data.slaRecords} columns={columns} fields={fields} idPrefix="SLA"
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  );
}

export function BillingCostPage({data, setData, onAdd, onUpdate, onDelete}){
  const ftMap = Object.fromEntries(data.fieldTasks.map(t=>[t.id,t]));
  const fields = [
    {key:'fieldTaskId', label:'Field task', type:'select', options:data.fieldTasks.map(t=>t.id), full:true},
    {key:'laborCost', label:'Labor cost ($)', type:'number'}, {key:'materialsCost', label:'Materials cost ($)', type:'number'},
    {key:'invoiceStatus', label:'Invoice status', type:'select', options:['Not Invoiced','Invoiced','Paid']}, {key:'invoiceNumber', label:'Invoice number'},
  ];
  const columns = [
    {key:'fieldTaskId', label:'Field task', strong:true, render:r=>ftMap[r.fieldTaskId]?ftMap[r.fieldTaskId].code:r.fieldTaskId},
    {key:'laborCost', label:'Labor', render:r=>money(r.laborCost)}, {key:'materialsCost', label:'Materials', render:r=>money(r.materialsCost)},
    {key:'total', label:'Total', render:r=>money(r.laborCost+r.materialsCost)}, {key:'invoiceStatus', label:'Invoice', render:r=><Badge value={r.invoiceStatus}/>}, {key:'invoiceNumber', label:'Invoice #'},
  ];
  const totalLabor = data.billingRecords.reduce((s,r)=>s+r.laborCost,0), totalMat = data.billingRecords.reduce((s,r)=>s+r.materialsCost,0);
  return (
    <div>
      <div className="grid grid-3" style={{marginBottom:14}}>
        <div className="metric-card"><div className="metric-label">Labor cost</div><div className="metric-value">{money(totalLabor)}</div></div>
        <div className="metric-card"><div className="metric-label">Materials cost</div><div className="metric-value">{money(totalMat)}</div></div>
        <div className="metric-card"><div className="metric-label">Total billable</div><div className="metric-value">{money(totalLabor+totalMat)}</div></div>
      </div>
      <CrudPanel title="Billing & cost tracking" subtitle="Link service work to financials and invoicing" accent="amber"
        rows={data.billingRecords} columns={columns} fields={fields} idPrefix="BILL"
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </div>
  );
}

export function FsmAnalyticsPage({data, setData}){
  const [tab, setTab] = useState('performance');
  const taskMap = Object.fromEntries(data.tasks.map(t=>[t.id,t])); const projMap = Object.fromEntries(data.projects.map(p=>[p.id,p]));
  const completionRate = Math.round(data.fieldTasks.filter(t=>t.status==='Completed').length/(data.fieldTasks.length||1)*100);
  const availableTechs = data.fieldResources.filter(r=>r.type==='Technician' && r.status==='Available').length;
  const totalTechs = data.fieldResources.filter(r=>r.type==='Technician').length;
  const slaMet = data.slaRecords.filter(s=>s.status==='Met').length;

  const [toast, setToast] = useState('');
  const exeMap = Object.fromEntries(data.execution.map(e=>[e.fieldTaskId,e]));
  const linked = data.fieldTasks.filter(ft=>ft.linkedTaskId && taskMap[ft.linkedTaskId]);
  const statusFromExecution = (exe, ft) => { if(!exe) return {status: ft.status==='Completed'?'Completed':'In Progress'}; if(exe.status==='Completed') return {status:'Completed', pct:100}; if(exe.status==='Started') return {status:'In Progress'}; if(exe.status==='Paused') return {status:'Blocked'}; return {status:'Not Started'}; };
  
  // Real-Time Cloud Interfacing Synchronization Handler
  const syncOne = async (ft)=>{
    const pmTask = taskMap[ft.linkedTaskId]; if(!pmTask) return;
    const exe = exeMap[ft.id]; const derived = statusFromExecution(exe, ft); const newPct = derived.pct!==undefined? derived.pct : (ft.status==='Completed'? 100 : pmTask.pct);
    
    try {
      // 1. Update PM Task inside Firestore database collection 'tasks'
      await setDoc(doc(db, 'tasks', pmTask.id), { ...pmTask, status: derived.status, pct: newPct }, { merge: true });
      
      // 2. Write new Sync Activity Log event inside Firestore database collection 'syncLog'
      const syncId = uid('SYN');
      await setDoc(doc(db, 'syncLog', syncId), {
        id: syncId,
        fieldTaskId: ft.id,
        linkedTaskId: pmTask.id,
        syncedAt: new Date().toLocaleString(),
        note: `Synced "${ft.title}" → ${derived.status} (${newPct}%)`
      });
      setToast(`Synced ${ft.code} to ${pmTask.name}`);
    } catch (e) {
      console.error("Cloud synchronization failed:", e);
    }
  };
  const syncAll = ()=> linked.forEach(syncOne);

  return (
    <div>
      <div style={{marginBottom:14}}><Tabs tabs={[{key:'performance',label:'Performance Dashboard'},{key:'pmsync',label:'PM Sync'}]} active={tab} onChange={setTab}/></div>
      {tab==='performance' && (
        <div className="card-grid">
          <div className="report-card"><div className="report-card-head"><div className="report-card-title">Task completion rate</div><Badge value="Performance"/></div><div className="metric-value" style={{fontSize:30}}>{completionRate}%</div><div className="metric-sub">of {data.fieldTasks.length} work orders completed</div></div>
          <div className="report-card"><div className="report-card-head"><div className="report-card-title">Technician availability</div><Badge value="Productivity"/></div><div className="metric-value" style={{fontSize:30}}>{availableTechs}/{totalTechs}</div><div className="metric-sub">technicians currently available</div></div>
          <div className="report-card"><div className="report-card-head"><div className="report-card-title">SLA attainment</div><Badge value="Customer"/></div><div className="metric-value" style={{fontSize:30}}>{slaMet}/{data.slaRecords.length}</div><div className="metric-sub">SLA commitments met</div></div>
        </div>
      )}
      {tab==='pmsync' && (
        <div>
          <div className="panel" style={{marginBottom:16}}>
            <div className="panel-head"><div><div className="panel-title">Interfacing data back to Project Management</div><div className="panel-sub">Push field execution status and progress into linked PPM tasks</div></div><button className="btn" style={{background:'var(--amber-500)', borderColor:'var(--amber-500)', color:'#fff'}} onClick={syncAll}>⇄ Sync all linked tasks</button></div>
            <div style={{overflowX:'auto'}}>
              <table>
                <thead><tr><th>Field task</th><th>Field status</th><th>Linked PM task</th><th>Project</th><th>PM status</th><th>PM progress</th><th style={{width:110}}>Action</th></tr></thead>
                <tbody>
                  {linked.length===0 && <tr className="empty-row"><td colSpan={7}>No field tasks are currently linked to a PM task.</td></tr>}
                  {linked.map(ft=>{ const pmTask = taskMap[ft.linkedTaskId]; const proj = projMap[pmTask.projectId]; return (
                    <tr key={ft.id}><td className="cell-strong">{ft.code} — {ft.title}</td><td><Badge value={ft.status}/></td><td>{pmTask.name}</td><td>{proj?proj.code:pmTask.projectId}</td><td><Badge value={pmTask.status}/></td>
                      <td><div style={{display:'flex', alignItems:'center', gap:6}}><div className="bar-track" style={{width:64}}><div className="bar-fill" style={{width:pct(pmTask.pct), background:'var(--orange-500)'}}></div></div><span style={{fontSize:11.5}}>{pct(pmTask.pct)}</span></div></td>
                      <td><button className="btn btn-sm" style={{background:'var(--amber-500)', borderColor:'var(--amber-500)', color:'#fff'}} onClick={()=>syncOne(ft)}>Sync now</button></td></tr>
                  ); })}
                </tbody>
              </table>
            </div>
          </div>
          <div className="panel">
            <div className="panel-head"><div><div className="panel-title">Sync activity log</div><div className="panel-sub">Most recent 25 synchronization events</div></div></div>
            <div style={{overflowX:'auto'}}><table><thead><tr><th>Timestamp</th><th>Event</th></tr></thead><tbody>{data.syncLog.length===0 && <tr className="empty-row"><td colSpan={2}>No sync events yet — run a sync above to populate this log.</td></tr>}{data.syncLog.map(l=> <tr key={l.id}><td className="cell-muted mono" style={{width:190}}>{l.syncedAt}</td><td>{l.note}</td></tr>)}</tbody></table></div>
          </div>
        </div>
      )}
      <Toast msg={toast} onDone={()=>setToast('')}/>
    </div>
  );
}
