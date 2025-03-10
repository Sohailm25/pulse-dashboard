import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Save, Edit2 } from 'lucide-react';
import { Textarea } from '@/components/ui/textarea';
import { useAuthStore } from '@/stores/auth-store';

console.log('ReferencePage component loaded');

export function ReferencePage() {
  console.log('ReferencePage rendering');
  
  const { user } = useAuthStore();
  const [isEditing, setIsEditing] = useState(false);
  const [content, setContent] = useState('');

  useEffect(() => {
    console.log('ReferencePage useEffect - user:', user);
    if (user) {
      const savedContent = localStorage.getItem(`referenceContent-${user.id}`) || '# Reference Guide\n\nAdd your notes here...\n\n## Features\n\n- Supports **bold** and *italic* text\n- Creates [links](https://example.com)\n- Makes lists\n  - With nested items\n  - And more\n- Handles `inline code` and code blocks\n\n```javascript\nconst example = "This is a code block";\nconsole.log(example);\n```\n\n## Tables\n\n| Header 1 | Header 2 |\n|----------|----------|\n| Cell 1   | Cell 2   |\n| Cell 3   | Cell 4   |';
      setContent(savedContent);
    }
  }, [user]);

  const handleSave = () => {
    if (user) {
      localStorage.setItem(`referenceContent-${user.id}`, content);
      setIsEditing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="max-w-4xl mx-auto"
    >
      <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <h1 className="text-2xl font-bold dark:text-white">Reference Guide</h1>
          <button
            onClick={isEditing ? handleSave : () => setIsEditing(true)}
            className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary/90"
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
            placeholder="Write your markdown content here..."
          />
        ) : (
          <div className="prose dark:prose-invert max-w-none">
            <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
          </div>
        )}
      </div>
    </motion.div>
  );
}

export default ReferencePage;