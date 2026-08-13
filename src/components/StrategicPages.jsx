import React, { useState, useMemo, useEffect } from 'react';
import { money, pct, Badge, SimpleTimeline, CrudPanel, Tabs } from '../seed';

/* ================================================================ */
/* Strategic Alignment                                              */
/* ================================================================ */

export function ObjectivesPage({data, setData, onAdd, onUpdate, onDelete}){
  const [selected, setSelected] = useState(null);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [valueEdit, setValueEdit] = useState({ actual: '', target: '' });
  const projMap = Object.fromEntries(data.projects.map(p=>[p.id,p]));

  useEffect(()=>{
    if(!selected) return;
    const actual = selected.actualValue ?? selected.data?.actualValue ?? '';
    const target = selected.targetValue ?? selected.data?.targetValue ?? '';
    setValueEdit({ actual, target });
  }, [selected]);

  const STATUS_OPTIONS = [
    { value: 'ALL', label: 'All' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'ON_HOLD', label: 'On Hold' },
    { value: 'COMPLETED', label: 'Completed' },
    { value: 'CANCELLED', label: 'Cancelled' },
  ];

  const canonicalStatus = (statusRaw) => {
    const s = String(statusRaw || '').toUpperCase();
    if (!s || s === 'NULL' || s === 'UNSET') return 'DRAFT';
    if (s.includes('ON_HOLD') || s.includes('ON HOLD') || s.includes('HOLD')) return 'ON_HOLD';
    if (s.includes('COMPLET') || s.includes('ACHIEV')) return 'COMPLETED';
    if (s.includes('CANCEL')) return 'CANCELLED';
    if (s.includes('DRAFT') || s.includes('NOT STARTED') || s.includes('NOT')) return 'DRAFT';
    // Treat 'On Track', 'At Risk', 'In Progress', etc as ACTIVE
    return 'ACTIVE';
  };

  const friendlyStatus = (s) => {
    const code = canonicalStatus(s);
    const map = { ACTIVE: 'Active', ON_HOLD: 'On Hold', COMPLETED: 'Completed', CANCELLED: 'Cancelled', DRAFT: 'Draft' };
    return map[code] || code;
  };

  const displayedObjectives = useMemo(()=>{
    if(!data.objectives) return [];
    if(statusFilter==='ALL') return data.objectives;
    return data.objectives.filter(o => canonicalStatus(o.status) === statusFilter);
  }, [data.objectives, statusFilter]);
  const fields = [
    {key:'title', label:'Objective', full:true}, {key:'keyResults', label:'Key results', type:'textarea', full:true},
    {key:'owner', label:'Owner'}, 
    {key:'linkedInvestmentId', label:'Linked Project', type:'select', options:data.projects.map(p=>({ value: p.id, label: p.code }))},
    {key:'targetValue', label:'Target value', type:'number'}, {key:'actualValue', label:'Actual value', type:'number'},
    {key:'status', label:'Status', type:'select', options:[{value:'DRAFT',label:'Draft'},{value:'ACTIVE',label:'Active'},{value:'ON_HOLD',label:'On Hold'},{value:'COMPLETED',label:'Completed'},{value:'CANCELLED',label:'Cancelled'}]},
  ];
  // Pill-style clickable title similar to project codes
  function PillLink({children, onClick}){
    return (
      <button onClick={onClick} style={{
        display:'inline-flex', alignItems:'center', gap:8, padding:'6px 10px', borderRadius:8,
        border:'1px solid var(--indigo-300)', background:'#fff', color:'var(--indigo-700)', cursor:'pointer', fontWeight:700,
        boxShadow: '0 1px 0 rgba(0,0,0,0.03)', transition: 'background .12s, transform .08s'
      }} onMouseEnter={(e)=> e.currentTarget.style.background='rgba(59,130,246,0.06)'} onMouseLeave={(e)=> e.currentTarget.style.background='#fff'}>{children}</button>
    );
  }

  const statusToHealth = (statusRaw) => {
    const s = String(statusRaw || '').toUpperCase();
    if (s.includes('DRAFT') || s.includes('NOT')) return 'Not Started';
    if (s.includes('ON_HOLD') || s.includes('HOLD')) return 'At Risk';
    if (s.includes('COMPLETED') || s.includes('ACHIEVED')) return 'Achieved';
    if (s.includes('CANCEL')) return 'Not Started';
    // default for ACTIVE/AT_RISK/ON_TRACK
    return 'On Track';
  };

  const healthOptions = ['Not Started','On Track','At Risk','Achieved'];

  const columns = [
    {key:'code', label:'ID', strong:true, width:'120px', render: r => (
      <span className="link-chip" onClick={() => setSelected(r)} style={{ background: 'var(--indigo-50)', color: 'var(--indigo-700)', borderColor: 'var(--indigo-500)', fontWeight: 700 }}>
        ⇄ {r.code || r.id}
      </span>
    )},
    {key:'title', label:'Objective', render: r => r.title},

    {key:'linkedInvestmentId', label:'Investment', width:'160px', render:r=>projMap[r.linkedInvestmentId]?projMap[r.linkedInvestmentId].code:'—'},
    {key:'owner', label:'Owner', width:'140px'},
    {key:'progress', label:'Progress', width: '180px', render:r=>(<div style={{display:'flex', alignItems:'center', gap:8}}><div style={{width:160}}><div className="bar-track" style={{width:'100%'}}><div className="bar-fill" style={{width:pct(r.actualValue/(r.targetValue||1)*100), background:'var(--indigo-500)'}}></div></div></div><span style={{fontSize:11.5}}>{pct(r.actualValue/(r.targetValue||1)*100)}</span></div>)},
    {key:'status', label:'Status', width:'140px', render:r=><Badge value={friendlyStatus(r.status)} />},
    {key:'health', label:'Health', width:'160px', render: r => <Badge value={ (r.data && r.data.health) || r.health || statusToHealth(r.status) }/>},
  ];

  const performAction = async (id, action) => {
    try {
      const base = import.meta.env.VITE_API_URL || '/api';
      const resp = await fetch(`${base}/objectives/${id}/action`, {
        method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action })
      });
      if (!resp.ok) {
        const txt = await resp.text();
        throw new Error(txt || 'Unknown error');
      }
      const updated = await resp.json();
      onUpdate(updated);
      setSelected(updated);
    } catch (err) {
      console.error('Action failed', err);
      alert(err.message || 'Failed to perform action');
    }
  };

  // Save target/actual values from modal
  const saveValues = async () => {
    if(!selected) return;
    try{
      const base = import.meta.env.VITE_API_URL || '/api';
      const payload = { actualValue: Number(valueEdit.actual) || 0 };
      const resp = await fetch(`${base}/objectives/${selected.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
      if(!resp.ok){ const txt = await resp.text(); throw new Error(txt||'Failed to save'); }
      const updated = await resp.json();
      onUpdate(updated);
      setSelected(updated);
    }catch(err){ console.error('Failed to save values', err); alert(err.message||'Failed to save values'); }
  };

  // Inject responsive modal CSS so modal sizes to content on desktop and uses full width on small screens
  useEffect(()=>{
    const css = `
      /* Desktop: modal sized to content; keep within viewport to avoid right-side blank area */
      .modal.responsive { width:auto; max-width: calc(100vw - 120px); min-width:420px; height:auto; max-height:80vh; box-sizing:border-box; }
      .modal.responsive .modal-body { padding:14px; box-sizing:border-box; }
      /* Use flex layout so left column expands and right column is fixed */
      .modal.responsive .modal-grid { display:flex; gap:14px; align-items:flex-start; width:100%; box-sizing:border-box; }
      .modal.responsive .modal-grid > div:first-child { flex:1 1 auto; min-width:0; }
      .modal.responsive .modal-grid > div:last-child { flex:0 0 300px; max-width:300px; align-self:flex-start; }

      /* Ensure content fills the left column and avoids extra whitespace */
      .modal.responsive .modal-grid .left-col { width:100%; }

      /* Make body scrollable while keeping header/footer fixed */
      .modal.responsive .modal-body { overflow:auto; }

      @media (max-width: 1100px){
        .modal.responsive { width:92vw !important; max-width:92vw; min-width:unset; }
      }
      @media (max-width: 900px){
        .modal.responsive { width:96vw !important; height:auto !important; max-height:86vh; min-width:unset; }
        .modal.responsive .modal-grid { flex-direction:column; }
        .modal.responsive .modal-foot { padding:8px; }
        .modal.responsive .modal-grid > div:last-child { max-width:100%; flex:1 1 auto; }
      }
    `;
    const el = document.createElement('style'); el.setAttribute('data-p-modal','true'); el.appendChild(document.createTextNode(css)); document.head.appendChild(el);
    return ()=>{ document.head.removeChild(el); };
  }, []);

  // Helper: choose actions based on current status
  const actionsFor = (statusRaw) => {
    const s = String(statusRaw || '').toUpperCase();
    // explicit mapping based on canonical statuses
    if (s === 'DRAFT') return [ {key:'activate', label:'Activate', tone:'green'}, {key:'cancel', label:'Cancel', tone:'red'} ];
    if (s === 'ACTIVE') return [ {key:'hold', label:'Put On Hold', tone:'amber'}, {key:'complete', label:'Mark Completed', tone:'indigo'}, {key:'cancel', label:'Cancel', tone:'red'} ];
    if (s === 'ON_HOLD' || s === 'HOLD') return [ {key:'activate', label:'Resume', tone:'green'}, {key:'complete', label:'Mark Completed', tone:'indigo'}, {key:'cancel', label:'Cancel', tone:'red'} ];
    if (s === 'COMPLETED') return [ {key:'reopen', label:'Reopen', tone:'indigo'}, {key:'delete', label:'Archive/Delete', tone:'red'} ];
    if (s === 'CANCELLED') return [ {key:'reopen', label:'Reopen', tone:'indigo'}, {key:'delete', label:'Archive/Delete', tone:'red'} ];
    // fallback
    return [ {key:'activate', label:'Activate', tone:'green'}, {key:'hold', label:'Put On Hold', tone:'amber'}, {key:'complete', label:'Mark Completed', tone:'indigo'}, {key:'cancel', label:'Cancel', tone:'red'} ];
  };

  // Small action button with hover effect
  function ActionButton({onClick, label, tone}){
    const [hover, setHover] = React.useState(false);
    const colors = {
      green: ['#e9f7ef', '#d4f0dc', '#1f7a3a'],
      amber: ['#fff8e6', '#fff1cc', '#9a6500'],
      indigo: ['#f0f4ff', '#e3ecff', '#2b4bd6'],
      red: ['#fff2f2', '#ffdede', '#b21b1b']
    };
    const [bg, hoverBg, fg] = colors[tone] || colors.indigo;
    const style = {
      background: hover ? hoverBg : bg,
      border: '1px solid rgba(0,0,0,0.06)',
      color: fg,
      padding: '10px',
      borderRadius: 8,
      cursor: 'pointer',
      textAlign: 'center',
      fontWeight: 600
    };
    return (
      <button
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        onClick={onClick}
        style={style}
      >{label}</button>
    );
  }

  return (
    <>
      <CrudPanel title="Objectives (OKRs)" subtitle="Aligns strategic vision with operational execution — tracks progress, interim actuals, and targets" accent="indigo"
        rows={displayedObjectives} columns={columns} fields={fields} idPrefix="OBJ"
        extraHeader={<div style={{display:'flex', gap:8, alignItems:'center'}}><label style={{fontSize:12, color:'var(--slate-600)', marginRight:6}}>Status</label><select className="btn" value={statusFilter} onChange={e=>setStatusFilter(e.target.value)} style={{minWidth:140}}>{STATUS_OPTIONS.map(opt => <option key={opt.value} value={opt.value}>{opt.label}</option>)}</select></div>}
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
        onRowClick={(r)=> setSelected(r)}
      />

      {selected && (
        <div className="modal-overlay" onMouseDown={(e)=>{ if(e.target===e.currentTarget) setSelected(null); }}>
          <div className="modal responsive" style={{display:'flex', flexDirection:'column'}}>
            <div className="modal-head"><div className="modal-title">Objective: {selected.title}</div><button className="modal-close" onClick={()=>setSelected(null)}>×</button></div>
            <div className="modal-body" style={{flex:1, overflow:'auto'}}>
              <div className="modal-grid">
                <div className="left-col" style={{minWidth:0, display:'flex', flexDirection:'column', justifyContent:'space-between', height:'100%'}}>
                  <div>
                    <div style={{display:'flex', justifyContent:'space-between', alignItems:'flex-start'}}>
                      <div style={{minWidth:0}}>
                        <div style={{fontSize:12, color:'var(--slate-700)'}}>Owner</div>
                        <div style={{marginTop:6, fontWeight:700}}>{selected.owner || selected.ownerId || '—'}</div>
                      </div>
                      <div style={{textAlign:'right', color:'var(--slate-500)'}}>
                        <div style={{fontSize:12}}>{selected.linkedInvestmentId ? (projMap[selected.linkedInvestmentId]?.code || selected.linkedInvestmentId) : ''}</div>
                        <div style={{marginTop:8, fontSize:12}}><strong>ID:</strong> {selected.id}</div>
                      </div>
                    </div>

                    <div style={{marginTop:12}}>
                      <div style={{fontWeight:700}}>Description / Key Results</div>
                      <div style={{marginTop:8, whiteSpace:'pre-wrap', lineHeight:1.5, color:'var(--slate-800)'}}>{selected.keyResults || selected.description || selected.data?.keyResults || selected.data?.description || '—'}</div>
                    </div>
                  </div>

                  <div style={{marginTop:12, display:'flex', gap:20, alignItems:'flex-start'}}>
                    <div>
                      <div style={{fontWeight:700}}>Progress</div>
                      <div style={{marginTop:6, display:'flex', gap:8, alignItems:'center'}}>
                        <input type="number" value={valueEdit.actual} onChange={e=> setValueEdit(prev=>({...prev, actual: e.target.value}))} style={{width:120, padding:6, borderRadius:6, border:'1px solid var(--slate-200)'}} />
                        <span>/</span>
                        <input type="number" value={valueEdit.target} readOnly disabled style={{width:120, padding:6, borderRadius:6, border:'1px solid var(--slate-200)', background:'#f7f7f8'}} />
                        <button className="btn btn-sm" onClick={saveValues} style={{marginLeft:8}}>Save</button>
                      </div>
                    </div>
                    <div>
                      <div style={{fontWeight:700}}>Status</div>
                      <div style={{marginTop:6}}><Badge value={friendlyStatus(selected.status || selected.state || selected.data?.status)} /></div>
                    </div>
                    <div>
                      <div style={{fontWeight:700}}>Health</div>
                      <div style={{marginTop:6}}>
                        <select value={ (selected.data && selected.data.health) || selected.health || statusToHealth(selected.status) } onChange={async (e)=>{
                          const newH = e.target.value;
                          try{
                            const base = import.meta.env.VITE_API_URL || '/api';
                            const payload = { data: { ...(selected.data||{}), health: newH } };
                            const resp = await fetch(`${base}/objectives/${selected.id}`, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(payload) });
                            if(!resp.ok){ const txt = await resp.text(); throw new Error(txt||'Failed to save'); }
                            const updated = await resp.json();
                            onUpdate(updated);
                            setSelected(updated);
                          }catch(err){ console.error('Failed to update health', err); alert(err.message||'Failed to update health'); }
                        }} style={{padding:6, borderRadius:6}}>
                          {healthOptions.map(h=> <option key={h} value={h}>{h}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>

                </div>

                <div style={{display:'flex', flexDirection:'column', gap:10, alignItems:'stretch', justifyContent:'flex-start'}}>
                  {actionsFor(selected.status).map(a => (
                    <ActionButton key={a.key} label={a.label} tone={a.tone} onClick={async ()=>{
                      if(a.key === 'delete'){
                        if(window.confirm('Archive/Delete this objective?')){
                          try{ await onDelete(selected); setSelected(null); }catch(e){ console.error(e); alert('Delete failed'); }
                        }
                        return;
                      }
                      // other actions map to server action endpoint
                      await performAction(selected.id, a.key);
                    }} />
                  ))}

                </div>

              </div>
            </div>
            <div className="modal-foot" style={{display:'flex', justifyContent:'flex-end'}}><button className="btn" onClick={()=>setSelected(null)}>Close</button></div>
          </div>
        </div>
      )}
    </>
  );
}


export function HierarchiesPage({data, setData, onAdd, onUpdate, onDelete}){
  const nodes = useMemo(()=>[
    ...data.investments.map(i=>({id:i.id, name:i.name, type:'Investment', metric:i.totalBudget})),
    ...data.projects.map(p=>{ const spent = data.costPlan.filter(c=>c.projectId===p.id).reduce((s,c)=>s+c.actualAmount,0); return {id:p.id, name:p.code, type:'Project', metric:spent}; }),
  ], [data]);
  const nodeMap = Object.fromEntries(nodes.map(n=>[n.id,n]));
  const childrenOf = (pid)=> data.hierarchyLinks.filter(l=>l.parentId===pid).map(l=>l.childId);
  const allChildren = new Set(data.hierarchyLinks.map(l=>l.childId));
  const roots = nodes.filter(n=> !allChildren.has(n.id));

  const rollup = (id)=>{ const kids = childrenOf(id); const own = nodeMap[id]? nodeMap[id].metric : 0; return own + kids.reduce((s,c)=>s+rollup(c),0); };

  const renderNode = (id, depth)=>{
    const n = nodeMap[id]; if(!n) return null;
    const kids = childrenOf(id);
    return (
      <div key={id}>
        <div className="bar-row" style={{marginLeft: depth*24}}>
          <div className="bar-label" style={{width:220}} title={n.name}><Badge value={n.type}/> <span style={{marginLeft:6}}>{n.name}</span></div>
          <div className="bar-track"><div className="bar-fill" style={{width:'100%', background:'var(--indigo-500)', opacity:0.15+0.1*depth}}></div></div>
          <div className="bar-val">{money(rollup(id))}</div>
        </div>
        {kids.map(cid=> renderNode(cid, depth+1))}
      </div>
    );
  };

  const linkSelectOptions = nodes.map(n=>({ value: n.id, label: `${n.type}: ${n.name}` }));

  const linkFields = [
    {key:'parentId', label:'Parent', type:'select', options:linkSelectOptions, full:true},
    {key:'childId', label:'Child', type:'select', options:linkSelectOptions, full:true},
  ];
  const linkColumns = [
    {key:'parentId', label:'Parent', strong:true, render:r=>nodeMap[r.parentId]?nodeMap[r.parentId].name:r.parentId},
    {key:'childId', label:'Child', render:r=>nodeMap[r.childId]?nodeMap[r.childId].name:r.childId}, // FIXED
  ];

  return (
    <div>
      <div className="panel" style={{marginBottom:16}}>
        <div className="panel-head"><div><div className="panel-title">Investment hierarchy</div><div className="panel-sub">Rolled-up spend/budget metric shown per node — tree layout</div></div></div>
        <div className="panel-body">{roots.map(r=>renderNode(r.id,0))}</div>
      </div>
      <CrudPanel title="Hierarchy relationships" subtitle="Define parent-child links between investments and projects" accent="indigo"
        rows={data.hierarchyLinks} columns={linkColumns} fields={linkFields} idPrefix="HL"
        onAdd={onAdd}
        onUpdate={onUpdate}
        onDelete={onDelete}
      />
    </div>
  );
}

export function RoadmapsPage({data, setData, onAdd, onUpdate, onDelete}){
  const [tab, setTab] = useState('timeline');
  const projMap = Object.fromEntries(data.projects.map(p=>[p.id,p]));
  const fields = [
    {key:'title', label:'Roadmap item', full:true}, 
    {key:'investmentId', label:'Linked Project', type:'select', options:data.projects.map(p=>({ value: p.id, label: p.code })), full:true},
    {key:'startDate', label:'Start date', type:'date'}, {key:'endDate', label:'End date', type:'date'},
    {key:'status', label:'Status', type:'select', options:['Not Started','In Progress','Completed','Delayed']},
  ];
  const columns = [
    {key:'title', label:'Roadmap item', strong:true}, {key:'investmentId', label:'Investment', render:r=>projMap[r.investmentId]?projMap[r.investmentId].code:r.investmentId},
    {key:'startDate', label:'Start'}, {key:'endDate', label:'End'}, {key:'status', label:'Status', render:r=><Badge value={r.status}/>},
  ];
  const timelineItems = data.roadmapItems.map(r=>({id:r.id, label:r.title, start:r.startDate, end:r.endDate, badge:projMap[r.investmentId]?projMap[r.investmentId].code:''}));
  return (
    <div>
      <div style={{marginBottom:14}}><Tabs tabs={[{key:'timeline',label:'Timeline'},{key:'grid',label:'Grid'}]} active={tab} onChange={setTab}/></div>
      {tab==='timeline' && <div className="panel"><div className="panel-head"><div><div className="panel-title">Portfolio roadmap</div><div className="panel-sub">Top-down timeline view across investments</div></div></div><div className="panel-body"><SimpleTimeline items={timelineItems} colorFor={()=> 'var(--indigo-500)'}/></div></div>}
      {tab==='grid' && (
        <CrudPanel title="Roadmap items" subtitle="Portfolio planning items linked to projects, ideas, or custom investments" accent="indigo"
          rows={data.roadmapItems} columns={columns} fields={fields} idPrefix="RM"
          onAdd={onAdd}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      )}
    </div>
  );
}  