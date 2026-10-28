import React from 'react';

const Footer = () => {
  return (
    <footer className="footer text-center">
      <div className="container">
        <p className="mb-0">© {new Date().getFullYear()} College Event Management System. All rights reserved.</p>
      </div>
    </footer>
  );
};

export default Footer;
