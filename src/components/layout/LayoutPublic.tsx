import React from 'react';
import { Outlet } from 'react-router-dom';
import Footer from '../Footer';

const LayoutPublic = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default LayoutPublic;
