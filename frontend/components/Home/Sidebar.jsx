import React, { useState } from 'react'
import { Button } from '../../../src/components/ui/button'
import { cn } from '../../../src/lib/utils'
import { Compass, Heart, Home, Library, Menu } from 'lucide-react'

const Sidebar = () => {
    const [isOpen, setIsOpen] = useState(true);

    return (
        <div
            className={cn("h-screen bg-slate-600 text-white p-4 transition-all duration-500 ease-in-out"
                , isOpen ? "w-60" : "w-20")}
        >
            <div className='flex items-center gap-4'>
                {/*sidebar toggle button*/}
                <Button variant='ghost' size='icon'
                    onClick={() => setIsOpen(!isOpen)}
                    className='mb-4'
                >
                    <Menu size={28} />
                </Button>

                {/* Sidebar Header */}
                {isOpen && <h1 className="text-xl font-bold mb-4">AudioScape</h1>}
            </div>


            {/* Menu Items*/}
            <ul className={cn("space-y-4 mx-2", !isOpen && "flex flex-col items-center pr-2 space-y-5 ")}>
                <li className='flex items-center gap-4 cursor-pointer hover:text-gray-400 transition-all ease-in-out duration-500'>
                    <Home size={24} />
                    {isOpen && <span>Home</span>}
                </li>
                <li className='flex items-center gap-4 cursor-pointer hover:text-gray-400 transition-all ease-in-out duration-500'>
                    <Compass size={24} />
                    {isOpen && <span>Explore</span>}
                </li>
                <li className='flex items-center gap-4  cursor-pointer hover:text-gray-400 transition-all ease-in-out duration-500'>
                    <Library size={24} />
                    {isOpen && <span>Library</span>}
                </li>
                <li className='flex items-center gap-4 cursor-pointer hover:text-gray-400 transition-all ease-in-out duration-500'>
                    <Heart size={24} />
                    {isOpen && <span>Liked Songs</span>}
                </li>
            </ul>
        </div>
    )
}

export default Sidebar