import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Input } from '../ui/Input';
import { Button } from '../ui/Button';
import { PasswordGenerator } from './PasswordGenerator';
import { supabase } from '../../lib/supabase';
import toast from 'react-hot-toast';
import { Label } from '../ui/Label';

export const RegisterForm: React.FC = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
  });

  const validatePassword = (password: string) => {
    const hasUpperCase = /[A-Z]/.test(password);
    const hasLowerCase = /[a-z]/.test(password);
    const hasNumbers = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*()_+\-=[\]{};:'",.<>/?\\|]/.test(password);
    const isLongEnough = password.length >= 8;
    return hasUpperCase && hasLowerCase && hasNumbers && hasSpecialChar && isLongEnough;
  };

  const validateEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    if (!validateEmail(formData.email)) {
      toast.error('E-mail inválido.');
      setLoading(false);
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error('As senhas não coincidem. Por favor, verifique.');
      setLoading(false);
      return;
    }

    if (!validatePassword(formData.password)) {
      toast.error('A senha deve ter pelo menos 8 caracteres, incluindo uma letra maiúscula, uma minúscula, um número e um caractere especial.');
      setLoading(false);
      return;
    }

    try {
      const { data, error: signUpError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
      });

      if (signUpError) {
        if (signUpError.message?.includes('user already registered')) {
          toast.error('Este e-mail já está registrado. Enviando um novo código de verificação.');
          await supabase.auth.signInWithOtp({ email: formData.email });
          navigate(`/verify-otp?email=${encodeURIComponent(formData.email)}&type=email`);
        } else if (signUpError.message?.includes('email_address_invalid')) {
          toast.error('E-mail inválido.');
        } else if (signUpError.message?.includes('over_email_send_rate_limit')) {
          toast.error('Limite de envio de e-mail excedido. Por favor, tente novamente mais tarde.');
        } else {
          toast.error(`Erro durante o cadastro: ${signUpError.message}. Por favor, verifique seu e-mail e tente novamente.`);
        }
      } else if (data.user) {
        toast.success('Conta criada com sucesso! Por favor, verifique seu e-mail para confirmar o registro.');
        navigate(`/verify-otp?email=${encodeURIComponent(formData.email)}&type=email`);
      } else {
        toast.error('Ocorreu um erro inesperado durante o cadastro.');
      }
    } catch (e) {
      toast.error('Ocorreu um erro inesperado. Por favor, tente novamente.');
      console.error('❌ Erro inesperado no registro:', e);
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordGenerate = (password: string) => {
    setFormData(prev => ({
      ...prev,
      password,
      confirmPassword: password,
    }));
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div>
        <Label htmlFor="email">E-mail</Label>
        <Input
          id="email"
          type="email"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
          fullWidth
        />
      </div>

      <div className="space-y-4">
        <div>
          <Label htmlFor="password">Senha</Label>
          <Input
            id="password"
            type="password"
            value={formData.password}
            onChange={(e) => setFormData({ ...formData, password: e.target.value })}
            required
            fullWidth
          />
        </div>

        <div>
          <Label htmlFor="confirmPassword">Confirmação de Senha</Label>
          <Input
            id="confirmPassword"
            type="password"
            value={formData.confirmPassword}
            onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
            required
            fullWidth
          />
        </div>

        <PasswordGenerator onGenerate={handlePasswordGenerate} />
      </div>

      <Button
        type="submit"
        className="w-full"
        disabled={loading}
      >
        {loading ? 'Criando...' : 'Criar Conta'}
      </Button>
    </form>
  );
};
