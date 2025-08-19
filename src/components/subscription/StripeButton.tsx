import React, { useState } from 'react';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import { Button } from '../ui/Button';
import { CreditCard } from 'lucide-react';
import toast from 'react-hot-toast';

interface StripeButtonProps {
  className?: string;
  successUrl: string;
  cancelUrl: string;
}

interface AuthUser {
  id: string;
  email?: string;
  pro_subscription_active?: boolean;
  subscription_expires_at?: string;
}

export const StripeButton: React.FC<StripeButtonProps> = ({ className, successUrl, cancelUrl }) => {
  const { user } = useAuth() as { user: AuthUser | null };
  const [processing, setProcessing] = useState(false);
  const priceId = import.meta.env.VITE_STRIPE_PRICE_ID_PRO;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

  const needsProSubscription = React.useMemo(() => {
    if (!user) return false;
    if (!user.pro_subscription_active) return true;
    if (!user.subscription_expires_at) return false;
    const expirationDate = new Date(user.subscription_expires_at);
    return expirationDate <= new Date();
  }, [user]);

  const isBoltPreview =
    window.location.hostname.includes('webcontainer-api.io') ||
    window.location.hostname.includes('bolt.new');

  const handleSubscribe = async () => {
    if (!priceId) {
      console.error('❌ Stripe Price ID manquant (VITE_STRIPE_PRICE_ID_PRO)');
      toast.error('Configuração Stripe ausente. Contate o suporte: provafacil.app@gmail.com', {
        id: 'stripe-config-error',
      });
      return;
    }

    if (!supabaseUrl) {
      console.error('❌ Supabase URL manquant (VITE_SUPABASE_URL)');
      toast.error('Configuração do servidor ausente. Contate o suporte: provafacil.app@gmail.com', {
        id: 'supabase-config-error',
      });
      return;
    }

    if (!user?.id || !user?.email) {
      toast.dismiss('unauthenticated');
      toast.error('Usuário não autenticado ou email não disponível', { id: 'unauthenticated' });
      return;
    }

    if (isBoltPreview) {
      toast.dismiss('bolt-preview');
      toast.error('Pagamento indisponível no ambiente de preview. Use a versão publicada.', {
        id: 'bolt-preview',
      });
      return;
    }

    setProcessing(true);
    try {
      const sessionResult = await supabase.auth.getSession();
      const token = sessionResult.data.session?.access_token;
      if (!token) {
        toast.dismiss('session-error');
        throw new Error('Token de sessão não encontrado.');
      }

      const apiUrl = `${supabaseUrl}/functions/v1/create-checkout-link`;
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          successUrl,
          cancelUrl,
          customer_email: user.email,
          priceId,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        const errorMsg = errorData.error || errorData.details || `Erro HTTP ${response.status}`;
        throw new Error(errorMsg);
      }

      const result = await response.json();
      if (!result.url) throw new Error('URL de checkout não recebida');
      window.location.href = result.url;
    } catch (error: Error) {
      console.error('❌ Erro StripeButton:', error);
      toast.dismiss('stripe-error');
      if (error.name === 'TypeError' && error.message.includes('Failed to fetch')) {
        toast.error('Erro de conexão. Verifique sua internet ou use a versão deployada.', {
          id: 'stripe-error',
        });
      } else if (error.message.includes('CORS')) {
        toast.error('Erro de CORS. Teste na versão publicada.', { id: 'stripe-error' });
      } else {
        toast.error(`Erro ao iniciar pagamento: ${error.message || 'Tente novamente.'}`, {
          id: 'stripe-error',
        });
      }
    } finally {
      setProcessing(false);
    }
  };

  if (!needsProSubscription) return null;

  if (!priceId) {
    return (
      <Button
        disabled
        leftIcon={<CreditCard className="h-4 w-4" />}
        className={`bg-gray-400 cursor-not-allowed ${className}`}
      >
        Configuração Stripe ausente
      </Button>
    );
  }

  return (
    <Button
      onClick={handleSubscribe}
      isLoading={processing}
      leftIcon={<CreditCard className="h-4 w-4" />}
      className={`bg-primary-600 hover:bg-primary-700 text-white ${className}`}
      disabled={processing}
    >
      {processing ? 'Processando...' : 'Assinar Plano Pro – R$ 9,99/mês'}
    </Button>
  );
};
