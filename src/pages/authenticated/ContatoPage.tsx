import React from "react";

export default function ContatoPage() {
  return (
    <div className="max-w-3xl mx-auto p-6 text-gray-800">
      <h1 className="text-2xl font-bold mb-4">Contato</h1>
      <p className="mb-4">
        Para qualquer dúvida, suporte ou questão relacionada à nossa plataforma, 
        entre em contato conosco pelo e-mail:
      </p>
      <a href="mailto:provafacil.bra@gmail.com" className="text-blue-600 underline">
        provafacil.bra@gmail.com
      </a>
    </div>
  );
}
