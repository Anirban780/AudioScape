import { Search } from 'lucide-react';
import React, { useState } from 'react';
import { Input } from '../../../src/components/ui/input';

const SearchBar = ({ darkMode }) => {
    const [query, setQuery] = useState("");

    return (
        <div className={`flex items-center rounded-md p-2 w-full max-w-lg mx-auto my-auto mt-4 transition-colors duration-300 ${
            darkMode ? ' text-white' : 'bg-gray-200 text-black'
        }`}>
            <Search size={20} className={darkMode ? 'text-gray-400' : 'text-gray-600'} />
            <Input
                type="text"
                placeholder="Search your songs, albums, artists"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className={`ml-2 outline-none w-full transition-colors duration-300 
                    ${darkMode ? 'bg-gray-600 text-white' : 'bg-gray-200 text-black placeholder-slate-600'}
                `}
            />
        </div>
    );
};

export default SearchBar;
