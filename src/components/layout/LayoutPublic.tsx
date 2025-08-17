import React from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { FaBars, FaTimes } from 'react-icons/fa';
import { IoIosArrowUp } from "react-icons/io";
import { useState } from 'react';
import Footer from './Footer';

const NavbarPublic = () => {
  const [isOpen, setIsOpen] = useState(false);

  const navItems = [
    { name: "Sobre", path: "/sobre" },
    { name: "Planos", path: "/planos" },
    { name: "Termos de Uso", path: "/termos-de-uso" },
    { name: "Política de Privacidade", path: "/politica-de-privacidade" },
    { name: "Contato", path: "/contato" },
  ];

  return (
    <nav className="bg-white shadow-lg font-sans">
      <div className="container mx-auto px-6 py-3 flex justify-between items-center">
        <div className="text-xl font-bold text-blue-600">
          <NavLink to="/">ProvaFacil</NavLink>
        </div>
        <div className="hidden md:flex items-center space-x-6">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              className={({ isActive }) =>
                `text-gray-600 hover:text-blue-600 transition-colors ${
                  isActive ? "border-b-2 border-blue-600" : ""
                }`
              }
            >
              {item.name}
            </NavLink>
          ))}
        </div>
        <div className="md:hidden">
          <button onClick={() => setIsOpen(!isOpen)} className="text-gray-600 hover:text-blue-600 focus:outline-none">
            {isOpen ? <FaTimes size={24} /> : <FaBars size={24} />}
          </button>
        </div>
      </div>
      {isOpen && (
        <div className="md:hidden bg-white shadow-md py-4">
          {navItems.map(item => (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => setIsOpen(false)}
              className="block px-6 py-2 text-gray-600 hover:bg-blue-100 w-full text-left"
            >
              {item.name}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
};

const LayoutPublic = () => {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      <NavbarPublic />
      <main className="flex-grow">
        <Outlet />
      </main>
      <Footer />
    </div>
  );
};

export default LayoutPublic;
