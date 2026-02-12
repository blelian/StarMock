import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Mic,
  MicOff,
  Send,
  MessageSquare,
  User,
  Bot,
  TrendingUp,
  BrainCircuit,
  Settings,
} from 'lucide-react'
import { useSpeechRecognition } from '../hooks/useSpeechRecognition'
import axios from 'axios'
import { useAuth } from '../hooks/useAuth'

interface Message {
  role: 'user' | 'ai'
  content: string
}

interface ChatResponse {
  text: string
}

const InterviewPage = () => {
  const { user, token } = useAuth()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'ai',
      content:
        "Hello! I'm your AI interviewer today. Are you ready to start our session? Tell me a bit about the role you're applying for.",
    },
  ])
  const [inputText, setInputText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  const { isListening, transcript, startListening, stopListening } =
    useSpeechRecognition()

  useEffect(() => {
    if (transcript) {
      setInputText(transcript)
    }
  }, [transcript])

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [messages])

  const handleSendMessage = async (text: string = inputText) => {
    if (!text.trim() || isLoading) return

    const userMessage: Message = { role: 'user', content: text }
    setMessages((prev) => [...prev, userMessage])
    setInputText('')
    setIsLoading(true)

    try {
      const response = await axios.post<ChatResponse>(
        'http://localhost:3001/api/interview/chat',
        {
          message: text,
          history: messages.map((m) => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }],
          })),
          context: { role: 'Software Engineer' },
        },
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      )

      const aiMessage: Message = { role: 'ai', content: response.data.text }
      setMessages((prev) => [...prev, aiMessage])
    } catch (error) {
      console.error('Chat error:', error)
      setMessages((prev) => [
        ...prev,
        {
          role: 'ai',
          content:
            "I'm sorry, I'm having trouble connecting to my brain right now. Please try again.",
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const toggleMic = () => {
    if (isListening) {
      stopListening()
      if (inputText) {
        void handleSendMessage(inputText)
      }
    } else {
      startListening()
    }
  }

  return (
    <div className="min-h-screen flex flex-col bg-bg-dark text-text-main">
      {/* Header */}
      <header className="glass-card m-4 p-4 flex items-center justify-between sticky top-0 z-50">
        <div className="flex items-center gap-2">
          <div className="bg-primary p-2 rounded-lg">
            <BrainCircuit size={24} className="text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold">StarMock AI</h1>
            <p className="text-xs text-text-muted">
              Interview Session • {user?.name}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex items-center gap-1 text-success text-sm bg-success/10 px-3 py-1 rounded-full">
            <div className="w-2 h-2 bg-success rounded-full animate-pulse" />
            Live Analysis Active
          </div>
          <button className="p-2 hover:bg-bg-card rounded-full transition">
            <Settings size={20} />
          </button>
        </div>
      </header>

      <main className="flex-1 flex flex-col md:flex-row gap-4 p-4 max-w-7xl mx-auto w-full overflow-hidden">
        {/* Chat Section */}
        <div className="flex-1 glass-card flex flex-col overflow-hidden">
          <div
            ref={scrollRef}
            className="flex-1 p-6 overflow-y-auto space-y-6 scroll-smooth"
          >
            <AnimatePresence initial={false}>
              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}
                  >
                    <div
                      className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-accent' : 'bg-primary'
                        }`}
                    >
                      {msg.role === 'user' ? (
                        <User size={16} />
                      ) : (
                        <Bot size={16} />
                      )}
                    </div>
                    <div
                      className={`p-4 rounded-2xl ${msg.role === 'user'
                          ? 'bg-primary text-white rounded-tr-none'
                          : 'bg-bg-card border border-glass-border rounded-tl-none'
                        }`}
                    >
                      <p className="text-sm md:text-base leading-relaxed">
                        {msg.content}
                      </p>
                    </div>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
            {isLoading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex gap-3"
              >
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center">
                  <Bot size={16} />
                </div>
                <div className="bg-bg-card p-4 rounded-2xl flex gap-1">
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <div className="w-1.5 h-1.5 bg-primary rounded-full animate-bounce" />
                </div>
              </motion.div>
            )}
          </div>

          <div className="p-4 bg-bg-dark/50 border-t border-glass-border">
            <div className="relative flex items-center gap-2">
              <input
                type="text"
                placeholder={
                  isListening ? 'Listening...' : 'Type your response...'
                }
                className={`flex-1 ${isListening ? 'border-primary' : ''}`}
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    void handleSendMessage()
                  }
                }}
              />

              <button
                onClick={toggleMic}
                className={`p-3 rounded-xl transition-all ${isListening
                    ? 'bg-error text-white scale-110'
                    : 'bg-bg-card hover:bg-primary/20 text-text-muted hover:text-primary'
                  }`}
              >
                {isListening ? <MicOff size={24} /> : <Mic size={24} />}
                {isListening && (
                  <div className="absolute -top-1 -right-1 flex gap-0.5">
                    <span className="w-1.5 h-1.5 bg-error rounded-full animate-ping" />
                  </div>
                )}
              </button>

              <button
                onClick={() => {
                  void handleSendMessage()
                }}
                disabled={!inputText.trim() || isLoading}
                className="btn-primary p-3 rounded-xl"
              >
                <Send size={24} />
              </button>
            </div>
          </div>
        </div>

        {/* Sidebar Info */}
        <div className="w-full md:w-80 space-y-4 flex flex-col">
          <div className="glass-card p-6">
            <h3 className="text-sm font-semibold text-text-muted mb-4 flex items-center gap-2">
              <TrendingUp size={16} /> METRICS
            </h3>
            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Confidence</span>
                  <span>85%</span>
                </div>
                <div className="w-full bg-bg-dark h-1.5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '85%' }}
                    className="bg-primary h-full"
                  />
                </div>
              </div>
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Clarity</span>
                  <span>72%</span>
                </div>
                <div className="w-full bg-bg-dark h-1.5 rounded-full overflow-hidden">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: '72%' }}
                    className="bg-accent h-full"
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="glass-card p-6 flex-1">
            <h3 className="text-sm font-semibold text-text-muted mb-4 flex items-center gap-2">
              <MessageSquare size={16} /> SUGGESTIONS
            </h3>
            <div className="space-y-3">
              {[
                'Try to use more technical terms',
                'Mention your past experience with React',
                "Explain the 'why' behind your decisions",
              ].map((s, i) => (
                <div
                  key={i}
                  className="text-sm p-3 bg-bg-dark/50 rounded-lg border border-glass-border"
                >
                  {s}
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}

export default InterviewPage
