"use client";

import React, { useState, useCallback } from 'react';
import { X, Lock, LayoutGrid, Sparkles, Crown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import OwnerAvatar from "@/app/components/plans/OwnerAvatar";
import appConfig from "@/lib/appconfig";
import { cn } from "@/lib/utils";

// Types
interface PlanUpgradePromptProps {
  organizationName: string;
  planName?: string;
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
  adminName: string;
  adminAvatarUrl?: string;
}

interface FeatureItem {
  id: string;
  icon: React.ReactNode;
  label: string;
}

export const PlanUpgradePrompt: React.FC<PlanUpgradePromptProps> = ({
  organizationName,
  planName = "Free plan",
  isOpen,
  onClose,
  onUpgrade,
  adminName,
  adminAvatarUrl,
}) => {
  const [isUpgrading, setIsUpgrading] = useState(false);

  const handleUpgrade = useCallback(async () => {
    setIsUpgrading(true);
    try {
      await onUpgrade();
    } finally {
      setIsUpgrading(false);
    }
  }, [onUpgrade]);

  const features: FeatureItem[] = [
    {
      id: 'private',
      icon: <Lock size={16} className="text-[#0F6E56]" />,
      label: 'Keep plans private',
    },
    {
      id: 'unlimited',
      icon: <LayoutGrid size={16} className="text-[#0F6E56]" />,
      label: 'Create unlimited plans',
    },
  ];

  // If not using as dropdown, render as modal/card
  if (!isOpen) return null;

  return (
    <div className="relative w-full max-w-sm bg-white rounded-xl shadow-2xl border border-gray-100 overflow-hidden animate-in fade-in zoom-in duration-200">
      {/* Header */}
      <div className="px-5 pt-5 pb-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3 className="text-lg font-semibold text-gray-900 leading-tight">
              {organizationName} is on {planName}
            </h3>
            <p className="mt-1 text-sm text-gray-500">
              In this plan, members access all plans.
            </p>
          </div>
          <button
            onClick={onClose}
            className="flex-shrink-0 p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-200"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Admin Info */}
      <div className="px-5 py-2">
        <div className="flex items-center gap-2.5">
          <OwnerAvatar
            ownerName={adminName}
            avatarUrl={adminAvatarUrl || appConfig.media.avatarExample}
            sizeClassName="h-6 w-6"
          />
          <span className="text-sm text-gray-600">
            <span className="font-medium text-gray-900">{adminName}</span>
            {' '}is an organization admin
          </span>
        </div>
      </div>

      {/* Upgrade Card */}
      <div className="mx-5 mb-5 mt-3 p-4 bg-gradient-to-br from-[#E1F5EE]/90 to-[#EEEDFE]/70 rounded-xl border border-[#0F6E56]/10">
        {/* Features List */}
        <div className="space-y-3 mb-4">
          {features.map((feature) => (
            <div 
              key={feature.id}
              className="flex items-center gap-3 text-sm text-gray-700"
            >
              <div className="flex-shrink-0 w-5 h-5 rounded-full bg-[#E1F5EE] flex items-center justify-center">
                {feature.icon}
              </div>
              <span className="font-medium">{feature.label}</span>
            </div>
          ))}
        </div>

        {/* Upgrade Button */}
        <Button
          onClick={handleUpgrade}
          disabled={isUpgrading}
          className={cn(
            "w-full h-10 font-semibold text-white bg-[#0F6E56] hover:bg-[#0c5e4a]",
            "transition-all duration-200 shadow-lg shadow-[#0F6E56]/20",
            "active:scale-[0.98] disabled:opacity-70 disabled:cursor-not-allowed",
            "flex items-center justify-center gap-2"
          )}
        >
          {isUpgrading ? (
            <>
              <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              Upgrading...
            </>
          ) : (
            <>
              <Crown size={16} className="fill-white/20" />
              Upgrade
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

// Dropdown wrapper version using shadcn/ui
interface PlanUpgradeDropdownProps {
  organizationName: string;
  planName?: string;
  adminName: string;
  adminAvatarUrl?: string;
  onUpgrade: () => void;
  trigger?: React.ReactNode;
}

export const PlanUpgradeDropdown: React.FC<PlanUpgradeDropdownProps> = ({
  organizationName,
  planName = "Free plan",
  adminName,
  adminAvatarUrl,
  onUpgrade,
  trigger,
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const handleClose = useCallback(() => {
    setIsOpen(false);
  }, []);

  const handleUpgrade = useCallback(async () => {
    await onUpgrade();
    setIsOpen(false);
  }, [onUpgrade]);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        {trigger || (
          <Button 
            variant="ghost" 
            size="sm"
            className="gap-2 text-[#0F6E56] border border-[#0F6E56]/25 hover:bg-[#E1F5EE] hover:text-[#0c5e4a]"
          >
            <Sparkles size={14} />
            Free Plan
          </Button>
        )}
      </DropdownMenuTrigger>
      
      <DropdownMenuContent 
        align="end" 
        sideOffset={10}
        collisionPadding={14}
        className="p-0 w-80 bg-transparent border-0 shadow-none !overflow-visible !overflow-x-visible !overflow-y-visible !max-h-none"
        avoidCollisions
      >
        <PlanUpgradePrompt
          organizationName={organizationName}
          planName={planName}
          isOpen={isOpen}
          onClose={handleClose}
          onUpgrade={handleUpgrade}
          adminName={adminName}
          adminAvatarUrl={adminAvatarUrl}
        />
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

// Demo/Example usage
export const PlanUpgradeDemo: React.FC = () => {
  const [logs, setLogs] = useState<string[]>([]);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const handleUpgrade = async () => {
    addLog("Initiating upgrade...");
    await new Promise(resolve => setTimeout(resolve, 1500));
    addLog("Upgrade completed! Redirecting to billing...");
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        {/* Header */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">
            Plan Upgrade Prompt
          </h1>
          <p className="text-gray-600">
            A polished upgrade prompt using shadcn/ui for positioning. 
            Click the button below to see the dropdown version.
          </p>
        </div>

        {/* Demo Section */}
        <div className="grid grid-cols-2 gap-8">
          {/* Dropdown Version */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Dropdown Version</h3>
            <div className="flex justify-center">
              <PlanUpgradeDropdown
                organizationName="My Startup"
                planName="Free plan"
                adminName="williamusanga23"
                onUpgrade={handleUpgrade}
              />
            </div>
          </div>

          {/* Standalone Card Version */}
          <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
            <h3 className="font-semibold text-gray-900 mb-4">Standalone Card</h3>
            <PlanUpgradePrompt
              organizationName="My Startup"
              planName="Free plan"
              isOpen={true}
              onClose={() => addLog("Closed prompt")}
              onUpgrade={handleUpgrade}
              adminName="williamusanga23"
            />
          </div>
        </div>

        {/* Features */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
          <h3 className="font-semibold text-gray-900 mb-4">Features</h3>
          <div className="grid grid-cols-2 gap-4 text-sm text-gray-600">
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                shadcn/ui DropdownMenu for automatic positioning
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Collision detection and viewport boundary handling
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Integrated OwnerAvatar component
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Loading states with spinner animation
              </li>
            </ul>
            <ul className="space-y-2">
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Smooth enter/exit animations
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Accessible with proper ARIA attributes
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                Gradient background on upgrade card
              </li>
              <li className="flex items-center gap-2">
                <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                TypeScript strict typing
              </li>
            </ul>
          </div>
        </div>

        {/* Action Log */}
        <div className="bg-slate-900 rounded-xl p-6 text-slate-300">
          <h3 className="font-semibold text-slate-100 mb-3">Action Log</h3>
          <div className="h-32 overflow-y-auto space-y-1 text-sm font-mono">
            {logs.length === 0 ? (
              <span className="text-slate-500 italic">No actions yet...</span>
            ) : (
              logs.slice(-10).map((log, i) => (
                <div key={i} className="text-slate-400">{log}</div>
              ))
            )}
          </div>
        </div>

        {/* Usage Example */}
        <div className="bg-slate-800 rounded-xl p-6 overflow-x-auto">
          <h3 className="text-slate-100 font-semibold mb-4">Usage Example</h3>
          <pre className="text-sm text-slate-300">
{`<PlanUpgradeDropdown
  organizationName="My Startup"
  planName="Free plan"
  adminName="williamusanga23"
  adminAvatarUrl={user.avatarUrl}
  onUpgrade={async () => {
    await upgradePlan();
    toast.success("Upgraded to Pro!");
  }}
/>`}
          </pre>
        </div>
      </div>
    </div>
  );
};

export default PlanUpgradeDropdown;