import React, { useState, useEffect, useCallback } from 'react';
import './App.css';
import { api } from './api';

// Seed data, constants & helpers
import { seed, NAV, MODULE_META, ACCENT } from './seed';

// Strategic Alignment Page Components
import { ObjectivesPage, HierarchiesPage, RoadmapsPage } from './components/StrategicPages';

// Work Management Page Components
import { ProjectDetailsPage, BaselinesPage, IdeasPage, InvestmentsPage, TeamsPage } from './components/WorkPages';
import { ProjectWorkspacePage } from './components/ProjectWorkspacePage'; // 17-Tab Workspace!

// Execution & Control Page Components
import { TasksModulePage, StatusModulePage, RicModulePage, ChecklistsModulePage, AgreementsModulePage } from './components/ExecutionPages';

// Field Service Management Page Components
import { WorkOrdersPage, SchedulingDispatchPage, AssetInventoryPage, MobileFieldAccessPage, CustomerSlaPage, BillingCostPage, FsmAnalyticsPage } from './components/FsmPages';

// Financials Page Components
import { CostPlansPage, BenefitPlansPage, BudgetsPage } from './components/FinancialPages';

// Resource Management Page Components
import { StaffingPage, TimesheetsPage, WorkforcePlansPage } from './components/ResourcePages';

// Insights & Analytics Page Components
import { StandardReportsPage, AdhocReportsPage, DataDesignerPage, UiDesignerPage } from './components/AnalyticsPages';

// Administration Page Components
import { BlueprintsPage, FieldSecurityPage, SystemSettingsPage, AuthApiPage } from './components/AdminPages';

// Sidebar Icons & Group Mapping Configs
const GROUP_ICONS = {
  strategic: '🎯', work: '📂', execution: '📋', financial: '💰',
  resource: '👥', insights: '📊', admin: '⚙️', fsm: '🛠️'
};

const ITEM_ICONS = {
  objectives: '🎯', hierarchies: '🌿', roadmaps: '🗺️',
  'project-details': '📁', baselines: '⏱️', ideas: '💡', investments: '💎', teams: '🤝',
  'tasks-module': '📝', 'status-module': '📢', 'ric-module': '⚠️', 'checklists-module': '☑️', 'agreements-module': '📜',
  'cost-plans': '📉', 'benefit-plans': '📈', budgets: '💵',
  staffing: '👤', timesheets: '📅', 'workforce-plans': '🗺️',
  'standard-reports': '📊', 'adhoc-reports': '🔍', 'data-designer': '🏗️', 'ui-designer': '🎨',
  blueprints: '📐', 'field-security': '🔒', 'system-settings': '⚙️', 'auth-api': '🔑',
  'work-orders': '🛠️', 'scheduling-dispatch': '🗓️', 'asset-inventory': '📦', 'mobile-field-access': '📱', 'customer-sla': '🤝', 'billing-cost': '🧾', 'fsm-analytics': '📈'
};

const ROLE_PERMISSIONS = {
  Admin: ['strategic', 'work', 'execution', 'financial', 'resource', 'insights', 'admin', 'fsm'],
  PM: ['strategic', 'work', 'execution', 'financial', 'resource', 'insights'],
  Executive: ['strategic', 'work', 'financial', 'insights'],
  'Resource Manager': ['work', 'resource', 'insights'],
  'Field Technician': ['fsm']
};

