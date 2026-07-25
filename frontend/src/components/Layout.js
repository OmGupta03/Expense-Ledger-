import React, { Suspense } from 'react';
import Sidebar from './Sidebar';

function Layout({ children }) {
  return (
    <div className="app-layout">
      <Suspense fallback={<div className="w-64 bg-sidebar-bg h-full flex-shrink-0 animate-pulse"></div>}>
        <Sidebar />
      </Suspense>
      <main className="main-content">
        <div className="w-full h-full flex flex-col">
          {children}
        </div>
      </main>
    </div>
  );
}

export default Layout;
