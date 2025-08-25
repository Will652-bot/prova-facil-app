import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, SortAsc, Trash2, Edit } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Badge } from '../components/ui/Badge';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { formatDateShort } from '../lib/utils';
import toast from 'react-hot-toast';

// Interface for evaluation data
interface Evaluation {
  id: string;
  date: string;
  student_id: string;
  class_id: string;
  criterion_id: string;
  comments: string;
  created_at: string;
  evaluation_title_id: string | null;
  student: {
    first_name: string;
    last_name: string;
  };
  class: {
    name: string;
  };
  criteria: {
    name: string;
    min_value: number;
    max_value: number;
  };
  evaluation_title?: {
    title: string;
  } | null;
}

// Le composant pour la page de liste des évaluations
const EvaluationsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [evaluations, setEvaluations] = useState<Evaluation[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    evaluationId: '',
    evaluationTitle: '',
    groupInfo: null as any
  });

  // Group evaluations by title, date, and criterion
  const [groupedEvaluations, setGroupedEvaluations] = useState<any[]>([]);

  const fetchEvaluations = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('evaluations')
        .select(`
          *,
          student:students(first_name, last_name),
          class:classes(name),
          criteria:criteria(name, min_value, max_value),
          evaluation_title:evaluation_titles(title)
        `)
        .eq('teacher_id', user.id)
        .order('date', { ascending: sortOrder === 'asc' });

      if (error) throw error;

      setEvaluations(data || []);

      // Group evaluations by title, date, and criterion
      const groups = data?.reduce((acc: any, evaluation: Evaluation) => {
        const displayTitle = evaluation.evaluation_title?.title || '';
        const key = `${displayTitle}-${evaluation.date}-${evaluation.criterion_id}-${evaluation.class_id}`;

        if (!acc[key]) {
          acc[key] = {
            id: evaluation.id,
            title: displayTitle,
            date: evaluation.date,
            class_id: evaluation.class_id,
            class_name: evaluation.class.name,
            criterion_id: evaluation.criterion_id,
            criterion_name: evaluation.criteria.name,
            criterion_range: `${evaluation.criteria.min_value} - ${evaluation.criteria.max_value}`,
            evaluation_title_id: evaluation.evaluation_title_id,
            count: 1
          };
        } else {
          acc[key].count += 1;
        }
        return acc;
      }, {});

      setGroupedEvaluations(Object.values(groups || {}));

    } catch (error) {
      console.error('Error fetching evaluations:', error);
      toast.error('Erro ao carregar avaliações');
    } finally {
      setLoading(false);
    }
  }, [user, sortOrder]);

  useEffect(() => {
    fetchEvaluations();
  }, [fetchEvaluations]);

  const handleDeleteClick = (evaluation: any) => {
    setConfirmDialog({
      isOpen: true,
      evaluationId: evaluation.id,
      evaluationTitle: evaluation.title,
      groupInfo: evaluation
    });
  };

  const handleConfirmDelete = async () => {
    try {
      const { groupInfo } = confirmDialog;

      if (groupInfo) {
        let deleteQuery = supabase
          .from('evaluations')
          .delete()
          .eq('date', groupInfo.date)
          .eq('criterion_id', groupInfo.criterion_id)
          .eq('class_id', groupInfo.class_id)
          .eq('teacher_id', user?.id);

        if (groupInfo.evaluation_title_id) {
          deleteQuery = deleteQuery.eq('evaluation_title_id', groupInfo.evaluation_title_id);
        }

        const { error } = await deleteQuery;
        if (error) throw error;
      }

      toast.success('Avaliação excluída com sucesso');
      fetchEvaluations();
    } catch (error) {
      console.error('Error deleting evaluation:', error);
      toast.error('Erro ao excluir avaliação');
    } finally {
      setConfirmDialog({ isOpen: false, evaluationId: '', evaluationTitle: '', groupInfo: null });
    }
  };

  const filteredEvaluations = groupedEvaluations.filter(evaluation =>
    evaluation.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
    evaluation.class_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    evaluation.criterion_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEditClick = (evaluation: any) => {
    navigate(`/evaluations/${evaluation.id}/edit`);
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Avaliações</h1>
          <p className="mt-1 text-gray-500">
            Gerencie as avaliações dos seus alunos
          </p>
        </div>
        <div className="mt-4 sm:mt-0">
          <Button
            onClick={() => navigate('/evaluations/new')}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Nova Avaliação
          </Button>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="search"
                placeholder="Buscar avaliações..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
                fullWidth
              />
            </div>
            <Button
              variant="outline"
              onClick={() => setSortOrder(current => current === 'asc' ? 'desc' : 'asc')}
              leftIcon={<SortAsc className="h-4 w-4" />}
            >
              {sortOrder === 'asc' ? 'Mais antigas' : 'Mais recentes'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            <div className="animate-spin h-8 w-8 border-4 border-primary-500 rounded-full border-t-transparent mx-auto"></div>
            <p className="mt-2 text-gray-500">Carregando avaliações...</p>
          </div>
        ) : filteredEvaluations.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Nenhuma avaliação encontrada</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate('/evaluations/new')}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Criar Avaliação
            </Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Data
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Título
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Alunos
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Critério
                  </th>
                  <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Valor
                  </th>
                  <th className="px-3 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Ações
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredEvaluations.map((evaluation) => (
                  <tr key={`${evaluation.title}-${evaluation.date}-${evaluation.criterion_id}-${evaluation.class_id}`}>
                    <td className="px-3 py-4 whitespace-nowrap">
                      {formatDateShort(evaluation.date)}
                    </td>
                    <td className="px-3 py-4">
                      <div className="text-sm font-medium text-gray-900">{evaluation.title}</div>
                      <div className="text-sm text-gray-500">{evaluation.class_name}</div>
                    </td>
                    <td className="px-3 py-4">
                      <Badge variant="secondary">
                        {evaluation.count} aluno{evaluation.count !== 1 ? 's' : ''}
                      </Badge>
                    </td>
                    <td className="px-3 py-4">
                      <div className="text-sm text-gray-900">{evaluation.criterion_name}</div>
                    </td>
                    <td className="px-3 py-4">
                      <div className="text-sm text-gray-900">{evaluation.criterion_range}</div>
                    </td>
                    <td className="px-3 py-4 text-right text-sm font-medium">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(evaluation)}
                        leftIcon={<Edit className="h-4 w-4" />}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(evaluation)}
                        leftIcon={<Trash2 className="h-4 w-4" />}
                      >
                        Excluir
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Excluir Avaliação"
        message={`Tem certeza que deseja excluir a avaliação "${confirmDialog.evaluationTitle}"? Isso excluirá todas as avaliações associadas.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, evaluationId: '', evaluationTitle: '', groupInfo: null })}
      />
    </div>
  );
};

export default EvaluationsPage;
