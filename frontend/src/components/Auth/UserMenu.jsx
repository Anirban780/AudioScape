import React, { useEffect, useState } from "react";
import useAuthStore from "@/store/useAuthStore";
import { signInWithGoogle, logout } from "@/auth/googleAuth";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { HelpCircle, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

/**
 * ============================================================================
 * USER AVATAR & AUTH MENU (UserMenu.jsx)
 * ============================================================================
 * 
 * WHAT THIS FILE DOES:
 * Renders the top-right user profile avatar dropdown menu (for authenticated users)
 * or a Google Sign-In button (for guest visitors).
 */
const UserMenu = () => {
  const user = useAuthStore((s) => s.user);
  const [avatarUrl, setAvatarUrl] = useState("");
  const navigate = useNavigate();

  useEffect(() => {
    const photo = user?.photoUrl || user?.photoURL;
    if (user && photo) {
      const url = photo.includes("?")
        ? `${photo}&sz=200`
        : `${photo}?sz=200`;

      setAvatarUrl(url);
    } else {
      setAvatarUrl("");
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
    navigate("/");
  };

  return (
    <div className="flex items-center space-x-3">
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger className="outline-none">
            <Avatar className="w-9 h-9 border border-[var(--color-border-default)] cursor-pointer hover:opacity-80 transition-opacity">
              <AvatarImage
                src={avatarUrl}
                alt="User Profile"
                onError={() => setAvatarUrl("")}
              />
              <AvatarFallback className="bg-[var(--color-primary)] text-[var(--color-text-on-primary)] font-semibold text-xs">
                {user.displayName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="mt-2 min-w-[220px] rounded-2xl border border-[var(--color-border-default)] bg-[var(--color-surface-overlay)] text-[var(--color-on-surface)] shadow-2xl p-2 z-50"
          >
            {/* Profile Info Header */}
            <div className="flex items-center p-3 space-x-3 rounded-xl bg-[var(--color-surface-raised)] border border-[var(--color-border-default)] mb-2">
              <Avatar className="w-10 h-10 flex-shrink-0">
                <AvatarImage src={avatarUrl} alt="User Profile" />
                <AvatarFallback className="bg-[var(--color-primary)] text-white font-semibold">
                  {user.displayName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <p className="font-semibold text-sm truncate">
                  {user.displayName || "User"}
                </p>
                <p className="text-xs text-[var(--color-on-surface-variant)] truncate">
                  {user.email}
                </p>
              </div>
            </div>

            <DropdownMenuSeparator className="my-1 bg-[var(--color-border-default)]" />

            {/* Menu Links */}
            <DropdownMenuItem 
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl cursor-pointer hover:bg-[var(--color-state-hover)] transition-colors"
              onClick={() => navigate("/profile")}
            >
              <User size={16} />
              <span>Profile</span>
            </DropdownMenuItem>

            <DropdownMenuItem 
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl cursor-pointer hover:bg-[var(--color-state-hover)] transition-colors"
              onClick={() => navigate("/help")}
            >
              <HelpCircle size={16} />
              <span>Help & Feedback</span>
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1 bg-[var(--color-border-default)]" />

            {/* Logout Action */}
            <DropdownMenuItem
              onClick={handleLogout}
              className="flex items-center gap-2 px-3 py-2 text-sm rounded-xl text-red-500 hover:bg-red-500/10 cursor-pointer transition-colors"
            >
              <LogOut size={16} />
              <span>Log out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          onClick={signInWithGoogle}
          className="px-4 py-2 text-sm font-semibold rounded-full bg-[var(--color-primary)] text-[var(--color-text-on-primary)] hover:opacity-90 transition-all shadow-md"
        >
          Login
        </Button>
      )}
    </div>
  );
};

export default UserMenu;