/* ================================================================ */
/* Shell / Layout Shell & Router                                     */
/* ================================================================ */
function App(){
  // 1. Initialize State
  const initialData = {
    projects: [], objectives: [], hierarchyLinks: [], roadmapItems: [], costPlan: [],
    benefitPlans: [], budgets: [], baselines: [], tasks: [], todos: [], checklists: [],
    risks: [], issues: [], changes: [], agreements: [], statusReports: [], resources: [],
    timesheets: [], ideas: [], investments: [], teams: [], adhocReports: [], dataDesignerDefs: [],
    uiDesignerDefs: [], blueprints: [], fieldResources: [], fieldTasks: [], schedule: [],
    allocations: [], execution: [], boq: [], devices: [], reports: [], slaRecords: [],
    billingRecords: [], syncLog: [], assumptions: [], stakeholders: [], lessons: [],
    systemSettings: [], fieldSecurity: [], apiKeys: [], savedViews: []
  };

  const [data, setData] = useState(initialData);

  const [view, setView] = useState('project-details'); 
  const [projectFilter, setProjectFilter] = useState('ALL');
  const [activeProjectId, setActiveProjectId] = useState(null); // Active Selected Project Workspace ID
  const [expandedGroups, setExpandedGroups] = useState({}); 
  const [userRole, setUserRole] = useState('Admin'); 

  const go = useCallback((key)=>{ setView(key); }, []);
  const groupOfKey = (key)=> NAV.find(g=> g.items.some(it=>it.key===key));
  const toggleGroup = (groupKey) => setExpandedGroups(prev => ({ ...prev, [groupKey]: !prev[groupKey] }));

  // Collapse state checking window.innerWidth initially for tablet/mobile auto-collapse
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return typeof window !== 'undefined' ? window.innerWidth <= 1024 : false;
  });

  // 2. Load all records from the Node API on startup
  useEffect(() => {
    const loadData = async () => {
      try {
        const serverData = await api.getAll();
        setData({ ...initialData, ...serverData });
      } catch (error) {
        console.error('Failed to load app data from API:', error);
      }
    };

    loadData();
  }, []);

  // 3. Generic API-based database write helpers
  const handleAdd = async (collectionName, record) => {
    try {
      const saved = await api.create(collectionName, record);
      setData(prev => ({ ...prev, [collectionName]: [...(prev[collectionName] || []), saved] }));
    } catch (e) {
      console.error(`Error adding to ${collectionName}:`, e);
    }
  };

  const handleUpdate = async (collectionName, record) => {
    try {
      const updated = await api.update(collectionName, record);
      setData(prev => ({
        ...prev,
        [collectionName]: (prev[collectionName] || []).map(item => item.id === updated.id ? updated : item),
      }));
    } catch (e) {
      console.error(`Error updating in ${collectionName}:`, e);
    }
  };

  const handleDelete = async (collectionName, record) => {
    try {
      await api.remove(collectionName, record.id);
      setData(prev => ({
        ...prev,
        [collectionName]: (prev[collectionName] || []).filter(item => item.id !== record.id),
      }));
    } catch (e) {
      console.error(`Error deleting from ${collectionName}:`, e);
    }
  };

  // Compute and filter NAV items based on current active userRole permissions
  const allowedCategories = ROLE_PERMISSIONS[userRole] || [];
  const visibleNav = NAV.filter(group => allowedCategories.includes(group.key));


  // 4. Component View Router
  const renderView = ()=>{
    switch(view){
      // Strategic Alignment
      case 'objectives': 
        return <ObjectivesPage data={data} setData={setData} onAdd={r => handleAdd('objectives', r)} onUpdate={r => handleUpdate('objectives', r)} onDelete={r => handleDelete('objectives', r)}/>;
      case 'hierarchies': 
        return <HierarchiesPage data={data} setData={setData} onAdd={r => handleAdd('hierarchyLinks', r)} onUpdate={r => handleUpdate('hierarchyLinks', r)} onDelete={r => handleDelete('hierarchyLinks', r)}/>;
      case 'roadmaps': 
        return <RoadmapsPage data={data} setData={setData} onAdd={r => handleAdd('roadmapItems', r)} onUpdate={r => handleUpdate('roadmapItems', r)} onDelete={r => handleDelete('roadmapItems', r)}/>;
      
      // Work Management (Renders 17-tab workspace if a project is active!)
      case 'project-details': 
        if (activeProjectId) {
          return (
            <ProjectWorkspacePage 
              projectId={activeProjectId} 
              onBack={() => setActiveProjectId(null)} 
              data={data}
              handleAdd={handleAdd}
              handleUpdate={handleUpdate}
              handleDelete={handleDelete}
            />
          );
        }
        return (
          <ProjectDetailsPage 
            data={data} 
            setData={setData} 
            onAdd={r => handleAdd('projects', r)} 
            onUpdate={r => handleUpdate('projects', r)} 
            onDelete={r => handleDelete('projects', r)}
            onViewProject={(id) => setActiveProjectId(id)} // Sets selected project ID
          />
        );

      case 'baselines': 
        return <BaselinesPage data={data} setData={setData} projectFilter={projectFilter} setProjectFilter={setProjectFilter} onAdd={r => handleAdd('baselines', r)} onUpdate={r => handleUpdate('baselines', r)} onDelete={r => handleDelete('baselines', r)}/>;
      case 'ideas': 
        return <IdeasPage data={data} setData={setData} onAdd={r => handleAdd('ideas', r)} onUpdate={r => handleUpdate('ideas', r)} onDelete={r => handleDelete('ideas', r)}/>;
      case 'investments': 
        return <InvestmentsPage data={data} setData={setData} onAdd={r => handleAdd('investments', r)} onUpdate={r => handleUpdate('investments', r)} onDelete={r => handleDelete('investments', r)}/>;
      case 'teams': 
        return <TeamsPage data={data} setData={setData} onAdd={r => handleAdd('teams', r)} onUpdate={r => handleUpdate('teams', r)} onDelete={r => handleDelete('teams', r)}/>;
      
      // Execution & Control
      case 'tasks-module': 
        return <TasksModulePage data={data} setData={setData} projectFilter={projectFilter} setProjectFilter={setProjectFilter} onAdd={r => handleAdd('tasks', r)} onUpdate={r => handleUpdate('tasks', r)} onDelete={r => handleDelete('tasks', r)} onAddTodo={(r) => handleAdd('todos', r)} onUpdateTodo={(r) => handleUpdate('todos', r)} onDeleteTodo={(r) => handleDelete('todos', r)}/>;
      case 'status-module': 
        return <StatusModulePage data={data} setData={setData} projectFilter={projectFilter} setProjectFilter={setProjectFilter} onAdd={r => handleAdd('statusReports', r)} onUpdate={r => handleUpdate('statusReports', r)} onDelete={r => handleDelete('statusReports', r)}/>;
      case 'ric-module': 
        return <RicModulePage data={data} setData={setData} projectFilter={projectFilter} setProjectFilter={setProjectFilter} onAddRisk={r => handleAdd('risks', r)} onUpdateRisk={r => handleUpdate('risks', r)} onDeleteRisk={r => handleDelete('risks', r)} onAddIssue={r => handleAdd('issues', r)} onUpdateIssue={r => handleUpdate('issues', r)} onDeleteIssue={r => handleDelete('issues', r)} onAddChange={r => handleAdd('changes', r)} onUpdateChange={r => handleUpdate('changes', r)} onDeleteChange={r => handleDelete('changes', r)}/>;
      case 'checklists-module': 
        return <ChecklistsModulePage data={data} setData={setData} projectFilter={projectFilter} setProjectFilter={setProjectFilter} onAdd={r => handleAdd('checklists', r)} onUpdate={r => handleUpdate('checklists', r)} onDelete={r => handleDelete('checklists', r)}/>;
      case 'agreements-module': 
        return <AgreementsModulePage data={data} setData={setData} onAdd={r => handleAdd('agreements', r)} onUpdate={r => handleUpdate('agreements', r)} onDelete={r => handleDelete('agreements', r)}/>;
      
      // Financials
      case 'cost-plans': 
        return <CostPlansPage data={data} setData={setData} projectFilter={projectFilter} setProjectFilter={setProjectFilter} onAdd={r => handleAdd('costPlan', r)} onUpdate={r => handleUpdate('costPlan', r)} onDelete={r => handleDelete('costPlan', r)}/>;
      case 'benefit-plans': 
        return <BenefitPlansPage data={data} setData={setData} projectFilter={projectFilter} setProjectFilter={setProjectFilter} onAdd={r => handleAdd('benefitPlans', r)} onUpdate={r => handleUpdate('benefitPlans', r)} onDelete={r => handleDelete('benefitPlans', r)}/>;
      case 'budgets': 
        return <BudgetsPage data={data} setData={setData} projectFilter={projectFilter} setProjectFilter={setProjectFilter} onAdd={r => handleAdd('budgets', r)} onUpdate={r => handleUpdate('budgets', r)} onDelete={r => handleDelete('budgets', r)}/>;
      
      // Resource Management
      case 'staffing': 
        return <StaffingPage data={data} setData={setData} onAdd={r => handleAdd('resources', r)} onUpdate={r => handleUpdate('resources', r)} onDelete={r => handleDelete('resources', r)}/>;
      case 'timesheets': 
        return <TimesheetsPage data={data} setData={setData} onAdd={r => handleAdd('timesheets', r)} onUpdate={r => handleUpdate('timesheets', r)} onDelete={r => handleDelete('timesheets', r)}/>;
      case 'workforce-plans': 
        return <WorkforcePlansPage data={data}/>;
      
      // Insights, Analytics & Designers
      case 'standard-reports': 
        return <StandardReportsPage data={data} go={go}/>;
      case 'adhoc-reports': 
        return <AdhocReportsPage data={data} setData={setData} onAdd={r => handleAdd('adhocReports', r)} onUpdate={r => handleUpdate('adhocReports', r)} onDelete={r => handleDelete('adhocReports', r)}/>;
      case 'data-designer': 
        return <DataDesignerPage data={data} setData={setData} onAdd={r => handleAdd('dataDesignerDefs', r)} onUpdate={r => handleUpdate('dataDesignerDefs', r)} onDelete={r => handleDelete('dataDesignerDefs', r)}/>;
      case 'ui-designer': 
        return <UiDesignerPage data={data} setData={setData} onAdd={r => handleAdd('uiDesignerDefs', r)} onUpdate={r => handleUpdate('uiDesignerDefs', r)} onDelete={r => handleDelete('uiDesignerDefs', r)}/>;
      
      // Administration
      case 'blueprints': 
        return (
          <BlueprintsPage 
            data={data} 
            onAdd={r => handleAdd('blueprints', r)} 
            onUpdate={r => handleUpdate('blueprints', r)} 
            onDelete={r => handleDelete('blueprints', r)}
          />
        );
      case 'field-security': 
        return <FieldSecurityPage data={data} setData={setData}/>;
      case 'system-settings': 
        return <SystemSettingsPage data={data} setData={setData}/>;
      case 'auth-api': 
        return <AuthApiPage data={data} setData={setData}/>;
      
      // Field Service Management (FSM)
      case 'work-orders': 
        return <WorkOrdersPage data={data} setData={setData} onAdd={r => handleAdd('fieldTasks', r)} onUpdate={r => handleUpdate('fieldTasks', r)} onDelete={r => handleDelete('fieldTasks', r)}/>;
      case 'scheduling-dispatch': 
        return <SchedulingDispatchPage data={data} setData={setData} onAdd={r => handleAdd('schedule', r)} onUpdate={r => handleUpdate('schedule', r)} onDelete={r => handleDelete('schedule', r)} onAddAlloc={r => handleAdd('allocations', r)} onUpdateAlloc={r => handleUpdate('allocations', r)} onDeleteAlloc={r => handleDelete('allocations', r)}/>;
      case 'asset-inventory': 
        return <AssetInventoryPage data={data} setData={setData} onAdd={r => handleAdd('fieldResources', r)} onUpdate={r => handleUpdate('fieldResources', r)} onDelete={r => handleDelete('fieldResources', r)} onAddBoq={r => handleAdd('boq', r)} onUpdateBoq={r => handleUpdate('boq', r)} onDeleteBoq={r => handleDelete('boq', r)}/>;
      case 'mobile-field-access': 
        return <MobileFieldAccessPage data={data} setData={setData} onAdd={r => handleAdd('execution', r)} onUpdate={r => handleUpdate('execution', r)} onDelete={r => handleDelete('execution', r)} onAddReport={r => handleAdd('reports', r)} onUpdateReport={r => handleUpdate('reports', r)} onDeleteReport={r => handleDelete('reports', r)} onAddDevice={r => handleAdd('devices', r)} onUpdateDevice={r => handleUpdate('devices', r)} onDeleteDevice={r => handleDelete('devices', r)}/>;
      case 'customer-sla': 
        return <CustomerSlaPage data={data} setData={setData} onAdd={r => handleAdd('slaRecords', r)} onUpdate={r => handleUpdate('slaRecords', r)} onDelete={r => handleDelete('slaRecords', r)}/>;
      case 'billing-cost': 
        return <BillingCostPage data={data} setData={setData} onAdd={r => handleAdd('billingRecords', r)} onUpdate={r => handleUpdate('billingRecords', r)} onDelete={r => handleDelete('billingRecords', r)}/>;
      case 'fsm-analytics': 
        return <FsmAnalyticsPage data={data} setData={setData}/>;
      default: return null;
    }
  };

  const sysConfig = data.systemSettings?.find(d => d.id === 'config') || {};
  
  const fontStyles = {
    Small: { fontSize: '11px' },
    Medium: { fontSize: '13px' },
    Large: { fontSize: '14.5px' }
  };
  const activeFontSizeStyle = fontStyles[sysConfig.fontSize || 'Medium'];

  const meta = MODULE_META[view] || {title: 'Projects', desc: 'Full lifecycle management — templates, phases, tasks, milestones, and baselines', group: 'Work Management'};
  const grp = groupOfKey(view);

  return (
    <div className="app-shell" style={activeFontSizeStyle}>
      {/* Mobile background overlay */}
      {!isSidebarCollapsed && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarCollapsed(true)} />
      )}

      {/* Sliding Sidebar */}
      <aside className={`sidebar ${isSidebarCollapsed ? 'collapsed' : ''}`}>
        {/* Brand logo container */}
        <div className="brand" style={{ justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', padding: '16px 12px' }}>
          {sysConfig.logoUrl ? (
            <img 
              src={sysConfig.logoUrl} 
              alt="Company Logo" 
              style={{ 
                height: '30px', 
                maxWidth: isSidebarCollapsed ? '48px' : '180px', 
                objectFit: 'contain' 
              }} 
            />
          ) : (
            <>
              <div className="brand-mark" style={{ background: sysConfig.themeColor || 'var(--teal-500)' }}>N</div>
              {!isSidebarCollapsed && (
                <div>
                  <div className="brand-name">Nexus Suite</div>
                  <div className="brand-sub">PPM · Field Ops</div>
                </div>
              )}
            </>
          )}
        </div>
        
        {/* Dynamic Accordion Nav List (Role-Filtered!) */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '10px 0' }}>
          {visibleNav.map(g => {
            const isGroupExpanded = !!expandedGroups[g.key];
            const groupIcon = GROUP_ICONS[g.key] || '📁';
            
            return (
              <div className="nav-group" key={g.key} style={{ padding: '0 8px 4px 8px' }}>
                <div 
                  className="nav-group-label" 
                  onClick={() => {
                    if (isSidebarCollapsed) {
                      setIsSidebarCollapsed(false); 
                    }
                    toggleGroup(g.key);
                  }}
                  style={{ 
                    cursor: 'pointer', 
                    display: 'flex', 
                    alignItems: 'center', 
                    justifyContent: isSidebarCollapsed ? 'center' : 'space-between',
                    padding: '10px',
                    borderRadius: '6px',
                    userSelect: 'none',
                    color: isGroupExpanded && !isSidebarCollapsed ? '#fff' : '#8fa0b8',
                    background: isGroupExpanded && !isSidebarCollapsed ? 'rgba(255,255,255,0.03)' : 'transparent'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '16px' }} title={g.label}>{groupIcon}</span>
                    {!isSidebarCollapsed && <span style={{ fontSize: '11px', fontWeight: 700 }}>{g.label}</span>}
                  </div>
                  
                  {!isSidebarCollapsed && (
                    <span style={{ fontSize: '10px', opacity: 0.7 }}>
                      {isGroupExpanded ? '▼' : '►'}
                    </span>
                  )}
                </div>

                {/* Sub-Items */}
                {(!isSidebarCollapsed && isGroupExpanded) && (
                  <div style={{ marginTop: '4px', borderLeft: '1px solid rgba(255,255,255,0.06)', marginLeft: '16px', paddingLeft: '4px' }}>
                    {g.items.map((it) => {
                      const itemIcon = ITEM_ICONS[it.key] || '•';
                      return (
                        <div 
                          className={`nav-item ${view === it.key ? 'active' : ''}`} 
                          key={it.key}
                          onClick={() => {
                            go(it.key);
                            setActiveProjectId(null); // Reset workspace state on direct sidebar clicks
                            if (window.innerWidth <= 768) {
                              setIsSidebarCollapsed(true); 
                            }
                          }}
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                        >
                          <span style={{ fontSize: '12px' }}>{itemIcon}</span>
                          <span>{it.label}</span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Pinned Bottom Area: Toggle Button + Proprietary Footer */}
        <div style={{ marginTop: 'auto', borderTop: '1px solid var(--slate-200)', background: 'var(--slate-50)' }}>
          <div style={{ display: 'flex', justifyContent: isSidebarCollapsed ? 'center' : 'flex-start', padding: '12px 18px' }}>
            <button 
              className="btn btn-sm" 
              style={{ 
                background: 'transparent', 
                color: 'var(--slate-600)', 
                border: 'none', 
                fontSize: '12.5px', 
                fontWeight: 600,
                cursor: 'pointer', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '8px',
                padding: 0
              }}
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              title={isSidebarCollapsed ? "Expand Menu" : "Collapse Menu"}
            >
              {isSidebarCollapsed ? '»' : <span>« Collapse Menu</span>}
            </button>
          </div>

          {!isSidebarCollapsed && (
            <div className="sidebar-footer" style={{ padding: '0 18px 16px 18px', borderTop: 'none', background: 'transparent' }}>
              <div style={{ fontSize: '8.5px', opacity: 0.7, color: 'var(--slate-500)', textTransform: 'uppercase', letterSpacing: '0.05em', lineHeight: '1.4' }}>
                Proprietary of ZidokaX Technologies Ind Pvt Ltd
              </div>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content Window */}
      <div className="main">
        {/* Top Active Cloud Environment Banner */}
        <div style={{ 
          background: 'linear-gradient(90deg, #152741, #0f1b2d)', 
          color: '#fff', 
          padding: '8px 28px', 
          fontSize: '11.5px', 
          fontWeight: 500, 
          letterSpacing: '0.04em',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          borderBottom: '1px solid rgba(255,255,255,0.1)'
        }}>
          <span>🚀 Nexus PPM + Field Ops Enterprise Edition — Active cloud environment (`ppm-fsm-2`)</span>
          <span style={{ fontSize: '10px', opacity: 0.8, background: '#16a34a', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>LIVE</span>
        </div>

        {/* Topbar featuring responsive burger toggle */}
        <div className="topbar" style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-start' }}>
          <button 
            className="mobile-menu-btn" 
            onClick={() => setIsSidebarCollapsed(false)}
            title="Open Menu"
          >
            ☰
          </button>
          
          <div>
            <div className="crumb">{grp ? grp.label : 'Overview'}</div>
            <div className="page-title">{meta.title}</div>
            <div className="page-desc">{meta.desc}</div>
          </div>
        </div>
        <div className="content">{renderView()}</div>
      </div>
    </div>
  );
}

export default App;