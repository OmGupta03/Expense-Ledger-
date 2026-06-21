import React from 'react';
import Sidebar from './Sidebar';

function Layout({ children }) {
  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content">
        <div className="w-full h-full flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}

export default Layout;
