import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, AlertCircle, Upload, X, FileText, Sparkles } from 'lucide-react';

const CustomChatbotCreator = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chatbotName, setChatbotName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isChatbotReady, setIsChatbotReady] = useState(false);
  const [sessionId, setSessionId] = useState(null);
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
      // Accept .txt, .docx, .pdf
      const validTypes = ['text/plain', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/pdf'];
      if (validTypes.includes(file.type)) {
        setSelectedFile(file);
        setError(null);
      } else {
        setError('Please upload a .txt, .docx, or .pdf file');
        setSelectedFile(null);
      }
    }
  };

  const createChatbot = async () => {
    if (!selectedFile || !chatbotName.trim()) {
      setError('Please provide both a chatbot name and a document');
      return;
    }

    setIsUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('chatbot_name', chatbotName);

    try {
      const response = await fetch('http://localhost:8000/create-chatbot', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      setSessionId(data.session_id);
      setIsChatbotReady(true);
      
      setMessages([{
        role: 'assistant',
        content: `Hello! I'm ${chatbotName}, your custom AI assistant. I'm here to answer questions based on the document you uploaded. What would you like to know?`,
        timestamp: new Date()
      }]);
      
    } catch (err) {
      setError('Failed to create chatbot. Make sure the backend is running on http://localhost:8000');
      console.error('Error:', err);
    } finally {
      setIsUploading(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading || !isChatbotReady) return;

    const userMessage = {
      role: 'user',
      content: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('http://localhost:8000/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          question: input,
          session_id: sessionId 
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      const assistantMessage = {
        role: 'assistant',
        content: data.answer,
        timestamp: new Date()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (err) {
      setError('Failed to get response. Please try again.');
      console.error('Error:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const resetChatbot = () => {
    setIsChatbotReady(false);
    setMessages([]);
    setSelectedFile(null);
    setChatbotName('');
    setSessionId(null);
    setError(null);
  };

  const formatTime = (date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  // Upload Screen
  if (!isChatbotReady) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-500/20 p-8">
          
          <div className="text-center mb-8">
            <div className="inline-block bg-gradient-to-br from-purple-500 to-blue-500 p-4 rounded-2xl mb-4">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Create Your Custom Chatbot</h1>
            <p className="text-slate-300">Upload your document and give your chatbot a name</p>
          </div>

          {error && (
            <div className="bg-red-500/10 border-l-4 border-red-500 p-4 rounded-r-lg mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Chatbot Name */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Chatbot Name
              </label>
              <input
                type="text"
                value={chatbotName}
                onChange={(e) => setChatbotName(e.target.value)}
                placeholder="e.g., Product Support Bot, HR Assistant, Legal Advisor..."
                className="w-full bg-slate-700/50 text-slate-100 placeholder-slate-400 rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-slate-600/50"
              />
            </div>

            {/* File Upload */}
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-2">
                Upload Document
              </label>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".txt,.docx,.pdf"
                onChange={handleFileSelect}
                className="hidden"
              />
              
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-600 rounded-xl p-8 text-center cursor-pointer hover:border-purple-500 transition-all hover:bg-slate-700/30"
              >
                {selectedFile ? (
                  <div className="flex items-center justify-center gap-3">
                    <FileText className="w-8 h-8 text-purple-400" />
                    <div className="text-left">
                      <p className="text-slate-200 font-medium">{selectedFile.name}</p>
                      <p className="text-slate-400 text-sm">{(selectedFile.size / 1024).toFixed(2)} KB</p>
                    </div>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedFile(null);
                      }}
                      className="ml-auto p-2 hover:bg-red-500/20 rounded-lg transition-colors"
                    >
                      <X className="w-5 h-5 text-red-400" />
                    </button>
                  </div>
                ) : (
                  <div>
                    <Upload className="w-12 h-12 text-slate-400 mx-auto mb-3" />
                    <p className="text-slate-300 font-medium mb-1">Click to upload document</p>
                    <p className="text-slate-400 text-sm">Supports .txt, .docx, .pdf files</p>
                  </div>
                )}
              </div>
            </div>

            {/* Create Button */}
            <button
              onClick={createChatbot}
              disabled={!selectedFile || !chatbotName.trim() || isUploading}
              className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-700 text-white rounded-xl px-6 py-4 font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl"
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Creating Your Chatbot...
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5" />
                  Create Chatbot
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Chat Screen
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
      <div className="w-full max-w-4xl h-[90vh] bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-500/20 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-6 shadow-lg">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/20 p-3 rounded-xl backdrop-blur-sm">
                <Bot className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">{chatbotName}</h1>
                <p className="text-purple-100 text-sm">Custom AI Assistant</p>
              </div>
            </div>
            <button
              onClick={resetChatbot}
              className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm"
            >
              New Chatbot
            </button>
          </div>
        </div>

        {/* Error Banner */}
        {error && (
          <div className="bg-red-500/10 border-l-4 border-red-500 p-4 m-4 rounded-r-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
              <p className="text-red-300 text-sm">{error}</p>
            </div>
          </div>
        )}

        {/* Messages Container */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 scrollbar-thin scrollbar-thumb-purple-500/50 scrollbar-track-transparent">
          {messages.map((message, index) => (
            <div
              key={index}
              className={`flex gap-3 ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              } animate-fade-in`}
            >
              {message.role === 'assistant' && (
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                  <Bot className="w-5 h-5 text-white" />
                </div>
              )}
              
              <div
                className={`max-w-[70%] rounded-2xl px-5 py-3 shadow-lg ${
                  message.role === 'user'
                    ? 'bg-gradient-to-br from-purple-600 to-blue-600 text-white'
                    : 'bg-slate-700/70 text-slate-100 border border-slate-600/50'
                }`}
              >
                <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">
                  {message.content}
                </p>
                <p
                  className={`text-xs mt-2 ${
                    message.role === 'user' ? 'text-purple-200' : 'text-slate-400'
                  }`}
                >
                  {formatTime(message.timestamp)}
                </p>
              </div>

              {message.role === 'user' && (
                <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg flex items-center justify-center shadow-lg">
                  <User className="w-5 h-5 text-white" />
                </div>
              )}
            </div>
          ))}
          
          {isLoading && (
            <div className="flex gap-3 justify-start">
              <div className="flex-shrink-0 w-8 h-8 bg-gradient-to-br from-purple-500 to-blue-500 rounded-lg flex items-center justify-center shadow-lg">
                <Bot className="w-5 h-5 text-white" />
              </div>
              <div className="bg-slate-700/70 rounded-2xl px-5 py-4 border border-slate-600/50">
                <div className="flex items-center gap-2">
                  <Loader2 className="w-4 h-4 text-purple-400 animate-spin" />
                  <span className="text-sm text-slate-300">Thinking...</span>
                </div>
              </div>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="border-t border-purple-500/20 bg-slate-800/80 p-4 backdrop-blur-sm">
          <div className="flex gap-3">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Ask me anything about your document..."
              disabled={isLoading}
              className="flex-1 bg-slate-700/50 text-slate-100 placeholder-slate-400 rounded-xl px-5 py-3 focus:outline-none focus:ring-2 focus:ring-purple-500 border border-slate-600/50 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            />
            <button
              onClick={sendMessage}
              disabled={!input.trim() || isLoading}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 disabled:from-slate-600 disabled:to-slate-700 text-white rounded-xl px-6 py-3 font-medium transition-all duration-200 disabled:cursor-not-allowed disabled:opacity-50 flex items-center gap-2 shadow-lg hover:shadow-xl"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <Send className="w-5 h-5" />
              )}
            </button>
          </div>
          <p className="text-xs text-slate-400 mt-3 text-center">
            Press Enter to send • Shift + Enter for new line
          </p>
        </div>
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fade-in {
          animation: fade-in 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CustomChatbotCreator;