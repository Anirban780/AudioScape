import React from 'react';

const Loader = () => {
  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/80 z-50">
      <div className="relative text-center">
        {/* Spinning Record */}
        <div className="w-24 h-24 rounded-full border-[6px] border-t-pink-500 border-red-900 animate-spin mx-auto"></div>
        <p className="mt-8 text-2xl font-semibold text-pink-400 animate-pulse">
          Loading <span className="text-red-500">Audioscape</span> Vibes...
        </p>
      </div>
    </div>
  );
};

export default Loader;
