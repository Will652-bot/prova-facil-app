import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { User, AuthState } from '../types'; // Assurez-vous que User et AuthState sont importés de votre fichier types

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
  });

  const updateUserState = async (session: any) => {
    console.log('🔄 [AuthContext] updateUserState - Session:', !!session);
    
    if (session?.user) {
      try {
        const { data, error } = await supabase
          .from('users')
          .select('*') // Sélectionne toutes les colonnes de la table 'users'
          .eq('id', session.user.id)
          .single();

        if (error) {
          console.warn('⚠️ [AuthContext] Erreur récupération données utilisateur:', error.message);
          
          if (error.code === 'PGRST116') { // Code d'erreur pour "ligne non trouvée"
            console.log('🆕 [AuthContext] Utilisateur non trouvé dans la table users, création et activation de l\'essai Pro...');
            // MODIFICATION CLÉ ICI : Définir current_plan à 'pro_trial' pour les nouveaux utilisateurs
            const { error: insertError } = await supabase
              .from('users')
              .insert({ 
                id: session.user.id, 
                email: session.user.email, 
                role: 'teacher', 
                current_plan: 'pro_trial' // <-- CORRIGÉ : Le plan par défaut pour un nouvel utilisateur est 'pro_trial'
                // pro_trial_start_date et pro_trial_enabled devraient être gérés par les valeurs par défaut de la DB (now() et true)
              });
            if (insertError) throw insertError;
          } else {
              throw error;
          }
        }

        // Re-récupère les données si l'insertion vient d'avoir lieu (pour inclure le plan 'pro_trial' si c'est une nouvelle insertion)
        const userData = data || (await supabase.from('users').select('*').eq('id', session.user.id).single()).data;
        
        // Calcul de la propriété isProOrTrial
        let isProOrTrial = false;
        const trialDurationDays = 15; // Durée de l'essai gratuit en jours

        // La logique pour déterminer si l'utilisateur est sur un plan Pro ou en essai Pro
        // L'utilisateur est Pro si :
        // 1. Son abonnement Pro est actif (pro_subscription_active est TRUE)
        // OU
        // 2. Son plan est explicitement 'pro' (abonné payant)
        // OU
        // 3. Son plan est 'pro_trial' ET l'essai est activé (pro_trial_enabled) ET la date de début est dans la période valide
        if (userData.pro_subscription_active || userData.current_plan === 'pro') {
          isProOrTrial = true;
        } else if (userData.current_plan === 'pro_trial' && userData.pro_trial_enabled && userData.pro_trial_start_date) {
          const trialStartDate = new Date(userData.pro_trial_start_date);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - trialStartDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)); // Différence en jours

          if (diffDays <= trialDurationDays) {
            isProOrTrial = true; // L'essai est toujours valide
          }
        }

        const newUser: User = { // Assurez-vous que 'User' est l'interface que vous avez mise à jour
          ...session.user,
          role: userData.role,
          subscription_plan: userData.current_plan, // Conserver pour la cohérence
          full_name: userData.full_name,
          pro_subscription_active: userData.pro_subscription_active,
          subscription_expires_at: userData.subscription_expires_at,
          current_plan: userData.current_plan, // Conserver pour la cohérence
          pro_trial_start_date: userData.pro_trial_start_date, // Ajouter la date de début de l'essai
          pro_trial_enabled: userData.pro_trial_enabled,       // Ajouter le flag d'essai
          isProOrTrial: isProOrTrial,                           // Ajouter la propriété calculée
        };
        
        console.log('✅ [AuthContext] Utilisateur mis à jour:', newUser.email, 'Plan Pro/Trial:', newUser.isProOrTrial, 'Current Plan DB:', newUser.current_plan);
        setState({ session, user: newUser, loading: false });
      } catch (error) {
        console.error('❌ [AuthContext] Exception mise à jour utilisateur:', error);
        setState({ session: null, user: null, loading: false });
      }
    } else {
      console.log('🧹 [AuthContext] Nettoyage état utilisateur');
      setState({ session: null, user: null, loading: false });
    }
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      await updateUserState(session);

      const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('🔔 [AuthContext] AuthStateChange:', { event, hasSession: !!session });

        // Ne pas rediriger si l'événement est PASSWORD_RECOVERY
        if (event === 'PASSWORD_RECOVERY') {
          console.log('🔄 [AuthContext] Événement de récupération de mot de passe détecté. Aucune redirection.');
          await updateUserState(session);
          return;
        }

        if (event === 'SIGNED_IN') {
          await updateUserState(session);
          if (session && window.location.pathname === '/login') {
            window.location.replace('/dashboard');
          }
        }

        if (event === 'SIGNED_OUT') {
          setState({ session: null, user: null, loading: false });
          if (window.location.pathname !== '/login') {
            window.location.replace('/login');
          }
        }
      });

      return () => {
        subscription?.unsubscribe();
      };
    };

    initializeAuth();
  }, []);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error || null };
  };
  
  const signOut = async () => {
    await supabase.auth.signOut();
    setState({ session: null, user: null, loading: false });
    window.location.replace('/login');
  };

  const value = {
    user: state.user,
    loading: state.loading,
    signIn,
    signOut,
    isAuthenticated: !!state.user,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
