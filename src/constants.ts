// Fix: Replaced all JSX syntax with React.createElement calls to make the file valid TypeScript.
import React, { useState, createContext, useContext, useRef, useEffect } from 'react';

// A collection of SVG icons used throughout the application.
export const Icons = {
  
  logo: (props: React.SVGProps<SVGSVGElement>) =>
    React.createElement(
      'svg',
      { ...props, viewBox: '0 0 24 24', fill: 'currentColor', xmlns: 'http://www.w3.org/2000/svg' },
      React.createElement('path', {
        d: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5-10-5-10 5zM12 14.5l-10-5L12 5l10 4.5-10 5z',
      })
    ),
  add: (props: React.SVGProps<SVGSVGElement>) =>
    React.createElement(
      'svg',
      { ...props, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' },
      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M12 4v16m8-8H4' })
    ),
  sparkles: (props: React.SVGProps<SVGSVGElement>) =>
    React.createElement(
      'svg',
      { ...props, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' },
      React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: 2,
        d: 'M5 3v4M3 5h4M16 17v4m-2 2h4M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
      }),
      React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: 2,
        d: 'M12 2v2m0 16v2m-7-9H3m18 0h-2m-5-5l-1-1m8 8l-1-1',
      })
    ),
  logout: (props: React.SVGProps<SVGSVGElement>) =>
    React.createElement(
      'svg',
      { ...props, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' },
      React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: 2,
        d: 'M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1',
      })
    ),
   cog: (props: React.SVGProps<SVGSVGElement>) =>
    React.createElement(
      'svg',
      { ...props, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' },
      React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: 2,
        d: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
      }),
      React.createElement('path', {
          strokeLinecap: 'round',
          strokeLinejoin: 'round',
          strokeWidth: 2,
          d: 'M15 12a3 3 0 11-6 0 3 3 0 016 0z'
      })
    ),
  chevronDown: (props: React.SVGProps<SVGSVGElement>) =>
    React.createElement(
      'svg',
      { ...props, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' },
      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M19 9l-7 7-7-7' })
    ),
  arrowLeft: (props: React.SVGProps<SVGSVGElement>) =>
    React.createElement(
      'svg',
      { ...props, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' },
      React.createElement('path', { strokeLinecap: 'round', strokeLinejoin: 'round', strokeWidth: 2, d: 'M10 19l-7-7m0 0l7-7m-7 7h18' })
    ),
  video: (props: React.SVGProps<SVGSVGElement>) =>
    React.createElement(
      'svg',
      { ...props, fill: 'none', viewBox: '0 0 24 24', stroke: 'currentColor' },
      React.createElement('path', {
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        strokeWidth: 2,
        d: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z',
      })
    ),
  imageToVideo: (props: React.SVGProps<SVGSVGElement>) => 
    React.createElement('svg', { ...props, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: '2', strokeLinecap: 'round', strokeLinejoin: 'round'},
      React.createElement('path', { d: 'M10 22H5a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-1 1.73' }),
      React.createElement('path', { d: 'm7 14 3-3 4 4' }),
      React.createElement('path', { d: 'm14 10 1-1' }),
      React.createElement('path', { d: 'M16 19h6' }),
      React.createElement('path', { d: 'M19 16v6' })
    ),
  google: (props: React.SVGProps<SVGSVGElement>) => 
    React.createElement('svg', { ...props, viewBox: '0 0 48 48', xmlns: 'http://www.w3.org/2000/svg' },
      React.createElement('path', { fill: '#FFC107', d: 'M43.611,20.083H42V20H24v8h11.303c-1.649,4.657-6.08,8-11.303,8c-6.627,0-12-5.373-12-12c0-6.627,5.373-12,12-12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C12.955,4,4,12.955,4,24c0,11.045,8.955,20,20,20c11.045,0,20-8.955,20-20C44,22.659,43.862,21.35,43.611,20.083z' }),
      React.createElement('path', { fill: '#FF3D00', d: 'M6.306,14.691l6.571,4.819C14.655,15.108,18.961,12,24,12c3.059,0,5.842,1.154,7.961,3.039l5.657-5.657C34.046,6.053,29.268,4,24,4C16.318,4,9.656,8.337,6.306,14.691z' }),
      React.createElement('path', { fill: '#4CAF50', d: 'M24,44c5.166,0,9.86-1.977,13.409-5.192l-6.19-5.238C29.211,35.091,26.715,36,24,36c-5.222,0-9.657-3.356-11.303-7.918l-6.522,5.023C9.505,39.556,16.227,44,24,44z' }),
      React.createElement('path', { fill: '#1976D2', d: 'M43.611,20.083H42V20H24v8h11.303c-0.792,2.237-2.231,4.166-4.087,5.571l6.19,5.238C42.012,35.842,44,30.138,44,24C44,22.659,43.862,21.35,43.611,20.083z' })
    ),
  trash: (props: React.SVGProps<SVGSVGElement>) => (
    React.createElement('svg', { ...props, xmlns: "http://www.w3.org/2000/svg", width: "24", height: "24", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round" },
      React.createElement('path', { d: "M3 6h18" }),
      React.createElement('path', { d: "M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" })
    )
  ),
};

// Generic UI Components (like a mini shadcn/ui)

// Button Component
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
}
export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className = '', variant = 'primary', ...props }, ref) => {
    const variants = {
      primary: 'bg-[#5890AD] text-white hover:bg-[#4A7A91] focus:ring-[#5890AD]',
      secondary: 'bg-[#EBF1F4] text-[#3A6073] hover:bg-[#DDE7EC] focus:ring-[#5890AD]',
      ghost: 'bg-transparent text-gray-700 hover:bg-gray-100',
      danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500',
    };
    return React.createElement('button', {
      className: `inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors ${variants[variant]} ${className}`,
      ref,
      ...props,
    });
  }
);
Button.displayName = 'Button';


