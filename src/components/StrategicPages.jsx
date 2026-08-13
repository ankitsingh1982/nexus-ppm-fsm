import React, { useState, useMemo } from 'react';
import { money, pct, Badge, SimpleTimeline, CrudPanel, Tabs } from '../seed';

/* ================================================================ */
/* Strategic Alignment                                              */
/* ================================================================ */

export function ObjectivesPage({data, setData, onAdd, onUpdate, onDelete}){
  const projMap = Object.fromEntries(data.projects.map(p=>[p.id,p]));
  const fields = [
    {key:'title', label:'Objective', full:true}, {key:'keyResults', label:'Key results', type:'textarea', full:true},
    {key:'owner', label:'Owner'}, 
    {key:'linkedInvestmentId', label:'Linked Project', type:'select', options:data.projects.map(p=>({ value: p.id, label: p.code }))},
    {key:'targetValue', label:'Target value', type:'number'}, {key:'actualValue', label:'Actual value', type:'number'},
    {key:'status', label:'Status', type:'select', options:['Not Started','On Track','At Risk','Achieved']},
  ];
  const columns = [
    {key:'title', label:'Objective', strong:true}, {key:'linkedInvestmentId', label:'Investment', render:r=>projMap[r.linkedInvestmentId]?projMap[r.linkedInvestmentId].code:'—'},
    {key:'owner', label:'Owner'},
    {key:'progress', label:'Progress', render:r=>(<div style={{display:'flex', alignItems:'center', gap:6}}><div className="bar-track" style={{width:80}}><div className="bar-fill" style={{width:pct(r.actualValue/(r.targetValue||1)*100), background:'var(--indigo-500)'}}></div></div><span style={{fontSize:11.5}}>{pct(r.actualValue/(r.targetValue||1)*100)}</span></div>)},
    {key:'status', label:'Status', render:r=><Badge value={r.status}/>},
  ];
  return (
    <CrudPanel title="Objectives (OKRs)" subtitle="Aligns strategic vision with operational execution — tracks progress, interim actuals, and targets" accent="indigo"
      rows={data.objectives} columns={columns} fields={fields} idPrefix="OBJ"
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
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