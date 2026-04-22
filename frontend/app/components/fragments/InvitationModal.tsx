"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  X, 
  Mail, 
  UserPlus, 
  Link as LinkIcon,
  AlertCircle,
  Crown,
} from 'lucide-react';

// Types
interface InviteModalProps {
  isOpen: boolean;
  onClose: () => void;
  teamName: string;
  onSendInvites: (emails: string[]) => Promise<void>;
  onCopyLink: () => Promise<void>;
}

type InviteMethod = 'manual' | 'microsoft' | 'google' | 'slack';

interface EmailChip {
  id: string;
  email: string;
  isValid: boolean;
}

// Custom hook for body scroll lock
const useLockBodyScroll = (isLocked: boolean) => {
  useEffect(() => {
    if (isLocked) {
      const originalStyle = window.getComputedStyle(document.body).overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalStyle;
      };
    }
  }, [isLocked]);
};

// Custom hook for click outside
const useClickOutside = (
  ref: React.RefObject<HTMLElement | null>,
  handler: () => void,
  isActive: boolean
) => {
  useEffect(() => {
    if (!isActive) return;

    const listener = (event: MouseEvent | TouchEvent) => {
      if (!ref.current || ref.current.contains(event.target as Node)) {
        return;
      }
      handler();
    };

    document.addEventListener('mousedown', listener);
    document.addEventListener('touchstart', listener);

    return () => {
      document.removeEventListener('mousedown', listener);
      document.removeEventListener('touchstart', listener);
    };
  }, [ref, handler, isActive]);
};

// Custom hook for escape key
const useEscapeKey = (handler: () => void, isActive: boolean) => {
  useEffect(() => {
    if (!isActive) return;

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        handler();
      }
    };

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, [handler, isActive]);
};

// Email validation utility
const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
};

