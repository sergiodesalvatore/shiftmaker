import React from 'react';

export default function Layout({ children }) {
  return (
    <div className="app-container">
      <header className="glass-panel header">
        <div>
          <h1>ShiftMaker</h1>
          <p style={{ opacity: 0.7, fontSize: '0.9rem' }}>Smart Scheduling System</p>
        </div>
        <nav>
          {/* Menu items can go here */}
        </nav>
      </header>
      <main className="main-content">
        {children}
      </main>
    </div>
  );
}
