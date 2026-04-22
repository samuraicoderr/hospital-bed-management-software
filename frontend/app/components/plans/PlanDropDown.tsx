"use client";

import React, { useState, useCallback } from 'react';
import { 
  Share2, 
  Link, 
  ExternalLink, 
  Star, 
  Pencil, 
  Copy, 
  Image, 
  Info, 
  Lock, 
  Download, 
  ArrowRight, 
  Trash2, 
  LogOut,
  HelpCircle
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuGroup,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

// Types
interface PlanMenuProps {
  planName: string;
  onShare?: () => void;
  onCopyLink?: () => void;
  onOpenInNewTab?: () => void;
  onStar?: () => void;
  onRename?: () => void;
  onDuplicate?: () => void;
  onChangeThumbnail?: () => void;
  onViewDetails?: () => void;
  onMakePrivate?: () => void;
  onDownloadBackup?: () => void;
  onMoveToTeam?: () => void;
  onDelete?: () => void;
  onLeave?: () => void;
}

type MenuItemConfig = {
  id: string;
  label: string;
  icon: React.ReactNode;
  onClick?: () => void;
  disabled?: boolean;
  destructive?: boolean;
  hasHint?: boolean;
  hintText?: string;
};

export const PlanMenu: React.FC<PlanMenuProps> = ({
  planName,
  onShare,
  onCopyLink,
  onOpenInNewTab,
  onStar,
  onRename,
  onDuplicate,
  onChangeThumbnail,
  onViewDetails,
  onMakePrivate,
  onDownloadBackup,
  onMoveToTeam,
  onDelete,
  onLeave,
}) => {
  const [isStarred, setIsStarred] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  const handleStar = useCallback(() => {
    setIsStarred(prev => !prev);
    onStar?.();
  }, [onStar]);

  const handleMakePrivate = useCallback(() => {
    setIsPrivate(prev => !prev);
    onMakePrivate?.();
  }, [onMakePrivate]);

  // Menu sections configuration
  const primaryActions: MenuItemConfig[] = [
    { id: 'share', label: 'Share', icon: <Share2 size={16} />, onClick: onShare },
    { id: 'copy', label: 'Copy plan link', icon: <Link size={16} />, onClick: onCopyLink },
    { id: 'open', label: 'Open in new tab', icon: <ExternalLink size={16} />, onClick: onOpenInNewTab },
  ];

  const planActions: MenuItemConfig[] = [
    { 
      id: 'star', 
      label: isStarred ? 'Unstar this plan' : 'Star this plan', 
      icon: <Star size={16} className={cn(isStarred && "fill-amber-400 text-amber-400")} />, 
      onClick: handleStar 
    },
    { id: 'rename', label: 'Rename', icon: <Pencil size={16} />, onClick: onRename },
    { id: 'duplicate', label: 'Duplicate', icon: <Copy size={16} />, onClick: onDuplicate },
    { id: 'thumbnail', label: 'Change thumbnail', icon: <Image size={16} />, onClick: onChangeThumbnail },
    { id: 'details', label: 'Plan details', icon: <Info size={16} />, onClick: onViewDetails },
  ];

  const privacyActions: MenuItemConfig[] = [
    { 
      id: 'private', 
      label: isPrivate ? 'Make plan public' : 'Make plan private', 
      icon: <Lock size={16} />, 
      onClick: handleMakePrivate,
      hasHint: true,
      hintText: 'Control who can view this plan'
    },
    { 
      id: 'download', 
      label: 'Download plan backup', 
      icon: <Download size={16} />, 
      onClick: onDownloadBackup,
      hasHint: true,
      hintText: 'Save a copy to your device'
    },
  ];

  const dangerActions: MenuItemConfig[] = [
    { 
      id: 'move', 
      label: 'Move to Team', 
      icon: <ArrowRight size={16} />, 
      onClick: onMoveToTeam,
      disabled: true 
    },
  ];

  const destructiveActions: MenuItemConfig[] = [
    { 
      id: 'delete', 
      label: 'Delete', 
      icon: <Trash2 size={16} />, 
      onClick: onDelete,
      destructive: true 
    },
    { 
      id: 'leave', 
      label: 'Leave', 
      icon: <LogOut size={16} />, 
      onClick: onLeave,
      disabled: true 
    },
  ];

  const renderMenuItem = (item: MenuItemConfig) => (
    <DropdownMenuItem
      key={item.id}
      onClick={item.onClick}
      disabled={item.disabled}
      className={cn(
        "flex items-center justify-between gap-3 px-3 py-2.5 text-sm cursor-pointer transition-colors",
        "focus:bg-gray-100 focus:text-gray-900",
        item.disabled && "opacity-50 cursor-not-allowed text-gray-400",
        item.destructive && !item.disabled && "text-red-600 focus:text-red-600 focus:bg-red-50",
        !item.destructive && !item.disabled && "text-gray-700"
      )}
    >
      <div className="flex items-center gap-3">
        <span className={cn(
          "text-gray-500",
          item.destructive && "text-red-500",
          item.disabled && "text-gray-400"
        )}>
          {item.icon}
        </span>
        <span className="font-medium">{item.label}</span>
      </div>
      {item.hasHint && (
        <HelpCircle 
          size={14} 
          className="text-gray-400 flex-shrink-0" 
        />
      )}
    </DropdownMenuItem>
  );

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button 
          variant="ghost" 
          size="sm"
          className="h-8 w-8 p-0 hover:bg-gray-100"
          aria-label={`${planName} options`}
        >
          <svg 
            width="15" 
            height="15" 
            viewBox="0 0 15 15" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="text-gray-600"
          >
            <path 
              d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z" 
              fill="currentColor" 
              fillRule="evenodd" 
              clipRule="evenodd"
            />
          </svg>
        </Button>
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        side="left"
        align="center"
        className="w-[min(16rem,calc(100vw-1rem))] p-1.5 bg-white border border-gray-200 shadow-xl rounded-xl"
        sideOffset={10}
        alignOffset={0}
        avoidCollisions={true}
        collisionPadding={10}
      >
        {/* Primary Actions */}
        <DropdownMenuGroup className="space-y-0.5">
          {primaryActions.map(renderMenuItem)}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-2 bg-gray-100" />

        {/* Plan Actions */}
        <DropdownMenuGroup className="space-y-0.5">
          {planActions.map(renderMenuItem)}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-2 bg-gray-100" />

        {/* Privacy Actions */}
        <DropdownMenuGroup className="space-y-0.5">
          {privacyActions.map(renderMenuItem)}
        </DropdownMenuGroup>

        <DropdownMenuSeparator className="my-2 bg-gray-100" />

        {/* Danger/Destructive Actions */}
        <DropdownMenuGroup className="space-y-0.5">
          {dangerActions.map(renderMenuItem)}
          {destructiveActions.map(renderMenuItem)}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Demo with context showing the menu in action
export const PlanMenuDemo: React.FC = () => {
  const [notifications, setNotifications] = useState<string[]>([]);

  const addNotification = (action: string) => {
    setNotifications(prev => [...prev, `${new Date().toLocaleTimeString()}: ${action}`]);
  };

  const menuProps: PlanMenuProps = {
    planName: "Q4 Marketing Strategy",
    onShare: () => addNotification("Opening share dialog..."),
    onCopyLink: () => addNotification("Link copied to clipboard!"),
    onOpenInNewTab: () => addNotification("Opening in new tab..."),
    onStar: () => addNotification("Plan starred!"),
    onRename: () => addNotification("Opening rename dialog..."),
    onDuplicate: () => addNotification("Plan duplicated!"),
    onChangeThumbnail: () => addNotification("Opening thumbnail picker..."),
    onViewDetails: () => addNotification("Opening plan details..."),
    onMakePrivate: () => addNotification("Privacy settings updated!"),
    onDownloadBackup: () => addNotification("Downloading backup..."),
    onMoveToTeam: () => addNotification("Moving to team..."),
    onDelete: () => addNotification("Plan deleted!"),
    onLeave: () => addNotification("Left the plan!"),
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Plan Menu Component</h1>
          <p className="text-gray-600">
            A production-ready dropdown menu using shadcn/ui primitives. 
            Click the three-dot menu below to interact.
          </p>
        </div>

        {/* Demo Card */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                P
              </div>
              <div>
                <h3 className="font-semibold text-gray-900">Q4 Marketing Strategy</h3>
                <p className="text-sm text-gray-500">Last edited 2 hours ago</p>
              </div>
            </div>
            
            <PlanMenu {...menuProps} />
          </div>
        </div>

        {/* Features List */}
        <div className="grid grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Features</h4>
            <ul className="space-y-2 text-sm text-gray-600">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Built on shadcn/ui DropdownMenu primitives
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Automatic positioning and collision detection
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Keyboard navigation (Arrow keys, Enter, Escape)
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                Focus management and accessibility
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                State management for Star and Private toggles
              </li>
            </ul>
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-4">
            <h4 className="font-semibold text-gray-900 mb-2">Action Log</h4>
            <div className="h-32 overflow-y-auto space-y-1 text-sm font-mono text-gray-600">
              {notifications.length === 0 ? (
                <span className="text-gray-400 italic">No actions yet...</span>
              ) : (
                notifications.slice(-10).map((note, i) => (
                  <div key={i} className="text-xs">{note}</div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Code Structure */}
        <div className="bg-slate-900 rounded-xl p-6 text-slate-300 text-sm overflow-x-auto">
          <pre>{`<PlanMenu
  planName="Q4 Marketing Strategy"
  onShare={() => {}}
  onCopyLink={() => {}}
  onStar={() => {}}
  onRename={() => {}}
  onDuplicate={() => {}}
  onChangeThumbnail={() => {}}
  onViewDetails={() => {}}
  onMakePrivate={() => {}}
  onDownloadBackup={() => {}}
  onMoveToTeam={() => {}}
  onDelete={() => {}}
  onLeave={() => {}}
/>`}</pre>
        </div>
      </div>
    </div>
  );
};

export default PlanMenu;