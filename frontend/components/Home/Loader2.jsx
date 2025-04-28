import React from 'react';
import { useTheme } from '../../ThemeProvider';

const Loader2 = () => {
  const { theme } = useTheme();

  return (
    <div className="flex justify-center items-center min-h-[60vh]">
      <div
        className={`border-6 border-t-6 rounded-full w-16 h-16 animate-spin ${
          theme === 'dark' ? 'border-gray-600 border-t-blue-400' : 'border-gray-300 border-t-blue-500'
        }`}
      />
    </div>
  );
};

export default Loader2;