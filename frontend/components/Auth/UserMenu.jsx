import { onAuthStateChanged } from 'firebase/auth';
import React, { useEffect, useState } from 'react'
import { auth, logout, signInWithGoogle } from '../../firebase/firebaseConfig';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from 'utils/components/ui/dropdown-menu';

import { Avatar, AvatarFallback, AvatarImage } from 'utils/components/ui/avatar';
import { Button } from 'utils/components/ui/button';
import { Settings, History, HelpCircle, LogOut, User } from "lucide-react";

const UserMenu = () => {
  const [user, setUser] = useState(null);

  useEffect(() => {
    onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    })
  }, []);

  return (
    <div className='flex items-center space-x-4'>
      {user ? (
        <DropdownMenu>
          <DropdownMenuTrigger>
            <Avatar className="w-10 h-10 cursor-pointer hover:opacity-80 transition-opacity duration-200">
              <AvatarImage src={user.photoURL} alt="User Profile" />
              <AvatarFallback className="bg-gray-300 dark:bg-gray-600 text-black dark:text-white">
                {user.displayName?.charAt(0) || "U"}
              </AvatarFallback>
            </Avatar>
          </DropdownMenuTrigger>

          <DropdownMenuContent
            align="end"
            className="mt-2 w-56 rounded-lg border border-gray-200 bg-white shadow-lg 
                     dark:border-gray-700 dark:bg-gray-900"
          >
            {/* Profile Header */}
            <div className="flex items-center px-4 py-3 space-x-3">
              <Avatar className="w-12 h-12">
                <AvatarImage src={user.photoURL} alt="User Profile" />
                <AvatarFallback className="bg-gray-500 text-white">
                  {user.displayName?.charAt(0) || "U"}
                </AvatarFallback>
              </Avatar>
              <div>
                <p className="font-medium text-gray-800 dark:text-white">
                  {user.displayName}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">{user.email}</p>
              </div>
            </div>

            <DropdownMenuSeparator className="my-1 border-gray-200 dark:border-gray-700" />

            {/* Menu Items */}
            <DropdownMenuItem className="px-4 py-2 flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition rounded-md cursor-pointer">
              <User size={18} />
              Profile
            </DropdownMenuItem>

            <DropdownMenuItem className="px-4 py-2 flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition rounded-md cursor-pointer">
              <Settings size={18} />
              Settings
            </DropdownMenuItem>

            <DropdownMenuItem className="px-4 py-2 flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition rounded-md cursor-pointer">
              <History size={18} />
              History
            </DropdownMenuItem>

            <DropdownMenuItem className="px-4 py-2 flex items-center gap-2 text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition rounded-md cursor-pointer">
              <HelpCircle size={18} />
              Help & Feedback
            </DropdownMenuItem>

            <DropdownMenuSeparator className="my-1 border-gray-200 dark:border-gray-700" />

            {/* Logout */}
            <DropdownMenuItem
              onClick={logout}
              className="px-4 py-2 flex items-center gap-2 text-red-600 hover:bg-red-100 dark:text-red-400 dark:hover:bg-red-900 rounded-md transition cursor-pointer"
            >
              <LogOut size={18} />
              Logout
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
  )
}

export default UserMenu