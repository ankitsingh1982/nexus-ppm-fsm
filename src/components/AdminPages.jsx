import React, { useState } from 'react';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase-config';
import { uid, Badge, Toast, Switch, CrudPanel } from '../seed';

/* ================================================================ */
/* Blueprints Page (Interactive CRUD Edition)                        */
/* ================================================================ */
export function BlueprintsPage({ data, onAdd, onUpdate, onDelete }) {
  const rows = data.blueprints || [];

  const fields = [
    { key: 'name', label: 'Blueprint Name', full: true },
    { key: 'investmentType', label: 'Investment Type', type: 'select', options: ['Project', 'Idea', 'Investment'] },
    { key: 'stages', label: 'Lifecycle Stages (e.g. Initiate → Plan → Execute → Close)', full: true },
    { key: 'status', label: 'Status', type: 'select', options: ['Active', 'Inactive'] }
  ];

  const columns = [
    { key: 'name', label: 'Blueprint Name', strong: true },
    { key: 'investmentType', label: 'Investment Type', render: r => <Badge value={r.investmentType}/> },
    { key: 'stages', label: 'Governance Stages' },
    { key: 'status', label: 'Status', render: r => <Badge value={r.status}/> }
  ];

  return (
    <CrudPanel 
      title="Blueprints" 
      subtitle="Manage reusable configuration templates and stagegate lifecycles" 
      accent="slate"
      rows={rows} 
      columns={columns} 
      fields={fields} 
      idPrefix="BP"
      onAdd={onAdd}
      onUpdate={onUpdate}
      onDelete={onDelete}
    />
  );
}

