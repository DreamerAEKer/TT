import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, MicOff, Volume2, RotateCcw, Languages, ArrowUpDown, Smartphone, History, Settings } from 'lucide-react';
import { speechService } from './services/SpeechService';
import { translationService } from './services/TranslationService';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface TranslationPaneProps {
  id: 'top' | 'bottom'; // top is partner (EN), bottom is user (TH)
  language: string;
  transcript: string; // what the person in THIS pane said
  incomingTranslation: string; // what the OTHER person said, translated to this pane's language
  isListening: boolean;
  isFlipped: boolean;
  onToggleListen: () => void;
  onSpeak: (text: string) => void;
}

const TranslationPane: React.FC<TranslationPaneProps> = ({
  id,
  language,
  transcript,
  incomingTranslation,
  isListening,
  isFlipped,
  onToggleListen,
  onSpeak,
}) => {
  const isTop = id === 'top';
  
  return (
    <div
      className={cn(
        "flex-1 flex flex-col p-6 transition-all duration-500 ease-in-out relative overflow-hidden",
        isFlipped && isTop ? "rotate-180" : ""
      )}
    >
      {/* Background Glow */}
      <div className={cn(
        "absolute -z-10 blur-[100px] w-64 h-64 rounded-full opacity-10",
        isTop ? "top-0 right-0 bg-blue-500" : "bottom-0 left-0 bg-purple-500"
      )} />

      <div className="flex justify-between items-center mb-6">
        <div className="flex items-center gap-3">
            <div className={cn(
                "w-10 h-10 rounded-xl flex items-center justify-center border border-white/10 glass-card",
                isListening ? "bg-white/10" : ""
            )}>
                <Languages className={cn("w-5 h-5", isTop ? "text-blue-400" : "text-purple-400")} />
            </div>
            <div>
                <p className="text-[10px] uppercase tracking-tighter text-white/40 mb-0.5">Speaking</p>
                <span className="text-sm font-bold tracking-wider">{language}</span>
            </div>
        </div>
        
        {incomingTranslation && (
            <button
                onClick={() => onSpeak(incomingTranslation)}
                className="p-3 rounded-2xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all active:scale-95"
            >
                <Volume2 className="w-5 h-5 text-white/70" />
            </button>
        )}
      </div>

      <div className="flex-1 flex flex-col justify-center text-center px-4">
        {/* The translation from the OTHER person (High Priority) */}
        <AnimatePresence mode="wait">
          {incomingTranslation ? (
            <motion.div
              key={incomingTranslation}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.05 }}
              className="mb-8"
            >
              <h2 className={cn(
                "text-3xl md:text-5xl font-bold tracking-tight leading-tight",
                isTop ? "text-blue-50" : "text-purple-50"
              )}>
                {incomingTranslation}
              </h2>
            </motion.div>
          ) : (
            <div className="h-20" /> /* Spacer */
          )}
        </AnimatePresence>
        
        {/* Your own current transcript (Lower Priority) */}
        <div className="mt-4">
          <p className={cn(
            "text-lg font-medium transition-all duration-300",
            isListening ? "text-white/90 scale-105" : "text-white/20"
          )}>
            {transcript || (isListening ? "Listening..." : "")}
          </p>
        </div>
      </div>

      <div className="flex justify-center mt-6">
        <button
          onClick={onToggleListen}
          className={cn(
            "w-20 h-20 rounded-[28px] flex items-center justify-center transition-all duration-500 relative",
            isListening 
              ? "bg-red-500 shadow-[0_0_40px_rgba(239,68,68,0.4)] rotate-90" 
              : isTop ? "bg-blue-600 hover:bg-blue-500 shadow-[0_0_30px_rgba(37,99,235,0.2)]" : "bg-purple-600 hover:bg-purple-500 shadow-[0_0_30px_rgba(168,85,247,0.2)]"
          )}
        >
          {isListening ? (
            <MicOff className="w-8 h-8 text-white animate-pulse" />
          ) : (
            <Mic className="w-8 h-8 text-white" />
          )}
          
          {isListening && (
              <>
                <div className="absolute inset-0 rounded-[28px] border-2 border-white/30 animate-ping" />
                <div className="absolute -inset-4 rounded-full border border-white/5 animate-[pulse_2s_infinite]" />
              </>
          )}
        </button>
      </div>
    </div>
  );
};

