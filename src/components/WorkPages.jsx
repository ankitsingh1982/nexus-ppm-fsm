import React, { useState, useMemo } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import { uid, money, Badge, Toast, CrudPanel, FilterSelect } from '../seed';

/* ================================================================ */
/* Work Management Pages & Components                              */
/* ================================================================ */

// 1. Projects Master List Gateway (Click Code to Deep-Dive!)
export function ProjectDetailsPage({data, setData, onAdd, onUpdate, onDelete, onViewProject}){
  const activeCount = data.projects.filter(p => p.status === 'Active').length;
  const criticalCount = data.projects.filter(p => p.health === 'Red').length;
  const totalCount = data.projects.length;

  const fields = [
    {key:'code', label:'Project code'}, {key:'name', label:'Project name', full:true}, {key:'manager', label:'Project manager'}, {key:'sponsor', label:'Sponsor'},
    {key:'status', label:'Status', type:'select', options:['Planning','Active','On Hold','Closed']}, {key:'health', label:'Health (RAG)', type:'select', options:['Green','Amber','Red']},
    {key:'startDate', label:'Start date', type:'date'}, {key:'endDate', label:'Target end date', type:'date'}, {key:'objectives', label:'Objectives', type:'textarea', full:true},
  ];
  
  const columns = [
    {key:'code', label:'Code', strong:true, render:r => (
      <span className="link-chip" onClick={() => onViewProject(r.id)} style={{ background: 'var(--blue-50)', color: 'var(--blue-700)', borderColor: 'var(--blue-500)', fontWeight: 600 }}>
        ⇄ {r.code}
      </span>
    )}, 
    {key:'name', label:'Project'}, {key:'manager', label:'Manager'},
    {key:'status', label:'Status', render:r=><Badge value={r.status}/>}, {key:'health', label:'Health', render:r=><Badge value={r.health}/>}, {key:'endDate', label:'Target end'},
  ];
  return (
    <div>
      {/* Welcome Banner */}
      <div style={{
        background: 'linear-gradient(135deg, #0b1220, #0f1b2d)', 
        borderRadius: '10px',
        padding: '20px 24px',
        color: '#fff',
        marginBottom: '20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexWrap: 'wrap',
        gap: '20px',
        boxShadow: '0 1px 3px rgba(15,27,45,0.06)'
      }}>
        <div>
          <h2 style={{margin: 0, fontSize: '18px', fontWeight: 600, color: '#fff'}}>Welcome back, Team</h2>
          <p style={{margin: '4px 0 0 0', fontSize: '12.5px', color: '#8fa0b8'}}>Nexus PPM Portfolio and Work Management summary.</p>
        </div>
        <div style={{display: 'flex', gap: '28px', flexWrap: 'wrap'}}>
          <div style={{borderLeft: '2px solid #0d9488', paddingLeft: '12px'}}>
            <div style={{fontSize: '10.5px', textTransform: 'uppercase', color: '#8fa0b8', fontWeight: 600, letterSpacing: '0.05em'}}>Active Projects</div>
            <div style={{fontSize: '20px', fontWeight: 700, marginTop: '2px'}}>{activeCount} <span style={{fontSize: '12px', fontWeight: 400, color: '#8fa0b8'}}>of {totalCount}</span></div>
          </div>
          <div style={{borderLeft: '2px solid #dc2626', paddingLeft: '12px'}}>
            <div style={{fontSize: '10.5px', textTransform: 'uppercase', color: '#8fa0b8', fontWeight: 600, letterSpacing: '0.05em'}}>Critical RAG</div>
            <div style={{fontSize: '20px', fontWeight: 700, marginTop: '2px', color: criticalCount > 0 ? '#dc2626' : '#fff'}}>{criticalCount}</div>
          </div>
        </div>
      </div>

      <CrudPanel title="Projects" subtitle="Full lifecycle management — templates, phases, tasks, milestones, and baselines" accent="blue"
        rows={data.projects} columns={columns} fields={fields} idPrefix="PRJ"
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </div>
  );
}

