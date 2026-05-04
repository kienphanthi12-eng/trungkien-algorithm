import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/**
 * Component render nội dung Markdown có hỗ trợ công thức Toán học LaTeX.
 * Hỗ trợ: $x^2$ (inline) và $$x^2$$ (block).
 */
export default function MarkdownRenderer({ content, className = "" }) {
  if (!content) return null;

  // Tiền xử lý để hỗ trợ các ký tự LaTeX mà AI hay sinh ra (như \( \) hoặc \[ \])
  const preProcessContent = (text) => {
    return text
      .replace(/\\\((.*?)\\\)/g, '$$$1$$') // Chuyển \( \) thành $ $
      .replace(/\\\[(.*?)\\\]/g, '$$$$$1$$$$'); // Chuyển \[ \] thành $$ $$
  };

  const processedContent = preProcessContent(content);

  return (
    <div className={`prose prose-slate max-w-none prose-math:my-4 ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Tùy chỉnh các thẻ HTML nếu cần (ví dụ: link mở tab mới)
          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" />,
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-6">
              <table {...props} className="min-w-full border-collapse border border-slate-300 rounded-lg overflow-hidden shadow-sm" />
            </div>
          ),
          thead: ({ node, ...props }) => <thead {...props} className="bg-slate-50" />,
          th: ({ node, ...props }) => (
            <th {...props} className="border border-slate-300 px-4 py-2.5 text-left text-sm font-bold text-slate-700 bg-slate-100/50" />
          ),
          td: ({ node, ...props }) => (
            <td {...props} className="border border-slate-300 px-4 py-2 text-sm text-slate-600 bg-white" />
          ),
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
}
