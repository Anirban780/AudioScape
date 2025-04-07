// src/components/layouts/ResponsiveLayout.jsx
import React from "react";

const ResponsiveLayout = ({ children }) => {
  return (
    <div className="min-h-screen w-full px-3 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto">{children}</div>
    </div>
  );
};

export default ResponsiveLayout;