// 2. Project Properties 1:1 Nested Fields Editor (With Auto-Schema Initializer)
export function ProjectPropertiesPage({ project, onUpdate }) {
  // Automatically maps flat list-created projects into the nested details schema! [11]
  const initializedProject = useMemo(() => {
    const summary = project.summary || {
      name: project.name || '',
      code: project.code || '',
      startDate: project.startDate || '',
      endDate: project.endDate || '',
      manager: project.manager || '',
      coordinator: project.coordinator || '',
      sponsor: project.sponsor || '',
      readyForNextStage: false,
      objective: project.objectives || '',
      stage: project.stage || 'Type A(NEC 6 Stages)/Initiation',
      docRepoUrl: project.docRepoUrl || ''
    };
    const schedule = project.schedule || {
      pctComplete: project.pctComplete || 0,
      pctCompleteMethod: 'Manual',
      asOfDate: project.asOfDate || new Date().toISOString().slice(0, 10),
      statusIndicator: project.status || 'Green',
      schedulerFormat: 'Workbench',
      priority: project.priority || 0
    };
    const obs = project.obs || { department: '', region: '', unit: '' };
    const erp = project.erp || { sapProjectCode: '', syncedAt: '', costCenter: '' };
    const riskRating = project.riskRating || {
      overall: 'None', compliance: 'None', contractAndLegal: 'None', costsAndEstimates: 'None',
      customerAndUser: 'None', finance: 'None', newFactors: 'None', safety: 'None',
      security: 'None', serviceAndOpex: 'None', structureAndGovernance: 'None',
      scopeAndDeadline: 'None', technologyAndProducts: 'None'
    };

    return {
      ...project,
      summary,
      schedule,
      obs,
      erp,
      riskRating
    };
  }, [project]);

  const [form, setForm] = useState(initializedProject);
  const [toast, setToast] = useState('');

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
      <div className="panel" style={{ padding: '14px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px' }}>
        <div>
          <div className="panel-title">Project Details & Properties</div>
          <div className="panel-sub">Edit summary, ERP coordinates, OBS mapping, and comprehensive risk ratings.</div>
        </div>
        <button className="btn btn-primary" onClick={handleSave}>Save Project Properties</button>
      </div>

      <div className="grid grid-2" style={{ alignItems: 'start' }}>
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

        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* OBS & ERP */}
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

// 3. Baselines Register Page (Mapped to project codes and cloud-locked!) [11]
export function BaselinesPage({data, setData, projectFilter, setProjectFilter, onAdd, onUpdate, onDelete, lockProjectId}){
  const rows = data.baselines.filter(f=> projectFilter==='ALL' || f.projectId===projectFilter);
  const projMap = Object.fromEntries(data.projects.map(p=>[p.id,p]));
  const fields = [
    {key:'projectId', label:'Project', type:'select', options:data.projects.map(p=>({ value: p.id, label: p.code })), full:true},
    {key:'version', label:'Baseline version'}, {key:'date', label:'Baselined on', type:'date'},
    {key:'budget', label:'Baselined budget ($)', type:'number'}, {key:'endDate', label:'Baselined end date', type:'date'}, {key:'notes', label:'Notes', type:'textarea', full:true},
  ];
  const columns = [
    {key:'projectId', label:'Project', strong:true, render:r=>projMap[r.projectId]?projMap[r.projectId].code:r.projectId},
    {key:'version', label:'Version'}, {key:'date', label:'Date set'}, {key:'budget', label:'Budget', render:r=>money(r.budget)}, {key:'endDate', label:'Baselined end'},
  ];
  return (
    <CrudPanel title="Baselines" subtitle="Snapshots of schedule, budget, and scope for variance comparison" accent="blue"
      rows={rows} columns={columns} fields={fields} idPrefix="BL"
      lockProjectId={lockProjectId} // <-- FIXED: Passes lock to CrudPanel [11]
      extraHeader={<FilterSelect options={data.projects.map(p=>({id:p.id,label:`${p.code} — ${p.name}`}))} value={projectFilter} onChange={setProjectFilter} allLabel="All projects"/>}
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  );
}

