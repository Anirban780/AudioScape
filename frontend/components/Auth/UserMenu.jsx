import React, { useEffect, useState } from "react";
import { useAuth } from "../../context/AuthContext";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Settings, History, HelpCircle, LogOut, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

const UserMenu = () => {
  const { user, signInWithGoogle, logout } = useAuth();
  const [avatarUrl, setAvatarUrl] = useState("");
  const navigate = useNavigate();

  // Debugging: Log user info
  useEffect(() => {
    console.log("User object:", user);
  }, [user]);

  // Fetch and update avatar URL reliably
  useEffect(() => {
    if (user && user.photoURL) {
      const url = user.photoURL.includes("?")
        ? `${user.photoURL}&sz=200`
        : `${user.photoURL}?sz=200`;

      const img = new Image();
      img.src = url;
      img.onload = () => setAvatarUrl(url); // Set after it's loaded

      setAvatarUrl(url); // Set immediately, but will update once loaded
    } else {
      setAvatarUrl("");
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();         // Sign out the user
    navigate("/");          // Redirect to Landing Page
  };


  return (
    <div className="flex items-center space-x-4">
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity duration-200">
              <AvatarImage
                src={avatarUrl}
                alt="User Profile"
                onError={() => setAvatarUrl("")}
              />
              <AvatarFallback className="bg-gray-300 dark:bg-gray-600 text-black dark:text-white">
                {user.displayName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="mt-2 min-w-max max-w-sm rounded-lg border border-gray-200 bg-white shadow-lg 
                     dark:border-gray-700 dark:bg-gray-900"
          >
            <div className="flex items-center px-4 py-3 space-x-3">
              <Avatar className="w-12 h-12 flex-shrink-0">
                <AvatarImage src={avatarUrl} alt="User Profile" />
                <AvatarFallback className="bg-gray-500 text-white">
                  {user.displayName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="font-medium text-gray-800 dark:text-white truncate max-w-[12rem]">
                  {user.displayName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400 break-words max-w-[12rem]">
                  {user.email}
                </p>
              </div>
            </div>

            <DropdownMenuSeparator className="my-1 border-gray-200 dark:border-gray-700" />

            <DropdownMenuItem 
              className="menu-item ml-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => navigate("/profile")}
            >
              <User size={18} />
              Profile
            </DropdownMenuItem>

            <DropdownMenuItem 
              className="menu-item ml-2 "
            >
              <History size={18} />
              History
            </DropdownMenuItem>

            <DropdownMenuItem 
              className="menu-item ml-2 hover:bg-gray-100 dark:hover:bg-gray-800"
              onClick={() => navigate("/help")}
            >
              <HelpCircle size={18} />
              Help & Feedback
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1 border-gray-200 dark:border-gray-700" />

            <DropdownMenuItem
              onClick={handleLogout}
              className="px-4 py-2 flex items-center gap-2 text-red-600 hover:bg-red-100 
                         dark:text-red-400 dark:hover:bg-red-900  rounded-md transition cursor-pointer"
            >
              <LogOut size={18} />
              <p className="dark:hover:text-white">Log out</p>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <Button
          onClick={signInWithGoogle}
          variant="outline"
          className="w-full sm:w-auto px-4 py-2 text-sm sm:text-base font-medium transition-all duration-300 
             border rounded-lg bg-gray-200 text-black border-gray-300 hover:bg-slate-300 
             dark:bg-gray-700 dark:text-white dark:border-gray-500 dark:hover:bg-gray-800"
        >
          Login
        </Button>
      )}
    </div>
  );
};

export default UserMenu;
