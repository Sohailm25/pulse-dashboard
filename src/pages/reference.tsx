import { useState, useEffect } from 'react';
// import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Save, Edit2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/stores/auth-store';

console.log('ReferencePage component loaded');

const DEFAULT_CONTENT = '# Reference Guide\n\nAdd your notes here...\n\n## Features\n\n- Supports **bold** and *italic* text\n- Creates [links](https://example.com)\n- Makes lists\n  - With nested items\n  - And more\n- Handles `inline code` and code blocks\n\n```javascript\nconst example = "This is a code block";\nconsole.log(example);\n```\n\n## Tables\n\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n| Cell 3   | Cell 4   |';

// Markdown styling without depending on @tailwindcss/typography plugin
const markdownStyles = {
  container: {
    fontFamily: 'system-ui, sans-serif',
    lineHeight: 1.6,
    color: '#333',
  },
  h1: {
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '1rem',
    marginTop: '1.5rem',
  },
  h2: {
    fontSize: '1.5rem',
    fontWeight: 'bold',
    marginBottom: '0.75rem',
    marginTop: '1.5rem',
  },
  p: {
    marginBottom: '1rem',
  },
  ul: {
    listStyleType: 'disc',
    paddingLeft: '2rem',
    marginBottom: '1rem',
  },
  ol: {
    listStyleType: 'decimal',
    paddingLeft: '2rem',
    marginBottom: '1rem',
  },
  li: {
    marginBottom: '0.25rem',
  },
  code: {
    backgroundColor: '#f0f0f0',
    padding: '0.25rem',
    borderRadius: '0.25rem',
    fontFamily: 'monospace',
    fontSize: '0.9em',
  },
  pre: {
    backgroundColor: '#f5f5f5',
    padding: '1rem',
    borderRadius: '0.5rem',
    overflowX: 'auto',
    marginBottom: '1rem',
  },
  table: {
    borderCollapse: 'collapse',
    width: '100%',
    marginBottom: '1rem',
  },
  th: {
    borderBottom: '2px solid #ddd',
    padding: '0.5rem',
    textAlign: 'left',
  },
  td: {
    borderBottom: '1px solid #ddd',
    padding: '0.5rem',
  },
};

export function ReferencePage() {
  console.log('ReferencePage rendering');
  
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState(DEFAULT_CONTENT);

  useEffect(() => {
    console.log('ReferencePage useEffect - user:', user);
    if (typeof window !== 'undefined' && user) {
      try {
        const savedContent = localStorage.getItem(`referenceContent-${user.id}`);
        if (savedContent) {
          setContent(savedContent);
        }
      } catch (error) {
        console.error('Error accessing localStorage:', error);
        // Keep the default content if localStorage is not available
      }
    }
  }, [user]);

  const handleSave = () => {
    if (typeof window !== 'undefined' && user) {
      try {
        localStorage.setItem(`referenceContent-${user.id}`, content);
        setIsEditing(false);
      } catch (error) {
        console.error('Error saving to localStorage:', error);
        // Show an error message to the user
        alert('Failed to save your content. Please try again.');
      }
    }
  };

  console.log('Rendering reference page with content length:', content.length);

  // Custom components for ReactMarkdown to use our inline styles
  const components = {
    h1: (props) => <h1 style={markdownStyles.h1} {...props} />,
    h2: (props) => <h2 style={markdownStyles.h2} {...props} />,
    p: (props) => <p style={markdownStyles.p} {...props} />,
    ul: (props) => <ul style={markdownStyles.ul} {...props} />,
    ol: (props) => <ol style={markdownStyles.ol} {...props} />,
    li: (props) => <li style={markdownStyles.li} {...props} />,
    code: (props) => <code style={markdownStyles.code} {...props} />,
    pre: (props) => <pre style={markdownStyles.pre} {...props} />,
    table: (props) => <table style={markdownStyles.table} {...props} />,
    th: (props) => <th style={markdownStyles.th} {...props} />,
    td: (props) => <td style={markdownStyles.td} {...props} />,
  };

  return (
    <div 
      className="max-w-4xl mx-auto p-4" 
      style={{ 
        border: '1px solid #ccc',
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '20px',
        margin: '20px auto',
        boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
      }}
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h1 
            className="text-2xl font-bold dark:text-white"
            style={{ color: '#333' }}
          >
            Reference Guide
          </h1>
          <button
            onClick={isEditing ? handleSave : () => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
            style={{ 
              backgroundColor: '#7c3aed',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}
          >
            {isEditing ? (
              <>
                <Save className="w-4 h-4" />
                Save
              </>
            ) : (
              <>
                <Edit2 className="w-4 h-4" />
                Edit
              </>
            )}
          </button>
        </div>

        {isEditing ? (
          <Textarea
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[500px] font-mono"
            style={{
              width: '100%',
              minHeight: '500px',
              padding: '12px',
              border: '1px solid #ddd',
              borderRadius: '4px',
              fontFamily: 'monospace'
            }}
            placeholder="Write your markdown content here..."
          />
        ) : (
          <div 
            style={{
              border: '1px solid #eee',
              padding: '20px',
              borderRadius: '4px',
              backgroundColor: '#fcfcfc',
              minHeight: '500px',
              overflow: 'auto',
              ...markdownStyles.container
            }}
          >
            {/* Ensure content is shown */}
            <div style={{ marginBottom: '20px', fontSize: '14px', color: '#777' }}>
              <strong>Preview Mode</strong> - Edit to make changes
            </div>
            
            {/* Actual markdown content with custom components to handle styling */}
            <ReactMarkdown 
              remarkPlugins={[remarkGfm]}
              components={components}
            >
              {content}
            </ReactMarkdown>
          </div>
        )}
      </div>
    </div>
  );
}

export default ReferencePage;