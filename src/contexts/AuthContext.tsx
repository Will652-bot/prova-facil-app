import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';
import { User, AuthState } from '../types';
import { Session } from '@supabase/supabase-js';

// Définition de l'interface pour les données utilisateur récupérées depuis Supabase
interface UserProfile {
  id: string;
  email: string;
  role: string;
  current_plan: string;
  pro_subscription_active: boolean;
  subscription_expires_at: string | null;
  pro_trial_start_date: string | null;
  pro_trial_enabled: boolean;
  full_name?: string;
}

// Fonction utilitaire pour calculer le statut de l'essai Pro
const getTrialStatus = (userData: UserProfile | null, trialDurationDays: number) => {
  const isTrialActive =
    userData?.pro_trial_enabled && userData?.pro_trial_start_date && userData?.current_plan === 'pro_trial';
  
  if (!isTrialActive) {
    return { isTrialPeriod: false, diffDays: 0 };
  }
  
  const trialStartDate = new Date(userData.pro_trial_start_date as string);
  const now = new Date();
  const diffDays = Math.ceil(
    Math.abs(now.getTime() - trialStartDate.getTime()) / (1000 * 60 * 60 * 24)
  );
  
  return {
    isTrialPeriod: diffDays <= trialDurationDays,
    diffDays,
  };
};

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ error: Error | null }>;
  signOut: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

// Fonction pour gérer le backoff exponentiel pour les requêtes Supabase
async function fetchWithRetry(query: any, retries = 3, delay = 500): Promise<any> {
    const { data, error } = await query;
    if (error?.code === '429' && retries > 0) {
        console.warn(`Warning: Erreur 429 détectée. Retraite de ${delay}ms... (Tentative ${4 - retries})`);
        await new Promise(res => setTimeout(res, delay));
        return fetchWithRetry(query, retries - 1, delay * 2);
    }
    if (error) {
        console.error(`❌ Erreur lors de la requête: ${error.message} (Code: ${error.code})`);
        throw error;
    }
    return data;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
  });

  const isUpdating = useRef(false);

  const updateUserState = useCallback(async (session: Session | null) => {
    if (!session?.user || isUpdating.current) {
      if (!session) {
        setState({ session: null, user: null, loading: false });
      }
      return;
    }

    isUpdating.current = true;
    console.log('🔄 [AuthContext] updateUserState - Session:', !!session);
    setState((prev) => ({ ...prev, loading: true }));

    try {
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single();
        
      let finalUserData: UserProfile | null = null;
      if (userError && userError.code === 'PGRST116') {
        console.log('🆕 [AuthContext] Utilisateur non trouvé, création du profil...');
        let initialPlan: UserProfile['current_plan'] = 'free';
        let proTrialStartDate: string | null = null;
        let proTrialEnabled = false;

        const { data: prospectMatch, error: prospectError } = await supabase
            .from('prospects')
            .select('id, created_at')
            .eq('email', session.user.email)
            .maybeSingle();

        if (prospectError) {
          throw prospectError;
        }

        if (prospectMatch) {
            const { data: first100, error: first100Error } = await supabase
                .from('prospects')
                .select('email')
                .order('created_at', { ascending: true })
                .limit(100);

            if (first100Error) {
              throw first100Error;
            }

            const isInFirst100 = first100?.some(p => p.email === session.user.email);
            if (isInFirst100) {
                initialPlan = 'pro_trial';
                proTrialStartDate = new Date().toISOString();
                proTrialEnabled = true;
                console.log('✅ Plan "pro_trial" attribué (dans les 100 premiers prospects).');
            } else {
                console.log('ℹ️ Prospect trouvé mais pas dans les 100 premiers, plan "free".');
            }
        } else {
            console.log('ℹ️ Non prospect, plan "free".');
        }

        const { data: insertData, error: insertError } = await supabase
          .from('users')
          .insert({
            id: session.user.id,
            email: session.user.email,
            role: 'teacher',
            current_plan: initialPlan,
            pro_trial_start_date: proTrialStartDate,
            pro_trial_enabled: proTrialEnabled,
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        } else {
          finalUserData = insertData as UserProfile;
        }
      } else if (userError) {
        throw userError;
      } else {
        finalUserData = userData as UserProfile;
      }

      const trialDurationDays = 15;
      const { isTrialPeriod, diffDays } = getTrialStatus(finalUserData, trialDurationDays);
      if (finalUserData?.current_plan === 'pro_trial' && diffDays > trialDurationDays) {
        console.log('⬇️ [AuthContext] Essai expiré -> free.');
        const { error: downgradeError } = await supabase
          .from('users')
          .update({ current_plan: 'free', pro_trial_enabled: false })
          .eq('id', session.user.id);
        if (!downgradeError) {
          finalUserData.current_plan = 'free';
          finalUserData.pro_trial_enabled = false;
        }
      }

      const isProOrTrialUser =
        finalUserData?.pro_subscription_active || finalUserData?.current_plan === 'pro' || isTrialPeriod;
      const newUser: User = {
        ...session.user,
        ...finalUserData,
        isProOrTrial: isProOrTrialUser,
        subscription_plan: finalUserData?.current_plan,
      };

      setState({ session, user: newUser, loading: false });
    } catch (error) {
      console.error('❌ [AuthContext] Exception lors de la mise à jour:', error);
      setState((prev) => ({ ...prev, user: null, loading: false }));
    } finally {
      isUpdating.current = false;
    }
  }, []);

  useEffect(() => {
    let isMounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (isMounted) {
          if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'PASSWORD_RECOVERY') {
            updateUserState(session);
          }
        }
      }
    );

    supabase.auth.getSession().then(({ data: { session } }) => {
      if (isMounted) {
        updateUserState(session);
      }
    });

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, [updateUserState]);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error || null };
  };

  const signOut = async () => {
    await supabase.auth.signOut();
    setState({ session: null, user: null, loading: false });
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
