import React, { useState } from 'react';
import { Badge, CrudPanel, Tabs, Toast } from '../seed';
import { ProjectPropertiesPage, BaselinesPage } from './WorkPages';
import { TasksModulePage, StatusModulePage, RicModulePage, ChecklistsModulePage, AgreementsModulePage } from './ExecutionPages';
import { CostPlansPage, BenefitPlansPage, BudgetsPage } from './FinancialPages';
import { StaffingPage } from './ResourcePages';

export function ProjectWorkspacePage({ projectId, onBack, data, handleAdd, handleUpdate, handleDelete }) {
  const [activeSubTab, setActiveSubTab] = useState('properties');
  const [expandedFolders, setExpandedGroups] = useState({
    admin: true,
    resources: false,
    financials: false,
    execution: false,
    governance: false
  });
  
  const [toast, setToast] = useState('');
  const project = data.projects.find(p => p.id === projectId);

  const toggleFolder = (key) => {
    setExpandedGroups(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // 17-Tab Folder Group Configuration
  const FOLDER_GROUPS = [
    {
      key: 'admin',
      label: '📋 Properties & Setup',
      items: [
        { key: 'properties', label: 'Properties' },
        { key: 'assumptions', label: 'Assumptions & Constraints' },
        { key: 'closure', label: 'Project Closure' },
        { key: 'stagegate', label: 'Stagegate Audit' }
      ]
    },
    {
      key: 'resources',
      label: '👥 Resource Management',
      items: [
        { key: 'staff', label: 'Staff' },
        { key: 'stakeholders', label: 'Stakeholders' },
        { key: 'conversations', label: 'Conversations' }
      ]
    },
    {
      key: 'financials',
      label: '💰 Financial Plans',
      items: [
        { key: 'cost-plans', label: 'Cost Plans' },
        { key: 'benefit-plans', label: 'Benefit Plans' },
        { key: 'budgets', label: 'Budget Plans' }
      ]
    },
    {
      key: 'execution',
      label: '⚙️ Execution & Control',
      items: [
        { key: 'tasks', label: 'Tasks' },
        { key: 'baselines', label: 'Baselines' },
        { key: 'dependencies', label: 'Dependencies' }
      ]
    },
    {
      key: 'governance',
      label: '🚦 Governance',
      items: [
        { key: 'status-reports', label: 'Status (PSR)' },
        { key: 'risks', label: 'Risks' },
        { key: 'issues', label: 'Issues' },
        { key: 'changes', label: 'Changes' },
        { key: 'lessons', label: 'Lessons Learned' }
      ]
    }
  ];

  const renderActiveTab = () => {
    switch (activeSubTab) {
      case 'properties':
        return <ProjectPropertiesPage project={project} onUpdate={(updated) => handleUpdate('projects', updated)} />;
      
      case 'assumptions':
        return (
          <CrudPanel title="Assumptions & Constraints" subtitle="Flat register for active project constraints" accent="indigo"
            rows={data.assumptions?.filter(r => r.projectId === projectId) || []}
            columns={[
              { key: 'type', label: 'Type', strong: true },
              { key: 'description', label: 'Description' },
              { key: 'remarks', label: 'Remarks' },
              { key: 'status', label: 'Status', render: r => <Badge value={r.status}/> }
            ]}
            fields={[
              { key: 'projectId', label: 'Project', type: 'select', options: [{ value: projectId, label: project?.summary?.code || project?.code || projectId }] },
              { key: 'type', label: 'Type', type: 'select', options: ['Assumption', 'Constraint'] },
              { key: 'description', label: 'Description', type: 'textarea', full: true },
              { key: 'remarks', label: 'Remarks', type: 'textarea', full: true },
              { key: 'status', label: 'Status', type: 'select', options: ['Open', 'Resolved', 'Closed'] }
            ]}
            idPrefix="ASM"
            lockProjectId={projectId} // Auto-locks and pre-fills
            onAdd={r => handleAdd('assumptions', { ...r, projectId })}
            onUpdate={r => handleUpdate('assumptions', r)}
            onDelete={r => handleDelete('assumptions', r)}
          />
        );

      case 'closure':
        return (
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Project Sign-Off Checklist</div></div>
            <div className="panel-body grid grid-2">
              <div className="field"><label>Review Status</label><input disabled value={project?.summary?.stage?.includes('Completed') ? 'Approved' : 'Under Review'} style={{ background: '#f5f5f5' }} /></div>
              <div className="field"><label>Customer Has Accepted All Other Deliverables</label><select><option>Yes</option><option>No</option><option>Exception</option></select></div>
              <div className="field"><label>Customer Has Accepted All Project Results</label><select><option>Yes</option><option>No</option><option>Exception</option></select></div>
              <div className="field"><label>Customer Has Accepted All Other Project Requirements</label><select><option>Yes</option><option>No</option><option>Exception</option></select></div>
              <div className="field field-full"><label>Explain Any Exceptions to the Above</label><textarea placeholder="Specify any outstanding client exceptions..." /></div>
              <div className="field field-full"><label>Documentation for the Above Has Been Filed/Archived</label><select><option>Yes</option><option>No</option></select></div>
              <div className="field-full" style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '14px' }}><button className="btn btn-primary" onClick={() => setToast('Sign-off saved to cloud')}>Save Sign-Off Checklists</button></div>
            </div>
          </div>
        );

      case 'stagegate':
        return (
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Stagegate Audit & Governance Lifecycle</div></div>
            <div className="panel-body">
              <table>
                <thead>
                  <tr><th>Stage Gate Name</th><th>Audit Status</th><th>Approved By</th><th>Approved Date</th><th>Reviewed By</th></tr>
                </thead>
                <tbody>
                  {['Startup', 'Initiation', 'Design', 'Build & Test', 'Deploy', 'Closure'].map(stage => (
                    <tr key={stage}>
                      <td className="cell-strong">TYPEA / {stage}</td>
                      <td><Badge value={stage === 'Startup' || stage === 'Initiation' ? 'Completed' : stage === 'Design' ? 'Under Review' : 'Planned'} /></td>
                      <td>{stage === 'Startup' || stage === 'Initiation' ? 'M. Chen' : '—'}</td>
                      <td>{stage === 'Startup' || stage === 'Initiation' ? '2026-04-12' : '—'}</td>
                      <td>Priya Nair</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        );

      case 'staff':
        return <StaffingPage data={data} projectFilter={projectId} lockProjectId={projectId} onAdd={r => handleAdd('resources', r)} onUpdate={r => handleUpdate('resources', r)} onDelete={r => handleDelete('resources', r)} />;
      
      case 'stakeholders':
        return (
          <CrudPanel title="Stakeholders" subtitle="Manage communication stakeholders for this project" accent="purple"
            rows={data.stakeholders?.filter(r => r.projectId === projectId) || []}
            columns={[
              { key: 'name', label: 'Name', strong: true },
              { key: 'company', label: 'Company' },
              { key: 'role', label: 'Role' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
              { key: 'interest', label: 'Interest Level', render: r => <Badge value={r.interest}/> }
            ]}
            fields={[
              { key: 'projectId', label: 'Project', type: 'select', options: [{ value: projectId, label: project?.summary?.code || project?.code || projectId }] },
              { key: 'name', label: 'Name' },
              { key: 'company', label: 'Company' },
              { key: 'role', label: 'Role' },
              { key: 'email', label: 'Email' },
              { key: 'phone', label: 'Phone' },
              { key: 'interest', label: 'Interest Level', type: 'select', options: ['Low', 'Medium', 'High'] }
            ]}
            idPrefix="STK"
            lockProjectId={projectId}
            onAdd={r => handleAdd('stakeholders', { ...r, projectId })}
            onUpdate={r => handleUpdate('stakeholders', r)}
            onDelete={r => handleDelete('stakeholders', r)}
          />
        );

      case 'conversations':
        return (
          <div className="panel">
            <div className="panel-head"><div className="panel-title">Project Conversations Thread</div></div>
            <div className="panel-body">
              <div style={{ background: '#f5f5f5', borderRadius: '8px', padding: '16px', minHeight: '180px', marginBottom: '14px' }}>
                <div style={{ marginBottom: '12px' }}><strong>Diego Alvarez (12:45 PM):</strong> Confirming delivery window with vendor logistics on Site B cabinet cooling components.</div>
                <div><strong>Priya Nair (01:02 PM):</strong> Thanks Diego, make sure to log this on the active issues list once received.</div>
              </div>
              <div className="field-full" style={{ display: 'flex', gap: '8px' }}>
                <input style={{ flex: 1 }} placeholder="Type a message inside this project conversation thread..." />
                <button className="btn btn-primary" onClick={() => setToast('Message posted')}>Send</button>
              </div>
            </div>
          </div>
        );

      case 'cost-plans':
        return <CostPlansPage data={data} projectFilter={projectId} setProjectFilter={() => {}} lockProjectId={projectId} onAdd={r => handleAdd('costPlan', r)} onUpdate={r => handleUpdate('costPlan', r)} onDelete={r => handleDelete('costPlan', r)} />;
      case 'benefit-plans':
        return <BenefitPlansPage data={data} projectFilter={projectId} setProjectFilter={() => {}} lockProjectId={projectId} onAdd={r => handleAdd('benefitPlans', r)} onUpdate={r => handleUpdate('benefitPlans', r)} onDelete={r => handleDelete('benefitPlans', r)} />;
      case 'budgets':
        return <BudgetsPage data={data} projectFilter={projectId} setProjectFilter={() => {}} lockProjectId={projectId} onAdd={r => handleAdd('budgets', r)} onUpdate={r => handleUpdate('budgets', r)} onDelete={r => handleDelete('budgets', r)} />;

      case 'tasks':
        return (
          <TasksModulePage data={data} projectFilter={projectId} setProjectFilter={() => {}} lockProjectId={projectId}
            onAdd={r => handleAdd('tasks', r)} onUpdate={r => handleUpdate('tasks', r)} onDelete={r => handleDelete('tasks', r)}
            onAddTodo={r => handleAdd('todos', r)} onUpdateTodo={r => handleUpdate('todos', r)} onDeleteTodo={r => handleDelete('todos', r)}
          />
        );
      case 'baselines':
        return <BaselinesPage data={data} projectFilter={projectId} setProjectFilter={() => {}} lockProjectId={projectId} onAdd={r => handleAdd('baselines', r)} onUpdate={r => handleUpdate('baselines', r)} onDelete={r => handleDelete('baselines', r)} />;
      case 'dependencies':
        return <AgreementsModulePage data={data} onAdd={r => handleAdd('agreements', r)} onUpdate={r => handleUpdate('agreements', r)} onDelete={r => handleDelete('agreements', r)} />;

      case 'status-reports':
        return <StatusModulePage data={data} projectFilter={projectId} setProjectFilter={() => {}} lockProjectId={projectId} onAdd={r => handleAdd('statusReports', r)} onUpdate={r => handleUpdate('statusReports', r)} onDelete={r => handleDelete('statusReports', r)} />;
      case 'risks':
        return (
          <RicModulePage data={data} projectFilter={projectId} setProjectFilter={() => {}} lockProjectId={projectId}
            onAddRisk={r => handleAdd('risks', r)} onUpdateRisk={r => handleUpdate('risks', r)} onDeleteRisk={r => handleDelete('risks', r)}
            onAddIssue={r => handleAdd('issues', r)} onUpdateIssue={r => handleUpdate('issues', r)} onDeleteIssue={r => handleDelete('issues', r)}
            onAddChange={r => handleAdd('changes', r)} onUpdateChange={r => handleUpdate('changes', r)} onDeleteChange={r => handleDelete('changes', r)}
          />
        );
      case 'issues':
        return (
          <RicModulePage data={data} projectFilter={projectId} setProjectFilter={() => {}} lockProjectId={projectId}
            onAddRisk={r => handleAdd('risks', r)} onUpdateRisk={r => handleUpdate('risks', r)} onDeleteRisk={r => handleDelete('risks', r)}
            onAddIssue={r => handleAdd('issues', r)} onUpdateIssue={r => handleUpdate('issues', r)} onDeleteIssue={r => handleDelete('issues', r)}
            onAddChange={r => handleAdd('changes', r)} onUpdateChange={r => handleUpdate('changes', r)} onDeleteChange={r => handleDelete('changes', r)}
          />
        );
      case 'changes':
        return (
          <RicModulePage data={data} projectFilter={projectId} setProjectFilter={() => {}} lockProjectId={projectId}
            onAddRisk={r => handleAdd('risks', r)} onUpdateRisk={r => handleUpdate('risks', r)} onDeleteRisk={r => handleDelete('risks', r)}
            onAddIssue={r => handleAdd('issues', r)} onUpdateIssue={r => handleUpdate('issues', r)} onDeleteIssue={r => handleDelete('issues', r)}
            onAddChange={r => handleAdd('changes', r)} onUpdateChange={r => handleUpdate('changes', r)} onDeleteChange={r => handleDelete('changes', r)}
          />
        );
      case 'lessons':
        return (
          <CrudPanel title="Lessons Learned" subtitle="Capture experience and recommended behaviors for future projects" accent="green"
            rows={data.lessons?.filter(r => r.projectId === projectId) || []}
            columns={[
              { key: 'name', label: 'Lesson Title', strong: true },
              { key: 'category', label: 'Category' },
              { key: 'reviewStatus', label: 'Review Status', render: r => <Badge value={r.reviewStatus}/> },
              { key: 'action', label: 'Action Undertaken' }
            ]}
            fields={[
              { key: 'projectId', label: 'Project', type: 'select', options: [{ value: projectId, label: project?.summary?.code || project?.code || projectId }] },
              { key: 'name', label: 'Lesson Title' },
              { key: 'category', label: 'Category', type: 'select', options: ['Technical', 'Commercial', 'Regulatory', 'Procurement'] },
              { key: 'action', label: 'Action Undertaken', type: 'textarea', full: true },
              { key: 'lessons', label: 'Lessons Learned', type: 'textarea', full: true },
              { key: 'recommendation', label: 'Recommended Behavior', type: 'textarea', full: true },
              { key: 'reviewStatus', label: 'Review Status', type: 'select', options: ['Draft', 'In Review', 'Approved'] }
            ]}
            idPrefix="LES"
            lockProjectId={projectId}
            onAdd={r => handleAdd('lessons', { ...r, projectId })}
            onUpdate={r => handleUpdate('lessons', r)}
            onDelete={r => handleDelete('lessons', r)}
          />
        );

      default:
        return null;
    }
  };

  return (
    <div style={{ display: 'flex', gap: '20px', minHeight: '75vh', alignItems: 'start' }}>
      
      {/* 1. Left Vertical Sub-Sidebar (17 Tab Accordion) */}
      <aside className="panel" style={{ width: '220px', flexShrink: 0, padding: '10px' }}>
        <div style={{ marginBottom: '14px' }}>
          <button className="btn btn-sm btn-primary" onClick={onBack} style={{ width: '100%' }}>
            ← Back to Projects List
          </button>
        </div>
        
        {FOLDER_GROUPS.map(folder => {
          const isExpanded = !!expandedFolders[folder.key];
          return (
            <div key={folder.key} style={{ marginBottom: '6px' }}>
              <div 
                onClick={() => toggleFolder(folder.key)}
                style={{ 
                  cursor: 'pointer', 
                  fontSize: '11.5px', 
                  fontWeight: 700, 
                  color: 'var(--slate-700)', 
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  padding: '8px 10px', 
                  background: 'var(--slate-100)', 
                  borderRadius: '5px' 
                }}
              >
                <span>{folder.label}</span>
                <span>{isExpanded ? '▼' : '►'}</span>
              </div>
              
              {isExpanded && (
                <div style={{ paddingLeft: '8px', marginTop: '4px', display: 'flex', flexDirection: 'column', gap: '2px' }}>
                  {folder.items.map(item => (
                    <div 
                      key={item.key} 
                      onClick={() => setActiveSubTab(item.key)}
                      style={{ 
                        padding: '6px 10px', 
                        fontSize: '12px', 
                        cursor: 'pointer', 
                        borderRadius: '4px',
                        background: activeSubTab === item.key ? 'var(--blue-50)' : 'transparent',
                        color: activeSubTab === item.key ? 'var(--blue-700)' : 'var(--slate-600)',
                        fontWeight: activeSubTab === item.key ? 600 : 400
                      }}
                    >
                      {item.label}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </aside>

      {/* 2. Main Selected Sub-Tab Render Window */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {renderActiveTab()}
      </div>

      <Toast msg={toast} onDone={() => setToast('')} />
    </div>
  );
} 