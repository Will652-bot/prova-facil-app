import React from "react";

export default function PlanosPage() {
  return (
    <div className="max-w-6xl mx-auto p-6 text-gray-800">
      <h1 className="text-2xl font-bold mb-6 text-center">Escolha o plano ideal para você</h1>

      {/* Banner Promocional */}
      <div className="bg-orange-100 border border-orange-300 rounded-lg p-3 text-center text-orange-700 font-semibold mb-6">
        🎁 Bônus para os 100 primeiros inscritos: <strong>15 dias grátis do Plano Pro!</strong>
      </div>

      {/* Cards de Planos */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Plano Gratuito */}
        <div className="border rounded-xl shadow-sm p-6 flex flex-col items-center">
          <h2 className="text-xl font-bold mb-2">Gratuito</h2>
          <p className="text-gray-600 mb-4">Ideal para começar a organizar suas avaliações.</p>
          <p className="text-2xl font-bold mb-4">R$ 0 <span className="text-sm">/mês</span></p>
          <ul className="text-sm text-gray-700 mb-6 space-y-2">
            <li>✔ Até 60 alunos</li>
            <li>✔ Relatórios básicos e personalizados</li>
            <li>✔ Suporte por email</li>
          </ul>
          <button className="bg-gray-200 text-gray-600 px-4 py-2 rounded-lg" disabled>
            Plano Atual
          </button>
        </div>

        {/* Plano Pro */}
        <div className="border rounded-xl shadow-md p-6 flex flex-col items-center bg-blue-50 relative">
          <span className="absolute top-0 right-0 bg-blue-500 text-white text-xs px-2 py-1 rounded-bl-lg">
            Popular
          </span>
          <h2 className="text-xl font-bold mb-2">Pro</h2>
          <p className="text-gray-600 mb-4">Mais controle, relatórios avançados e exportação.</p>
          <p className="text-2xl font-bold mb-4">R$ 9,99 <span className="text-sm">/mês</span></p>
          <ul className="text-sm text-gray-700 mb-6 space-y-2">
            <li>✔ Todas as features do Plano Gratuito</li>
            <li>✔ Alunos ilimitados</li>
            <li>✔ Suporte prioritário</li>
            <li>✔ Exportação em PDF e Excel</li>
            <li>✔ Anexar arquivos PDF às avaliações</li>
          </ul>
          <a
            href="/checkout-pro"
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition"
          >
            Assinar Plano Pro
          </a>
        </div>

        {/* Plano Empresarial */}
        <div className="border rounded-xl shadow-sm p-6 flex flex-col items-center">
          <h2 className="text-xl font-bold mb-2">Empresarial</h2>
          <p className="text-gray-600 mb-4">Para escolas e instituições.</p>
          <p className="text-2xl font-bold mb-4">Sob Consulta</p>
          <ul className="text-sm text-gray-700 mb-6 space-y-2">
            <li>✔ Todas as features do Plano Pro</li>
            <li>✔ API personalizada</li>
            <li>✔ Integração com sistemas</li>
            <li>✔ Suporte 24/7</li>
          </ul>
          <a
            href="/contato"
            className="bg-green-600 text-white px-6 py-2 rounded-lg hover:bg-green-700 transition"
          >
            Contatar Vendas
          </a>
        </div>
      </div>

      {/* Programa de Indicação */}
      <div className="bg-blue-100 border border-blue-300 rounded-lg p-4 mt-8 text-center text-blue-700">
        💎 <strong>Programa de Indicação:</strong> indique <strong>3 colegas</strong> e ganhe
        <strong> 3 meses grátis do Plano Pro</strong> (assim que seus colegas se cadastrarem).
      </div>
    </div>
  );
}
