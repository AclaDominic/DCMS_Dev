import React from 'react';

function AuthLayout({ children }) {
  return (
    <div className="d-flex justify-content-center align-items-center" style={{ minHeight: '100vh', width: '100%' }}>
      {children}
    </div>
  );
}

export default AuthLayout;
