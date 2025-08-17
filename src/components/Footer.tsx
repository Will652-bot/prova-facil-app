import React from "react";
import { Link } from "react-router-dom";

export default function Footer() {
  return (
    <footer className="bg-gray-100 border-t mt-10 p-4 text-xs text-gray-600">
      <div className="max-w-6xl mx-auto flex flex-wrap gap-4 justify-center">
        <Link to="/sobre" className="hover:underline">Sobre</Link>
        <Link to="/planos" className="hover:underline">Planos</Link>
        <Link to="/termos-de-uso" className="hover:underline">Termos de Uso</Link>
        <Link to="/politica-de-privacidade" className="hover:underline">Política de Privacidade</Link>
        <Link to="/contato" className="hover:underline">Contato</Link>
      </div>
    </footer>
  );
}