// Card Component
export const Card: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ children, className = '', ...props }) =>
  React.createElement(
    'div',
    { className: `bg-white rounded-lg shadow-md border border-gray-200 ${className}`, ...props },
    children
  );

export const CardHeader: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) =>
  React.createElement('div', { className: `p-6 border-b border-gray-200 ${className}` }, children);
  
export const CardTitle: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) =>
  React.createElement('h3', { className: `text-lg font-semibold leading-6 text-gray-900 ${className}` }, children);

export const CardContent: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) =>
  React.createElement('div', { className: `p-6 ${className}` }, children);

export const CardFooter: React.FC<{ children: React.ReactNode; className?: string }> = ({ children, className = '' }) =>
    React.createElement('div', { className: `px-6 py-4 bg-gray-50 border-t border-gray-200 rounded-b-lg ${className}` }, children);


// Input Component
export const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, ...props }, ref) => {
    return React.createElement('input', {
      className: `w-full p-3 border border-gray-300 rounded-md shadow-sm focus:ring-[#5890AD] focus:border-[#5890AD] transition duration-150 ease-in-out bg-white ${className}`,
      ref,
      ...props,
    });
  }
);
Input.displayName = 'Input';

// Avatar Component
export const Avatar: React.FC<{ src?: string; fallback: string; className?: string }> = ({
  src,
  fallback,
  className = '',
}) =>
  React.createElement(
    'div',
    {
      className: `relative flex h-10 w-10 shrink-0 overflow-hidden rounded-full items-center justify-center bg-gray-200 text-gray-600 font-semibold ${className}`,
    },
    src ? React.createElement('img', { src, alt: 'User avatar' }) : React.createElement('span', null, fallback)
  );

// Dropdown Menu Component
const DropdownMenuContext = createContext<{
  open: boolean;
  setOpen: React.Dispatch<React.SetStateAction<boolean>>;
}>({ open: false, setOpen: () => {} });

export const DropdownMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [menuRef]);

  return React.createElement(
    DropdownMenuContext.Provider,
    { value: { open, setOpen } },
    React.createElement('div', { className: 'relative inline-block text-left', ref: menuRef }, children)
  );
};

export const DropdownMenuTrigger: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { open, setOpen } = useContext(DropdownMenuContext);
  return React.createElement('div', { onClick: () => setOpen(!open), className: 'cursor-pointer' }, children);
};

export const DropdownMenuContent: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => {
  const { open } = useContext(DropdownMenuContext);
  if (!open) return null;
  return React.createElement(
    'div',
    {
      className: `origin-top-right absolute right-0 mt-2 w-56 rounded-md shadow-lg bg-white ring-1 ring-black ring-opacity-5 z-10 ${className}`,
    },
    React.createElement('div', { className: 'py-1', role: 'menu', 'aria-orientation': 'vertical' }, children)
  );
};

export const DropdownMenuItem: React.FC<{
  children: React.ReactNode;
  onSelect?: () => void;
  className?: string;
}> = ({ children, onSelect, className = '' }) => {
  const { setOpen } = useContext(DropdownMenuContext);
  return React.createElement(
    'a',
    {
      href: '#',
      className: `flex items-center gap-2 text-gray-700 block px-4 py-2 text-sm hover:bg-gray-100 ${className}`,
      role: 'menuitem',
      onClick: (e: React.MouseEvent) => {
        e.preventDefault();
        onSelect?.();
        setOpen(false);
      },
    },
    children
  );
};

// Modal Component
export const Modal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}> = ({ isOpen, onClose, children }) => {
  if (!isOpen) return null;

  return React.createElement(
    'div',
    {
      className: 'fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4',
      'aria-labelledby': 'modal-title',
      role: 'dialog',
      'aria-modal': 'true',
      onClick: onClose,
    },
    React.createElement(
      'div',
      {
        className: 'bg-white rounded-lg shadow-xl w-full max-w-md overflow-hidden transform transition-all',
        // Fix: Explicitly typed event parameter `e` to aid TypeScript's overload resolution for React.createElement.
        onClick: (e: React.MouseEvent) => e.stopPropagation(), // Prevent closing when clicking inside the modal
      },
      children
    )
  );
};

export const ModalHeader: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = ({ children, className = '' }) => 
    React.createElement('div', { className: `p-6 border-b border-gray-200 ${className}`}, children);


export const ModalTitle: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = ({ children, className = '' }) => 
    React.createElement('h2', { id: 'modal-title', className: `text-xl font-bold text-gray-900 ${className}`}, children);


export const ModalBody: React.FC<{
    children: React.ReactNode;
    className?: string;
}> = ({ children, className = '' }) => 
    React.createElement('div', { className: `p-6 ${className}`}, children);


// Fix: Explicitly typed component props with React.HTMLAttributes<HTMLDivElement> to resolve a TypeScript overload error.
// This ensures that all valid div attributes, including className, are recognized.
// Fix: Replaced `React.HTMLAttributes<HTMLDivElement>` with `React.ComponentProps<'div'>` to provide a more robust type for div element props, resolving the overload error.
export const ModalFooter: React.FC<React.ComponentProps<'div'>> = ({ children, className = '', ...props }) =>
  React.createElement(
    'div',
    {
      className: `px-6 py-4 bg-gray-50 border-t border-gray-200 flex justify-end gap-3 ${className}`,
      ...props
    },
    children
  );


