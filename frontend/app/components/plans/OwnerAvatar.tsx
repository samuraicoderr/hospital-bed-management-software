"use client";

import React from "react";
import appConfig from "@/lib/appconfig";

interface OwnerAvatarProps {
  ownerName: string;
  avatarUrl?: string;
  sizeClassName?: string;
}

export default function OwnerAvatar({
  ownerName,
  avatarUrl,
  sizeClassName = "h-8 w-8",
}: OwnerAvatarProps) {
  const fallbackGenerated = `https://ui-avatars.com/api/?name=${encodeURIComponent(
    ownerName
  )}&background=0F6E56&color=ffffff&size=96`;

  const src = avatarUrl || fallbackGenerated;

  return (
    <div className="relative inline-flex group/owner">
      <img
        src={src}
        alt={`${ownerName} avatar`}
        className={`${sizeClassName} rounded-full object-cover border border-gray-200 bg-gray-100`}
        onError={(event) => {
          event.currentTarget.onerror = null;
          event.currentTarget.src = appConfig.media.defaultAvatar;
        }}
      />

      <div className="pointer-events-none absolute left-1/2 bottom-full z-20 mb-2 -translate-x-1/2 opacity-0 translate-y-1 transition-all duration-150 group-hover/owner:opacity-100 group-hover/owner:translate-y-0">
        <div className="whitespace-nowrap rounded-md bg-gray-900 px-2 py-1 text-xs font-medium text-white shadow-lg">
          {ownerName}
        </div>
        <div className="mx-auto -mt-1 h-2 w-2 rotate-45 bg-gray-900" />
      </div>
    </div>
  );
}
