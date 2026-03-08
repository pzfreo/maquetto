import { useEffect } from 'react';
import { useAppStore } from '../../store';
import { useProjects } from '../../hooks/useProjects';

interface ProjectListModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function ProjectListModal({ isOpen, onClose }: ProjectListModalProps) {
  const projectList = useAppStore((s) => s.projectList);
  const projectLoading = useAppStore((s) => s.projectLoading);
  const currentProject = useAppStore((s) => s.currentProject);
  const { loadProjectList, openProject, removeProject } = useProjects();

  useEffect(() => {
    if (isOpen) {
      void loadProjectList();
    }
  }, [isOpen, loadProjectList]);

  if (!isOpen) return null;

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.6)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        style={{
          background: '#1e1e2e',
          borderRadius: '12px',
          border: '1px solid #333',
          width: '500px',
          maxHeight: '70vh',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
        }}
      >
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '16px 20px',
            borderBottom: '1px solid #333',
          }}
        >
          <h2 style={{ margin: 0, fontSize: '16px', color: '#e0e0e0' }}>
            My Projects
          </h2>
          <button
            onClick={onClose}
            style={{
              background: 'transparent',
              border: 'none',
              color: '#888',
              fontSize: '18px',
              cursor: 'pointer',
              padding: '2px 6px',
            }}
          >
            x
          </button>
        </div>

        <div style={{ flex: 1, overflow: 'auto', padding: '8px 0' }}>
          {projectLoading ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
              Loading...
            </div>
          ) : projectList.length === 0 ? (
            <div style={{ padding: '20px', textAlign: 'center', color: '#888' }}>
              No saved projects yet. Use Save to Cloud to save your first project.
            </div>
          ) : (
            projectList.map((project) => (
              <div
                key={project.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '10px 20px',
                  borderBottom: '1px solid #2a2a3e',
                  background: currentProject?.id === project.id ? '#2a2a4e' : 'transparent',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      color: '#e0e0e0',
                      fontSize: '14px',
                      fontWeight: 500,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {project.title}
                  </div>
                  <div style={{ color: '#888', fontSize: '11px', marginTop: '2px' }}>
                    {new Date(project.updatedAt).toLocaleDateString()} {new Date(project.updatedAt).toLocaleTimeString()}
                  </div>
                </div>
                <button
                  onClick={() => {
                    openProject(project);
                    onClose();
                  }}
                  style={{
                    padding: '4px 12px',
                    borderRadius: '4px',
                    border: '1px solid #4a9eff',
                    background: 'transparent',
                    color: '#4a9eff',
                    fontSize: '12px',
                    cursor: 'pointer',
                    marginLeft: '8px',
                    flexShrink: 0,
                  }}
                >
                  Open
                </button>
                <button
                  onClick={() => {
                    if (confirm(`Delete "${project.title}"?`)) {
                      void removeProject(project.id);
                    }
                  }}
                  style={{
                    padding: '4px 8px',
                    borderRadius: '4px',
                    border: '1px solid #666',
                    background: 'transparent',
                    color: '#888',
                    fontSize: '12px',
                    cursor: 'pointer',
                    marginLeft: '4px',
                    flexShrink: 0,
                  }}
                >
                  Del
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