export default function App() {
  const [isFlipped, setIsFlipped] = useState(true);
  const [activePane, setActivePane] = useState<'top' | 'bottom' | null>(null);
  const [data, setData] = useState({
    top: { 
        text: '', 
        translationForMe: '', // Translation of what bottom said -> English
        lang: 'en-US', 
        name: 'Guest (English)' 
    },
    bottom: { 
        text: '', 
        translationForMe: '', // Translation of what top said -> Thai
        lang: 'th-TH', 
        name: 'You (Thai)' 
    }
  });

  const translationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const performTranslation = async (pane: 'top' | 'bottom', text: string, isFinal: boolean) => {
    if (!text.trim()) return;

    const sourceLang = data[pane].lang.split('-')[0];
    const targetPane = pane === 'top' ? 'bottom' : 'top';
    const targetLang = data[targetPane].lang.split('-')[0];

    try {
      const translated = await translationService.translate(text, sourceLang, targetLang);
      
      setData(prev => ({
        ...prev,
        [targetPane]: { ...prev[targetPane], translationForMe: translated }
      }));

      if (isFinal) {
        speechService.speak(translated, data[targetPane].lang);
      }
    } catch (err) {
      console.error('Translation error', err);
    }
  };

  const handleSpeechResult = (pane: 'top' | 'bottom', transcript: string, isFinal: boolean) => {
    setData(prev => ({
      ...prev,
      [pane]: { ...prev[pane], text: transcript }
    }));

    // Debounced real-time translation for interim results
    if (translationTimeoutRef.current) clearTimeout(translationTimeoutRef.current);
    
    if (isFinal) {
        performTranslation(pane, transcript, true);
    } else {
        translationTimeoutRef.current = setTimeout(() => {
            performTranslation(pane, transcript, false);
        }, 800);
    }
  };

  const toggleListen = (pane: 'top' | 'bottom') => {
    if (activePane === pane) {
      speechService.stopListening();
      setActivePane(null);
    } else {
      if (activePane) speechService.stopListening();
      
      setActivePane(pane);
      // Clear previous for this turn
      setData(prev => ({
          ...prev,
          [pane]: { ...prev[pane], text: '' },
          [pane === 'top' ? 'bottom' : 'top']: { ...prev[pane === 'top' ? 'bottom' : 'top'], translationForMe: '' }
      }));

      speechService.startListening(
        data[pane].lang,
        (result) => handleSpeechResult(pane, result.transcript, result.isFinal),
        (error) => {
          console.error(error);
          setActivePane(null);
        }
      );
    }
  };

  const clear = () => {
    setData(prev => ({
        top: { ...prev.top, text: '', translationForMe: '' },
        bottom: { ...prev.bottom, text: '', translationForMe: '' }
    }));
  };

  return (
    <main className="w-full h-[100dvh] flex flex-col bg-[#050810] text-white overflow-hidden font-['Outfit'] select-none">
      <TranslationPane
        id="top"
        language="English"
        transcript={data.top.text}
        incomingTranslation={data.top.translationForMe}
        isListening={activePane === 'top'}
        isFlipped={isFlipped}
        onToggleListen={() => toggleListen('top')}
        onSpeak={(text) => speechService.speak(text, data.top.lang)}
      />

      <div className="h-px bg-white/5 relative flex justify-center items-center z-50">
        <div className="absolute flex gap-2 glass-card p-1.5 rounded-3xl border border-white/10 shadow-2xl scale-110">
          <button 
            onClick={() => setIsFlipped(!isFlipped)} 
            className={cn(
                "p-3 rounded-2xl transition-all duration-300", 
                isFlipped ? "text-blue-400 bg-blue-500/10 shadow-inner" : "text-white/30 hover:bg-white/5"
            )}
          >
            <ArrowUpDown className="w-5 h-5" />
          </button>
          
          <div className="w-px h-8 bg-white/10 my-1" />

          <button 
            onClick={clear}
            className="p-3 rounded-2xl text-white/30 hover:bg-white/5 transition-all"
          >
            <RotateCcw className="w-5 h-5" />
          </button>
        </div>
      </div>

      <TranslationPane
        id="bottom"
        language="Thai"
        transcript={data.bottom.text}
        incomingTranslation={data.bottom.translationForMe}
        isListening={activePane === 'bottom'}
        isFlipped={false}
        onToggleListen={() => toggleListen('bottom')}
        onSpeak={(text) => speechService.speak(text, data.bottom.lang)}
      />

      {/* Floating Status Bar for iOS Home Indicator clearance */}
      <div className="h-8 w-full flex items-center justify-center px-6 pb-2 opacity-20 pointer-events-none">
        <div className="w-32 h-1 bg-white/40 rounded-full" />
      </div>

      <div className="fixed top-4 left-4 flex gap-4 opacity-30">
          <Smartphone className="w-4 h-4" />
          <span className="text-[10px] uppercase tracking-widest">iOS & Android Ready</span>
      </div>
    </main>
  );
}
