import React from 'react';
import { useNavigate } from 'react-router-dom';

const Header: React.FC = () => {
  const navigate = useNavigate();

  return (
    <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-gray-200 z-50">
      <div className="flex items-center h-full px-4 max-w-screen-2xl mx-auto">
        <div
            className="cursor-pointer text-xl font-bold text-gray-800 hover:text-gray-600 transition-colors"onClick={() => navigate('/')}
        >
          {/*<img*/}
          {/*  src="/company-logo.svg"*/}
          {/*  alt="Company Logo"*/}
          {/*  className="h-8"*/}
          {/*/>*/}
            RadiusX Global Chatbot
        </div>
      </div>
    </header>
  );
};

export default Header;