import React from 'react';

export default function Footer() {
  return (
    <footer className="footer">
      © {new Date().getFullYear()} ATOM — экспериментальный язык программирования
    </footer>
  );
}
