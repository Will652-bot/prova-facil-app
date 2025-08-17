import React from 'react';

const PoliticaPrivacidadePage = () => (
  <div className="p-8 md:p-12 text-gray-700 max-w-4xl mx-auto">
    <h1 className="text-3xl md:text-4xl font-bold text-center text-blue-800 mb-8">
      Política de Privacidade
    </h1>
    <div className="bg-white p-6 md:p-8 rounded-2xl shadow-lg prose max-w-none">
      <p className="font-bold mb-4">
        A sua privacidade é de extrema importância para nós. Esta política descreve
        como o ProvaFacil coleta, usa, protege e trata os dados dos usuários em
        conformidade com a Lei Geral de Proteção de Dados (LGPD).
      </p>
      <h2 className="text-2xl font-semibold text-blue-700 mb-4">
        1. Dados Coletados
      </h2>
      <p>
        Coletamos as seguintes informações fornecidas voluntariamente por você através
        do nosso formulário de cadastro na landing page:
      </p>
      <ul className="list-disc list-inside">
        <li>Nome completo</li>
        <li>Endereço de e-mail</li>
        <li>Tipo de professor (por exemplo: Educação Infantil, Ensino Médio, Faculdade, etc.)</li>
        <li>E-mail do professor que o indicou (se aplicável)</li>
      </ul>
      <h2 className="text-2xl font-semibold text-blue-700 mb-4 mt-6">
        2. Finalidade da Coleta de Dados
      </h2>
      <p>
        Utilizamos os dados coletados com as seguintes finalidades:
      </p>
      <ul className="list-disc list-inside">
        <li>Para criar e gerenciar sua conta de acesso ao ProvaFacil.</li>
        <li>Para conceder e gerenciar o período de teste gratuito do nosso serviço.</li>
        <li>Para enviar comunicações relevantes sobre o serviço, atualizações e informações sobre o produto.</li>
        <li>Para fins de marketing, como o envio de newsletters ou promoções, com o seu consentimento.</li>
      </ul>
      <h2 className="text-2xl font-semibold text-blue-700 mb-4 mt-6">
        3. Compartilhamento de Dados com Terceiros
      </h2>
      <p>
        Garantimos que não compartilhamos seus dados pessoais com terceiros para fins
        comerciais ou outros, sem o seu consentimento explícito. Suas informações
        permanecem estritamente no ecossistema do ProvaFacil.
      </p>
      <h2 className="text-2xl font-semibold text-blue-700 mb-4 mt-6">
        4. Segurança e Proteção de Dados
      </h2>
      <p>
        Adotamos medidas de segurança técnicas e administrativas para proteger seus
        dados contra acessos não autorizados, perdas, destruição ou alteração. Isso
        inclui:
      </p>
      <ul className="list-disc list-inside">
        <li>A criptografia de dados sensíveis para garantir sua confidencialidade.</li>
        <li>Acesso restrito e específico a cada espaço de trabalho de professor, garantindo que você tenha
          controle total sobre suas informações e que elas não sejam acessíveis por outros usuários.</li>
      </ul>
      <h2 className="text-2xl font-semibold text-blue-700 mb-4 mt-6">
        5. Direitos do Titular de Dados (LGPD)
      </h2>
      <p>
        Em conformidade com a LGPD, você, como titular dos dados, tem o direito de:
      </p>
      <ul className="list-disc list-inside">
        <li>Acessar seus dados pessoais e obter uma cópia de suas informações.</li>
        <li>Corrigir dados incompletos, inexatos ou desatualizados.</li>
        <li>Solicitar a anonimização, bloqueio ou eliminação de dados desnecessários.</li>
        <li>Obter informações sobre as entidades públicas e privadas com as quais o ProvaFacil compartilhou seus dados.</li>
        <li>Revogar seu consentimento a qualquer momento.</li>
      </ul>
      <p>
        Para exercer qualquer um desses direitos, você pode entrar em contato conosco
        através do e-mail de contato abaixo.
      </p>
      <h2 className="text-2xl font-semibold text-blue-700 mb-4 mt-6">
        6. Contato
      </h2>
      <p>
        Para todas as questões relacionadas a esta política de privacidade, por favor,
        entre em contato conosco através do e-mail: <a href="mailto:provafacil.bra@gmail.com" className="text-blue-500 hover:underline">provafacil.bra@gmail.com</a>.
      </p>
    </div>
  </div>
);

export default PoliticaPrivacidadePage;

