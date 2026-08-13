import React, { useState } from 'react';
import { money, pct, Badge, Toast, CrudPanel, FilterSelect } from '../seed';

/* ================================================================ */
/* Shared Insights & Reporting Dictionary                            */
/* ================================================================ */
const SOURCE_MAP = {
  'Cost Plans': {key:'costPlan', cols:['projectId','period','category','plannedAmount','actualAmount'], numeric:'actualAmount', groupBy:'category'},
  'Benefit Plans': {key:'benefitPlans', cols:['projectId','period','benefitType','plannedAmount','realizedAmount'], numeric:'realizedAmount', groupBy:'benefitType'},
  'Budgets': {key:'budgets', cols:['projectId','name','totalAmount','status'], numeric:'totalAmount', groupBy:'status'},
  'Resources': {key:'resources', cols:['name','role','allocatedProjectId','allocationPct'], numeric:'allocationPct', groupBy:'role'},
  'Risks & Opportunities': {key:'risks', cols:['title','kind','probability','impact','status'], numeric:null, groupBy:'status'},
  'Issues': {key:'issues', cols:['title','priority','status','owner'], numeric:null, groupBy:'priority'},
  'Objectives': {key:'objectives', cols:['title','owner','targetValue','actualValue','status'], numeric:'actualValue', groupBy:'status'},
  'Work Orders': {key:'fieldTasks', cols:['code','title','status','priority'], numeric:null, groupBy:'status'},
  'Custom Investments': {key:'investments', cols:['code','name','type','status','totalBudget'], numeric:'totalBudget', groupBy:'type'},
};

/* ================================================================ */
/* Standard Reports Page                                            */
/* ================================================================ */
export function StandardReportsPage({data, go}){
  const {projects, costPlan, resources, risks, issues, fieldTasks, objectives} = data;
  const projMap = Object.fromEntries(projects.map(p=>[p.id,p]));
  const byProject = {};
  
  costPlan.forEach(c=>{ 
    byProject[c.projectId] = byProject[c.projectId] || {planned:0, actual:0}; 
    byProject[c.projectId].planned += c.plannedAmount; 
    byProject[c.projectId].actual += c.actualAmount; 
  });
  
  const avgAlloc = Math.round(resources.reduce((s,r)=>s+(r.allocationPct||0),0)/(resources.length||1));
  const statusCounts = {}; 
  projects.forEach(p=>{ statusCounts[p.status]=(statusCounts[p.status]||0)+1; });
  
  const openRisks = risks.filter(r=>r.status==='Open').length;
  const openIssues = issues.filter(i=>i.status!=='Resolved').length;
  const avgOkr = Math.round(objectives.reduce((s,o)=>s+(o.actualValue/(o.targetValue||1)*100),0)/(objectives.length||1));
  
  return (
    <div className="card-grid">
      <div className="report-card"><div className="report-card-head"><div className="report-card-title">Financial summary</div><Badge value="Financials"/></div><div className="report-card-desc">Planned vs actual spend by project.</div>
        {Object.entries(byProject).map(([pid,v])=>(<div key={pid} className="bar-row"><div className="bar-label">{projMap[pid]?.code||pid}</div><div className="bar-track"><div className="bar-fill" style={{width:pct(v.actual/(v.planned||1)*100), background:'var(--teal-500)'}}></div></div><div className="bar-val">{money(v.actual)}</div></div>))}
      </div>
      <div className="report-card"><div className="report-card-head"><div className="report-card-title">Resource utilization</div><Badge value="Resources"/></div><div className="report-card-desc">Average allocation across the resource pool.</div><div className="metric-value" style={{fontSize:30}}>{avgAlloc}%</div><div className="metric-sub">across {resources.length} resources</div></div>
      <div className="report-card"><div className="report-card-head"><div className="report-card-title">Project status summary</div><Badge value="Projects"/></div><div className="report-card-desc">Count of projects by lifecycle status.</div>
        {Object.entries(statusCounts).map(([s,c])=>(<div key={s} className="bar-row"><div className="bar-label">{s}</div><div className="bar-track"><div className="bar-fill" style={{width:pct(c/projects.length*100), background:'var(--blue-500)'}}></div></div><div className="bar-val">{c}</div></div>))}
      </div>
      <div className="report-card"><div className="report-card-head"><div className="report-card-title">Risk & issue exposure</div><Badge value="Risk"/></div><div className="report-card-desc">Open items requiring attention.</div><div className="metric-value" style={{fontSize:30}}>{openRisks+openIssues}</div><div className="metric-sub">{openRisks} open risks, {openIssues} open issues</div></div>
      <div className="report-card"><div className="report-card-head"><div className="report-card-title">OKR attainment</div><Badge value="Objectives"/></div><div className="report-card-desc">Average progress toward strategic objectives.</div><div className="metric-value" style={{fontSize:30}}>{pct(avgOkr)}</div><div className="metric-sub">across {objectives.length} objectives</div></div>
      <div className="report-card"><div className="report-card-head"><div className="report-card-title">Field operations summary</div><Badge value="Field Service"/></div><div className="report-card-desc">Field task queue by status.</div>
        {['New','Scheduled','Dispatched','In Progress','Completed'].map(s=>{ const c = fieldTasks.filter(t=>t.status===s).length; return <div key={s} className="bar-row"><div className="bar-label">{s}</div><div className="bar-track"><div className="bar-fill" style={{width:pct(c/(fieldTasks.length||1)*100), background:'var(--amber-500)'}}></div></div><div className="bar-val">{c}</div></div>; })}
      </div>
    </div>
  );
}

