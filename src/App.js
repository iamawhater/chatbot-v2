import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, AlertCircle, Upload, X, FileText, Sparkles, History, Menu, Plus, MessageSquare, Trash2, Info, Shield, Zap } from 'lucide-react';

const CustomChatbotCreator = () => {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chatbotName, setChatbotName] = useState('');
  const [selectedFile, setSelectedFile] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [isChatbotReady, setIsChatbotReady] = useState(false);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [showHistory, setShowHistory] = useState(false);
  const [showUploadForm, setShowUploadForm] = useState(true);
  const [showInfoModal, setShowInfoModal] = useState(false);
  
  // Bot history stored in localStorage
  const [botHistory, setBotHistory] = useState(() => {
    const saved = localStorage.getItem('chatbotHistory');
    return saved ? JSON.parse(saved) : [];
  });
  
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const fileInputRef = useRef(null);

  // Save bot history to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem('chatbotHistory', JSON.stringify(botHistory));
  }, [botHistory]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file) {
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

  const saveCurrentConversation = () => {
    if (currentSessionId && messages.length > 0) {
      setBotHistory(prev => {
        const existing = prev.find(bot => bot.sessionId === currentSessionId);
        if (existing) {
          return prev.map(bot => 
            bot.sessionId === currentSessionId 
              ? { ...bot, messages, lastUpdated: new Date().toISOString() }
              : bot
          );
        }
        return prev;
      });
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
      const response = await fetch('https://yourchatbot.ddns.net/create-chatbot', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      const sessionId = data.session_id;
      
      setCurrentSessionId(sessionId);
      setIsChatbotReady(true);
      setShowUploadForm(false);
      
      const welcomeMessage = {
        role: 'assistant',
        content: `Hello! I'm ${chatbotName}, your custom AI assistant. I'm here to answer questions based on the document you uploaded. What would you like to know?`,
        timestamp: new Date()
      };
      
      setMessages([welcomeMessage]);
      
      // Add to bot history
      const newBot = {
        sessionId,
        name: chatbotName,
        fileName: selectedFile.name,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        messages: [welcomeMessage]
      };
      
      setBotHistory(prev => [newBot, ...prev]);
      
    } catch (err) {
      setError('Failed to create chatbot. Make sure the backend is running on server');
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
      const response = await fetch('https://yourchatbot.ddns.net/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          question: input,
          session_id: currentSessionId 
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

      setMessages(prev => {
        const updated = [...prev, assistantMessage];
        // Update history
        setBotHistory(prevHistory => 
          prevHistory.map(bot => 
            bot.sessionId === currentSessionId 
              ? { ...bot, messages: updated, lastUpdated: new Date().toISOString() }
              : bot
          )
        );
        return updated;
      });
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

  const loadBot = (bot) => {
    saveCurrentConversation();
    setCurrentSessionId(bot.sessionId);
    setMessages(bot.messages);
    setChatbotName(bot.name);
    setIsChatbotReady(true);
    setShowUploadForm(false);
    setShowHistory(false);
  };

  const deleteBot = (sessionId, e) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this bot and its conversation history?')) {
      setBotHistory(prev => prev.filter(bot => bot.sessionId !== sessionId));
      if (currentSessionId === sessionId) {
        resetToUploadScreen();
      }
    }
  };

  const resetToUploadScreen = () => {
    saveCurrentConversation();
    setIsChatbotReady(false);
    setShowUploadForm(true);
    setMessages([]);
    setSelectedFile(null);
    setChatbotName('');
    setCurrentSessionId(null);
    setError(null);
  };

  const createNewBot = () => {
    saveCurrentConversation();
    resetToUploadScreen();
  };

  const formatTime = (date) => {
    return new Date(date).toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now - date;
    const hours = diff / (1000 * 60 * 60);
    
    if (hours < 24) {
      return 'Today';
    } else if (hours < 48) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    }
  };

  // Upload Screen
  if (showUploadForm) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center p-4">
        {/* Side Buttons */}
        <div className="fixed left-4 top-1/2 transform -translate-y-1/2 z-10">
          <button
            onClick={() => setShowInfoModal(true)}
            className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 px-6 py-4 rounded-xl font-medium transition-all duration-200 backdrop-blur-sm border border-purple-500/30 hover:border-purple-500/50 shadow-lg hover:shadow-xl flex items-center gap-3 group"
          >
            <Zap className="w-5 h-5 text-purple-400 group-hover:text-purple-300 transition-colors" />
            How it works
          </button>
        </div>

        <div className="fixed right-4 top-1/2 transform -translate-y-1/2 z-10">
          <button
            onClick={() => setShowInfoModal(true)}
            className="bg-slate-800/80 hover:bg-slate-700/80 text-slate-200 px-6 py-4 rounded-xl font-medium transition-all duration-200 backdrop-blur-sm border border-green-500/30 hover:border-green-500/50 shadow-lg hover:shadow-xl flex items-center gap-3 group"
          >
            <Shield className="w-5 h-5 text-green-400 group-hover:text-green-300 transition-colors" />
            Data Privacy
          </button>
        </div>

        <div className="w-full max-w-2xl bg-slate-800/50 backdrop-blur-xl rounded-2xl shadow-2xl border border-purple-500/20 p-8">
          
          {/* History Button */}
          {botHistory.length > 0 && (
            <button
              onClick={() => setShowHistory(true)}
              className="absolute top-4 right-4 bg-slate-700/50 hover:bg-slate-600/50 text-slate-200 px-4 py-2 rounded-lg text-sm font-medium transition-colors flex items-center gap-2 border border-slate-600/50"
            >
              <History className="w-4 h-4" />
              My Bots ({botHistory.length})
            </button>
          )}

          <div className="text-center mb-8">
            <div className="inline-block bg-gradient-to-br from-purple-500 to-blue-500 p-4 rounded-2xl mb-4">
              <Sparkles className="w-12 h-12 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Create Your Custom Chatbot</h1>
            <p className="text-slate-300 mb-6">Turn any document into an AI assistant in 3 simple steps</p>
            
            {/* Steps Guide */}
            <div className="flex items-center justify-center gap-4 mb-6">
              <div className="flex items-center gap-3">
                <div className="bg-purple-500/20 text-purple-300 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 border-purple-500">
                  1
                </div>
                <span className="text-slate-300 text-sm">Name your bot</span>
              </div>
              
              <div className="w-8 h-0.5 bg-slate-600"></div>
              
              <div className="flex items-center gap-3">
                <div className="bg-purple-500/20 text-purple-300 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 border-purple-500">
                  2
                </div>
                <span className="text-slate-300 text-sm">Upload file</span>
              </div>
              
              <div className="w-8 h-0.5 bg-slate-600"></div>
              
              <div className="flex items-center gap-3">
                <div className="bg-purple-500/20 text-purple-300 w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm border-2 border-purple-500">
                  3
                </div>
                <span className="text-slate-300 text-sm">Happy chatting!</span>
              </div>
            </div>
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

            {/* Credits Section */}
            <div className="mt-8 pt-6 border-t border-slate-700">
              <div className="text-center text-slate-500 text-xs">
                <p>Built with ❤️ by <span className="text-purple-400 font-medium">Alok Dahal</span></p>
                <a 
                  href="mailto:alokdahal5@gmail.com" 
                  className="text-slate-400 hover:text-purple-400 transition-colors"
                >
                  alokdahal5@gmail.com
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Info Modal */}
        {showInfoModal && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
            <div className="bg-slate-800 rounded-2xl shadow-2xl border border-purple-500/20 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-500/20 p-2 rounded-lg">
                      <Info className="w-5 h-5 text-purple-400" />
                    </div>
                    <h2 className="text-xl font-bold text-white">How It Works & Privacy</h2>
                  </div>
                  <button
                    onClick={() => setShowInfoModal(false)}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* How RAG Works */}
                <div className="bg-slate-700/30 rounded-xl p-5 border border-slate-600/50">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="bg-blue-500/20 p-2 rounded-lg">
                      <Zap className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-2">How RAG Technology Works</h3>
                      <p className="text-slate-300 text-sm leading-relaxed mb-3">
                        This chatbot uses <span className="text-purple-400 font-medium">Retrieval-Augmented Generation (RAG)</span>, 
                        a cutting-edge AI technique that combines document search with language generation.
                      </p>
                      <div className="space-y-2 text-sm text-slate-400">
                        <p><span className="text-purple-400">1. Document Processing:</span> Your uploaded file is split into chunks and converted into mathematical vectors (embeddings).</p>
                        <p><span className="text-purple-400">2. Smart Retrieval:</span> When you ask a question, the system finds the most relevant chunks from your document.</p>
                        <p><span className="text-purple-400">3. AI Generation:</span> The AI reads those relevant chunks and generates a natural, accurate answer based only on your document.</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Data Privacy */}
                <div className="bg-slate-700/30 rounded-xl p-5 border border-slate-600/50">
                  <div className="flex items-start gap-3 mb-3">
                    <div className="bg-green-500/20 p-2 rounded-lg">
                      <Shield className="w-5 h-5 text-green-400" />
                    </div>
                    <div>
                      <h3 className="text-white font-semibold mb-2">Your Data is Safe & Private</h3>
                      <div className="space-y-2 text-sm text-slate-300">
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5"></div>
                          <p><span className="font-medium">Local Storage:</span> All conversations are stored locally in your browser. No one else can access them.</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5"></div>
                          <p><span className="font-medium">Temporary Processing:</span> Your documents are processed in real-time and can be deleted by you at any time.</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5"></div>
                          <p><span className="font-medium">No Training:</span> Your data is never used to train AI models or shared with third parties.</p>
                        </div>
                        <div className="flex items-start gap-2">
                          <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5"></div>
                          <p><span className="font-medium">Secure Connection:</span> All communications are encrypted via HTTPS.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Credits */}
                <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-5 border border-purple-500/30">
                  <div className="text-center">
                    <div className="inline-block bg-gradient-to-br from-purple-500 to-blue-500 p-3 rounded-xl mb-3">
                      <Sparkles className="w-6 h-6 text-white" />
                    </div>
                    <h3 className="text-white font-semibold mb-2">Built by Alok Dahal</h3>
                    <p className="text-slate-300 text-sm mb-3">
                      Custom Chatbot Creator - Powered by RAG Technology
                    </p>
                    <a 
                      href="mailto:alokdahal5@gmail.com"
                      className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                    >
                      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                        <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                      </svg>
                      Contact Me
                    </a>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* History Sidebar */}
        {showHistory && (
          <div className="fixed inset-y-0 left-0 z-50 flex">
            <div className="w-full max-w-md bg-slate-800/95 backdrop-blur-sm shadow-2xl border-r border-purple-500/20 flex flex-col animate-slide-in-left">
              <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-purple-600/20 to-blue-600/20">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="bg-purple-500/20 p-2 rounded-lg">
                      <History className="w-6 h-6 text-purple-400" />
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">My Chatbots</h2>
                      <p className="text-slate-400 text-sm">{botHistory.length} bot{botHistory.length !== 1 ? 's' : ''} created</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowHistory(false)}
                    className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                  >
                    <X className="w-5 h-5 text-slate-400" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {botHistory.length === 0 ? (
                  <div className="text-center py-12">
                    <Bot className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <p className="text-slate-400 text-sm">No chatbots yet</p>
                    <p className="text-slate-500 text-xs mt-1">Create your first one!</p>
                  </div>
                ) : (
                  botHistory.map((bot) => (
                    <div
                      key={bot.sessionId}
                      onClick={() => loadBot(bot)}
                      className={`rounded-xl p-4 cursor-pointer transition-all border group ${
                        bot.sessionId === currentSessionId 
                          ? 'bg-purple-600/20 border-purple-500 shadow-lg' 
                          : 'bg-slate-700/50 hover:bg-slate-700 border-slate-600/50 hover:border-purple-500/50'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-2 flex-1">
                          <div className={`p-1.5 rounded-lg ${
                            bot.sessionId === currentSessionId 
                              ? 'bg-purple-500/30' 
                              : 'bg-purple-500/20'
                          }`}>
                            <Bot className="w-4 h-4 text-purple-400" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <h3 className="text-white font-semibold text-sm truncate">{bot.name}</h3>
                            {bot.sessionId === currentSessionId && (
                              <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full inline-block mt-1">Active</span>
                            )}
                          </div>
                        </div>
                        <button
                          onClick={(e) => deleteBot(bot.sessionId, e)}
                          className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                        >
                          <Trash2 className="w-4 h-4 text-red-400" />
                        </button>
                      </div>
                      
                      <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                        <FileText className="w-3 h-3 flex-shrink-0" />
                        <span className="truncate">{bot.fileName}</span>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs text-slate-500">
                        <span className="flex items-center gap-1">
                          <MessageSquare className="w-3 h-3" />
                          {bot.messages.length} msg
                        </span>
                        <span>{formatDate(bot.lastUpdated)}</span>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="p-4 border-t border-slate-700 bg-slate-800/80">
                <button
                  onClick={() => {
                    setShowHistory(false);
                    createNewBot();
                  }}
                  className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl px-4 py-3 font-medium transition-all flex items-center justify-center gap-2"
                >
                  <Plus className="w-5 h-5" />
                  Create New Bot
                </button>
              </div>
            </div>
          </div>
        )}
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
            <div className="flex items-center gap-2">
              <button
                onClick={() => setShowHistory(true)}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm flex items-center gap-2"
              >
                <History className="w-4 h-4" />
                My Bots
              </button>
              <button
                onClick={createNewBot}
                className="bg-white/20 hover:bg-white/30 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors backdrop-blur-sm flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                New Bot
              </button>
            </div>
          </div>
        </div>

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
          <div className="flex items-center justify-between mt-3">
            <p className="text-xs text-slate-400">
              Press Enter to send • Shift + Enter for new line
            </p>
            <button
              onClick={() => setShowInfoModal(true)}
              className="text-xs text-slate-400 hover:text-purple-400 transition-colors flex items-center gap-1"
            >
              <Info className="w-3 h-3" />
              How it works
            </button>
          </div>
        </div>
      </div>

      {/* Info Modal (same as upload screen) */}
      {showInfoModal && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-800 rounded-2xl shadow-2xl border border-purple-500/20 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-6 border-b border-slate-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500/20 p-2 rounded-lg">
                    <Info className="w-5 h-5 text-purple-400" />
                  </div>
                  <h2 className="text-xl font-bold text-white">How It Works & Privacy</h2>
                </div>
                <button
                  onClick={() => setShowInfoModal(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-6 space-y-6">
              {/* How RAG Works */}
              <div className="bg-slate-700/30 rounded-xl p-5 border border-slate-600/50">
                <div className="flex items-start gap-3 mb-3">
                  <div className="bg-blue-500/20 p-2 rounded-lg">
                    <Zap className="w-5 h-5 text-blue-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">How RAG Technology Works</h3>
                    <p className="text-slate-300 text-sm leading-relaxed mb-3">
                      This chatbot uses <span className="text-purple-400 font-medium">Retrieval-Augmented Generation (RAG)</span>, 
                      a cutting-edge AI technique that combines document search with language generation.
                    </p>
                    <div className="space-y-2 text-sm text-slate-400">
                      <p><span className="text-purple-400">1. Document Processing:</span> Your uploaded file is split into chunks and converted into mathematical vectors (embeddings).</p>
                      <p><span className="text-purple-400">2. Smart Retrieval:</span> When you ask a question, the system finds the most relevant chunks from your document.</p>
                      <p><span className="text-purple-400">3. AI Generation:</span> The AI reads those relevant chunks and generates a natural, accurate answer based only on your document.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Privacy */}
              <div className="bg-slate-700/30 rounded-xl p-5 border border-slate-600/50">
                <div className="flex items-start gap-3 mb-3">
                  <div className="bg-green-500/20 p-2 rounded-lg">
                    <Shield className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <h3 className="text-white font-semibold mb-2">Your Data is Safe & Private</h3>
                    <div className="space-y-2 text-sm text-slate-300">
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5"></div>
                        <p><span className="font-medium">Local Storage:</span> All conversations are stored locally in your browser. No one else can access them.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5"></div>
                        <p><span className="font-medium">Temporary Processing:</span> Your documents are processed in real-time and can be deleted by you at any time.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5"></div>
                        <p><span className="font-medium">No Training:</span> Your data is never used to train AI models or shared with third parties.</p>
                      </div>
                      <div className="flex items-start gap-2">
                        <div className="w-1.5 h-1.5 bg-green-400 rounded-full mt-1.5"></div>
                        <p><span className="font-medium">Secure Connection:</span> All communications are encrypted via HTTPS.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Credits */}
              <div className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 rounded-xl p-5 border border-purple-500/30">
                <div className="text-center">
                  <div className="inline-block bg-gradient-to-br from-purple-500 to-blue-500 p-3 rounded-xl mb-3">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-white font-semibold mb-2">Built by Alok Dahal</h3>
                  <p className="text-slate-300 text-sm mb-3">
                    Custom Chatbot Creator - Powered by RAG Technology
                  </p>
                  <a 
                    href="mailto:alokdahal5@gmail.com"
                    className="inline-flex items-center gap-2 bg-purple-600 hover:bg-purple-500 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                  >
                    <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z" />
                      <path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" />
                    </svg>
                    Contact Me
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* History Sidebar Modal */}
      {showHistory && (
        <div className="fixed inset-y-0 left-0 z-50 flex">
          <div className="w-full max-w-md bg-slate-800/95 backdrop-blur-sm shadow-2xl border-r border-purple-500/20 flex flex-col animate-slide-in-left">
            <div className="p-6 border-b border-slate-700 bg-gradient-to-r from-purple-600/20 to-blue-600/20">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="bg-purple-500/20 p-2 rounded-lg">
                    <History className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white">My Chatbots</h2>
                    <p className="text-slate-400 text-sm">{botHistory.length} bot{botHistory.length !== 1 ? 's' : ''} created</p>
                  </div>
                </div>
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-2 hover:bg-slate-700 rounded-lg transition-colors"
                >
                  <X className="w-5 h-5 text-slate-400" />
                </button>
              </div>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {botHistory.length === 0 ? (
                <div className="text-center py-12">
                  <Bot className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                  <p className="text-slate-400 text-sm">No chatbots yet</p>
                  <p className="text-slate-500 text-xs mt-1">Create your first one!</p>
                </div>
              ) : (
                botHistory.map((bot) => (
                  <div
                    key={bot.sessionId}
                    onClick={() => loadBot(bot)}
                    className={`rounded-xl p-4 cursor-pointer transition-all border group ${
                      bot.sessionId === currentSessionId 
                        ? 'bg-purple-600/20 border-purple-500 shadow-lg' 
                        : 'bg-slate-700/50 hover:bg-slate-700 border-slate-600/50 hover:border-purple-500/50'
                    }`}
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2 flex-1">
                        <div className={`p-1.5 rounded-lg ${
                          bot.sessionId === currentSessionId 
                            ? 'bg-purple-500/30' 
                            : 'bg-purple-500/20'
                        }`}>
                          <Bot className="w-4 h-4 text-purple-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="text-white font-semibold text-sm truncate">{bot.name}</h3>
                          {bot.sessionId === currentSessionId && (
                            <span className="text-xs bg-purple-500/30 text-purple-300 px-2 py-0.5 rounded-full inline-block mt-1">Active</span>
                          )}
                        </div>
                      </div>
                      <button
                        onClick={(e) => deleteBot(bot.sessionId, e)}
                        className="p-1.5 hover:bg-red-500/20 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
                      >
                        <Trash2 className="w-4 h-4 text-red-400" />
                      </button>
                    </div>
                    
                    <div className="flex items-center gap-2 text-xs text-slate-400 mb-2">
                      <FileText className="w-3 h-3 flex-shrink-0" />
                      <span className="truncate">{bot.fileName}</span>
                    </div>
                    
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <span className="flex items-center gap-1">
                        <MessageSquare className="w-3 h-3" />
                        {bot.messages.length} msg
                      </span>
                      <span>{formatDate(bot.lastUpdated)}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
            
            <div className="p-4 border-t border-slate-700 bg-slate-800/80">
              <button
                onClick={() => {
                  setShowHistory(false);
                  createNewBot();
                }}
                className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white rounded-xl px-4 py-3 font-medium transition-all flex items-center justify-center gap-2"
              >
                <Plus className="w-5 h-5" />
                Create New Bot
              </button>
            </div>
          </div>
        </div>
      )}

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
        @keyframes slide-in {
          from {
            transform: translateX(100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in {
          animation: slide-in 0.3s ease-out;
        }
        @keyframes slide-in-left {
          from {
            transform: translateX(-100%);
          }
          to {
            transform: translateX(0);
          }
        }
        .animate-slide-in-left {
          animation: slide-in-left 0.3s ease-out;
        }
      `}</style>
    </div>
  );
};

export default CustomChatbotCreator;