/* ================================================================ */
/* Field-Level Security Page                                        */
/* ================================================================ */
export function FieldSecurityPage({ data }){
  const cycle = ['Hidden','Read-only','Editable'];
  const colorOf = {'Hidden':'var(--red-500)','Read-only':'var(--amber-500)','Editable':'var(--green-500)'};
  const cellStyle = (v)=>({background:colorOf[v]+'22', color:colorOf[v], border:`1px solid ${colorOf[v]}55`});

  // Pulls single matrix document config from the array list
  const config = data.fieldSecurity?.find(d => d.id === 'config') || {
    fields: ['Budget','Actuals','Objective Target','Risk Owner','Approved Rate'],
    roles: ['Project Manager','Resource Manager','Executive','Field Technician'],
    matrix: {
      'Budget':{'Project Manager':'Editable','Resource Manager':'Read-only','Executive':'Read-only','Field Technician':'Hidden'},
      'Actuals':{'Project Manager':'Editable','Resource Manager':'Editable','Executive':'Read-only','Field Technician':'Hidden'},
      'Objective Target':{'Project Manager':'Read-only','Resource Manager':'Hidden','Executive':'Editable','Field Technician':'Hidden'},
      'Risk Owner':{'Project Manager':'Editable','Resource Manager':'Read-only','Executive':'Read-only','Field Technician':'Read-only'},
      'Approved Rate':{'Project Manager':'Read-only','Resource Manager':'Editable','Executive':'Read-only','Field Technician':'Hidden'}
    }
  };
  
  const setCell = async (field, role)=>{
    const cur = config.matrix?.[field]?.[role] || 'Hidden';
    const next = cycle[(cycle.indexOf(cur)+1)%cycle.length];
    const updatedMatrix = { 
      ...config.matrix, 
      [field]: { ...config.matrix[field], [role]: next } 
    };
    try {
      await setDoc(doc(db, 'fieldSecurity', 'config'), { ...config, matrix: updatedMatrix });
    } catch (e) {
      console.error("Error setting security cell:", e);
    }
  };

  return (
    <div className="panel">
      <div className="panel-head"><div><div className="panel-title">Field-level security</div><div className="panel-sub">Click a cell to cycle visibility — Hidden → Read-only → Editable</div></div></div>
      <div className="panel-body" style={{overflowX:'auto'}}>
        <table>
          <thead><tr><th>Field</th>{config.roles.map(r=> <th key={r}>{r}</th>)}</tr></thead>
          <tbody>
            {config.fields.map(f=>(
              <tr key={f}>
                <td className="cell-strong">{f}</td>
                {config.roles.map(role=>(
                  <td key={role}><div className="sec-cell" style={cellStyle(config.matrix?.[f]?.[role] || 'Hidden')} onClick={()=>setCell(f,role)}>{(config.matrix?.[f]?.[role] || 'Hidden')[0]}</div></td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* ================================================================ */
/* System Settings Page                                             */
/* ================================================================ */
export function SystemSettingsPage({ data }){
  const [toast, setToast] = useState(''); 
  
  // Pulls your settings document from the live array list (with fallbacks if empty) [11]
  const s = data.systemSettings?.find(d => d.id === 'config') || {
    currency: 'USD',
    fiscalYearStart: 'January',
    dateFormat: 'MM/DD/YYYY',
    timeTrackingRequired: true,
    language: 'English',
    themeColor: '#0f766e',
    fontSize: 'Medium',
    logoUrl: ''
  };
  
  const upd = async (k, v) => {
    try {
      await setDoc(doc(db, 'systemSettings', 'config'), { ...s, [k]: v });
      setToast('System settings successfully updated in the Cloud!');
    } catch (e) {
      console.error("Error updating system settings:", e);
    }
  };

  const LANGUAGES = ['English', 'Spanish', 'French', 'German', 'Japanese', 'Hindi'];
  const FONT_SIZES = ['Small', 'Medium', 'Large'];
  const THEME_COLORS = [
    { name: 'Teal (Default)', hex: '#0f766e' },
    { name: 'Classic Blue', hex: '#1d4ed8' },
    { name: 'Warm Amber', hex: '#b45309' },
    { name: 'Deep Purple', hex: '#6d28d9' },
    { name: 'Minimalist Slate', hex: '#334155' }
  ];

  return (
    <div className="panel">
      <div className="panel-head">
        <div>
          <div className="panel-title">System Settings & Customization</div>
          <div className="panel-sub">Configure platform-wide currencies, audit calendars, visual themes, typography, and company branding.</div>
        </div>
        <button className="btn btn-primary" onClick={() => setToast('Settings successfully saved!')}>Save Settings</button>
      </div>
      <div className="panel-body grid grid-2">
        
        {/* Left Column: Basic Configurations */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="settings-row">
            <div><div className="settings-label">Default Currency</div><div className="settings-desc">Used across time-phased cost plans and budgets</div></div>
            <select className="btn" value={s.currency} onChange={e => upd('currency', e.target.value)}><option>USD</option><option>EUR</option><option>GBP</option><option>INR</option></select>
          </div>
          <div className="settings-row">
            <div><div className="settings-label">Fiscal Year Start</div><div className="settings-desc">Anchors period naming conventions</div></div>
            <select className="btn" value={s.fiscalYearStart} onChange={e => upd('fiscalYearStart', e.target.value)}>{['January','April','July','October'].map(m => <option key={m}>{m}</option>)}</select>
          </div>
          <div className="settings-row">
            <div><div className="settings-label">Date Format</div><div className="settings-desc">Applies formatting globally to calendar fields</div></div>
            <select className="btn" value={s.dateFormat} onChange={e => upd('dateFormat', e.target.value)}><option>MM/DD/YYYY</option><option>DD/MM/YYYY</option><option>YYYY-MM-DD</option></select>
          </div>
          <div className="settings-row">
            <div><div className="settings-label">Require Time Tracking</div><div className="settings-desc">Enforces weekly timesheet submissions for allocations</div></div>
            <Switch on={s.timeTrackingRequired} onToggle={() => upd('timeTrackingRequired', !s.timeTrackingRequired)}/>
          </div>
        </div>

        {/* Right Column: Visual Theme & Branding */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <div className="settings-row">
            <div><div className="settings-label">Platform Language</div><div className="settings-desc">Translates dashboard navigation and actions</div></div>
            <select className="btn" value={s.language || 'English'} onChange={e => upd('language', e.target.value)}>
              {LANGUAGES.map(l => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="settings-row">
            <div><div className="settings-label">Global Font Size</div><div className="settings-desc">Adjusts sidebar and grid typography sizes</div></div>
            <select className="btn" value={s.fontSize || 'Medium'} onChange={e => upd('fontSize', e.target.value)}>
              {FONT_SIZES.map(sz => <option key={s}>{sz}</option>)}
            </select>
          </div>
          <div className="settings-row">
            <div><div className="settings-label">Active Theme Color</div><div className="settings-desc">Adjusts accents, tab buttons, and active indicators</div></div>
            <select className="btn" value={s.themeColor || '#0f766e'} onChange={e => upd('themeColor', e.target.value)}>
              {THEME_COLORS.map(tc => <option key={tc.hex} value={tc.hex}>{tc.name}</option>)}
            </select>
          </div>
          <div className="field-full" style={{ paddingTop: '8px' }}>
            <label style={{ fontSize: '11px', fontWeight: 700, color: 'var(--slate-500)' }}>Company Logo Placeholder URL</label>
            <input 
              placeholder="e.g. https://yourcompany.com/brand-logo.png" 
              value={s.logoUrl || ''} 
              onChange={e => upd('logoUrl', e.target.value)} 
              style={{ width: '100%', marginTop: '6px' }}
            />
          </div>
        </div>

      </div>
      <Toast msg={toast} onDone={() => setToast('')} />
    </div>
  );
}

/* ================================================================ */
/* Authentication & API Keys Page                                   */
/* ================================================================ */
export function AuthApiPage({ data }){
  const [toast, setToast] = useState('');
  const apiKeysList = data.apiKeys || [];
  
  // Pulls single SAML configuration document from systemSettings collection
  const samlConfig = data.systemSettings?.find(d => d.id === 'saml') || { samlEnabled: true };

  const revoke = async (id)=>{
    const k = apiKeysList.find(x => x.id === id);
    if (!k) return;
    try {
      await setDoc(doc(db, 'apiKeys', id), { ...k, status: 'Revoked' }, { merge: true });
      setToast('API key revoked successfully');
    } catch (e) {
      console.error("Error revoking key:", e);
    }
  };
  
  const generate = async ()=>{
    const id = uid('KEY');
    const key = {id, name:'New Integration Key', keyMasked:`nx_live_••••••••${Math.random().toString(16).slice(2,6).toUpperCase()}`, created:new Date().toISOString().slice(0,10), status:'Active'};
    try {
      await setDoc(doc(db, 'apiKeys', id), key);
      setToast('New API key generated');
    } catch (e) {
      console.error("Error generating key:", e);
    }
  };

  return (
    <div>
      <div className="panel" style={{marginBottom:16}}>
        <div className="panel-head"><div><div className="panel-title">Authentication</div><div className="panel-sub">SAML single sign-on configuration</div></div></div>
        <div className="panel-body">
          <div className="settings-row">
            <div><div className="settings-label">SAML authentication</div><div className="settings-desc">Require SSO login via the configured identity provider</div></div>
            <Switch on={samlConfig.samlEnabled} onToggle={async () => {
              try {
                await setDoc(doc(db, 'systemSettings', 'saml'), { samlEnabled: !samlConfig.samlEnabled }, { merge: true });
              } catch (e) {
                console.error("Error toggling SAML:", e);
              }
            }}/>
          </div>
        </div>
      </div>
      <div className="panel">
        <div className="panel-head"><div><div className="panel-title">API keys</div><div className="panel-sub">Keys used by integrations to call the platform API</div></div><button className="btn btn-primary" onClick={generate}>+ Generate key</button></div>
        <div className="panel-body">
          {apiKeysList.length === 0 && <div className="cell-muted" style={{ padding: '10px' }}>No active API keys found.</div>}
          {apiKeysList.map(k=>(
            <div className="settings-row" key={k.id}>
              <div><div className="settings-label">{k.name}</div><div className="settings-desc mono">{k.keyMasked} · created {k.created}</div></div>
              <div style={{display:'flex', alignItems:'center', gap:10}}><Badge value={k.status}/>{k.status==='Active' && <button className="btn btn-sm btn-danger" onClick={()=>revoke(k.id)}>Revoke</button>}</div>
            </div>
          ))}
        </div>
      </div>
      <Toast msg={toast} onDone={()=>setToast('')}/>
    </div>
  );
}