import React, { useState, useEffect, useRef } from 'react';
import {
  Send,
  Mic,
  MicOff,
  Volume2,
  VolumeX,
  Bot,
  User,
  Sparkles,
  Loader2,
  Info,
  X,
  HelpCircle,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from '../hooks/useTranslation';
import { useSpeechRecognition } from '../hooks/useSpeechRecognition';
import { useTextToSpeech } from '../hooks/useTextToSpeech';
import { chatApi } from '../api/client';
import { ChatMessage } from '../types';

interface ChatPageProps {
  initialContext?: any;
  onClearContext?: () => void;
}

export const ChatPage: React.FC<ChatPageProps> = ({ initialContext, onClearContext }) => {
  const { language } = useAuth();
  const { t } = useTranslation();

  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content:
        language === 'hi'
          ? 'नमस्ते! मैं आपका फाइटोविज़न-एक्स कृषि सहायक हूँ। फसलों की बीमारी, दवा के छिड़काव या जैविक उपचार के बारे में आप मुझसे पूछ सकते हैं।'
          : language === 'ta'
          ? 'வணக்கம்! நான் உங்கள் பைட்டோவிஷன்-எக்ஸ் வேளாண் ஆலோசகர். உங்கள் பயிர் பாதுகாப்பு மற்றும் நோய் மேலாண்மை குறித்து என்னிடம் கேட்கலாம்.'
          : language === 'te'
          ? 'నమస్కారం! నేను మీ ఫైటోవిజన్-ఎక్స్ వ్యవసాయ సహాయకుడిని. పంట తెగుళ్లు, మందుల పిచికారీ గురించి నన్ను అడగవచ్చు.'
          : language === 'ml'
          ? 'നമസ്കാരം! ഞാൻ നിങ്ങളുടെ ഫൈറ്റോവിഷൻ-എക്സ് കാർഷിക സഹായിയാണ്. വിള രോഗങ്ങൾ, കീടനിയന്ത്രണം എന്നിവയെക്കുറിച്ച് ചോദിക്കാം.'
          : 'Hello! I am your PhytoVision-X Agricultural Assistant. Ask me anything about crop health, spray recommendations, disease prevention, or satellite NDVI interpretations.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);

  const [inputMessage, setInputMessage] = useState('');
  const [conversationId, setConversationId] = useState<number | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [activeContext, setActiveContext] = useState<any>(initialContext);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Voice Hooks
  const { isListening, isSupported: isMicSupported, startListening, stopListening } =
    useSpeechRecognition((transcript) => {
      if (transcript.trim()) {
        setInputMessage((prev) => (prev ? `${prev} ${transcript}` : transcript));
      }
    });

  const { speak, stop: stopSpeaking, isSpeaking, isSupported: isTtsSupported } = useTextToSpeech();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSendMessage = async (textToSend?: string) => {
    const text = textToSend || inputMessage;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      role: 'farmer',
      content: text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await chatApi.sendMessage({
        message: text.trim(),
        language,
        conversation_id: conversationId,
        context: activeContext,
      });

      setConversationId(response.conversation_id);

      const assistantMsg: ChatMessage = {
        role: 'assistant',
        content: response.response,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };

      setMessages((prev) => [...prev, assistantMsg]);

      // Speak answer if audio is supported
      if (isTtsSupported) {
        speak(response.response);
      }
    } catch (err) {
      console.error('Chat failed', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: 'I apologize, I am temporarily having trouble connecting to the agronomy server. Please ensure proper soil drainage and consult your local extension officer.',
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const SUGGESTION_CHIPS = [
    'How do I treat Early Blight on tomatoes?',
    'What organic sprays work for powdery mildew?',
    'Why did my satellite NDVI drop suddenly?',
    'Best fungicide spray schedule for potato late blight?',
  ];

  return (
    <div className="flex flex-col h-[calc(100vh-140px)] glass-card rounded-2xl border border-slate-800 overflow-hidden">
      {/* Chat Header */}
      <div className="p-4 bg-slate-900/90 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-400 flex items-center justify-center text-slate-950 font-bold shadow-glow-emerald">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-white">PhytoVision AI Assistant</h2>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
            </div>
            <p className="text-[11px] text-slate-400">Multilingual Agricultural Expert · Voice Enabled</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {isSpeaking && (
            <button
              onClick={stopSpeaking}
              className="flex items-center gap-1 text-xs text-rose-400 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/30 animate-pulse"
            >
              <VolumeX className="w-3.5 h-3.5" />
              <span>Mute Voice</span>
            </button>
          )}
        </div>
      </div>

      {/* Context banner if opened from a specific diagnosis */}
      {activeContext && (
        <div className="bg-emerald-950/40 border-b border-emerald-500/30 px-4 py-2 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2 truncate">
            <Sparkles className="w-3.5 h-3.5 flex-shrink-0" />
            <span className="truncate">
              Active Context: <strong className="text-white">{activeContext.crop} ({activeContext.disease})</strong>
            </span>
          </div>
          <button
            onClick={() => {
              setActiveContext(null);
              if (onClearContext) onClearContext();
            }}
            className="text-slate-400 hover:text-white p-0.5"
            title="Clear context"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Message Stream */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map((msg, idx) => {
          const isFarmer = msg.role === 'farmer';
          return (
            <div
              key={idx}
              className={`flex gap-3 max-w-[85%] ${isFarmer ? 'ml-auto flex-row-reverse' : 'mr-auto'}`}
            >
              <div
                className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                  isFarmer ? 'bg-emerald-500 text-slate-950' : 'bg-slate-800 text-teal-400 border border-slate-700'
                }`}
              >
                {isFarmer ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>

              <div
                className={`p-3.5 rounded-2xl text-xs leading-relaxed space-y-1.5 shadow-sm ${
                  isFarmer
                    ? 'bg-emerald-600 text-white rounded-tr-none'
                    : 'bg-slate-900 border border-slate-800 text-slate-200 rounded-tl-none'
                }`}
              >
                <div className="whitespace-pre-wrap">{msg.content}</div>
                <div className={`text-[10px] text-right ${isFarmer ? 'text-emerald-200' : 'text-slate-500'}`}>
                  {msg.timestamp}
                </div>
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex gap-3 max-w-[80%]">
            <div className="w-8 h-8 rounded-xl bg-slate-800 text-teal-400 flex items-center justify-center flex-shrink-0 border border-slate-700">
              <Bot className="w-4 h-4" />
            </div>
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-slate-800 rounded-tl-none flex items-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-3.5 h-3.5 animate-spin text-emerald-400" />
              <span>Consulting agricultural knowledge base...</span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Suggested Quick Prompt Chips */}
      <div className="px-4 py-2 border-t border-slate-800/80 bg-slate-950/40 flex items-center gap-2 overflow-x-auto no-scrollbar">
        {SUGGESTION_CHIPS.map((chip, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(chip)}
            className="flex-shrink-0 text-[11px] px-3 py-1 rounded-full bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-emerald-500/30 transition"
          >
            {chip}
          </button>
        ))}
      </div>

      {/* Input Form with Voice Support */}
      <div className="p-3 bg-slate-900/90 border-t border-slate-800 flex items-center gap-2">
        {/* Voice Input Button */}
        {isMicSupported && (
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            className={`p-2.5 rounded-xl border transition ${
              isListening
                ? 'bg-rose-500 text-white border-rose-400 animate-pulse'
                : 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border-slate-700'
            }`}
            title={isListening ? 'Stop listening' : 'Start speaking'}
          >
            {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
          </button>
        )}

        <input
          type="text"
          value={inputMessage}
          onChange={(e) => setInputMessage(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder={isListening ? t('btn_listening') : t('chat_placeholder')}
          className="flex-1 bg-slate-950 border border-slate-700 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
        />

        <button
          type="button"
          disabled={!inputMessage.trim() || isLoading}
          onClick={() => handleSendMessage()}
          className="p-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-400 text-slate-950 font-bold disabled:opacity-40 shadow-glow-emerald hover:brightness-110 active:scale-95 transition"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