// Generate unique ID
const generateId = (): string => 
  `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

export const InviteModal: React.FC<InviteModalProps> = ({
  isOpen,
  onClose,
  teamName,
  onSendInvites,
  onCopyLink,
}) => {
  const [activeTab, setActiveTab] = useState<InviteMethod>('manual');
  const [emails, setEmails] = useState<EmailChip[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const modalRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const lastChipRef = useRef<HTMLDivElement>(null);

  // Lock body scroll when modal is open
  useLockBodyScroll(isOpen);
  
  // Close on escape key
  useEscapeKey(onClose, isOpen);
  
  // Close on click outside
  useClickOutside(modalRef, onClose, isOpen);

  // Focus input when modal opens
  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen]);

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setEmails([]);
      setInputValue('');
      setError(null);
      setCopied(false);
      setActiveTab('manual');
    }
  }, [isOpen]);

  const addEmail = useCallback((email: string) => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) return;

    // Check for duplicates
    if (emails.some(e => e.email.toLowerCase() === trimmedEmail.toLowerCase())) {
      setError('This email has already been added');
      return;
    }

    const newChip: EmailChip = {
      id: generateId(),
      email: trimmedEmail,
      isValid: isValidEmail(trimmedEmail),
    };

    setEmails(prev => [...prev, newChip]);
    setInputValue('');
    setError(null);
  }, [emails]);

  const removeEmail = useCallback((id: string) => {
    setEmails(prev => prev.filter(e => e.id !== id));
    setError(null);
    inputRef.current?.focus();
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',' || e.key === ' ') {
      e.preventDefault();
      if (inputValue.trim()) {
        addEmail(inputValue);
      }
    } else if (e.key === 'Backspace' && !inputValue && emails.length > 0) {
      // Remove last chip on backspace when input is empty
      const lastEmail = emails[emails.length - 1];
      removeEmail(lastEmail.id);
    }
  }, [inputValue, emails, addEmail, removeEmail]);

  const handlePaste = useCallback((e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedText = e.clipboardData.getData('text');
    const pastedEmails = pastedText.split(/[\n,;]/).map(e => e.trim()).filter(Boolean);
    
    pastedEmails.forEach(email => addEmail(email));
  }, [addEmail]);

  const handleSendInvites = async () => {
    const validEmails = emails.filter(e => e.isValid).map(e => e.email);
    
    if (validEmails.length === 0) {
      setError('Please add at least one valid email address');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      await onSendInvites(validEmails);
      onClose();
    } catch (err) {
      setError('Failed to send invitations. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await onCopyLink();
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      setError('Failed to copy link');
    }
  };

  const handleTabChange = (tab: InviteMethod) => {
    setActiveTab(tab);
    // In a real app, this would switch to OAuth flows for Microsoft/Google/Slack
    console.log(`Switching to ${tab} invite method`);
  };

  if (!isOpen) return null;

  const validEmailCount = emails.filter(e => e.isValid).length;

  const tabs: { id: InviteMethod; label: string; icon: React.ReactNode }[] = [
    { 
      id: 'manual', 
      label: 'Manual Invite', 
      icon: <Mail size={18} /> 
    },
    { 
      id: 'microsoft', 
      label: 'Microsoft', 
      icon: (
        <svg viewBox="0 0 21 21" className="w-5 h-5">
          <rect x="1" y="1" width="9" height="9" fill="#f25022"/>
          <rect x="1" y="11" width="9" height="9" fill="#00a4ef"/>
          <rect x="11" y="1" width="9" height="9" fill="#7fba00"/>
          <rect x="11" y="11" width="9" height="9" fill="#ffb900"/>
        </svg>
      )
    },
    { 
      id: 'google', 
      label: 'Google', 
      icon: (
        <svg viewBox="0 0 24 24" className="w-5 h-5">
          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
        </svg>
      )
    },
    { 
      id: 'slack', 
      label: 'Slack', 
      icon: (
        <svg viewBox="0 0 127 127" className="w-5 h-5">
          <path fill="#E01E5A" d="M27.2 80c0 7.3-5.9 13.2-13.2 13.2C6.7 93.2.8 87.3.8 80c0-7.3 5.9-13.2 13.2-13.2h13.2V80zm6.6 0c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2v33c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V80z"/>
          <path fill="#36C5F0" d="M47 27c-7.3 0-13.2-5.9-13.2-13.2C33.8 6.5 39.7.6 47 .6c7.3 0 13.2 5.9 13.2 13.2V27H47zm0 6.7c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H13.9C6.6 60.1.7 54.2.7 46.9c0-7.3 5.9-13.2 13.2-13.2H47z"/>
          <path fill="#2EB67D" d="M99.9 46.9c0-7.3 5.9-13.2 13.2-13.2 7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H99.9V46.9zm-6.6 0c0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V13.8C66.9 6.5 72.8.6 80.1.6c7.3 0 13.2 5.9 13.2 13.2v33.1z"/>
          <path fill="#ECB22E" d="M80.1 99.8c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2-7.3 0-13.2-5.9-13.2-13.2V99.8h13.2zm0-6.6c-7.3 0-13.2-5.9-13.2-13.2 0-7.3 5.9-13.2 13.2-13.2h33.1c7.3 0 13.2 5.9 13.2 13.2 0 7.3-5.9 13.2-13.2 13.2H80.1z"/>
        </svg>
      )
    },
  ];

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/40 backdrop-blur-sm transition-opacity duration-300"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Modal */}
      <div
        ref={modalRef}
        className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl transform transition-all duration-300 scale-100"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
          <h2 
            id="modal-title" 
            className="text-xl font-semibold text-gray-900"
          >
            Invite to {teamName}
          </h2>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close modal"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 border-b border-gray-100">
          <div className="flex gap-6">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => handleTabChange(tab.id)}
                className={`
                  flex items-center gap-2 py-4 text-sm font-medium border-b-2 transition-colors duration-200
                  ${activeTab === tab.id 
                    ? 'border-[#0F6E56] text-[#0F6E56]' 
                    : 'border-transparent text-gray-600 hover:text-gray-900'
                  }
                `}
                aria-selected={activeTab === tab.id}
                role="tab"
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {activeTab === 'manual' ? (
            <>
              {/* Email Input Area */}
              <div
                className={`
                  min-h-[120px] p-3 rounded-lg border-2 transition-all duration-200
                  ${error 
                    ? 'border-red-300 bg-red-50' 
                    : 'border-gray-200 focus-within:border-[#0F6E56] focus-within:ring-4 focus-within:ring-[#E1F5EE]'
                  }
                `}
                onClick={() => inputRef.current?.focus()}
              >
                <div className="flex flex-wrap gap-2 items-center">
                  <UserPlus size={20} className="text-gray-400 flex-shrink-0" />
                  
                  {emails.map((chip) => (
                    <div
                      key={chip.id}
                      ref={chip === emails[emails.length - 1] ? lastChipRef : null}
                      className={`
                        flex items-center gap-1 px-3 py-1.5 rounded-full text-sm
                        transition-all duration-200 animate-in fade-in zoom-in
                        ${chip.isValid 
                          ? 'bg-gray-100 text-gray-700' 
                          : 'bg-red-100 text-red-700 border border-red-200'
                        }
                      `}
                    >
                      <span>{chip.email}</span>
                      <button
                        onClick={() => removeEmail(chip.id)}
                        className="ml-1 p-0.5 rounded-full hover:bg-black/10 transition-colors"
                        aria-label={`Remove ${chip.email}`}
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  
                  <input
                    ref={inputRef}
                    type="text"
                    value={inputValue}
                    onChange={(e) => setInputValue(e.target.value)}
                    onKeyDown={handleKeyDown}
                    onPaste={handlePaste}
                    onBlur={() => {
                      if (inputValue.trim()) {
                        addEmail(inputValue);
                      }
                    }}
                    placeholder={emails.length === 0 ? "Enter email addresses..." : ""}
                    className="flex-1 min-w-[120px] bg-transparent outline-none text-sm py-1"
                    aria-label="Email input"
                  />
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div 
                  className="mt-2 flex items-center gap-2 text-sm text-red-600 animate-in slide-in-from-top-1"
                  role="alert"
                >
                  <AlertCircle size={16} />
                  {error}
                </div>
              )}

              {/* Helper Text */}
              <p className="mt-2 text-xs text-gray-500">
                Press Enter or comma to add multiple emails. Paste a list to add multiple at once.
              </p>

              {/* Action Buttons */}
              <div className="mt-6 flex items-center justify-between gap-4">
                <button
                  onClick={handleSendInvites}
                  disabled={isLoading || validEmailCount === 0}
                  className={`
                    px-6 py-2.5 rounded-lg font-medium text-white
                    transition-all duration-200 flex items-center gap-2
                    ${isLoading || validEmailCount === 0
                      ? 'bg-[#5ea592] cursor-not-allowed'
                      : 'bg-[#0F6E56] hover:bg-[#0c5e4a] active:scale-95 shadow-lg shadow-[#0F6E56]/25'
                    }
                  `}
                >
                  {isLoading ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      Sending...
                    </>
                  ) : (
                    `Send ${validEmailCount > 0 ? validEmailCount : ''} invitation${validEmailCount !== 1 ? 's' : ''}`
                  )}
                </button>

                <button
                  onClick={handleCopyLink}
                  className={`
                    px-4 py-2.5 rounded-lg font-medium border-2
                    transition-all duration-200 flex items-center gap-2
                    ${copied
                      ? 'border-green-500 text-green-600 bg-green-50'
                      : 'border-gray-300 text-gray-700 hover:border-gray-400 hover:bg-gray-50'
                    }
                  `}
                >
                  <LinkIcon size={18} />
                  {copied ? 'Copied!' : 'Copy team invite link'}
                </button>
              </div>
            </>
          ) : (
            /* OAuth Placeholder */
            <div className="py-12 text-center text-gray-500">
              <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                {tabs.find(t => t.id === activeTab)?.icon}
              </div>
              <p className="font-medium text-gray-900">
                Connect with {tabs.find(t => t.id === activeTab)?.label}
              </p>
              <p className="text-sm mt-1">
                Connect your {tabs.find(t => t.id === activeTab)?.label} account to easily invite people from your organization.
              </p>
              <button className="mt-4 px-6 py-2 bg-[#0F6E56] text-white rounded-lg hover:bg-[#0c5e4a] transition-colors">
                Continue with {tabs.find(t => t.id === activeTab)?.label}
              </button>
            </div>
          )}
        </div>

        {/* Footer Info */}
        <div className="px-6 py-4 bg-[#E1F5EE]/60 rounded-b-2xl border-t border-[#B8E7DA]">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-[#CFEFE5] flex items-center justify-center">
              <Crown size={16} className="text-[#0F6E56]" />
            </div>
            <p className="text-sm text-gray-600 leading-relaxed">
              <button className="text-[#0F6E56] font-medium hover:underline">
                Upgrade
              </button>
              {' '}to invite Guests to shared plans and collaborate securely with clients and investors. 👀
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

// Demo/Example usage
export const Demo: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleSendInvites = async (emails: string[]) => {
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1500));
    console.log('Sending invites to:', emails);
  };

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText('https://miro.com/app/board/invite/abc123');
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="bg-white rounded-xl p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900 mb-4">
            Team Invitation Modal Demo
          </h1>
          <p className="text-gray-600 mb-6">
            Click the button below to open the invitation modal. Features include:
          </p>
          <ul className="space-y-2 text-sm text-gray-600 list-disc list-inside mb-6">
            <li>Email chip input with validation</li>
            <li>Keyboard navigation (Enter, Backspace, Comma)</li>
            <li>Paste multiple emails at once</li>
            <li>Tab navigation for different invite methods</li>
            <li>Loading states and error handling</li>
            <li>Accessible with ARIA attributes</li>
            <li>Smooth animations and transitions</li>
          </ul>
          <button
            onClick={() => setIsOpen(true)}
            className="px-6 py-3 bg-[#0F6E56] text-white rounded-lg font-medium hover:bg-[#0c5e4a] transition-colors shadow-lg shadow-[#0F6E56]/25"
          >
            Open Invite Modal
          </button>
        </div>
      </div>

      <InviteModal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        teamName="My Team Bro"
        onSendInvites={handleSendInvites}
        onCopyLink={handleCopyLink}
      />
    </div>
  );
};

export default InviteModal;