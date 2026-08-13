import React, { useState } from 'react';
import { uid, pct, Badge, SimpleTimeline, CrudPanel, FilterSelect, Tabs, RecordModal, Toast } from '../seed';

/* ================================================================ */
/* Execution & Control Pages                                         */
/* ================================================================ */

export function TasksModulePage({
  data, setData, projectFilter, setProjectFilter, 
  onAdd, onUpdate, onDelete, 
  onAddTodo, onUpdateTodo, onDeleteTodo,
  lockProjectId // Accepts lockProjectId!
}){
  const [tab, setTab] = useState('grid');
  const [boardModal, setBoardModal] = useState(null);
  const projMap = Object.fromEntries(data.projects.map(p=>[p.id,p]));
  const linkedFieldTaskFor = (taskId)=> data.fieldTasks.find(ft=>ft.linkedTaskId===taskId);
  const rows = data.tasks.filter(f=> projectFilter==='ALL' || f.projectId===projectFilter);

  const projectSelectOptions = data.projects.map(p => ({ value: p.id, label: p.code }));

  const taskFields = [
    {key:'projectId', label:'Project', type:'select', options:projectSelectOptions, full:true},
    {key:'name', label:'Task / milestone / phase name', full:true}, {key:'kind', label:'Type', type:'select', options:['Task','Milestone','Phase']},
    {key:'start', label:'Start date', type:'date'}, {key:'end', label:'End date', type:'date'}, {key:'pct', label:'% complete', type:'number'},
    {key:'owner', label:'Owner'}, {key:'status', label:'Status', type:'select', options:['Not Started','In Progress','Completed','Blocked']},
  ];
  const taskColumns = [
    {key:'name', label:'Task / milestone / phase', strong:true, render:r=><span>{r.kind==='Milestone'? '◆ ': r.kind==='Phase'? '▤ ':''}{r.name}</span>},
    {key:'projectId', label:'Project', render:r=>projMap[r.projectId]?projMap[r.projectId].code:r.projectId},
    {key:'start', label:'Start'}, {key:'end', label:'End'},
    {key:'pct', label:'Progress', render:r=>(<div style={{display:'flex', alignItems:'center', gap:6}}><div className="bar-track" style={{width:64}}><div className="bar-fill" style={{width:pct(r.pct), background:'var(--orange-500)'}}></div></div><span style={{fontSize:11.5}}>{pct(r.pct)}</span></div>)},
    {key:'status', label:'Status', render:r=><Badge value={r.status}/>},
    {key:'link', label:'Field link', render:r=>{ const ft=linkedFieldTaskFor(r.id); return ft? <span className="link-chip">⇄ {ft.code}</span> : <span className="link-chip none">Not linked</span>; }},
  ];

  const STATUSES = ['Not Started','In Progress','Blocked','Completed'];
  
  const saveBoardEdit = (form)=>{ 
    onUpdate({ ...boardModal, ...form }); 
    setBoardModal(null); 
  };

  const todoRows = data.todos.filter(f=> projectFilter==='ALL' || f.projectId===projectFilter);
  const taskMap = Object.fromEntries(data.tasks.map(t=>[t.id,t]));
  const todoFields = [
    {key:'projectId', label:'Project', type:'select', options:projectSelectOptions, full:true},
    {key:'taskId', label:'Parent task', type:'select', options:data.tasks.map(t=>t.id), full:true},
    {key:'text', label:'To-do item', full:true}, {key:'owner', label:'Owner'}, {key:'done', label:'Done', type:'select', options:['true','false']},
  ];
  const todoColumns = [
    {key:'done', label:'', width:36, render:r=> <span style={{fontSize:15}}>{(r.done===true||r.done==='true')? '☑':'☐'}</span>},
    {key:'text', label:'To-do', strong:true, render:r=> <span style={{textDecoration:(r.done===true||r.done==='true')?'line-through':'none', color:(r.done===true||r.done==='true')?'var(--slate-500)':'inherit'}}>{r.text}</span>},
    {key:'taskId', label:'Parent task', render:r=> taskMap[r.taskId]? taskMap[r.taskId].name : r.taskId}, {key:'owner', label:'Owner'},
  ];

  const timelineItems = rows.map(t=>({id:t.id, label:t.name, start:t.start, end:t.end, badge:t.kind}));

  return (
    <div>
      <div style={{marginBottom:14, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:10}}>
        <Tabs tabs={[{key:'grid',label:'Grid'},{key:'board',label:'Board'},{key:'timeline',label:'Timeline'},{key:'todos',label:'To-Dos'}]} active={tab} onChange={setTab}/>
        <FilterSelect options={data.projects.map(p=>({id:p.id,label:`${p.code} — ${p.name}`}))} value={projectFilter} onChange={setProjectFilter} allLabel="All projects"/>
      </div>

      {tab==='grid' && (
        <CrudPanel title="Tasks, milestones & phases" subtitle="Work breakdown structure with progress tracking" accent="orange"
          rows={rows} columns={taskColumns} fields={taskFields} idPrefix="TSK"
          lockProjectId={lockProjectId} // Auto-locks and pre-fills! [11]
          onAdd={onAdd}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      )}

      {tab==='board' && (
        <div className="panel"><div className="panel-head"><div><div className="panel-title">Execution board</div><div className="panel-sub">Click a card to edit status and progress</div></div></div>
          <div className="panel-body">
            <div className="board-cols">
              {STATUSES.map(s=>(
                <div className="board-col" key={s}>
                  <div className="board-col-head"><span>{s}</span><span>{rows.filter(r=>r.status===s).length}</span></div>
                  {rows.filter(r=>r.status===s).map(r=>(
                    <div className="board-card" key={r.id} onClick={()=>setBoardModal(r)}>
                      <div className="board-card-title">{r.kind==='Milestone'?'◆ ':r.kind==='Phase'?'▤ ':''}{r.name}</div>
                      <div className="board-card-meta"><span>{projMap[r.projectId]?.code}</span><span>{pct(r.pct)}</span></div>
                    </div>
                  ))}
                  {rows.filter(r=>r.status===s).length===0 && <div className="cell-muted" style={{fontSize:11.5, padding:'6px 2px'}}>No items</div>}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {tab==='timeline' && <div className="panel"><div className="panel-head"><div><div className="panel-title">Execution timeline</div><div className="panel-sub">Tasks, milestones, and phases plotted by date range</div></div></div><div className="panel-body"><SimpleTimeline items={timelineItems} colorFor={(i)=> i.badge==='Milestone'? 'var(--purple-500)' : i.badge==='Phase'? 'var(--indigo-500)' : 'var(--orange-500)'}/></div></div>}

      {tab==='todos' && (
        <CrudPanel title="To-dos" subtitle="Granular action items nested under project tasks" accent="orange"
          rows={todoRows} columns={todoColumns} fields={todoFields} idPrefix="TD"
          lockProjectId={lockProjectId} // Auto-locks and pre-fills! [11]
          onAdd={onAddTodo}
          onUpdate={onUpdateTodo}
          onDelete={onDeleteTodo}
        />
      )}

      {boardModal && <RecordModal title={`Edit — ${boardModal.name}`} fields={taskFields} initial={boardModal} onCancel={()=>setBoardModal(null)} onSave={saveBoardEdit}/>}
    </div>
  );
}

export function StatusModulePage({data, setData, projectFilter, setProjectFilter, onAdd, onUpdate, onDelete, lockProjectId}){
  const [toast, setToast] = useState('');
  const rows = data.statusReports.filter(f=> projectFilter==='ALL' || f.projectId===projectFilter);
  const projMap = Object.fromEntries(data.projects.map(p=>[p.id,p]));
  
  const projectSelectOptions = data.projects.map(p => ({ value: p.id, label: p.code }));

  const publish = (r)=>{ 
    onUpdate({ ...r, publishStatus:'Published' }); 
    setToast('Status report published'); 
  };

  const fields = [
    {key:'projectId', label:'Project', type:'select', options:projectSelectOptions, full:true},
    {key:'period', label:'Reporting period'}, {key:'rag', label:'Overall RAG', type:'select', options:['Green','Amber','Red']},
    {key:'submittedBy', label:'Submitted by'}, {key:'publishStatus', label:'Publish status', type:'select', options:['Draft','Published']},
    {key:'accomplishments', label:'Accomplishments this period', type:'textarea', full:true}, {key:'nextSteps', label:'Planned next steps', type:'textarea', full:true},
  ];
  const columns = [
    {key:'period', label:'Period', strong:true}, {key:'projectId', label:'Project', render:r=>projMap[r.projectId]?projMap[r.projectId].code:r.projectId},
    {key:'rag', label:'RAG', render:r=><Badge value={r.rag}/>}, {key:'publishStatus', label:'Publish', render:r=><Badge value={r.publishStatus}/>}, {key:'submittedBy', label:'Submitted by'},
    {key:'publish', label:'', render:r=> r.publishStatus!=='Published' ? <button className="btn btn-sm" onClick={()=>publish(r)}>Publish</button> : <span className="cell-muted">—</span>},
  ];
  return (
    <div>
      <CrudPanel title="Status reports" subtitle="Create and publish status reports for projects and investments" accent="orange"
        rows={rows} columns={columns} fields={fields} idPrefix="SR"
        lockProjectId={lockProjectId} // Auto-locks and pre-fills! [11]
        extraHeader={<FilterSelect options={data.projects.map(p=>({id:p.id,label:`${p.code} — ${p.name}`}))} value={projectFilter} onChange={setProjectFilter} allLabel="All projects"/>}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
      <Toast msg={toast} onDone={()=>setToast('')}/>
    </div>
  );
}

export function RicModulePage({
  data, setData, projectFilter, setProjectFilter,
  onAddRisk, onUpdateRisk, onDeleteRisk,
  onAddIssue, onUpdateIssue, onDeleteIssue,
  onAddChange, onUpdateChange, onDeleteChange,
  lockProjectId // Accepts lockProjectId!
}){
  const [tab, setTab] = useState('risks');
  const projMap = Object.fromEntries(data.projects.map(p=>[p.id,p]));
  const projectSelectOptions = data.projects.map(p => ({ value: p.id, label: p.code }));

  const riskRows = data.risks.filter(f=> projectFilter==='ALL' || f.projectId===projectFilter);
  const riskFields = [
    {key:'projectId', label:'Project', type:'select', options:projectSelectOptions, full:true}, {key:'kind', label:'Type', type:'select', options:['Risk','Opportunity']},
    {key:'title', label:'Description', full:true}, {key:'category', label:'Category'}, {key:'probability', label:'Probability', type:'select', options:['Low','Medium','High']},
    {key:'impact', label:'Impact', type:'select', options:['Low','Medium','High']}, {key:'owner', label:'Owner'}, {key:'status', label:'Status', type:'select', options:['Open','Mitigated','Closed']},
    {key:'response', label:'Response / plan', type:'textarea', full:true},
  ];
  const riskColumns = [
    {key:'kind', label:'Type', render:r=><Badge value={r.kind}/>}, {key:'title', label:'Description', strong:true},
    {key:'projectId', label:'Project', render:r=>projMap[r.projectId]?projMap[r.projectId].code:r.projectId},
    {key:'probability', label:'Probability', render:r=><Badge value={r.probability}/>}, {key:'impact', label:'Impact', render:r=><Badge value={r.impact}/>},
    {key:'owner', label:'Owner'}, {key:'status', label:'Status', render:r=><Badge value={r.status}/>},
  ];

  const issueRows = data.issues.filter(f=> projectFilter==='ALL' || f.projectId===projectFilter);
  const issueFields = [
    {key:'projectId', label:'Project', type:'select', options:projectSelectOptions, full:true}, {key:'title', label:'Issue description', full:true},
    {key:'priority', label:'Priority', type:'select', options:['Low','Medium','High','Critical']}, {key:'owner', label:'Owner'}, {key:'status', label:'Status', type:'select', options:['Open','In Progress','Resolved']},
    {key:'raised', label:'Date raised', type:'date'}, {key:'resolution', label:'Resolution notes', type:'textarea', full:true},
  ];
  const issueColumns = [
    {key:'title', label:'Issue', strong:true}, {key:'projectId', label:'Project', render:r=>projMap[r.projectId]?projMap[r.projectId].code:r.projectId},
    {key:'priority', label:'Priority', render:r=><Badge value={r.priority}/>}, {key:'owner', label:'Owner'}, {key:'status', label:'Status', render:r=><Badge value={r.status}/>}, {key:'raised', label:'Raised'},
  ];

  const changeRows = data.changes.filter(f=> projectFilter==='ALL' || f.projectId===projectFilter);
  const changeFields = [
    {key:'projectId', label:'Project', type:'select', options:projectSelectOptions, full:true}, {key:'title', label:'Change description', full:true},
    {key:'type', label:'Type', type:'select', options:['Scope','Schedule','Budget','Resource']}, {key:'impact', label:'Impact summary'},
    {key:'status', label:'Status', type:'select', options:['Submitted','Approved','Rejected','Implemented']}, {key:'requestedBy', label:'Requested by'},
  ];
  const changeColumns = [
    {key:'title', label:'Change request', strong:true}, {key:'projectId', label:'Project', render:r=>projMap[r.projectId]?projMap[r.projectId].code:r.projectId},
    {key:'type', label:'Type'}, {key:'impact', label:'Impact'}, {key:'status', label:'Status', render:r=><Badge value={r.status}/>}, {key:'requestedBy', label:'Requested by'},
  ];

  return (
    <div>
      <div style={{marginBottom:14, display:'flex', justifyContent:'space-between', flexWrap:'wrap', gap:10}}>
        <Tabs tabs={[{key:'risks',label:'Risks & Opportunities'},{key:'issues',label:'Issues'},{key:'changes',label:'Changes'}]} active={tab} onChange={setTab}/>
        <FilterSelect options={data.projects.map(p=>({id:p.id,label:`${p.code} — ${p.name}`}))} value={projectFilter} onChange={setProjectFilter} allLabel="All projects"/>
      </div>
      {tab==='risks' && <CrudPanel title="Risk register" subtitle="Risks with probability, impact, and mitigation — opportunities tracked alongside" accent="orange" rows={riskRows} columns={riskColumns} fields={riskFields} idPrefix="RSK"
        lockProjectId={lockProjectId} onAdd={onAddRisk} onUpdate={onUpdateRisk} onDelete={onDeleteRisk}/>}
      {tab==='issues' && <CrudPanel title="Issue log" subtitle="Logs of problems with owners, severity, and resolution status" accent="orange" rows={issueRows} columns={issueColumns} fields={issueFields} idPrefix="ISS"
        lockProjectId={lockProjectId} onAdd={onAddIssue} onUpdate={onUpdateIssue} onDelete={onDeleteIssue}/>}
      {tab==='changes' && <CrudPanel title="Change control" subtitle="Change requests, approvals, and governance workflow" accent="orange" rows={changeRows} columns={changeColumns} fields={changeFields} idPrefix="CHG"
        lockProjectId={lockProjectId} onAdd={onAddChange} onUpdate={onUpdateChange} onDelete={onDeleteChange}/>}
    </div>
  );
}

export function ChecklistsModulePage({data, setData, projectFilter, setProjectFilter, onAdd, onUpdate, onDelete, lockProjectId}){
  const rows = data.checklists.filter(f=> projectFilter==='ALL' || f.projectId===projectFilter);
  const taskMap = Object.fromEntries(data.tasks.map(t=>[t.id,t]));
  const projectSelectOptions = data.projects.map(p => ({ value: p.id, label: p.code }));

  const fields = [
    {key:'projectId', label:'Project', type:'select', options:projectSelectOptions, full:true},
    {key:'taskId', label:'Parent task', type:'select', options:data.tasks.map(t=>t.id), full:true},
    {key:'item', label:'Checklist item', full:true}, {key:'owner', label:'Owner'},
    {key:'fromTemplate', label:'Inherited from template', type:'select', options:['Yes','No']}, {key:'done', label:'Done', type:'select', options:['true','false']},
  ];
  const columns = [
    {key:'done', label:'', width:36, render:r=> <span style={{fontSize:15}}>{(r.done===true||r.done==='true')? '☑':'☐'}</span>},
    {key:'item', label:'Checklist item', strong:true, render:r=> <span style={{textDecoration:(r.done===true||r.done==='true')?'line-through':'none', color:(r.done===true||r.done==='true')?'var(--slate-500)':'inherit'}}>{r.item}</span>},
    {key:'taskId', label:'Parent task', render:r=> taskMap[r.taskId]? taskMap[r.taskId].name : r.taskId},
    {key:'owner', label:'Owner'}, {key:'fromTemplate', label:'Template', render:r=><Badge value={r.fromTemplate}/>},
  ];
  return (
    <CrudPanel title="Checklists" subtitle="Project checklists with to-dos, ownership transfer, and template inheritance" accent="orange"
      rows={rows} columns={columns} fields={fields} idPrefix="CHK"
      lockProjectId={lockProjectId} // Auto-locks and pre-fills! [11]
      extraHeader={<FilterSelect options={data.projects.map(p=>({id:p.id,label:`${p.code} — ${p.name}`}))} value={projectFilter} onChange={setProjectFilter} allLabel="All projects"/>}
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  );
}

export function AgreementsModulePage({data, setData, onAdd, onUpdate, onDelete, lockProjectId}){
  const combinedOptions = [
    ...data.projects.map(p=>({ value: p.id, label: `Project: ${p.code}` })), 
    ...data.ideas.map(i=>({ value: i.id, label: `Idea: ${i.title}` }))
  ];
  const nameFor = (id)=> {
    const matched = combinedOptions.find(o=>o.value===id);
    return matched ? matched.label : id;
  };
  const fields = [
    {key:'title', label:'Agreement title', full:true},
    {key:'fromId', label:'From investment / idea', type:'select', options:combinedOptions, full:true},
    {key:'toId', label:'To investment / idea', type:'select', options:combinedOptions, full:true},
    {key:'type', label:'Type', type:'select', options:['Dependency','Commitment','SLA']},
    {key:'status', label:'Status', type:'select', options:['Draft','Active','Fulfilled','Breached']},
    {key:'owner', label:'Owner'}, {key:'dueDate', label:'Due date', type:'date'}, {key:'description', label:'Description', type:'textarea', full:true},
  ];
  const columns = [
    {key:'title', label:'Agreement', strong:true}, {key:'fromId', label:'From', render:r=>nameFor(r.fromId)}, {key:'toId', label:'To', render:r=>nameFor(r.toId)},
    {key:'type', label:'Type', render:r=><Badge value={r.type}/>}, {key:'owner', label:'Owner'}, {key:'dueDate', label:'Due'}, {key:'status', label:'Status', render:r=><Badge value={r.status}/>},
  ];
  return (
    <CrudPanel title="Agreements" subtitle="Manage agreements between projects and ideas — dependencies and inter-investment commitments" accent="orange"
      rows={data.agreements} columns={columns} fields={fields} idPrefix="AGR"
      lockProjectId={lockProjectId} // Auto-locks and pre-fills! [11]
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  );
}