/* ================================================================ */
/* Ad-hoc Reports Page                                              */
/* ================================================================ */
export function AdhocReportsPage({data, setData, onAdd, onUpdate, onDelete}){
  const [toast, setToast] = useState('');
  const run = (r)=>{ const src = SOURCE_MAP[r.dataSource]; const count = src? data[src.key].length : 0; setToast(`"${r.name}" executed — ${count} records in ${r.dataSource}`); };
  
  const fields = [
    {key:'name', label:'Report name', full:true}, {key:'dataSource', label:'Data source', type:'select', options:Object.keys(SOURCE_MAP)},
    {key:'filterSummary', label:'Filter summary'}, {key:'createdBy', label:'Created by'}, {key:'dateCreated', label:'Date created', type:'date'},
  ];
  const columns = [
    {key:'name', label:'Report', strong:true}, {key:'dataSource', label:'Data source', render:r=><Badge value={r.dataSource}/>},
    {key:'filterSummary', label:'Filter', render:r=><span className="mono cell-muted">{r.filterSummary}</span>}, {key:'createdBy', label:'Created by'},
    {key:'run', label:'', render:r=> <button className="btn btn-sm" onClick={()=>run(r)}>▶ Run</button>},
  ];
  return (
    <div>
      <CrudPanel title="Ad-hoc reports" subtitle="User-defined queries and custom views" accent="green"
        rows={data.adhocReports} columns={columns} fields={fields} idPrefix="ADH"
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
      <Toast msg={toast} onDone={()=>setToast('')}/>
    </div>
  );
}

/* ================================================================ */
/* Data Designer Page                                               */
/* ================================================================ */
export function DataDesignerPage({data, setData, onAdd, onUpdate, onDelete}){
  const fields = [
    {key:'name', label:'Data definition name', full:true}, {key:'dataSource', label:'Data source', type:'select', options:Object.keys(SOURCE_MAP)},
    {key:'fields', label:'Fields (comma separated)', full:true}, {key:'joinNote', label:'Join / notes', type:'textarea', full:true},
  ];
  const columns = [ {key:'name', label:'Definition', strong:true}, {key:'dataSource', label:'Source', render:r=><Badge value={r.dataSource}/>}, {key:'fields', label:'Fields'}, {key:'joinNote', label:'Notes'} ];
  return (
    <CrudPanel title="Data designer" subtitle="Define data sources, joins, and metrics for use in report layouts" accent="green"
      rows={data.dataDesignerDefs} columns={columns} fields={fields} idPrefix="DD"
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  );
}

/* ================================================================ */
/* UI Designer Page (Now mapped to definition name!)               */
/* ================================================================ */
export function UiDesignerPage({data, setData, onAdd, onUpdate, onDelete}){
  const [previewId, setPreviewId] = useState(data.uiDesignerDefs[0] && data.uiDesignerDefs[0].id);
  const ddMap = Object.fromEntries(data.dataDesignerDefs.map(d=>[d.id,d]));
  
  // Custom dropdown mapping to show definition NAMES inside our selector
  const ddSelectOptions = data.dataDesignerDefs.map(d => ({ value: d.id, label: d.name }));

  const fields = [
    {key:'name', label:'Layout name', full:true}, 
    {key:'dataDesignerId', label:'Data definition', type:'select', options:ddSelectOptions, full:true},
    {key:'chartType', label:'Visualization type', type:'select', options:['Bar','Table','Metric Card']}, 
    {key:'title', label:'Display title', full:true},
  ];
  const columns = [
    {key:'name', label:'Layout', strong:true}, {key:'dataDesignerId', label:'Data definition', render:r=>ddMap[r.dataDesignerId]?ddMap[r.dataDesignerId].name:r.dataDesignerId},
    {key:'chartType', label:'Type', render:r=><Badge value={r.chartType}/>}, {key:'preview', label:'', render:r=><button className="btn btn-sm" onClick={()=>setPreviewId(r.id)}>Preview</button>},
  ];
  const activeDef = data.uiDesignerDefs.find(u=>u.id===previewId); const dd = activeDef && ddMap[activeDef.dataDesignerId]; const src = dd && SOURCE_MAP[dd.dataSource]; const rows = src ? data[src.key] : [];
  return (
    <div>
      <CrudPanel title="UI designer" subtitle="Build report layouts, charts, and visualizations from a data definition" accent="green"
        rows={data.uiDesignerDefs} columns={columns} fields={fields} idPrefix="UI"
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
      {activeDef && src && (
        <div className="preview-box">
          <div className="preview-label">Live preview — {activeDef.title}</div>
          {activeDef.chartType==='Metric Card' && <div className="metric-card" style={{maxWidth:220}}><div className="metric-label">{dd.dataSource}</div><div className="metric-value">{rows.length}</div><div className="metric-sub">total records</div></div>}
          {activeDef.chartType==='Table' && (<table><thead><tr>{src.cols.map(c=> <th key={c}>{c}</th>)}</tr></thead><tbody>{rows.slice(0,5).map((r,i)=>(<tr key={i}>{src.cols.map(c=> <td key={c}>{typeof r[c]==='number'? r[c].toLocaleString(): String(r[c]??'—')}</td>)}</tr>))}</tbody></table>)}
          {activeDef.chartType==='Bar' && (()=>{ const groups={}; rows.forEach(r=>{ const g=r[src.groupBy]??'Other'; groups[g]=(groups[g]||0)+(src.numeric?(r[src.numeric]||0):1); }); const max=Math.max(1,...Object.values(groups)); return Object.entries(groups).map(([g,v])=>(<div key={g} className="bar-row"><div className="bar-label">{g}</div><div className="bar-track"><div className="bar-fill" style={{width:pct(v/max*100), background:'var(--green-500)'}}></div></div><div className="bar-val">{src.numeric?(Number.isInteger(v)?v.toLocaleString():v.toFixed(0)):v}</div></div>)); })()}
        </div>
      )}
    </div>
  );
}