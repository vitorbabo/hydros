import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, X, Minimize2, Maximize2, Trash2 } from 'lucide-react';
import { useAnalyticsStore, QueryContext } from '../../store/analyticsStore';
import { useAuthStore } from '../../store/authStore';
import { formatDistanceToNow } from 'date-fns';

interface AIAssistantProps {
  context: QueryContext;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  onClose?: () => void;
}

export const AIAssistant: React.FC<AIAssistantProps> = ({
  context,
  isCollapsed = false,
  onToggleCollapse,
  onClose,
}) => {
  const [input, setInput] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const { currentConversation, isLoadingAI, queryAI, startNewConversation, clearCurrentConversation } = useAnalyticsStore();
  const { user } = useAuthStore();

  useEffect(() => {
    if (!currentConversation && user) {
      startNewConversation(user.email, context);
    }
  }, [currentConversation, user, context, startNewConversation]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [currentConversation?.messages]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoadingAI || !user) return;

    const question = input.trim();
    setInput('');

    await queryAI(question, context, user.email);

    // Focus back on input
    inputRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e);
    }
  };

  const suggestedQuestions = [
    "What was the average turbidity level last week?",
    "Compare water quality across all sites",
    "Show me sites with chlorine levels above normal",
    "Why did the flow rate spike yesterday?",
    "Which site has the best efficiency?",
  ];

  if (isCollapsed) {
    return (
      <div className="fixed bottom-6 right-6 z-50">
        <button
          onClick={onToggleCollapse}
          className="p-4 bg-[#135bec] text-white rounded-full shadow-lg hover:bg-[#0d47c1] transition-colors"
        >
          <Bot size={24} />
        </button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-white dark:bg-gray-800 border-l border-gray-200 dark:border-gray-700">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-[#135bec] rounded-lg">
            <Bot className="text-white" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">AI Assistant</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              Ask questions about your data
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {currentConversation && currentConversation.messages.length > 0 && (
            <button
              onClick={() => {
                if (window.confirm('Clear conversation history?')) {
                  clearCurrentConversation();
                  if (user) {
                    startNewConversation(user.email, context);
                  }
                }
              }}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Clear conversation"
            >
              <Trash2 size={16} className="text-gray-600 dark:text-gray-400" />
            </button>
          )}
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Minimize"
            >
              <Minimize2 size={16} className="text-gray-600 dark:text-gray-400" />
            </button>
          )}
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors"
              title="Close"
            >
              <X size={16} className="text-gray-600 dark:text-gray-400" />
            </button>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {!currentConversation || currentConversation.messages.length === 0 ? (
          <div className="space-y-4">
            <div className="text-center text-gray-600 dark:text-gray-400">
              <Bot className="mx-auto mb-2 text-gray-400 dark:text-gray-500" size={48} />
              <p className="font-medium">Welcome to AI Assistant</p>
              <p className="text-sm mt-1">
                I can help you analyze your water treatment data and answer questions
              </p>
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Try asking:
              </p>
              {suggestedQuestions.map((question, index) => (
                <button
                  key={index}
                  onClick={() => setInput(question)}
                  className="w-full text-left p-3 text-sm bg-gray-50 dark:bg-gray-900 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                >
                  {question}
                </button>
              ))}
            </div>
          </div>
        ) : (
          currentConversation.messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 bg-[#135bec] rounded-full flex items-center justify-center">
                  <Bot className="text-white" size={16} />
                </div>
              )}
              <div
                className={`max-w-[80%] ${
                  message.role === 'user'
                    ? 'bg-[#135bec] text-white'
                    : 'bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-white'
                } rounded-lg p-3`}
              >
                <div className="text-sm whitespace-pre-wrap">{message.content}</div>
                {message.dataReferences && message.dataReferences.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-300 dark:border-gray-700">
                    <div className="text-xs text-gray-600 dark:text-gray-400">
                      Data sources: {message.dataReferences.join(', ')}
                    </div>
                  </div>
                )}
                <div className="text-xs mt-1 opacity-70">
                  {formatDistanceToNow(new Date(message.timestamp))} ago
                </div>
              </div>
              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 bg-gray-300 dark:bg-gray-600 rounded-full flex items-center justify-center">
                  <User className="text-gray-700 dark:text-gray-300" size={16} />
                </div>
              )}
            </div>
          ))
        )}

        {isLoadingAI && (
          <div className="flex gap-3">
            <div className="flex-shrink-0 w-8 h-8 bg-[#135bec] rounded-full flex items-center justify-center">
              <Bot className="text-white" size={16} />
            </div>
            <div className="bg-gray-100 dark:bg-gray-900 rounded-lg p-3">
              <div className="flex gap-1">
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <div className="w-2 h-2 bg-gray-400 dark:bg-gray-600 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <form onSubmit={handleSubmit} className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex gap-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Ask a question about your water treatment data..."
            className="flex-1 px-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 text-gray-900 dark:text-white resize-none focus:ring-2 focus:ring-[#135bec] focus:border-transparent"
            rows={2}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoadingAI}
            className="px-4 py-2 bg-[#135bec] text-white rounded-lg hover:bg-[#0d47c1] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Send size={20} />
          </button>
        </div>
        <div className="text-xs text-gray-500 dark:text-gray-500 mt-2">
          Press Enter to send, Shift+Enter for new line
        </div>
      </form>
    </div>
  );
};

export default AIAssistant;
