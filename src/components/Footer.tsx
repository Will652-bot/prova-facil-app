import React from "react";
import { Link } from "react-router-dom";
import { FaHeart } from 'react-icons/fa';
import { IoIosArrowUp } from "react-icons/io";

const Footer = () => {
  // Logique pour le bouton de retour en haut de la page
  const [showScroll, setShowScroll] = React.useState(false);

  const checkScrollTop = () => {
    if (!showScroll && window.scrollY > 400) {
      setShowScroll(true);
    } else if (showScroll && window.scrollY <= 400) {
      setShowScroll(false);
    }
  };

  const scrollTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  React.useEffect(() => {
    window.addEventListener('scroll', checkScrollTop);
    return () => window.removeEventListener('scroll', checkScrollTop);
  }, []);

  return (
    <footer className="bg-white text-gray-700 font-sans py-8 mt-12 shadow-inner">
      <div className="container mx-auto px-6">
        <div className="flex flex-col md:flex-row justify-between items-center text-center md:text-left">
          <div className="mb-4 md:mb-0">
            <h4 className="text-xl font-bold text-blue-800">ProvaFacil</h4>
            <p className="text-sm mt-2 text-gray-500">
              Avaliação Inteligente para Professores
            </p>
          </div>
          <div className="flex flex-col md:flex-row items-center space-y-2 md:space-y-0 md:space-x-6">
            <Link to="/sobre" className="hover:underline text-sm text-gray-600">Sobre</Link>
            <Link to="/planos" className="hover:underline text-sm text-gray-600">Planos</Link>
            <Link to="/termos-de-uso" className="hover:underline text-sm text-gray-600">Termos de Uso</Link>
            <Link to="/politica-de-privacidade" className="hover:underline text-sm text-gray-600">Política de Privacidade</Link>
            <Link to="/contato" className="hover:underline text-sm text-gray-600">Contato</Link>
          </div>
        </div>
        <div className="text-center text-xs mt-6 opacity-75">
          &copy; {new Date().getFullYear()} ProvaFacil. Todos os direitos reservados.
        </div>
      </div>
      {showScroll && (
        <button
          onClick={scrollTop}
          className="fixed bottom-6 right-6 p-3 bg-blue-500 text-white rounded-full shadow-lg hover:bg-blue-600 transition-colors"
          aria-label="Voltar ao topo"
        >
          <IoIosArrowUp size={24} />
        </button>
      )}
    </footer>
  );
};

export default Footer;
