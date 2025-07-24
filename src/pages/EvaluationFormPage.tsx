import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { FileText, Eye, Download, AlertTriangle, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext'; // Assurez-vous que le chemin est correct
import toast from 'react-hot-toast';

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
  const [loading, setLoading] = useState(true); // Initialisez à true pour le chargement initial
  const [loadingPDF, setLoadingPDF] = useState(false);
  // isInitialLoad n'est plus nécessaire si le useEffect principal est bien géré

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
  // Ces fonctions sont maintenant plus pures et ne dépendent que de leurs arguments ou de l'utilisateur
  const fetchClassesData = useCallback(async () => {
    const { data, error } = await supabase
      .from('classes')
      .select('*')
      .eq('teacher_id', user?.id)
      .order('name');
    if (error) throw error;
    return data || [];
  }, [user?.id]);

  const fetchCriteriaData = useCallback(async () => {
    const { data, error } = await supabase
      .from('criteria')
      .select('*')
      .eq('teacher_id', user?.id)
      .order('name');
    if (error) throw error;
    return data || [];
  }, [user?.id]);

  const fetchEvaluationTitlesData = useCallback(async () => {
    const { data, error } = await supabase
      .from('evaluation_titles')
      .select('*')
      .eq('teacher_id', user?.id)
      .order('title');
    if (error) throw error;
    return data || [];
  }, [user?.id]);

  const fetchCriteriaForTitleData = useCallback(async (titleId: string, allCriteria: any[]) => {
    const { data, error } = await supabase
      .from('evaluation_title_criteria')
      .select(`
        criterion_id,
        criteria:criteria(*)
      `)
      .eq('evaluation_title_id', titleId)
      .eq('teacher_id', user?.id);

    if (error) {
      console.error('Error fetching criteria for title:', error.message);
      return allCriteria; // Revenir aux critères par défaut en cas d'erreur
    }
    const titleCriteria = data?.map(item => item.criteria).filter(Boolean) || [];
    return titleCriteria.length > 0 ? titleCriteria : allCriteria;
  }, [user?.id]);

  const fetchAttachedPDFData = useCallback(async (evalTitleId: string, classId: string) => {
    const { data, error } = await supabase
      .from('evaluation_attachments')
      .select('*, class:classes(name)')
      .eq('evaluation_title_id', evalTitleId)
      .eq('class_id', classId)
      .eq('teacher_id', user?.id)
      .maybeSingle();

    if (error && error.code !== 'PGRST116') throw error;
    return data;
  }, [user?.id]);

  const fetchStudentsData = useCallback(async (classId: string) => {
    const { data, error } = await supabase
      .from('students')
      .select('id, first_name, last_name')
      .eq('class_id', classId)
      .order('first_name');
    if (error) throw error;
    return data || [];
  }, []); // Aucune dépendance externe, fonction pure.

  const fetchEvaluationsForGroup = useCallback(async (classId: string, criterionId: string, evaluationDate: string, evalTitleId: string) => {
    const { data, error } = await supabase
      .from('evaluations')
      .select(`id, student_id, value, comments`)
      .eq('class_id', classId)
      .eq('criterion_id', criterionId)
      .eq('date', evaluationDate)
      .eq('evaluation_title_id', evalTitleId)
      .eq('teacher_id', user?.id);
    if (error) throw error;
    return data || [];
  }, [user?.id]);

  const fetchLatestEvaluationsForPreFill = useCallback(async (classId: string, criterionId: string, evalTitleId: string, evaluationDate: string) => {
    const { data, error } = await supabase
      .from('evaluations')
      .select(`id, student_id, value, comments, date`)
      .eq('class_id', classId)
      .eq('criterion_id', criterionId)
      .eq('evaluation_title_id', evalTitleId)
      .eq('teacher_id', user?.id)
      .eq('date', evaluationDate) // Filtrer par la date du formulaire
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw error;
    return data || [];
  }, [user?.id]);
  // --- FIN Fonctions de récupération de données ---


  // --- Effet principal pour le chargement initial de TOUTES les données du formulaire ---
  useEffect(() => {
    const loadAllInitialData = async () => {
      setLoading(true); // Active le chargement au début de cet effet
      try {
        // 1. Charger les données de base (classes, critères, titres) en parallèle
        const [classesData, criteriaData, evaluationTitlesData] = await Promise.all([
          fetchClassesData(),
          fetchCriteriaData(),
          fetchEvaluationTitlesData()
        ]);

        setClasses(classesData);
        setCriteria(criteriaData);
        setAvailableCriteria(criteriaData);
        setEvaluationTitles(evaluationTitlesData);

        let initialClassId = '';
        let initialCriterionObj = null;
        let initialEvaluationTitleId = '';
        let initialFormDate = date; // Utilise la date par défaut de l'état (aujourd'hui)

        if (isEditing) {
          if (!id) {
            console.error("Erreur: isEditing est vrai mais l'ID de l'évaluation est manquant dans les paramètres de l'URL.");
            toast.error("Erro ao carregar avaliação: ID ausente.");
            navigate('/evaluations');
            return;
          }

          // En mode édition, charger les données spécifiques du groupe d'évaluation
          const { data: singleEvaluationRecord, error: singleFetchError } = await supabase
            .from('evaluations')
            .select(`date, class_id, criterion_id, evaluation_title_id`)
            .eq('id', id)
            .eq('teacher_id', user?.id)
            .single();

          if (singleFetchError) {
            console.error('Error fetching single evaluation record to identify group:', singleFetchError.message);
            toast.error('Avaliação não encontrada ou sem permissão.');
            navigate('/evaluations');
            return;
          }

          const { date: groupDate, class_id: groupClassId, criterion_id: groupCriterionId, evaluation_title_id: groupEvaluationTitleId } = singleEvaluationRecord;

          initialFormDate = new Date(groupDate).toISOString().split('T')[0];
          initialClassId = groupClassId;
          initialEvaluationTitleId = groupEvaluationTitleId || '';
          
          const criterionFound = criteriaData.find((c: any) => c.id === groupCriterionId);
          initialCriterionObj = criterionFound || null;

          // Mettre à jour les états du formulaire avec les données du groupe
          setDate(initialFormDate);
          setSelectedClass(initialClassId);
          setSelectedEvaluationTitleId(initialEvaluationTitleId);
          setSelectedCriterion(initialCriterionObj);

          // Mettre à jour availableCriteria en fonction du titre du groupe
          if (initialEvaluationTitleId) {
            const filteredCriteria = await fetchCriteriaForTitleData(initialEvaluationTitleId, criteriaData);
            setAvailableCriteria(filteredCriteria);
          } else {
            setAvailableCriteria(criteriaData);
          }

        } else { // Mode "Nouvelles Avaliações" - initialisation des sélecteurs si des valeurs par défaut sont souhaitées
            // Si vous voulez pré-sélectionner une classe/titre/critère par défaut, faites-le ici.
            // Sinon, ils resteront vides et l'utilisateur devra les choisir.
        }

        // Charger les étudiants et les évaluations une fois que la classe et le critère sont définis
        if (initialClassId && initialCriterionObj?.id) {
          const studentsData = await fetchStudentsData(initialClassId);
          setStudents(studentsData);

          let finalEvaluations: StudentEvaluationData[] = [];

          if (isEditing) {
            const existingEvaluations = await fetchEvaluationsForGroup(initialClassId, initialCriterionObj.id, initialFormDate, initialEvaluationTitleId);
            finalEvaluations = studentsData.map((student: any) => {
              const existing = existingEvaluations.find((e: any) => e.student_id === student.id);
              return {
                student_id: student.id,
                student_name: `${student.first_name} ${student.last_name}`,
                criterion_id: initialCriterionObj.id,
                value: existing?.value?.toString() || '',
                comments: existing?.comments || '',
                id: existing?.id
              };
            });
          } else { // Mode création
            const latestEvaluations = await fetchLatestEvaluationsForPreFill(initialClassId, initialCriterionObj.id, initialEvaluationTitleId, initialFormDate);
            finalEvaluations = studentsData.map((student: any) => {
              const existing = latestEvaluations.find((e: any) => e.student_id === student.id);
              return {
                student_id: student.id,
                student_name: `${student.first_name} ${student.last_name}`,
                criterion_id: initialCriterionObj.id,
                value: existing?.value?.toString() || '',
                comments: existing?.comments || '',
                id: existing?.id
              };
            });
          }
          setEvaluations(finalEvaluations);
        } else {
          setStudents([]);
          setEvaluations([]);
        }

        // Charger le PDF attaché si les IDs sont disponibles
        if (initialEvaluationTitleId && initialClassId) {
          setLoadingPDF(true);
          const pdfData = await fetchAttachedPDFData(initialEvaluationTitleId, initialClassId);
          setAttachedPDF(pdfData);
          setLoadingPDF(false);
        } else {
          setAttachedPDF(null);
        }

      } catch (error: any) {
        console.error("Erreur lors du chargement du formulaire:", error.message);
        toast.error('Erro ao carregar formulário.');
        navigate('/evaluations');
      } finally {
        setLoading(false); // Désactive le chargement une fois tout terminé
      }
    };

    // Déclenche le chargement initial des données.
    // Cet effet ne dépend que de 'id' et 'user.id' pour le déclenchement initial.
    // 'date' n'est pas une dépendance ici car elle est gérée par l'utilisateur.
    // Toutes les fonctions de fetch sont des useCallback stables.
    loadAllInitialData();
  }, [id, user?.id, isEditing, navigate,
      fetchClassesData, fetchCriteriaData, fetchEvaluationTitlesData,
      fetchAttachedPDFData, fetchStudentsData, fetchEvaluationsForGroup,
      fetchLatestEvaluationsForPreFill, fetchCriteriaForTitleData
  ]);


  // Effet pour gérer les changements des sélecteurs de formulaire (classe, critère, titre, date)
  // et recharger les données dynamiques (étudiants, évaluations, PDF) en conséquence.
  useEffect(() => {
    // Ne pas exécuter cet effet si le chargement initial est toujours en cours
    // ou si les données de base (classes, criteria, evaluationTitles) ne sont pas encore chargées.
    if (loading || classes.length === 0 || criteria.length === 0 || evaluationTitles.length === 0) {
      return;
    }

    const handleDynamicFormChanges = async () => {
      setLoading(true); // Active le chargement pour les mises à jour dynamiques
      try {
        // 1. Mettre à jour les critères disponibles si le titre change
        if (selectedEvaluationTitleId) {
          const filteredCriteria = await fetchCriteriaForTitleData(selectedEvaluationTitleId, criteria);
          setAvailableCriteria(filteredCriteria);
        } else {
          setAvailableCriteria(criteria);
        }

        // 2. Charger les étudiants et les évaluations si la classe ou le critère change
        if (selectedClass && selectedCriterion?.id) {
          const studentsData = await fetchStudentsData(selectedClass);
          setStudents(studentsData);

          let updatedEvaluations: StudentEvaluationData[] = [];

          if (isEditing) {
            // En mode édition, recharger les évaluations spécifiques au groupe
            const existingEvaluations = await fetchEvaluationsForGroup(selectedClass, selectedCriterion.id, date, selectedEvaluationTitleId);
            updatedEvaluations = studentsData.map((student: any) => {
              const existing = existingEvaluations.find((e: any) => e.student_id === student.id);
              return {
                student_id: student.id,
                student_name: `${student.first_name} ${student.last_name}`,
                criterion_id: selectedCriterion.id,
                value: existing?.value?.toString() || '',
                comments: existing?.comments || '',
                id: existing?.id
              };
            });
          } else { // Mode création
            // Pré-remplir avec les dernières évaluations pour la date sélectionnée
            const latestEvaluations = await fetchLatestEvaluationsForPreFill(selectedClass, selectedCriterion.id, selectedEvaluationTitleId, date);
            updatedEvaluations = studentsData.map((student: any) => {
              const existing = latestEvaluations.find((e: any) => e.student_id === student.id);
              return {
                student_id: student.id,
                student_name: `${student.first_name} ${student.last_name}`,
                criterion_id: selectedCriterion.id,
                value: existing?.value?.toString() || '',
                comments: existing?.comments || '',
                id: existing?.id
              };
            });
          }
          setEvaluations(updatedEvaluations);

        } else {
          // Si la classe ou le critère n'est pas sélectionné, vider les étudiants et les évaluations
          setStudents([]);
          setEvaluations([]);
        }

        // 3. Charger le PDF attaché
        if (selectedEvaluationTitleId && selectedClass) {
          setLoadingPDF(true);
          const pdfData = await fetchAttachedPDFData(selectedEvaluationTitleId, selectedClass);
          setAttachedPDF(pdfData);
          setLoadingPDF(false);
        } else {
          setAttachedPDF(null);
        }

      } catch (error: any) {
        console.error("Erreur lors de la mise à jour dynamique du formulaire:", error.message);
        toast.error('Erro ao atualizar formulário.');
      } finally {
        setLoading(false); // Désactive le chargement une fois la mise à jour dynamique terminée
      }
    };

    // Déclenche cet effet lorsque les sélecteurs de formulaire changent (par interaction utilisateur)
    // ou lorsque la date change.
    handleDynamicFormChanges();
  }, [selectedClass, selectedCriterion, selectedEvaluationTitleId, date, isEditing, user,
      classes.length, criteria, evaluationTitles, // Dépendances pour garantir que les données de base sont chargées et stables
      fetchCriteriaForTitleData, fetchStudentsData, fetchEvaluationsForGroup,
      fetchLatestEvaluationsForPreFill, fetchAttachedPDFData
  ]);


  // Effet pour auto-remplir le nom du titre d'évaluation affiché
  useEffect(() => {
    if (selectedEvaluationTitleId) {
      const selectedEvaluationTitle = evaluationTitles.find(
        evalTitle => evalTitle.id === selectedEvaluationTitleId
      );
      if (selectedEvaluationTitle) {
        setEvaluationTitleName(selectedEvaluationTitle.title);
        setShowTitleField(false);
      }
    } else {
      setEvaluationTitleName('');
      setShowTitleField(true);
    }
  }, [selectedEvaluationTitleId, evaluationTitles]);


  // Gère la suppression réelle des évaluations (utilise le loading global)
  const handleConfirmDelete = async () => {
    if (!isEditing || !id) return;

    setLoading(true);
    try {
      const { data: evaluationData, error: fetchError } = await supabase
        .from('evaluations')
        .select('*')
        .eq('id', id)
        .single();

      if (fetchError) throw fetchError;

      if (evaluationData.teacher_id !== user?.id) {
        toast.error('Você não tem permissão para excluir esta avaliação');
        return; // Sortir sans changer le loading à false ici
      }

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

      if (deleteError) throw deleteError;

      toast.success('Avaliação excluída com sucesso');
      navigate('/evaluations');
    } catch (error: any) {
      console.error('Error deleting evaluation:', error.message);
      toast.error('Erro ao excluir avaliação');
    } finally {
      setLoading(false);
      setConfirmDialog({ isOpen: false, title: '', message: '' });
    }
  };

  // Sorts evaluations: those with values first, then alphabetically by student name
  const sortedEvaluations = [...evaluations].sort((a, b) => {
    const aHasValue = a.value && a.value.trim() !== '';
    const bHasValue = b.value && b.value.trim() !== '';

    if (aHasValue && !bHasValue) return -1;
    if (!aHasValue && bHasValue) return 1;

    return a.student_name.localeCompare(b.student_name);
  });

  // Global loading overlay to prevent interaction and show status
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
            : 'Preencha as informations pour créer múltiples avaliações'}
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Date Input */}
            <Input
              label="Data"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
              fullWidth
            />

            {/* Class Selection */}
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
                // Disabled in edit mode to maintain group consistency
                disabled={isEditing}
              >
                <option value="">Selecione uma turma</option>
                {classes.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Evaluation Title Selection */}
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
            {/* Display Selected Evaluation Title Name */}
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

            {/* Criterion Selection */}
            <div className="space-y-2">
              <label htmlFor="criterion-select" className="block text-sm font-medium text-gray-700">
                Critério
              </label>
              <select
                id="criterion-select"
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
                value={selectedCriterion?.id || ''}
                onChange={(e) => setSelectedCriterion(availableCriteria.find(c => c.id === e.target.value) || null)} // Met à jour l'objet critère
                required
                // Disabled if in edit mode and evaluations are already loaded
                disabled={isEditing && evaluations.length > 0}
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

          {/* PDF Attachment Indicator */}
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
                Não há PDF anexado para esta combinação de título et turma.
              </p>
            </div>
          ) : null}

          {/* Student Evaluations Table - Now includes comments column */}
          {selectedClass && (
            <div className="mt-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4">Avaliações dos Alunos</h3>

              {/* Utilise 'loading' global au lieu de 'loadingStudents' pour éviter le clignotement */}
              {loading ? (
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
                        {/* NEW: Comments Header */}
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
                            {/* NEW: Comments Input for each student */}
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
            {/* Delete button - only show when editing */}
            {isEditing && (
              <Button
                type="button"
                variant="danger"
                onClick={handleDeleteClick}
                isLoading={loading} // Utilisez le loading global
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

      {/* Confirm Dialog */}
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
