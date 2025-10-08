"use client";

import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';

// --- Types ---
type ToastMessage = {
  id: number;
  message: string;
  type: 'success' | 'error' | 'info';
};

type ToastContextType = {
  addToast: (message: string, type: ToastMessage['type']) => void;
};

// --- Context ---
const ToastContext = createContext<ToastContextType | null>(null);

// --- Provider Component ---
export const ToastProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const addToast = useCallback((message: string, type: ToastMessage['type']) => {
    const id = Date.now();
    setToasts((prevToasts) => [...prevToasts, { id, message, type }]);
    setTimeout(() => {
      removeToast(id);
    }, 5000); // Auto-dismiss after 5 seconds
  }, []);

  const removeToast = (id: number) => {
    setToasts((prevToasts) => prevToasts.filter((toast) => toast.id !== id));
  };

  const toastTypeClasses = {
    success: 'bg-green-100 border-green-400 text-green-700',
    error: 'bg-red-100 border-red-400 text-red-700',
    info: 'bg-blue-100 border-blue-400 text-blue-700',
  };

  return (
    <ToastContext.Provider value={{ addToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col items-end gap-3">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`flex items-center justify-between max-w-sm w-full p-4 rounded-lg shadow-lg border-l-4 ${toastTypeClasses[toast.type]} animate-fade-in-right`}
          >
            <p className="font-medium">{toast.message}</p>
            <button onClick={() => removeToast(toast.id)} className="ml-4 p-1 rounded-full hover:bg-black/10">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20"><path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"></path></svg>
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

// --- Hook ---
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
