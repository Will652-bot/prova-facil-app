import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FileText, Eye, Download, AlertTriangle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';
// import { v4 as uuidv4 } from 'uuid'; // <-- ASSUREZ-VOUS QUE CETTE LIGNE EST COMMENTÉE OU SUPPRIMÉE

// Interface pour les titres d'évaluation
interface EvaluationTitle {
  id: string;
  title: string;
  teacher_id: string;
}

// Interface pour les pièces jointes d'évaluation (PDFs)
interface EvaluationAttachment {
  id: string;
  evaluation_title_id: string;
  teacher_id: string;
  class_id: string;
  file_path: string;
  created_at?: string;
  class?: {
    name: string;
  };
}

// Nouvelle interface pour les données d'évaluation des étudiants, incluant les commentaires
interface StudentEvaluationData {
  id?: string; // L'ID est optionnel car il n'existe pas pour les nouvelles évaluations
  student_id: string;
  student_name: string;
  criterion_id: string;
  value: string;
  comments: string;
}

export const EvaluationFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { user } = useAuth();

  // États de chargement
  const [loading, setLoading] = useState(false);
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [loadingPDF, setLoadingPDF] = useState(false);

  // États des données
  const [classes, setClasses] = useState<any[]>([]);
  const [students, setStudents] = useState<any[]>([]);
  const [criteria, setCriteria] = useState<any[]>([]);
  const [availableCriteria, setAvailableCriteria] = useState<any[]>([]);
  const [evaluationTitles, setEvaluationTitles] = useState<EvaluationTitle[]>([]);
  const [attachedPDF, setAttachedPDF] = useState<EvaluationAttachment | null>(null);

  // États des entrées du formulaire
  const [selectedClass, setSelectedClass] = useState('');
  const [selectedCriterion, setSelectedCriterion] = useState<any>(null);
  const [selectedEvaluationTitleId, setSelectedEvaluationTitleId] = useState('');
  // Initialise la date à aujourd'hui par défaut
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  // État des évaluations multiples - inclut maintenant 'comments' pour chaque étudiant
  const [evaluations, setEvaluations] = useState<StudentEvaluationData[]>([]);

  // État pour l'affichage du titre de l'évaluation
  const [showTitleField, setShowTitleField] = useState(false);
  const [evaluationTitleName, setEvaluationTitleName] = useState('');

  // État du dialogue de confirmation de suppression
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: ''
  });

  // Détermine si le formulaire est en mode édition (si un ID est présent dans l'URL)
  const isEditing = !!id;

  // --- Fonctions de gestion des changements de valeur et de commentaire (utilisent useCallback) ---
  const handleValueChange = useCallback((studentId: string, value: string) => {
    setEvaluations(prev =>
      prev.map(evaluation =>
        evaluation.student_id === studentId
          ? { ...evaluation, value }
          : evaluation
      )
    );
  }, []);

  const handleCommentChange = useCallback((studentId: string, comment: string) => {
    setEvaluations(prev =>
      prev.map(evaluation =>
        evaluation.student_id === studentId
          ? { ...evaluation, comments: comment }
          : evaluation
      )
    );
  }, []);
  // --- FIN Fonctions de gestion ---


  // --- Fonctions de récupération de données (TOUTES en useCallback pour la stabilité) ---
  const fetchClasses = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('*')
        .eq('teacher_id', user?.id)
        .order('name');
      if (error) throw error;
      setClasses(data || []);
    } catch (error: any) {
      console.error('Error fetching classes:', error.message);
      toast.error('Erro ao carregar turmas');
    }
  }, [user?.id]); // Dépend de user.id et supabase (implicite via 'supabase' importé)

  const fetchCriteria = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('criteria')
        .select('*')
        .eq('teacher_id', user?.id)
        .order('name');
      if (error) throw error;
      setCriteria(data || []);
      setAvailableCriteria(data || []);
    }
    catch (error: any) {
      console.error('Error fetching criteria:', error.message);
      toast.error('Erro ao carregar critérios');
    }
  }, [user?.id]); // Dépend de user.id et supabase

  const fetchEvaluationTitles = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('evaluation_titles')
        .select('*')
        .eq('teacher_id', user?.id)
        .order('title');
      if (error) throw error;
      setEvaluationTitles(data || []);
    } catch (error: any) {
      console.error('Error fetching evaluation titles:', error.message);
      toast.error('Erro ao carregar títulos de avaliação');
    }
  }, [user?.id]); // Dépend de user.id et supabase

  const fetchCriteriaForTitle = useCallback(async (titleId: string) => {
    try {
      const { data, error } = await supabase
        .from('evaluation_title_criteria')
        .select(`
          criterion_id,
          criteria:criteria(*)
        `)
        .eq('evaluation_title_id', titleId)
        .eq('teacher_id', user?.id);

      if (error) throw error;

      const titleCriteria = data?.map(item => item.criteria).filter(Boolean) || [];

      if (titleCriteria.length > 0) {
        setAvailableCriteria(titleCriteria);
      } else {
        // Si aucun critère spécifique n'est trouvé pour ce titre, revenir à tous les critères
        setAvailableCriteria(criteria);
      }
    } catch (error: any) {
      console.error('Error fetching criteria for title:', error.message);
      setAvailableCriteria(criteria); // Revenir aux critères par défaut en cas d'erreur
    }
  }, [user?.id, criteria]); // Dépend de user.id, criteria et supabase

  const checkForAttachedPDF = useCallback(async () => {
    try {
      setLoadingPDF(true);
      const { data, error } = await supabase
        .from('evaluation_attachments')
        .select('*, class:classes(name)')
        .eq('evaluation_title_id', selectedEvaluationTitleId)
        .eq('class_id', selectedClass)
        .eq('teacher_id', user?.id)
        .maybeSingle();

      // PGRST116 est le code d'erreur pour "No rows found" avec maybeSingle
      if (error && error.code !== 'PGRST116') throw error;

      setAttachedPDF(data);
    }
    catch (error: any) {
      console.error('Error checking for attached PDF:', error.message);
      toast.error('Erro ao verificar anexos');
    } finally {
      setLoadingPDF(false);
    }
  }, [selectedEvaluationTitleId, selectedClass, user?.id]); // Dépend de selectedEvaluationTitleId, selectedClass, user.id et supabase

  const fetchStudents = useCallback(async (classId: string) => {
    setLoadingStudents(true);
    try {
      const { data, error } = await supabase
        .from('students')
        .select('id, first_name, last_name')
        .eq('class_id', classId)
        .order('first_name');

      if (error) throw error;
      setStudents(data || []);

      // Initialise les évaluations pour les nouveaux étudiants si pas en mode édition
      if (data && !isEditing) {
        const initialEvaluations: StudentEvaluationData[] = data.map(student => ({
          student_id: student.id,
          student_name: `${student.first_name} ${student.last_name}`,
          criterion_id: selectedCriterion?.id || '',
          value: '',
          comments: ''
        }));
        setEvaluations(initialEvaluations);
      } else if (!data || data.length === 0) {
        setEvaluations([]);
      }
    } catch (error: any) {
      console.error('Error fetching students:', error.message);
      toast.error('Erro ao carregar alunos');
    } finally {
      setLoadingStudents(false);
    }
  }, [selectedCriterion?.id, isEditing]); // Dépend de selectedCriterion.id, isEditing et supabase. setEvaluations est une dépendance implicite ici.

  const fetchEvaluation = useCallback(async (evaluationId: string) => {
    setLoading(true);
    try {
      // Étape 1: Récupérer un enregistrement unique pour identifier le groupe d'évaluation
      const { data: singleEvaluationRecord, error: singleFetchError } = await supabase
        .from('evaluations')
        .select(`date, class_id, criterion_id, evaluation_title_id`)
        .eq('id', evaluationId)
        .eq('teacher_id', user?.id)
        .single();

      if (singleFetchError) {
        console.error('Error fetching single evaluation record to identify group:', singleFetchError.message);
        toast.error('Avaliação não encontrada ou sem permissão.');
        navigate('/evaluations');
        return;
      }

      const { date: groupDate, class_id: groupClassId, criterion_id: groupCriterionId, evaluation_title_id: groupEvaluationTitleId } = singleEvaluationRecord;

      // Mettre à jour les états du formulaire avec les données du groupe
      setDate(new Date(groupDate).toISOString().split('T')[0]);
      setSelectedClass(groupClassId);
      setSelectedEvaluationTitleId(groupEvaluationTitleId || '');

      // Charger les étudiants de la classe sélectionnée
      await fetchStudents(groupClassId);

      // Étape 2: Récupérer toutes les évaluations existantes pour ce groupe (date, classe, critère, titre)
      const { data: existingEvaluations, error: evalError } = await supabase
        .from('evaluations')
        .select(`id, student_id, value, comments`)
        .eq('class_id', groupClassId)
        .eq('criterion_id', groupCriterionId)
        .eq('date', groupDate)
        .eq('teacher_id', user?.id);

      if (evalError) throw evalError;

      // Mettre à jour l'état 'evaluations' en fusionnant les étudiants et leurs évaluations existantes
      setEvaluations(currentStudents => { // Renommé 'currentEvaluations' en 'currentStudents' pour plus de clarté
        const evaluationsMap = new Map<string, Omit<StudentEvaluationData, 'student_name'>>();
        existingEvaluations?.forEach(evaluation => {
          evaluationsMap.set(evaluation.student_id, {
            id: evaluation.id,
            student_id: evaluation.student_id,
            criterion_id: groupCriterionId, // Assurez-vous que le criterion_id est correct
            value: evaluation.value?.toString() || '',
            comments: evaluation.comments || ''
          });
        });

        // Assurez-vous que 'currentStudents' est bien la liste des étudiants chargés par fetchStudents
        return (currentStudents || []).map(student => {
          const existing = evaluationsMap.get(student.student_id);
          return {
            ...student, // Garde student_id et student_name de la liste des étudiants
            criterion_id: existing?.criterion_id || groupCriterionId, // Utilise l'existant ou le groupe
            value: existing?.value || '',
            comments: existing?.comments || '',
            id: existing?.id // L'ID de l'évaluation existante
          };
        });
      });

    } catch (error: any) {
      console.error('Error fetching evaluation group:', error.message);
      toast.error('Erro ao carregar avaliação. Redirecionando...');
      navigate('/evaluations');
    } finally {
      setLoading(false);
    }
  }, [user?.id, navigate, fetchStudents]); // Dépend de user.id, navigate, fetchStudents et supabase


  // --- useEffects pour le chargement des données et la logique du formulaire ---

  // Effet pour l'initialisation générale et le chargement d'évaluation en mode édition
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      try {
        await Promise.all([
          fetchClasses(),
          fetchCriteria(),
          fetchEvaluationTitles()
        ]);

        if (isEditing) {
          if (id) {
            await fetchEvaluation(id);
          } else {
            console.error("Erreur: isEditing est vrai mais l'ID de l'évaluation est manquant dans les paramètres de l'URL.");
            toast.error("Erro ao carregar avaliação: ID ausente.");
            navigate('/evaluations');
          }
        }
      } catch (err: any) {
        console.error("Erreur d'initialisation du formulário:", err.message);
        toast.error('Erro ao iniciar formulário.');
        navigate('/evaluations');
      } finally {
        setLoading(false);
      }
    };

    initialize();
  }, [id, user?.id, isEditing, navigate, fetchClasses, fetchCriteria, fetchEvaluationTitles, fetchEvaluation]);


  // Effet pour charger les étudiants quand la classe sélectionnée change
  useEffect(() => {
    if (selectedClass) {
      fetchStudents(selectedClass);
    } else {
      setStudents([]);
      if (!isEditing) { // Seulement vider les évaluations si ce n'est pas en mode édition
        setEvaluations([]);
      }
    }
  }, [selectedClass, isEditing, fetchStudents]);


  // Effet pour définir le critère sélectionné (principalement en mode édition)
  // et s'assurer que availableCriteria est prêt.
  useEffect(() => {
    if (evaluations.length > 0 && evaluations[0]?.criterion_id && availableCriteria.length > 0) {
      const criterion = availableCriteria.find(c => c.id === evaluations[0].criterion_id);
      setSelectedCriterion(criterion || null);
    } else if (evaluations.length === 0) {
      setSelectedCriterion(null);
    }
  }, [evaluations, availableCriteria]);


  // Effet pour filtrer les critères basés sur le titre d'évaluation sélectionné
  useEffect(() => {
    if (selectedEvaluationTitleId) {
      fetchCriteriaForTitle(selectedEvaluationTitleId);
    } else {
      setAvailableCriteria(criteria);
    }
  }, [selectedEvaluationTitleId, criteria, fetchCriteriaForTitle]);


  // Effet pour vérifier et afficher le PDF attaché
  useEffect(() => {
    if (selectedEvaluationTitleId && selectedClass) {
      checkForAttachedPDF();
    } else {
      setAttachedPDF(null);
    }
  }, [selectedEvaluationTitleId, selectedClass, user?.id, checkForAttachedPDF]);


  // Effet pour auto-remplir le nom du titre d'évaluation affiché
  useEffect(() => {
    if (selectedEvaluationTitleId && !isEditing) {
      const selectedEvaluationTitle = evaluationTitles.find(
        evalTitle => evalTitle.id === selectedEvaluationTitleId
      );

      if (selectedEvaluationTitle) {
        setEvaluationTitleName(selectedEvaluationTitle.title);
        setShowTitleField(false);
      }
    } else if (!selectedEvaluationTitleId && !isEditing) {
      setEvaluationTitleName('');
      setShowTitleField(true);
    }
  }, [selectedEvaluationTitleId, evaluationTitles, isEditing]);


  // Effet pour contrôler la visibilité du champ de titre en mode édition
  useEffect(() => {
    if (isEditing && selectedEvaluationTitleId) {
      const selectedEvaluationTitle = evaluationTitles.find(
        evalTitle => evalTitle.id === selectedEvaluationTitleId
      );

      if (selectedEvaluationTitle) {
        setEvaluationTitleName(selectedEvaluationTitle.title);
        setShowTitleField(false);
      }
    } else if (isEditing && !selectedEvaluationTitleId) {
      setShowTitleField(true);
    }
  }, [isEditing, selectedEvaluationTitleId, evaluationTitles]);


  // NOUVEL Effet : Récupérer et pré-remplir les évaluations existantes pour le mode "Nouvelle Évaluation"
  // Prend en compte la date sélectionnée (par défaut la date du jour)
  useEffect(() => {
    // Ne s'exécute pas en mode édition, ou si des dépendances clés sont manquantes
    if (isEditing || !user || !selectedClass || !selectedCriterion?.id || !selectedEvaluationTitleId || students.length === 0) {
      return;
    }

    setLoadingStudents(true);
    const fetchExistingEvalsForPreFill = async () => {
      try {
        const { data: existingEvals, error } = await supabase
          .from('evaluations')
          .select(`id, student_id, value, comments, date`)
          .eq('class_id', selectedClass)
          .eq('criterion_id', selectedCriterion.id)
          .eq('evaluation_title_id', selectedEvaluationTitleId)
          .eq('teacher_id', user.id)
          .eq('date', date) // <-- Correction 2 : Filtrer par la date du formulaire
          .order('date', { ascending: false })
          .order('created_at', { ascending: false });

        if (error) throw error;

        const existingEvalsMap = new Map<string, Pick<StudentEvaluationData, 'id' | 'value' | 'comments'>>();
        existingEvals?.forEach(evalItem => {
          // Si plusieurs évaluations existent pour le même étudiant, on prend la plus récente grâce aux ordres
          if (!existingEvalsMap.has(evalItem.student_id)) {
            existingEvalsMap.set(evalItem.student_id, {
              id: evalItem.id,
              value: evalItem.value?.toString() || '',
              comments: evalItem.comments || ''
            });
          }
        });

        setEvaluations(currentEvaluations => {
          // Si currentEvaluations est vide (première fois que les étudiants sont chargés)
          if (!currentEvaluations || currentEvaluations.length === 0) {
            return students.map(student => {
              const existing = existingEvalsMap.get(student.id);
              return {
                student_id: student.id,
                student_name: `${student.first_name} ${student.last_name}`,
                criterion_id: selectedCriterion.id,
                value: existing?.value || '',
                comments: existing?.comments || '',
                id: existing?.id // L'ID existant sera inclus si l'évaluation est pré-remplie
              };
            });
          }

          // Si currentEvaluations contient déjà des données (par exemple, après un changement de critère)
          return currentEvaluations.map(evaluation => {
            const existing = existingEvalsMap.get(evaluation.student_id);
            if (existing) {
              return {
                ...evaluation,
                value: existing.value,
                comments: existing.comments,
                id: existing.id // L'ID existant sera inclus
              };
            }
            return evaluation; // Retourne l'évaluation telle quelle si pas de pré-remplissage
          });
        });

      } catch (error: any) {
        console.error('Error fetching existing evaluations for pre-fill:', error.message);
        toast.error('Erro ao pré-carregar avaliações existentes.');
      } finally {
        setLoadingStudents(false);
      }
    };

    fetchExistingEvalsForPreFill();
  }, [user, isEditing, selectedClass, selectedCriterion, selectedEvaluationTitleId, students, date]); // <-- Correction 2 : Ajout de 'date' aux dépendances

  // --- FIN useEffects ---


  // Gère la visualisation du PDF attaché dans un nouvel onglet
  const handleViewPDF = async () => {
    if (!attachedPDF) return;

    try {
      const { data, error } = await supabase.storage
        .from('evaluation-attachments')
        .createSignedUrl(attachedPDF.file_path, 3600); // URL signée valide pour 1 heure

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      }
    } catch (error: any) {
      console.error('Error viewing PDF:', error.message);
      toast.error('Erro ao visualizar PDF');
    }
  };

  // Gère le téléchargement du PDF attaché
  const handleDownloadPDF = async () => {
    if (!attachedPDF) return;

    try {
      toast.loading('Preparando download...');

      const { data, error } = await supabase.storage
        .from('evaluation-attachments')
        .download(attachedPDF.file_path);

      if (error) throw error;

      if (data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = attachedPDF.file_path.split('/').pop() || 'documento.pdf';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        toast.dismiss();
        toast.success('Download concluído');
      }
    } catch (error: any) {
      console.error('Error downloading PDF:', error.message);
      toast.dismiss();
      toast.error('Erro ao baixar PDF');
    }
  };

  // Gère le changement de critère sélectionné
  const handleCriterionChange = (criterionId: string) => {
    const criterion = availableCriteria.find(c => c.id === criterionId);
    setSelectedCriterion(criterion);

    setEvaluations(prev =>
      prev.map(evaluation => ({
        ...evaluation,
        criterion_id: criterionId,
        // Réinitialise la valeur et les commentaires si le critère change
        value: evaluation.criterion_id !== criterionId ? '' : evaluation.value,
        comments: evaluation.criterion_id !== criterionId ? '' : evaluation.comments
      }))
    );
  };

  // Valide les entrées du formulaire avant la soumission
  const validateForm = () => {
    if (!selectedClass) {
      toast.error('Selecione uma turma');
      return false;
    }

    if (!selectedEvaluationTitleId) {
      toast.error('Selecione um título de avaliação');
      return false;
    }

    if (!date) {
      toast.error('Informe uma data para a avaliação');
      return false;
    }

    if (!selectedCriterion || !selectedCriterion.id) {
      toast.error('Selecione um critère valide.');
      return false;
    }

    // Vérifie que tous les items d'évaluation ont le bon criterion_id
    const hasCorrectCriterionId = evaluations.every(evalItem => evalItem.criterion_id === selectedCriterion.id);
    if (!hasCorrectCriterionId) {
      toast.error('O ID do critère não corresponde para todas as avaliações. Por favor, selecione o critère novamente.');
      return false;
    }

    // Vérifie qu'au moins une évaluation a une valeur non vide
    const hasValues = evaluations.some(evaluation => evaluation.value && evaluation.value.trim() !== '');
    if (!hasValues) {
      toast.error('Informe pelo menos um valor de avaliação');
      return false;
    }

    // Valide les valeurs par rapport à la plage du critère
    if (selectedCriterion) {
      const invalidValues = evaluations
        .filter(evaluation => evaluation.value && evaluation.value.trim() !== '')
        .filter(evaluation => {
          const value = parseFloat(evaluation.value);
          return isNaN(value) ||
            value < selectedCriterion.min_value ||
            value > selectedCriterion.max_value;
        });

      if (invalidValues.length > 0) {
        toast.error(`Alguns valores estão fora do intervalo permitido (${selectedCriterion.min_value} - ${selectedCriterion.max_value})`);
        return false;
      }
    }

    return true;
  };

  // Gère la soumission du formulaire (création ou mise à jour des évaluations)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setLoading(true);

    try {
      // Prépare les évaluations à sauvegarder, en filtrant celles sans valeur
      const evaluationsToSave = evaluations
        .filter(evaluation => evaluation.value && evaluation.value.trim() !== '')
        .map(evaluation => {
          const finalCriterionId = selectedCriterion?.id;
          if (!finalCriterionId) {
            // Cette erreur devrait être attrapée par la validation, mais c'est une sécurité
            throw new Error("Criterion ID is missing during submission. This should be caught by validation.");
          }

          const baseEvaluation: any = {
            date,
            comments: evaluation.comments || null,
            class_id: selectedClass,
            teacher_id: user?.id,
            student_id: evaluation.student_id,
            criterion_id: finalCriterionId,
            value: parseFloat(evaluation.value),
            evaluation_title_id: selectedEvaluationTitleId
          };

          // Inclure 'id' UNIQUEMENT si evaluation.id existe déjà (pour les mises à jour).
          // Sinon, l'ID sera généré par la base de données (DEFAULT gen_random_uuid()).
          if (evaluation.id) {
            baseEvaluation.id = evaluation.id;
          }

          return baseEvaluation;
        });

      // Séparez les insertions des mises à jour
      const toUpdate = evaluationsToSave.filter(evaluation => 'id' in evaluation);
      const toInsert = evaluationsToSave.filter(evaluation => !('id' in evaluation));

      // Effectuez les mises à jour
      if (toUpdate.length > 0) {
        const { error: updateError } = await supabase
          .from('evaluations')
          .upsert(toUpdate, {
            onConflict: 'id' // <-- Correction 1 : Utilise l'ID primaire pour le conflit
          });
        if (updateError) throw updateError;
      }

      // Effectuez les insertions
      if (toInsert.length > 0) {
        const { error: insertError } = await supabase
          .from('evaluations')
          .insert(toInsert); // Utilise insert pour les nouveaux enregistrements (l'ID sera généré)
        if (insertError) throw insertError;
      }

      toast.success(isEditing ? 'Avaliações atualizadas com sucesso' : 'Avaliações criadas com sucesso');
      navigate('/evaluations');
    } catch (error: any) {
      console.error('Error saving evaluations:', error.message);
      toast.error('Erro ao salvar avaliações');
    } finally {
      setLoading(false);
    }
  };

  // Gère le dialogue de confirmation de suppression
  const handleDeleteClick = () => {
    setConfirmDialog({
      isOpen: true,
      title: 'Excluir Avaliação',
      message: `Tem certeza que deseja excluir a avaliação "${evaluationTitleName}"? Esta ação não pode ser desfeita e excluirá todas as avaliações associées.`
    });
  };

  // Gère la suppression réelle des évaluations
  const handleConfirmDelete = async () => {
    if (!isEditing || !id) return; // Ne peut supprimer qu'en mode édition avec un ID

    setDeleting(true);
    try {
      // Récupère les données de l'évaluation pour obtenir les infos du groupe à supprimer
      const { data: evaluationData, error: fetchError } = await supabase
        .from('evaluations')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      // Vérifie les permissions de l'utilisateur
      if (evaluationData.teacher_id !== user?.id) {
        toast.error('Você não tem permissão para excluir esta avaliação');
        setDeleting(false);
        setConfirmDialog({ isOpen: false, title: '', message: '' });
        return;
      }

      // Construit la requête de suppression pour toutes les évaluations du groupe
      let deleteQuery = supabase
        .from('evaluations')
        .delete()
        .eq('date', evaluationData.date)
        .eq('criterion_id', evaluationData.criterion_id)
        .eq('class_id', evaluationData.class_id)
        .eq('teacher_id', user?.id);

      if (evaluationData.evaluation_title_id) {
        deleteQuery = deleteQuery.eq('evaluation_title_id', evaluationData.evaluation_title_id);
      }

      const { error: deleteError } = await deleteQuery;

      if (deleteError) throw deleteError; // Lance l'erreur si la suppression échoue

      toast.success('Avaliação excluída com sucesso');
      navigate('/evaluations'); // Redirige après la suppression
    } catch (error: any) {
      console.error('Error deleting evaluation:', error.message);
      toast.error('Erro ao excluir avaliação');
    } finally {
      setDeleting(false);
      setConfirmDialog({ isOpen: false, title: '', message: '' });
    }
  };

  // Trie les évaluations : celles avec des valeurs d'abord, puis par ordre alphabétique du nom de l'étudiant
  const sortedEvaluations = [...evaluations].sort((a, b) => {
    const aHasValue = a.value && a.value.trim() !== '';
    const bHasValue = b.value && b.value.trim() !== '';

    if (aHasValue && !bHasValue) return -1; // a a une valeur, b n'en a pas -> a avant b
    if (!aHasValue && bHasValue) return 1;  // a n'a pas de valeur, b en a une -> b avant a

    // Si les deux ont ou n'ont pas de valeur, trier par nom d'étudiant
    return a.student_name.localeCompare(b.student_name);
  });

  // Overlay de chargement global pour empêcher l'interaction et afficher le statut
  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary-500"></div>
        <p className="ml-4 text-xl text-primary-600">Carregando formulário...</p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditing ? 'Editar Avaliações' : 'Novas Avaliações'}
        </h1>
        <p className="mt-1 text-gray-500">
          {isEditing
            ? 'Atualize as informações das avaliações'
            : 'Preencha as informações para criar múltiplas avaliações'}
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Champ de saisie de la date */}
            <Input
              label="Data"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              fullWidth
            />

            {/* Sélection de la classe */}
            <div className="space-y-2">
              <label htmlFor="class-select" className="block text-sm font-medium text-gray-700">
                Turma
              </label>
              <select
                id="class-select"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                value={selectedClass}
                onChange={(e) => {
                  setSelectedClass(e.target.value);
                }}
                required
                disabled={isEditing} {/* Désactivé en mode édition pour maintenir la cohérence du groupe */}
              >
                <option value="">Selecione uma turma</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Sélection du titre de l'évaluation */}
            <div className="space-y-2">
              <label htmlFor="evaluation-title-select" className="block text-sm font-medium text-gray-700">
                Título da Avaliação
              </label>
              <select
                id="evaluation-title-select"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                value={selectedEvaluationTitleId}
                onChange={(e) => setSelectedEvaluationTitleId(e.target.value)}
                required
              >
                <option value="">Selecione um título</option>
                {evaluationTitles.map((title) => (
                  <option key={title.id} value={title.id}>
                    {title.title}
                  </option>
                ))}
              </select>
              {selectedEvaluationTitleId && availableCriteria.length < criteria.length && (
                <p className="text-xs text-blue-600 mt-1">
                  ℹ️ Critères filtrés baseados no título selecionado
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Affichage du nom du titre d'évaluation sélectionné */}
            {evaluationTitleName && (
              <div className="space-y-2">
                <label className="block text-sm font-medium text-gray-700">
                  Título da Avaliação Selecionado
                </label>
                <div className="mt-1 block w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md text-gray-700">
                  {evaluationTitleName}
                </div>
                <p className="text-xs text-gray-500">
                  Título definido pelo "Título da Avaliação" selecionado
                </p>
              </div>
            )}

            {/* Sélection du critère */}
            <div className="space-y-2">
              <label htmlFor="criterion-select" className="block text-sm font-medium text-gray-700">
                Critério
              </label>
              <select
                id="criterion-select"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                value={selectedCriterion?.id || ''}
                onChange={(e) => handleCriterionChange(e.target.value)}
                required
                disabled={isEditing && evaluations.length > 0} {/* Désactivé si en édition et des évaluations sont déjà chargées */}
              >
                <option value="">Selecione um critère</option>
                {availableCriteria.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.min_value} - {c.max_value})
                  </option>
                ))}
              </select>
              {availableCriteria.length === 0 && (
                <p className="text-sm text-error-600">
                  Nenhum critère encontrado.{' '}
                  <Button
                    variant="ghost"
                    size="sm"
                    type="button"
                    onClick={() => navigate('/criteria/new')}
                  >
                    Criar critère
                  </Button>
                </p>
              )}
            </div>
          </div>

          {/* Indicateur de pièce jointe PDF */}
          {loadingPDF ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-center">
              <div className="animate-spin h-5 w-5 border-2 border-primary-500 rounded-full border-t-transparent mr-2"></div>
              <p className="text-sm text-gray-600">Verificando anexos...</p>
            </div>
          ) : attachedPDF ? (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <FileText className="h-5 w-5 text-blue-600" />
                  <div>
                    <p className="text-sm font-medium text-blue-900">
                      PDF da Prova Anexado
                    </p>
                    <p className="text-xs text-blue-700">
                      {attachedPDF.file_path.split('/').pop()}
                    </p>
                    <p className="text-xs text-blue-600">
                      Turma: {attachedPDF.class?.name}
                    </p>
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleViewPDF}
                    leftIcon={<Eye className="h-4 w-4" />}
                  >
                    Visualizar
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={handleDownloadPDF}
                    leftIcon={<Download className="h-4 w-4" />}
                  >
                    Baixar
                  </Button>
                </div>
              </div>
            </div>
          ) : selectedEvaluationTitleId && selectedClass ? (
            <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
              <p className="text-sm text-gray-600 text-center">
                Não há PDF anexado para esta combinação de título e turma.
              </p>
            </div>
          ) : null}

          {/* Tableau des évaluations des étudiants - inclut maintenant la colonne des commentaires */}
          {selectedClass && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Avaliações dos Alunos</h3>

              {loadingStudents ? (
                <div className="text-center py-4">
                  <div className="animate-spin h-8 w-8 border-4 border-primary-500 rounded-full border-t-transparent mx-auto"></div>
                  <p className="mt-2 text-gray-500">Carregando alunos...</p>
                </div>
              ) : students.length === 0 ? (
                <div className="text-center py-6 bg-gray-50 rounded-lg">
                  <p className="text-gray-500">Nenhum aluno encontrado nesta turma.</p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-2"
                    onClick={() => navigate(`/classes/${selectedClass}/students/new`)}
                  >
                    Adicionar aluno
                  </Button>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Aluno
                        </th>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Valor
                        </th>
                        {/* NOUVEAU : En-tête des commentaires */}
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Comentários
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {sortedEvaluations.map((evaluation) => {
                        const hasValue = evaluation.value && evaluation.value.trim() !== '';
                        return (
                          <tr key={evaluation.student_id}>
                            <td className={`px-6 py-4 whitespace-nowrap text-sm ${hasValue ? 'font-bold' : ''} text-gray-900`}>
                              {evaluation.student_name}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-40">
                              <input
                                type="number"
                                step="0.1"
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50"
                                value={evaluation.value}
                                onChange={(e) => handleValueChange(evaluation.student_id, e.target.value)}
                                min={selectedCriterion?.min_value}
                                max={selectedCriterion?.max_value}
                                placeholder={selectedCriterion ? `${selectedCriterion.min_value}-${selectedCriterion.max_value}` : ''}
                                disabled={false}
                              />
                            </td>
                            {/* NOUVEAU : Champ de saisie des commentaires pour chaque étudiant */}
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 w-full">
                              <textarea
                                className="w-full rounded-md border-gray-300 shadow-sm focus:border-primary-500 focus:ring focus:ring-primary-500 focus:ring-opacity-50"
                                rows={2}
                                value={evaluation.comments}
                                onChange={(e) => handleCommentChange(evaluation.student_id, e.target.value)}
                                placeholder="Adicionar comentário..."
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          <div className="flex justify-between items-center">
            {/* Bouton de suppression - affiché uniquement en mode édition */}
            {isEditing && (
              <Button
                type="button"
                variant="danger"
                onClick={handleDeleteClick}
                isLoading={deleting}
                leftIcon={<Trash2 className="h-4 w-4" />}
              >
                Excluir Avaliação
              </Button>
            )}

            <div className={`flex space-x-3 ${!isEditing ? 'ml-auto' : ''}`}>
              <Button
                type="button"
                variant="outline"
                onClick={() => navigate('/evaluations')}
              >
                Cancelar
              </Button>
              <Button type="submit" isLoading={loading}>
                {isEditing ? 'Salvar Alterações' : 'Criar Avaliações'}
              </Button>
            </div>
          </div>
        </form>
      </Card>

      {/* Dialogue de confirmation */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, title: '', message: '' })}
      />
    </div>
  );
};
