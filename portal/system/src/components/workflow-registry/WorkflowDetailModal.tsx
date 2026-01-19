import { useState } from 'react';
import { useUI } from '../../providers/UIProvider';
import type { Workflow } from './workflow-detail/types';
import WorkflowBasicSection from './workflow-detail/WorkflowBasicSection';
import WorkflowStepsSection from './workflow-detail/WorkflowStepsSection';
import WorkflowResolversSection from './workflow-detail/WorkflowResolversSection';
import WorkflowKeywordsSection from './workflow-detail/WorkflowKeywordsSection';
import WorkflowPromptsSection from './workflow-detail/WorkflowPromptsSection';

interface WorkflowDetailModalProps {
  workflow: Workflow;
  onClose: () => void;
  onUpdate: () => void;
}

export default function WorkflowDetailModal({ workflow, onClose, onUpdate }: WorkflowDetailModalProps) {
  // Accordion state
  type SectionType = 'BASIC' | 'PROMPTS' | 'STEPS' | 'RESOLVERS' | 'KEYWORDS';
  const [activeSection, setActiveSection] = useState<SectionType>('BASIC');
  const [isChildEditing, setIsChildEditing] = useState(false);
  const { } = useUI();

  const handleEditStateChange = (isEditing: boolean) => {
    setIsChildEditing(isEditing);
  };

  const handleMaskClick = () => {
    if (isChildEditing) {
      // Silently block closing
      return;
    }
    onClose();
  };

  return (
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(0,0,0,0.7)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 9999,
        backdropFilter: 'blur(4px)'
      }}
      onClick={handleMaskClick}
    >
      <div 
        className="panel"
        style={{
          width: '800px',
          height: '80vh',
          display: 'flex',
          flexDirection: 'column',
          background: '#0d1117',
          border: '1px solid #30363d',
          boxShadow: '0 12px 48px rgba(0,0,0,0.6)',
          borderRadius: '8px'
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="panel-title" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span>WORKFLOW :: {workflow.id.toUpperCase()}</span>
            {workflow.status === 'DELETED' && (
              <span style={{ fontSize: '10px', padding: '2px 6px', background: 'rgba(255,0,0,0.2)', color: '#e74c3c', borderRadius: '3px' }}>
                DELETED
              </span>
            )}
          </div>
          <button 
            onClick={onClose}
            style={{ border: 'none', background: 'transparent', color: '#8b949e', padding: 0, fontSize: '18px', cursor: 'pointer' }}
          >
            ×
          </button>
        </div>

        {/* Content with Accordion */}
        <div className="panel-content" style={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column', padding: 0 }}>
          
          {/* 1. BASIC INFO */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: activeSection === 'BASIC' ? 1 : '0 0 auto' }}>
             <div 
                onClick={() => setActiveSection('BASIC')}
                style={{
                    padding: '12px 16px',
                    background: '#161b22',
                    borderBottom: '1px solid #30363d',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontWeight: 600, fontSize: '12px', color: activeSection === 'BASIC' ? '#58a6ff' : '#c9d1d9'
                }}
             >
                <span>WORKFLOW BASIC</span>
                <span style={{ fontSize: '10px', opacity: 0.7 }}>{activeSection === 'BASIC' ? '▼' : '▶'}</span>
             </div>
             {activeSection === 'BASIC' && (
               <div style={{ flex: 1, overflowY: 'auto' }}>
                 <WorkflowBasicSection 
                   workflow={workflow} 
                   onUpdate={onUpdate}
                   onEditStateChange={handleEditStateChange}
                 />
               </div>
             )}
          </div>

          {/* 1.5 PROMPTS & INTENT */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: activeSection === 'PROMPTS' ? 1 : '0 0 auto' }}>
             <div 
                onClick={() => setActiveSection('PROMPTS')}
                style={{
                    padding: '12px 16px',
                    background: '#161b22',
                    borderBottom: '1px solid #30363d',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontWeight: 600, fontSize: '12px', color: activeSection === 'PROMPTS' ? '#58a6ff' : '#c9d1d9'
                }}
             >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>PROMPTS & INTENT</span>
                    <span style={{ fontSize: '10px', opacity: 0.5, fontWeight: 'normal' }}>AI matching config</span>
                </div>
                <span style={{ fontSize: '10px', opacity: 0.7 }}>{activeSection === 'PROMPTS' ? '▼' : '▶'}</span>
             </div>
             {activeSection === 'PROMPTS' && (
               <div style={{ flex: 1, overflowY: 'auto' }}>
                 <WorkflowPromptsSection 
                   workflow={workflow} 
                   onUpdate={onUpdate}
                   onEditStateChange={handleEditStateChange}
                 />
               </div>
             )}
          </div>

          {/* 2. STEPS */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: activeSection === 'STEPS' ? 1 : '0 0 auto' }}>
            <div 
                onClick={() => setActiveSection('STEPS')}
                style={{
                    padding: '12px 16px',
                    background: '#161b22',
                    borderBottom: '1px solid #30363d',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontWeight: 600, fontSize: '12px', color: activeSection === 'STEPS' ? '#58a6ff' : '#c9d1d9'
                }}
             >
                <span>WORKFLOW STEPS ({workflow.steps?.length || 0})</span>
                <span style={{ fontSize: '10px', opacity: 0.7 }}>{activeSection === 'STEPS' ? '▼' : '▶'}</span>
             </div>
             {activeSection === 'STEPS' && (
               <div style={{ flex: 1, overflowY: 'auto' }}>
                 <WorkflowStepsSection 
                   workflow={workflow}
                   onUpdate={onUpdate}
                   onEditStateChange={handleEditStateChange}
                 />
               </div>
             )}
          </div>

          {/* 3. RESOLVERS */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: activeSection === 'RESOLVERS' ? 1 : '0 0 auto' }}>
            <div 
                onClick={() => setActiveSection('RESOLVERS')}
                style={{
                    padding: '12px 16px',
                    background: '#161b22',
                    borderBottom: '1px solid #30363d',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontWeight: 600, fontSize: '12px', color: activeSection === 'RESOLVERS' ? '#58a6ff' : '#c9d1d9'
                }}
             >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>RESOLVERS ({workflow.resolvers ? Object.keys(workflow.resolvers).length : 0})</span>
                    <span style={{ fontSize: '10px', opacity: 0.5, fontWeight: 'normal' }}>Name → ID auto-lookup</span>
                </div>
                <span style={{ fontSize: '10px', opacity: 0.7 }}>{activeSection === 'RESOLVERS' ? '▼' : '▶'}</span>
             </div>
             {activeSection === 'RESOLVERS' && (
               <div style={{ flex: 1, overflowY: 'auto' }}>
                 <WorkflowResolversSection 
                   workflow={workflow}
                   onUpdate={onUpdate}
                   onEditStateChange={handleEditStateChange}
                 />
               </div>
             )}
          </div>

          {/* 4. KEYWORDS */}
          <div style={{ display: 'flex', flexDirection: 'column', overflow: 'hidden', flex: activeSection === 'KEYWORDS' ? 1 : '0 0 auto' }}>
            <div 
                onClick={() => setActiveSection('KEYWORDS')}
                style={{
                    padding: '12px 16px',
                    background: '#161b22',
                    borderBottom: '1px solid #30363d',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    fontWeight: 600, fontSize: '12px', color: activeSection === 'KEYWORDS' ? '#58a6ff' : '#c9d1d9'
                }}
             >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span>KEYWORDS ({workflow.keywords?.length || 0})</span>
                    <span style={{ fontSize: '10px', opacity: 0.5, fontWeight: 'normal' }}>Semantic tags</span>
                </div>
                <span style={{ fontSize: '10px', opacity: 0.7 }}>{activeSection === 'KEYWORDS' ? '▼' : '▶'}</span>
             </div>
             {activeSection === 'KEYWORDS' && (
               <div style={{ flex: 1, overflowY: 'auto' }}>
                 <WorkflowKeywordsSection 
                   workflow={workflow}
                   onUpdate={onUpdate}
                   onEditStateChange={handleEditStateChange} // Added specifically for Keywords if it accepts it, otherwise wrapper is safe
                 />
               </div>
             )}
          </div>
        </div>
      </div>
    </div>
  );
}