// 4. Ideas Capture & Project Converter Page
export function IdeasPage({data, setData, onAdd, onUpdate, onDelete}){
  const [toast, setToast] = useState('');
  const fields = [
    {key:'title', label:'Idea title', full:true}, {key:'category', label:'Category'}, {key:'requestedBy', label:'Requested by'},
    {key:'status', label:'Status', type:'select', options:['New','Under Review','Approved','Rejected','Converted']},
    {key:'businessValue', label:'Business value', type:'select', options:['Low','Medium','High']}, {key:'description', label:'Description', type:'textarea', full:true},
  ];
  
  const convert = async (idea)=>{
    const projectId = uid('PRJ');
    const newProject = {
      id: projectId, 
      code: `NX-${Math.floor(2200 + Math.random() * 90)}`, 
      name: idea.title, 
      manager: idea.requestedBy, 
      sponsor: 'TBD', 
      status: 'Planning', 
      health: 'Green', 
      startDate: new Date().toISOString().slice(0,10), 
      endDate: '', 
      objectives: idea.description
    };
    
    try {
      await setDoc(doc(db, 'projects', projectId), newProject);
      await setDoc(doc(db, 'ideas', idea.id), { ...idea, status: 'Converted' }, { merge: true });
      setToast(`Converted to project ${newProject.code}`);
    } catch (e) {
      console.error("Error converting idea:", e);
    }
  };

  const columns = [
    {key:'title', label:'Idea', strong:true}, {key:'category', label:'Category'}, {key:'requestedBy', label:'Requested by'},
    {key:'businessValue', label:'Value', render:r=><Badge value={r.businessValue}/>}, {key:'status', label:'Status', render:r=><Badge value={r.status}/>},
    {key:'convert', label:'', render:r=> r.status!=='Converted' ? <button className="btn btn-sm" onClick={()=>convert(r)}>Convert →</button> : <span className="cell-muted">Converted</span>},
  ];
  return (
    <div>
      <CrudPanel title="Ideas" subtitle="Capture, evaluate, and convert ideas into projects" accent="blue"
        rows={data.ideas} columns={columns} fields={fields} idPrefix="IDE"
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
      <Toast msg={toast} onDone={()=>setToast('')}/>
    </div>
  );
}

// 5. Custom Investments Register Page
export function InvestmentsPage({data, setData, onAdd, onUpdate, onDelete}){
  const projMap = Object.fromEntries(data.projects.map(p=>[p.id,p]));
  const fields = [
    {key:'code', label:'Investment code'}, {key:'name', label:'Name', full:true},
    {key:'type', label:'Type', type:'select', options:['Program','Application','Asset','Digital Transformation','Market Expansion','Other']},
    {key:'sponsor', label:'Sponsor'}, {key:'status', label:'Status', type:'select', options:['Active','On Hold','Closed']},
    {key:'totalBudget', label:'Total budget ($)', type:'number'}, {key:'linkedProjectId', label:'Linked project', type:'select', options:data.projects.map(p=>({ value: p.id, label: p.code }))},
  ];
  const columns = [
    {key:'code', label:'Code', strong:true}, {key:'name', label:'Investment'}, {key:'type', label:'Type', render:r=><Badge value={r.type}/>},
    {key:'sponsor', label:'Sponsor'}, {key:'totalBudget', label:'Budget', render:r=>money(r.totalBudget)},
    {key:'linkedProjectId', label:'Linked project', render:r=> r.linkedProjectId && projMap[r.linkedProjectId] ? projMap[r.linkedProjectId].code : <span className="cell-muted">—</span>}, {key:'status', label:'Status', render:r=><Badge value={r.status}/>},
  ];
  return (
    <CrudPanel title="Custom investments" subtitle="Flexible investment types — digital transformation, market expansion, and more" accent="blue"
      rows={data.investments} columns={columns} fields={fields} idPrefix="INV"
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  );
}

// 6. Persistent Teams Register Page
export function TeamsPage({data, setData, onAdd, onUpdate, onDelete}){
  const fields = [
    {key:'name', label:'Team name', full:true}, {key:'description', label:'Description', type:'textarea', full:true},
    {key:'lead', label:'Team lead'}, {key:'members', label:'Members (comma separated)', full:true},
    {key:'fundingModel', label:'Funding model', type:'select', options:['Persistent','Project-based']},
  ];
  const columns = [
    {key:'name', label:'Team', strong:true}, {key:'lead', label:'Lead'}, {key:'members', label:'Members'}, {key:'fundingModel', label:'Funding', render:r=><Badge value={r.fundingModel}/>},
  ];
  return (
    <CrudPanel title="Teams" subtitle="Persistent funding for people-centric planning, aligned to products or value streams" accent="blue"
      rows={data.teams} columns={columns} fields={fields} idPrefix="TM"
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  );
}