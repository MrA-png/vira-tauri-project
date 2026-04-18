import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { vscDarkPlus } from "react-syntax-highlighter/dist/esm/styles/prism";
import { Message } from "../../services/ai";

interface ChatMessageProps {
  message: Message;
}

export const ChatMessage: React.FC<ChatMessageProps> = ({ message }) => {
  const isUser = message.role === "user";
  
  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
      <div 
        className={`max-w-[90%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed shadow-lg ${
          isUser 
            ? "bg-sky-600/20 text-sky-100 border border-sky-500/20 rounded-tr-none" 
            : "bg-white/5 text-slate-200 border border-white/5 rounded-tl-none"
        }`}
      >
        <div className="markdown-container prose prose-invert prose-sm max-w-none">
          <ReactMarkdown
            remarkPlugins={[remarkGfm, remarkMath]}
            rehypePlugins={[rehypeKatex]}
            components={{
              code({ node, inline, className, children, ...props }: any) {
                const match = /language-(\w+)/.exec(className || "");
                return !inline && match ? (
                  <div className="rounded-lg overflow-hidden my-2">
                    <SyntaxHighlighter
                      style={vscDarkPlus}
                      language={match[1]}
                      PreTag="div"
                      {...props}
                    >
                      {String(children).replace(/\n$/, "")}
                    </SyntaxHighlighter>
                  </div>
                ) : (
                  <code className={`${className} bg-white/10 px-1 rounded`} {...props}>
                    {children}
                  </code>
                );
              },
              // Style other markdown elements
              p: ({ children }) => <p className="mb-2 last:mb-0 leading-relaxed">{children}</p>,
              ul: ({ children }) => <ul className="list-disc ml-4 mb-2">{children}</ul>,
              ol: ({ children }) => <ol className="list-decimal ml-4 mb-2">{children}</ol>,
              li: ({ children }) => <li className="mb-1">{children}</li>,
              strong: ({ children }) => <strong className="font-bold text-sky-300">{children}</strong>,
              hr: () => <hr className="border-white/10 my-4" />,
              // Explicitly style block math for better spacing
              div: ({ className, children }) => {
                if (className?.includes('math-display')) {
                  return <div className="my-4 overflow-x-auto py-2 bg-white/5 rounded-lg px-2 flex justify-center text-sky-200">{children}</div>;
                }
                return <div className={className}>{children}</div>;
              }
            }}
          >
            {message.text}
          </ReactMarkdown>
        </div>
      </div>
    </div>
  );
};

export const ChatLoading: React.FC = () => (
  <div className="flex justify-start">
    <div className="bg-white/5 border border-white/5 px-4 py-2.5 rounded-2xl rounded-tl-none shadow-lg">
      <div className="flex space-x-1">
        <div className="h-1.5 w-1.5 bg-sky-500/50 rounded-full animate-bounce" />
        <div className="h-1.5 w-1.5 bg-sky-500/50 rounded-full animate-bounce [animation-delay:0.2s]" />
        <div className="h-1.5 w-1.5 bg-sky-500/50 rounded-full animate-bounce [animation-delay:0.4s]" />
      </div>
    </div>
  </div>
);
