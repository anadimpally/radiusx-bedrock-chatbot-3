import React from 'react';
import Header from './Header';

interface LayoutProps {
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <div className="pt-16"> {/* Add padding-top to account for fixed header */}
        {children}
      </div>
    </div>
  );
};

export default Layout;