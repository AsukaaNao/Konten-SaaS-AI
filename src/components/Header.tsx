import React from "react";
import { User } from "../types/index";
import {
  Icons,
  Avatar,
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
} from "../constants";
import { Page } from "../types/index";

interface HeaderProps {
  user?: User | null;
  onLogout: () => void;
  onBack?: () => void;
  onNavigate: (page: Page) => void;
}

export const Header: React.FC<HeaderProps> = ({
  user,
  onLogout,
  onBack,
  onNavigate,
}) => {
  const userFallback = user?.displayName
    ? user.displayName.charAt(0).toUpperCase()
    : "U";

  return (
    <header className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-20">
      <div className="container mx-auto px-4 md:px-8">
        <div className="flex justify-between items-center py-3">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600 -ml-2"
                aria-label="Go back"
              >
                <Icons.arrowLeft className="h-6 w-6" />
              </button>
            )}

            {/* ✅ Refined RICE AI Brand Section */}
            <a
              href="https://riceai.net"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 group"
              onClick={(e) => {
                e.preventDefault();
                onNavigate("dashboard");
              }}
            >
              <img
                alt="RICE AI Logo"
                src="https://assets.zyrosite.com/cdn-cgi/image/format=auto,w=200,fit=crop,q=95/AGB2yyJJKXfD527r/rice-ai-consulting-2-AoPWxvnWOju2GwOz.png"
                className="h-7 w-auto sm:h-8 object-contain transition-transform group-hover:scale-105"
              />
              <div className="flex flex-col leading-tight">
                <h1 className="text-[18px] sm:text-[20px] font-extrabold text-gray-900 tracking-tight leading-[1.1]">
                  RICE AI
                </h1>

                <p className="text-[13px] sm:text-sm text-[#6B9CB2] font-medium tracking-wide">
                  Content Maker
                </p>
              </div>
            </a>

          </div>

          {/* ✅ User Menu / Login Button */}
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger>
                <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-gray-100 cursor-pointer">
                  <Avatar src={user.avatarUrl} fallback={userFallback} />
                  <div className="hidden md:flex flex-col text-left">
                    <span className="font-semibold text-sm text-gray-800">
                      {user.displayName}
                    </span>
                    <span className="text-xs text-gray-500">{user.email}</span>
                  </div>
                  <Icons.chevronDown className="h-5 w-5 text-gray-400 hidden md:block" />
                </div>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem onSelect={() => onNavigate("settings")}>
                  <Icons.cog className="h-4 w-4 text-gray-500" />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem onSelect={onLogout}>
                  <Icons.logout className="h-4 w-4 text-gray-500" />
                  <span>Logout</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              onClick={() => onNavigate("login")}
              className="px-4 py-2 bg-[#5890AD] text-white rounded-lg font-medium hover:bg-[#4b7e98] transition-colors"
            >
              Login
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
