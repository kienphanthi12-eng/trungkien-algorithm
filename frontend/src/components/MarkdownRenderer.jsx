import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';

/**
 * Component render nội dung Markdown có hỗ trợ công thức Toán học LaTeX.
 * Hỗ trợ: $x^2$ (inline) và $$x^2$$ (block).
 */
export default function MarkdownRenderer({ content, className = "" }) {
  if (!content) return null;

  return (
    <div className={`prose prose-slate max-w-none ${className}`}>
      <ReactMarkdown
        remarkPlugins={[remarkMath]}
        rehypePlugins={[rehypeKatex]}
        components={{
          // Tùy chỉnh các thẻ HTML nếu cần (ví dụ: link mở tab mới)
          a: ({ node, ...props }) => <a {...props} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline" />,
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto my-4">
              <table {...props} className="min-w-full divide-y divide-gray-200 border border-gray-200 rounded-lg" />
            </div>
          ),
          th: ({ node, ...props }) => <th {...props} className="px-4 py-2 bg-gray-50 font-bold text-left text-sm" />,
          td: ({ node, ...props }) => <td {...props} className="px-4 py-2 border-t border-gray-100 text-sm" />,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
