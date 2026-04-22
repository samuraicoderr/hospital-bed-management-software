"use client";

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { 
  User, 
  Settings, 
  Trash2, 
  HelpCircle, 
  Download, 
  Code2, 
  ShoppingBag, 
  Crown, 
  LogOut,
  ChevronRight
} from 'lucide-react';
import { useRouter } from 'next/dist/client/components/navigation';
import { FrontendRoutes } from '@/lib/api/FrontendRoutes';

// Types
interface DropdownItem {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  href?: string;
  danger?: boolean;
  hasArrow?: boolean;
  divider?: boolean;
}

interface UserDropdownProps {
  userName: string;
  avatarUrl?: string;
  onLogout?: () => void;
  onProfileClick?: () => void;
}

// Custom hook for click outside
const useClickOutside = (
  ref: React.RefObject<HTMLElement | null>,
  handler: () => void
) => {
  useEffect(() => {
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
  }, [ref, handler]);
};

// Custom hook for keyboard navigation
const useKeyboardNavigation = (
  isOpen: boolean,
  itemCount: number,
  onClose: () => void,
  onSelect: (index: number) => void
) => {
  const [focusedIndex, setFocusedIndex] = useState<number>(-1);

  useEffect(() => {
    if (!isOpen) {
      setFocusedIndex(-1);
      return;
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setFocusedIndex((prev) => (prev + 1) % itemCount);
          break;
        case 'ArrowUp':
          e.preventDefault();
          setFocusedIndex((prev) => (prev - 1 + itemCount) % itemCount);
          break;
        case 'Enter':
          e.preventDefault();
          if (focusedIndex >= 0) {
            onSelect(focusedIndex);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, itemCount, focusedIndex, onClose, onSelect]);

  return focusedIndex;
};

export const UserDropdown: React.FC<UserDropdownProps> = ({
  userName,
  avatarUrl,
  onLogout,
  onProfileClick,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const router = useRouter();

  const toggleDropdown = useCallback(() => {
    setIsOpen((prev) => !prev);
  }, []);

  const closeDropdown = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleLogout = useCallback(() => {
    closeDropdown();
    onLogout?.();
  }, [closeDropdown, onLogout]);

  const handleProfileClick = useCallback(() => {
    closeDropdown();
    onProfileClick?.();
  }, [closeDropdown, onProfileClick]);

  const menuItems: DropdownItem[] = [
    { id: 'profile', label: 'Profile', icon: <User size={18} />, onClick: handleProfileClick },
    { id: 'admin', label: 'Admin Console', icon: <Settings size={18} />, onClick: () => router.push(FrontendRoutes.organization) },
    { id: 'trash', label: 'Trash', icon: <Trash2 size={18} />, hasArrow: true, onClick: () => router.push(FrontendRoutes.trash) },
    { id: 'learning', label: 'Learning Center', icon: <HelpCircle size={18} /> },
    { id: 'apps', label: 'iOS, Android, Desktop Apps', icon: <Download size={18} /> },
    { id: 'developer', label: 'Developer Hub', icon: <Code2 size={18} /> },
    { id: 'marketplace', label: 'Miro Marketplace', icon: <ShoppingBag size={18} /> },
    { id: 'upgrade', label: 'Upgrade', icon: <Crown size={18} /> },
    { id: 'logout', label: 'Log out', icon: <LogOut size={18} />, onClick: handleLogout, divider: true },
  ];

  const handleSelect = useCallback((index: number) => {
    const item = menuItems[index];
    if (item.onClick) {
      item.onClick();
    }
  }, [menuItems]);

  const focusedIndex = useKeyboardNavigation(
    isOpen,
    menuItems.length,
    closeDropdown,
    handleSelect
  );

  useClickOutside(dropdownRef, closeDropdown);

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      {/* Trigger Button */}
      <button
        ref={buttonRef}
        onClick={toggleDropdown}
        className={`
          flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-200
          hover:bg-gray-100 active:scale-95
          ${isOpen ? 'bg-gray-100' : ''}
        `}
        id="user-menu-button"
        aria-expanded={isOpen}
        aria-haspopup="true"
        aria-label="User menu"
      >
        <img
          src={avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(userName)}&background=random`}
          alt={`${userName}'s avatar`}
          className="w-8 h-8 rounded-full object-cover border border-gray-200"
        />
        <span className="hidden md:inline max-w-40 truncate text-sm font-medium text-gray-900">{userName}</span>
      </button>

      {/* Dropdown Menu */}
      <div
        className={`
          absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-100
          transform transition-all duration-200 origin-top-right z-50
          ${isOpen 
            ? 'opacity-100 scale-100 translate-y-0' 
            : 'opacity-0 scale-95 -translate-y-2 pointer-events-none'
          }
        `}
        role="menu"
        aria-orientation="vertical"
        aria-labelledby="user-menu-button"
      >
        {/* Menu Items */}
        <div className="py-2">
          {menuItems.map((item, index) => (
            <React.Fragment key={item.id}>
              {item.divider && index > 0 && (
                <div className="my-2 border-t border-gray-100" role="separator" />
              )}
              <MenuItem
                item={item}
                isFocused={focusedIndex === index}
                onClick={() => {
                  if (item.onClick) item.onClick();
                  else closeDropdown();
                }}
              />
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Backdrop for mobile */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/5 z-40 lg:hidden" 
          onClick={closeDropdown}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

// Sub-component for individual menu items
interface MenuItemProps {
  item: DropdownItem;
  isFocused: boolean;
  onClick: () => void;
}

const MenuItem: React.FC<MenuItemProps> = ({ item, isFocused, onClick }) => {
  const itemRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (isFocused && itemRef.current) {
      itemRef.current.focus();
    }
  }, [isFocused]);

  const baseClasses = `
    w-full flex items-center justify-between px-4 py-2.5 text-sm
    transition-colors duration-150 outline-none
    ${item.danger 
      ? 'text-red-600 hover:bg-red-50' 
      : 'text-gray-700 hover:bg-gray-50 hover:text-gray-900'
    }
    ${isFocused ? 'bg-gray-50' : ''}
  `;

  const content = (
    <>
      <div className="flex items-center gap-3">
        <span className={`${item.danger ? 'text-red-500' : 'text-gray-500'}`}>
          {item.icon}
        </span>
        <span className="font-medium">{item.label}</span>
      </div>
      {item.hasArrow && (
        <ChevronRight size={16} className="text-gray-400" />
      )}
    </>
  );

  if (item.href) {
    return (
      <a
        href={item.href}
        className={baseClasses}
        role="menuitem"
        onClick={onClick}
      >
        {content}
      </a>
    );
  }

  return (
    <button
      ref={itemRef}
      onClick={onClick}
      className={baseClasses}
      role="menuitem"
      tabIndex={isFocused ? 0 : -1}
    >
      {content}
    </button>
  );
};

// Demo/Example usage
export const Demo: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">User Dropdown Demo</h1>
          <UserDropdown
            userName="williamusanga23"
            onLogout={() => console.log('Logging out...')}
            onProfileClick={() => console.log('Opening profile...')}
          />
        </div>
        
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <p className="text-gray-600">
            Click the user menu in the top right to see the dropdown in action.
            Features include:
          </p>
          <ul className="mt-4 space-y-2 text-sm text-gray-600 list-disc list-inside">
            <li>Keyboard navigation (Arrow keys, Enter, Escape)</li>
            <li>Click outside to close</li>
            <li>Smooth animations and transitions</li>
            <li>Focus management and accessibility</li>
            <li>Responsive design with mobile backdrop</li>
            <li>TypeScript strict typing</li>
          </ul>
        </div>
      </div>
    </div>
  );
};

export default UserDropdown;