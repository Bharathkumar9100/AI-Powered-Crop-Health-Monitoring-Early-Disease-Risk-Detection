import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';

const LANG_CODE_MAP: Record<string, string> = {
  en: 'en-IN',
  ta: 'ta-IN',
  hi: 'hi-IN',
  te: 'te-IN',
  ml: 'ml-IN',
};

export const useSpeechRecognition = (onResult?: (transcript: string) => void) => {
  const { language } = useAuth();
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSupported, setIsSupported] = useState(false);
  const [recognition, setRecognition] = useState<any>(null);

  useEffect(() => {
    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (SpeechRecognition) {
      setIsSupported(true);
      const instance = new SpeechRecognition();
      instance.continuous = false;
      instance.interimResults = true;

      instance.onresult = (event: any) => {
        let currentTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          currentTranscript += event.results[i][0].transcript;
        }
        setTranscript(currentTranscript);
        if (event.results[0].isFinal && onResult) {
          onResult(currentTranscript);
        }
      };

      instance.onerror = () => {
        setIsListening(false);
      };

      instance.onend = () => {
        setIsListening(false);
      };

      setRecognition(instance);
    }
  }, [onResult]);

  const startListening = useCallback(() => {
    if (recognition && !isListening) {
      try {
        recognition.lang = LANG_CODE_MAP[language] || 'en-IN';
        setTranscript('');
        recognition.start();
        setIsListening(true);
      } catch (err) {
        console.error('Failed to start speech recognition', err);
      }
    }
  }, [recognition, isListening, language]);

  const stopListening = useCallback(() => {
    if (recognition && isListening) {
      recognition.stop();
      setIsListening(false);
    }
  }, [recognition, isListening]);

  return {
    isListening,
    transcript,
    isSupported,
    startListening,
    stopListening,
  };
};
