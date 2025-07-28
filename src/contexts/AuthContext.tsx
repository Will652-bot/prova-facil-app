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
  const = useState<AuthState>({
    session: null,
    user: null,
    loading: true,
  });

  const updateUserState = async (session: any) => {
    console.log('🔄 [AuthContext] updateUserState - Session:',!!session);
    
    if (session?.user) {
      try {
        let userData; // Déclarer userData ici pour qu'il soit accessible dans tout le bloc try

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
            const { data: insertData, error: insertError } = await supabase // Capture data from insert
             .from('users')
             .insert({ 
                id: session.user.id, 
                email: session.user.email, 
                role: 'teacher', 
                current_plan: 'pro_trial' // Le plan par défaut pour un nouvel utilisateur est 'pro_trial'
                // pro_trial_start_date et pro_trial_enabled devraient être gérés par les valeurs par défaut de la DB (now() et true)
              })
             .select('*') // IMPORTANT : Sélectionne la ligne insérée pour obtenir les valeurs par défaut de la DB
             .single();
            if (insertError) throw insertError;
            userData = insertData; // Utilise les données de l'opération d'insertion
          } else {
              throw error;
          }
        } else {
            userData = data; // Utilisateur trouvé, utilise les données existantes
        }

        // --- NOUVELLE LOGIQUE D'ACTIVATION/MISE À JOUR DE L'ESSAI PRO POUR UTILISATEURS EXISTANTS ---
        const trialDurationDays = 15; // Durée de l'essai gratuit en jours

        // 1. Vérifier si l'utilisateur est éligible pour un essai et si son plan actuel est 'free'
        //    (Cela couvre le cas de wilmic.bh@gmail.com)
        if (userData.pro_trial_enabled && userData.current_plan === 'free' && userData.pro_trial_start_date) {
            const trialStartDate = new Date(userData.pro_trial_start_date);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - trialStartDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays <= trialDurationDays) {
                console.log('⬆️ [AuthContext] Utilisateur éligible à l\'essai Pro et plan actuel est "free". Tentative de mise à jour vers "pro_trial"...');
                const { error: updateError } = await supabase
                   .from('users')
                   .update({ current_plan: 'pro_trial' })
                   .eq('id', session.user.id);

                if (updateError) {
                    console.error('❌ [AuthContext] Erreur lors de la mise à jour du plan vers pro_trial:', updateError.message);
                    // Continuer avec le plan 'free' si la mise à jour échoue
                } else {
                    userData.current_plan = 'pro_trial'; // Mettre à jour l'objet userData localement pour la suite du traitement
                    console.log('✅ [AuthContext] Plan mis à jour vers pro_trial dans la DB et localement.');
                }
            } else {
                console.log('⏳ [AuthContext] Essai Pro expiré pour cet utilisateur (plan "free").');
                // Pas besoin de rétrograder ici, car le plan est déjà 'free'
            }
        } 
        // 2. Logique pour rétrograder un essai expiré (si le plan était 'pro_trial' et qu'il a expiré)
        else if (userData.current_plan === 'pro_trial' && userData.pro_trial_enabled && userData.pro_trial_start_date) {
            const trialStartDate = new Date(userData.pro_trial_start_date);
            const now = new Date();
            const diffTime = Math.abs(now.getTime() - trialStartDate.getTime());
            const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

            if (diffDays > trialDurationDays) {
                console.log('⬇️ [AuthContext] Essai Pro expiré. Tentative de rétrogradation du plan vers "free"...');
                const { error: updateError } = await supabase
                   .from('users')
                   .update({ current_plan: 'free' })
                   .eq('id', session.user.id);
                if (updateError) {
                    console.error('❌ [AuthContext] Erreur lors de la rétrogradation du plan expiré:', updateError.message);
                } else {
                    userData.current_plan = 'free'; // Mettre à jour l'objet userData localement
                    console.log('✅ [AuthContext] Plan rétrogradé à "free" car l\'essai a expiré.');
                }
            }
        }
        // --- FIN NOUVELLE LOGIQUE ---

        // Calcul de la propriété isProOrTrial (utilisant maintenant le userData potentiellement mis à jour)
        let isProOrTrial = false;
        // trialDurationDays est déjà défini plus haut

        if (userData.pro_subscription_active |

| userData.current_plan === 'pro') {
          isProOrTrial = true;
        } else if (userData.current_plan === 'pro_trial' && userData.pro_trial_enabled && userData.pro_trial_start_date) {
          const trialStartDate = new Date(userData.pro_trial_start_date);
          const now = new Date();
          const diffTime = Math.abs(now.getTime() - trialStartDate.getTime());
          const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

          if (diffDays <= trialDurationDays) {
            isProOrTrial = true;
          }
        }

        const newUser: User = {
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
        console.log('🔔 [AuthContext] AuthStateChange:', { event, hasSession:!!session });

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
          if (window.location.pathname!== '/login') {
            window.location.replace('/login');
          }
        }
      });

      return () => {
        subscription?.unsubscribe();
      };
    };

    initializeAuth();
  },);

  const signIn = async (email: string, password: string) => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return { error: error |

| null };
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
    isAuthenticated:!!state.user,
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
