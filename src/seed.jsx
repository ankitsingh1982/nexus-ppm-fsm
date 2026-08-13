import React, { useState, useEffect, useMemo } from 'react';
import { api } from './api';

/* ================================================================ */
/* Utilities & Helper Constants                                     */
/* ================================================================ */
// Upgraded to a stateless, random generator to prevent database collisions on refresh [11]
export const uid = (prefix) => {
  const randomSuffix = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${randomSuffix}`;
};
export const money = (n) => `$${Number(n||0).toLocaleString(undefined,{maximumFractionDigits:0})}`;
export const pct = (n) => `${Math.round(n||0)}%`;
export const daysBetween = (a,b) => Math.max(1, Math.round((new Date(b) - new Date(a)) / 86400000));

export const ACCENT = { 
  teal:'var(--teal-500)', 
  blue:'var(--blue-500)', 
  purple:'var(--purple-500)', 
  green:'var(--green-500)', 
  amber:'var(--amber-500)', 
  indigo:'var(--indigo-500)', 
  orange:'var(--orange-500)', 
  slate:'var(--slate-600)' 
};

export const TONE_MAP = {
  'Active':'green','Approved':'green','Resolved':'green','Completed':'green','Achieved':'green','On Track':'green',
  'Available':'green','Confirmed':'green','Implemented':'green','Green':'green','Low':'green','Yes':'green','Realized':'green','Delivered':'green','Installed':'green','Expert':'green','Met':'green','Paid':'green','Published':'green',
  'On Hold':'amber','In Progress':'amber','Scheduled':'amber','Mitigated':'amber','Busy':'amber','At Risk':'amber',
  'Amber':'amber','Medium':'amber','Submitted':'amber','Dispatched':'amber','Started':'amber','Paused':'amber','Under Review':'amber','Ordered':'amber','Committed':'amber','Intermediate':'amber','Forecast':'amber','Invoiced':'amber','Draft':'amber',
  'Critical':'red','High':'red','Red':'red','Open':'red','Rejected':'red','Off Duty':'red','Lost':'red','Blocked':'red','No':'red','Breached':'red',
  'Planning':'blue','New':'blue','Not Started':'blue','Inactive':'gray','Planned':'blue','Beginner':'blue','Not Invoiced':'blue',
  'Opportunity':'purple','Converted':'purple','Program':'purple',
  'Dependency':'indigo','Commitment':'indigo','SLA':'indigo',
  'Phase':'orange','Milestone':'orange',
};

export function toneFor(v){ return TONE_MAP[v] || 'gray'; }

/* ================================================================ */
/* Shared Micro-Components                                          */
/* ================================================================ */
export function Badge({value}){
  if(value===undefined||value===null||value==='') return <span className="cell-muted">—</span>;
  const t = toneFor(value);
  return <span className={`badge b-${t}`}><span className="badge-dot"></span>{value}</span>;
}

export function Toast({msg,onDone}){
  useEffect(()=>{ if(!msg) return; const t=setTimeout(onDone,2200); return ()=>clearTimeout(t); },[msg]);
  if(!msg) return null;
  return <div className="toast"><span>✓</span><span>{msg}</span></div>;
}

export function Switch({on, onToggle}){
  return <div className={`switch ${on?'on':''}`} onClick={onToggle}><div className="switch-knob"></div></div>;
}

export function SimpleTimeline({items, colorFor}){
  // Safe-guard: Filter out any items with missing or invalid start/end dates
  const validItems = items.filter(i => i.start && i.end && !isNaN(new Date(i.start).getTime()) && !isNaN(new Date(i.end).getTime()));
  
  if(validItems.length === 0) {
    return <div className="cell-muted" style={{padding:20, textAlign:'center'}}>No active allocation timeline to display.</div>;
  }
  
  const starts = validItems.map(i=>new Date(i.start).getTime());
  const ends = validItems.map(i=>new Date(i.end).getTime());
  const min = Math.min(...starts);
  const max = Math.max(...ends);
  const span = Math.max(1, max - min);
  
  return (
    <div>
      {validItems.map(i=>{
        const left = ((new Date(i.start).getTime()-min)/span)*100;
        const width = Math.max(1.5, ((new Date(i.end).getTime()-new Date(i.start).getTime())/span)*100);
        return (
          <div className="tl-row" key={i.id}>
            <div className="tl-label" title={i.label}>{i.label}</div>
            <div className="tl-track">
              <div className="tl-bar" style={{left:`${left}%`, width:`${width}%`, background:colorFor? colorFor(i): 'var(--blue-500)'}}>{i.badge||''}</div>
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ================================================================ */
/* Shared CRUD Helpers (Part A)                                     */
/* ================================================================ */
export function FieldInput({f, value, onChange}){
  const common = { 
    value: value===undefined||value===null? '': value, 
    onChange: (e)=>onChange(f.key, f.type==='number'? Number(e.target.value): e.target.value),
    disabled: f.disabled
  };
  if(f.type==='select') {
    return (
      <select {...common}>
        <option value="">Select…</option>
        {f.options.map(o => {
          const isObj = typeof o === 'object' && o !== null;
          const val = isObj ? o.value : o;
          const label = isObj ? o.label : o;
          return <option key={val} value={val}>{label}</option>;
        })}
      </select>
    );
  }
  if(f.type==='textarea') return <textarea {...common} placeholder={f.placeholder||''}></textarea>;
  return <input type={f.type||'text'} {...common} placeholder={f.placeholder||''} />;
}

export function RecordModal({title, fields, initial, onCancel, onSave}){
  const [form, setForm] = useState(initial || {});
  const set = (k,v)=> setForm(prev=> ({...prev, [k]:v}));
  return (
    <div className="modal-overlay" onMouseDown={(e)=>{ if(e.target===e.currentTarget) onCancel(); }}>
      <div className="modal">
        <div className="modal-head"><div className="modal-title">{title}</div><button className="modal-close" onClick={onCancel}>×</button></div>
        <div className="modal-body">
          {fields.map(f=>(<div className={`field ${f.full? 'field-full':''}`} key={f.key}><label>{f.label}</label><FieldInput f={f} value={form[f.key]} onChange={set} /></div>))}
        </div>
        <div className="modal-foot"><button className="btn" onClick={onCancel}>Cancel</button><button className="btn btn-primary" onClick={()=>onSave(form)}>Save record</button></div>
      </div>
    </div>
  );
}
/* ================================================================ */
/* Shared CRUD Helpers (Part B - CrudPanel States & Logic)          */
/* ================================================================ */
export function CrudPanel({
  title, subtitle, accent, rows, columns, fields, idPrefix, 
  onAdd, onUpdate, onDelete, extraHeader, defaultRecord, lockProjectId, onRowClick
}){
  // 1. Core Hooks & States
  const [modal, setModal] = useState(null);
  const [query, setQuery] = useState('');
  const [toast, setToast] = useState('');
  const [sortConfig, setSortConfig] = useState({ key: null, direction: null });
  const [hiddenColumns, setHiddenColumns] = useState([]);
  
  // Custom Filter Builder & Logic States [11]
  const [customFilters, setCustomFilters] = useState([]); 
  const [matchOperator, setMatchOperator] = useState('and'); // 'and' (Match All) vs 'or' (Match Any) [11]
  
  // Multi-Level Grouping States [11]
  const [primaryGroup, setPrimaryGroup] = useState('');
  const [secondaryGroup, setSecondaryGroup] = useState('');
  
  // Settings & Views Popover states
  const [showSettings, setShowSettings] = useState(false);
  const [isSaveViewModalOpen, setIsSaveViewModalOpen] = useState(false);
  const [viewName, setViewName] = useState('');
  const [savedViews, setSavedViews] = useState([]); 
  const [selectedViewId, setSelectedViewId] = useState('');

  // 1. Automatically locks your key relational fields inside any active project workspace [11]
  const processedFields = useMemo(() => {
    if (!lockProjectId) return fields;
    return fields.map(f => {
      if (f.key === 'projectId' || f.key === 'fromId' || f.key === 'allocatedProjectId') {
        return { ...f, disabled: true };
      }
      return f;
    });
  }, [fields, lockProjectId]);

  // ... (keep search and sort logic identical) ...

  // Fetch and Load Saved Views from the API [11]
  useEffect(() => {
    const loadSavedViews = async () => {
      try {
        const list = await api.list('savedViews');
        setSavedViews(list.filter(v => v.targetCollection === idPrefix && v.isVisible));
      } catch (error) {
        console.error('Failed to load saved views:', error);
      }
    };

    loadSavedViews();
  }, [idPrefix]);

  // Handlers for Custom Query Filters
  const addCustomFilter = () => setCustomFilters(prev => [...prev, { id: uid('FLT'), field: '', value: '' }]);
  const removeCustomFilter = (id) => setCustomFilters(prev => prev.filter(f => f.id !== id));
  const updateCustomFilter = (id, key, val) => {
    setCustomFilters(prev => prev.map(f => f.id === id ? { ...f, [key]: val } : f));
  };

  // Apply Selected View Config to local grid states [11]
  const handleApplyView = (viewId) => {
    setSelectedViewId(viewId);
    if (!viewId) {
      setQuery('');
      setSortConfig({ key: null, direction: null });
      setHiddenColumns([]);
      setPrimaryGroup('');
      setSecondaryGroup('');
      setCustomFilters([]);
      setMatchOperator('and');
      return;
    }
    const view = savedViews.find(v => v.id === viewId);
    if (view) {
      setQuery(view.query || '');
      setSortConfig(view.sortConfig || { key: null, direction: null });
      setHiddenColumns(view.hiddenColumns || []);
      setCustomFilters(view.customFilters || []);
      setMatchOperator(view.matchOperator || 'and'); // Restore match operator [11]
      setPrimaryGroup(view.primaryGroup || '');     
      setSecondaryGroup(view.secondaryGroup || ''); 
     }
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    } else if (sortConfig.key === key && sortConfig.direction === 'desc') {
      key = null;
      direction = null;
    }
    setSortConfig({ key, direction });
  };

  const toggleColumn = (key) => {
    setHiddenColumns(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);
  };

  const visibleColumns = useMemo(() => columns.filter(c => !hiddenColumns.includes(c.key)), [columns, hiddenColumns]);

  // Apply sequential real-time Filtering (with AND / OR logic) and Sorting [11]
  const processedRows = useMemo(() => {
    let result = rows;
    
    // A. Apply Global Search Filter
    if (query.trim()) {
      const q = query.toLowerCase();
      result = rows.filter(r => columns.map(c=>c.key).some(k => String(r[k]||'').toLowerCase().includes(q)));
    }
    
    // B. Apply Custom Query Filters (AND vs OR Logic!) [11]
    if (customFilters.length > 0) {
      result = result.filter(r => {
        const matches = customFilters.map(f => {
          if (!f.field || !f.value || !f.value.trim()) return true; // Skip empty/unconfigured rules
          const cellVal = String(r[f.field] || '').toLowerCase();
          const filterVal = f.value.toLowerCase();
          return cellVal.includes(filterVal);
        });

        if (matchOperator === 'and') {
          return matches.every(match => match === true); // Match ALL [11]
        } else {
          return matches.some(match => match === true); // Match ANY [11]
        }
      });
    }
    
    // C. Apply Sort Config
    if (sortConfig.key && sortConfig.direction) {
      result = [...result].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal === undefined || aVal === null) return 1;
        if (bVal === undefined || bVal === null) return -1;
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }
    return result;
  }, [rows, query, customFilters, matchOperator, sortConfig, columns]);

  // Dynamic Compound Grouping
  const groupedRows = useMemo(() => {
    if (!primaryGroup) return null;
    const groups = {};
    processedRows.forEach(r => {
      const val1 = r[primaryGroup] ?? 'Unassigned';
      const val2 = secondaryGroup ? (r[secondaryGroup] ?? 'Unassigned') : '';
      const compoundKey = secondaryGroup ? `${val1} ➔ ${val2}` : val1;
      if (!groups[compoundKey]) groups[compoundKey] = [];
      groups[compoundKey].push(r);
    });
    return groups;
  }, [processedRows, primaryGroup, secondaryGroup]);

  const handleSaveView = async () => {
    if (!viewName.trim()) {
      alert("Please enter a name for your custom view.");
      return;
    }
    const viewId = uid('VIEW');
    const customView = {
      id: viewId, 
      targetCollection: idPrefix, 
      name: viewName, 
      query, 
      sortConfig, 
      hiddenColumns, 
      customFilters, 
      matchOperator, // Save logical operator [11]
      primaryGroup, 
      secondaryGroup, 
      isVisible: true 
    };
    try {
      await api.create('savedViews', customView);
      setToast(`View "${viewName}" successfully saved to the API!`);
      setViewName('');
      setIsSaveViewModalOpen(false);
      setSelectedViewId(viewId);
      const refreshed = await api.list('savedViews');
      setSavedViews(refreshed.filter(v => v.targetCollection === idPrefix && v.isVisible));
    } catch (e) {
      console.error("Error saving view: ", e);
      alert("Failed to save view. Check the API server.");
    }
  };

  // 2. Automatically pre-fills your relational keys inside the add record modal! [11]
  const openAdd = () => {
    const baseRecord = defaultRecord || {};
    const prefilled = { ...baseRecord };
    if (lockProjectId) {
      prefilled.projectId = lockProjectId;
      prefilled.fromId = lockProjectId;
      prefilled.allocatedProjectId = lockProjectId;
    }
    setModal({ mode: 'add', record: prefilled });
  };
  const openEdit = (r)=> setModal({mode:'edit', record:r});
  const closeModal = ()=> setModal(null);
  const save = (form)=>{
    if(modal.mode==='add'){ onAdd({...form, id: uid(idPrefix)}); setToast('Record added'); }
    else { onUpdate({...modal.record, ...form}); setToast('Record updated'); }
    closeModal();
  };
  const remove = (r)=>{ if(window.confirm('Delete this record?')){ onDelete(r); setToast('Record deleted'); } };
  const accentColor = ACCENT[accent] || ACCENT.teal;
  return (
    <div className="panel" style={{ position: 'relative' }}>
      <div className="panel-head">
        <div><div className="panel-title">{title}</div>{subtitle && <div className="panel-sub">{subtitle}</div>}</div>
        <div className="panel-actions" style={{ position: 'relative' }}>
          {extraHeader}
          <div className="search-wrap"><span className="search-ic">⌕</span><input type="text" placeholder="Search…" value={query} onChange={e=>setQuery(e.target.value)} style={{width:160}}/></div>
          
          {/* Dynamic Views Dropdown */}
          {savedViews.length > 0 && (
            <select 
              className="btn btn-sm"
              value={selectedViewId}
              onChange={e => handleApplyView(e.target.value)}
              style={{ maxWidth: '140px', paddingRight: '20px' }}
            >
              <option value="">Standard View</option>
              {savedViews.map(v => (
                <option key={v.id} value={v.id}>{v.name}</option>
              ))}
            </select>
          )}

          <button className="btn btn-sm" onClick={() => setShowSettings(!showSettings)}>
            ⚙ Columns ({visibleColumns.length}/{columns.length})
          </button>
          
          <button className="btn btn-sm" onClick={() => setIsSaveViewModalOpen(true)}>
            💾 Save View
          </button>

          {/* Filter Space Toggle Trigger */}
          <button className="btn btn-sm" onClick={addCustomFilter}>
            🔍 Filter {customFilters.length > 0 ? `(${customFilters.length})` : ''}
          </button>
          
          <button className="btn btn-accent btn-sm" style={{background:accentColor, borderColor:accentColor}} onClick={openAdd}>+ Add</button>

          {/* Column Selector Popover */}
          {showSettings && (
            <div className="panel" style={{
              position: 'absolute', right: '0', top: '35px', zIndex: 100,
              padding: '12px', background: '#fff', border: '1px solid var(--slate-200)',
              boxShadow: 'var(--shadow-card)', borderRadius: '6px', minWidth: '180px'
            }}>
              <div style={{ fontSize: '10px', fontWeight: 700, textTransform: 'uppercase', marginBottom: '8px', color: 'var(--slate-505)' }}>Show/Hide Columns</div>
              {columns.map(c => (
                <label key={c.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', marginBottom: '6px', cursor: 'pointer', userSelect: 'none', color: 'var(--slate-700)' }}>
                  <input 
                    type="checkbox" 
                    checked={!hiddenColumns.includes(c.key)} 
                    onChange={() => toggleColumn(c.key)} 
                    style={{ cursor: 'pointer' }}
                  />
                  {c.label}
                </label>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* NEW: Horizontal, Space-Saving, Pill-Shaped Filter Chip Workspace [11] */}
      {customFilters.length > 0 && (
        <div style={{ 
          background: 'var(--slate-100)', 
          padding: '10px 18px', 
          borderBottom: '1px solid var(--slate-200)',
          display: 'flex',
          flexDirection: 'column',
          gap: '10px'
        }}>
          {/* Match Operator Controls & Trigger */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px', color: 'var(--slate-700)', fontWeight: 500, flexWrap: 'wrap' }}>
            <span>Match</span>
            <select 
              value={matchOperator} 
              onChange={e => setMatchOperator(e.target.value)}
              style={{ padding: '3px 8px', borderRadius: '4px', border: '1px solid var(--slate-300)', background: '#fff', fontSize: '11px', fontWeight: 600 }}
            >
              <option value="and">All (AND)</option>
              <option value="or">Any (OR)</option>
            </select>
            <span>of the following query filters:</span>
            
            <button className="btn btn-sm" onClick={addCustomFilter} style={{ marginLeft: 'auto', padding: '2px 8px', fontSize: '11.5px' }}>
              ➕ Add Filter
            </button>
          </div>

          {/* Horizontal Pill-Shaped Active Filter Chips [11] */}
          <div style={{ display: 'flex', flexDirection: 'row', flexWrap: 'wrap', gap: '8px', alignItems: 'center' }}>
            {customFilters.map(f => {
              const matchedField = fields.find(fd => fd.key === f.field);
              const hasOptions = matchedField && matchedField.type === 'select' && matchedField.options;

              return (
                <div key={f.id} style={{ 
                  display: 'inline-flex', 
                  alignItems: 'center', 
                  gap: '6px', 
                  background: '#fff', 
                  padding: '4px 10px', 
                  borderRadius: '20px', 
                  border: '1px solid var(--slate-300)',
                  boxShadow: 'var(--shadow-card)'
                }}>
                  <select 
                    value={f.field} 
                    onChange={e => updateCustomFilter(f.id, 'field', e.target.value)}
                    style={{ fontSize: '11.5px', padding: '2px', border: 'none', background: 'transparent', fontWeight: 600, color: 'var(--slate-700)', cursor: 'pointer' }}
                  >
                    <option value="">Select Field...</option>
                    {columns.map(c => <option key={c.key} value={c.key}>{c.label}</option>)}
                  </select>

                  <span style={{ fontSize: '11px', fontWeight: 600, color: 'var(--slate-400)' }}>=</span>

                  {hasOptions ? (
                    <select
                      value={f.value}
                      onChange={e => updateCustomFilter(f.id, 'value', e.target.value)}
                      style={{ fontSize: '11.5px', padding: '2px', border: 'none', background: 'transparent', fontWeight: 500, color: 'var(--slate-900)', cursor: 'pointer' }}
                    >
                      <option value="">Select Value...</option>
                      {matchedField.options.map(o => {
                        const isObj = typeof o === 'object' && o !== null;
                        return <option key={isObj ? o.value : o} value={isObj ? o.value : o}>{isObj ? o.label : o}</option>;
                      })}
                    </select>
                  ) : (
                    <input 
                      placeholder="Value..." 
                      value={f.value} 
                      onChange={e => updateCustomFilter(f.id, 'value', e.target.value)}
                      style={{ fontSize: '11px', padding: '2px 4px', border: 'none', borderBottom: '1px dashed var(--slate-300)', width: '90px', background: 'transparent', color: 'var(--slate-900)' }}
                    />
                  )}

                  <button 
                    onClick={() => removeCustomFilter(f.id)} 
                    style={{ background: 'transparent', border: 'none', color: 'var(--red-500)', cursor: 'pointer', fontSize: '11px', fontWeight: 'bold', padding: '0 2px' }}
                    title="Delete Filter"
                  >
                    ✕
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      <div style={{ overflowX: 'auto' }}>
        <table>
          <thead>
            {/* Headers Row with Column-Level Sorting & Grouping Actions [11] */}
            <tr>
              {visibleColumns.map(c => {
                const isSorted = sortConfig.key === c.key;
                return (
                  <th 
                    key={c.key} 
                  style={{ userSelect: 'none', width: c.width || undefined }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'space-between' }}>
                      <div 
                        onClick={() => handleSort(c.key)} 
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        title="Click to sort"
                      >
                        {c.label}
                        {isSorted && (sortConfig.direction === 'asc' ? ' ▲' : ' ▼')}
                      </div>
                      
                      {/* 1. Header Group-by Toggle Icon [11] */}
                      <span 
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent triggering column sorting
                          setPrimaryGroup(primaryGroup === c.key ? '' : c.key);
                        }}
                        style={{ 
                          fontSize: '11px', 
                          opacity: primaryGroup === c.key ? 1 : 0.4, 
                          cursor: 'pointer',
                          padding: '2px 4px',
                          borderRadius: '4px',
                          background: primaryGroup === c.key ? 'rgba(255,255,255,0.1)' : 'transparent'
                        }}
                        title={`Group by ${c.label}`}
                      >
                        📁
                      </span>
                    </div>
                  </th>
                );
              })}
              <th style={{ width: 90, textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {processedRows.length === 0 && <tr className="empty-row"><td colSpan={visibleColumns.length + 1}>No records found.</td></tr>}
            
            {/* 2. Dynamic Grouped Rows vs Standard Flat Rows Render Logic [11] */}
            {primaryGroup && groupedRows ? (
              Object.entries(groupedRows).map(([groupVal, groupItems]) => (
                <React.Fragment key={groupVal}>
                  {/* Group Header Row */}
                  <tr style={{ background: 'var(--slate-100)', fontWeight: 600 }}>
                    <td colSpan={visibleColumns.length + 1} style={{ padding: '10px 12px', color: 'var(--navy-950)' }}>
                      📁 {groupVal} ({groupItems.length})
                    </td>
                  </tr>
                  
                  {/* Group Items */}
                  {groupItems.map(r => (
                    <tr key={r.id} onClick={() => onRowClick ? onRowClick(r) : undefined} style={{ cursor: onRowClick ? 'pointer' : 'default' }}>
                      {visibleColumns.map(c => (
                                          <td key={c.key} className={c.strong ? 'cell-strong' : ''} style={{ width: c.width || undefined, maxWidth: c.width || undefined, overflow: c.width ? 'hidden' : undefined, textOverflow: c.width ? 'ellipsis' : undefined, whiteSpace: c.width ? 'nowrap' : 'normal' }}>
                          {c.render ? c.render(r) : (r[c.key] ?? <span className="cell-muted">—</span>)}
                        </td>
                      ))}
                      <td>
                        <div className="row-actions">
                          <button className="btn btn-sm btn-icon" title="Edit" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>✎</button>
                          <button className="btn btn-sm btn-icon btn-danger" title="Delete" onClick={(e) => { e.stopPropagation(); remove(r); }}>🗑</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </React.Fragment>
              ))
            ) : (
              // Standard Flat Rows
              processedRows.map(r => (
                <tr key={r.id} onClick={() => onRowClick ? onRowClick(r) : undefined} style={{ cursor: onRowClick ? 'pointer' : 'default' }}>
                  {visibleColumns.map(c => (
                    <td key={c.key} className={c.strong ? 'cell-strong' : ''} style={{ width: c.width || undefined, maxWidth: c.width || undefined, overflow: c.width ? 'hidden' : undefined, textOverflow: c.width ? 'ellipsis' : undefined, whiteSpace: c.width ? 'nowrap' : 'normal' }}>
                      {c.render ? c.render(r) : (r[c.key] ?? <span className="cell-muted">—</span>)}
                    </td>
                  ))}
                  <td>
                    <div className="row-actions">
                      <button className="btn btn-sm btn-icon" title="Edit" onClick={(e) => { e.stopPropagation(); openEdit(r); }}>✎</button>
                      <button className="btn btn-sm btn-icon btn-danger" title="Delete" onClick={(e) => { e.stopPropagation(); remove(r); }}>🗑</button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      {modal && <RecordModal title={modal.mode === 'add' ? `Add ${title.replace(/s$/, '')}` : `Edit record`} fields={processedFields} initial={modal.record} onCancel={closeModal} onSave={save} />}
      
      {/* Save View Modal Dialog */}
      {isSaveViewModalOpen && (
        <div className="modal-overlay" onMouseDown={(e) => { if(e.target===e.currentTarget) setIsSaveViewModalOpen(false); }}>
          <div className="modal" style={{ maxWidth: '400px', marginTop: '10%' }}>
            <div className="modal-head">
              <div className="modal-title">Save Custom View</div>
              <button className="modal-close" onClick={() => setIsSaveViewModalOpen(false)}>×</button>
            </div>
            <div className="modal-body" style={{ gridTemplateColumns: '1fr', padding: '20px' }}>
              <div className="field field-full">
                <label>View Name</label>
                <input 
                  placeholder="e.g., NEC Standard Risks View" 
                  value={viewName} 
                  onChange={e => setViewName(e.target.value)} 
                  style={{ width: '100%' }}
                />
              </div>
              <div style={{ fontSize: '11px', color: 'var(--slate-500)', marginTop: '4px', lineHeight: '1.4' }}>
                Saving this view will preserve your current active filters, sorting preferences, and hidden column selections in the cloud [11].
              </div>
            </div>
            <div className="modal-foot">
              <button className="btn" onClick={() => setIsSaveViewModalOpen(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSaveView}>Save View</button>
            </div>
          </div>
        </div>
      )}

      <Toast msg={toast} onDone={() => setToast('')} />
    </div>
  );
} // <-- Closed CrudPanel function block perfectly!

export function FilterSelect({options, value, onChange, allLabel}){
  return (<select className="btn" value={value} onChange={e=>onChange(e.target.value)} style={{minWidth:190}}><option value="ALL">{allLabel}</option>{options.map(o=> <option key={o.id} value={o.id}>{o.label}</option>)}</select>);
}

export function Tabs({tabs, active, onChange}){
  return (<div className="pill-tabs">{tabs.map(t=> <div key={t.key} className={`pill-tab ${active===t.key?'active':''}`} onClick={()=>onChange(t.key)}>{t.label}</div>)}</div>);
}

/* ================================================================ */
/* Seed Data Function (No longer holds massive mock data arrays!)  */
/* ================================================================ */
export function seed(){
  return {
    projects: [], objectives: [], hierarchyLinks: [], roadmapItems: [], costPlan: [],
    benefitPlans: [], budgets: [], baselines: [], tasks: [], todos: [], checklists: [],
    risks: [], issues: [], changes: [], agreements: [], statusReports: [], resources: [],
    timesheets: [], ideas: [], investments: [], teams: [], adhocReports: [], dataDesignerDefs: [],
    uiDesignerDefs: [], blueprints: [], fieldResources: [], fieldTasks: [], schedule: [],
    allocations: [], execution: [], boq: [], devices: [], reports: [], slaRecords: [],
    billingRecords: [], syncLog: [], assumptions: [], stakeholders: [], lessons: []
  };
}

/* ================================================================ */
/* Navigation map & sidebar routing configuration                    */
/* ================================================================ */
export const NAV = [
  {key:'strategic', label:'Strategic Alignment', color:'indigo', items:[
    {key:'objectives', label:'Objectives', desc:'OKR workspace aligning strategic vision with operational execution.'},
    {key:'hierarchies', label:'Hierarchies', desc:'Parent-child relationships between investments with rolled-up metrics.'},
    {key:'roadmaps', label:'Roadmaps', desc:'Top-down portfolio planning with timeline and grid views.'},
  ]},
  {key:'work', label:'Work Management', color:'blue', items:[
    {key:'project-details', label:'Projects', desc:'Full lifecycle management — templates, phases, tasks, milestones, and baselines.'},
    {key:'baselines', label:'Baselines', desc:'Snapshots of schedule, budget, and scope for variance comparison.'},
    {key:'ideas', label:'Ideas', desc:'Capture, evaluate, and convert ideas into projects.'},
    {key:'investments', label:'Custom Investments', desc:'Flexible investment types — digital transformation, market expansion, and more.'},
    {key:'teams', label:'Teams', desc:'Persistent funding for people-centric planning, aligned to products or value streams.'},
  ]},
  {key:'execution', label:'Execution & Control', color:'orange', items:[
    {key:'tasks-module', label:'Tasks Module', desc:'Tasks, milestones, phases, and to-dos across grid, board, and timeline layouts.'},
    {key:'status-module', label:'Status Module', desc:'Create and publish status reports for projects and investments.'},
    {key:'ric-module', label:'Risks, Issues & Changes', desc:'Risks, opportunities, issues, and change requests with governance workflow.'},
    {key:'checklists-module', label:'Checklists Module', desc:'Project checklists with ownership transfer and template inheritance.'},
    {key:'agreements-module', label:'Agreements Module', desc:'Agreements and dependencies between projects and ideas.'},
  ]},
  {key:'financial', label:'Financial Management', color:'teal', items:[
    {key:'cost-plans', label:'Cost Plans', desc:'Time-phased planned costs; mark as Plan of Record and convert to a budget.'},
    {key:'benefit-plans', label:'Benefit Plans', desc:'Planned and realized benefits tied to investments.'},
    {key:'budgets', label:'Budgets', desc:'Approved funding, typically converted from a Plan of Record cost plan.'},
  ]},  
  {key:'resource', label:'Resource Management', color:'purple', items:[
    {key:'staffing', label:'Staffing', desc:'Resource allocation and staffing analysis — staff grid and allocation timeline.'},
    {key:'timesheets', label:'Timesheets', desc:'Track hours worked on tasks and investments, with approvals.'},
    {key:'workforce-plans', label:'Plans', desc:'Workforce trends, turnover, and skills demand forecasting.'},
  ]},
  {key:'insights', label:'Insights & Analytics', color:'green', items:[
    {key:'standard-reports', label:'Standard Reports', desc:'Prebuilt dashboards for financials, utilization, and status.'},
    {key:'adhoc-reports', label:'Ad-hoc Reports', desc:'User-defined queries and custom views.'},
    {key:'data-designer', label:'Data Designer', desc:'Define data sources, joins, and metrics.'},
    {key:'ui-designer', label:'UI Designer', desc:'Build report layouts, charts, and visualizations.'},
  ]},
  {key:'admin', label:'Administration', color:'slate', items:[
    {key:'blueprints', label:'Blueprints', desc:'Reusable configuration templates for investment types.'},
    {key:'field-security', label:'Field-level Security', desc:'Control field visibility and edit rights by role.'},
    {key:'system-settings', label:'System Settings', desc:'Platform-wide configuration — currency, fiscal year, formats.'},
    {key:'auth-api', label:'Authentication & API Keys', desc:'SAML authentication and API key management.'},
  ]},
  {key:'fsm', label:'Field Service', color:'amber', items:[
    {key:'work-orders', label:'Work Order Management', desc:'Create, assign, and track service jobs.'},
    {key:'scheduling-dispatch', label:'Scheduling & Dispatch', desc:'Optimize technician routes and availability.'},
    {key:'asset-inventory', label:'Asset & Inventory Mgmt', desc:'Track parts, tools, and equipment usage.'},
    {key:'mobile-field-access', label:'Mobile Field Access', desc:'Technicians update tasks, capture signatures, and upload photos onsite.'},
    {key:'customer-sla', label:'Customer & SLA Mgmt', desc:'Monitor service level agreements and customer commitments.'},
    {key:'billing-cost', label:'Billing & Cost Tracking', desc:'Link service work to financials and invoicing.'},
    {key:'fsm-analytics', label:'Analytics & Reporting', desc:'Service performance, technician productivity, and CSAT.'},
  ]},
];

export const MODULE_META = {};
NAV.forEach(g=> g.items.forEach(it=> MODULE_META[it.key]={title:it.label, desc:it.desc, group:g.label}));
