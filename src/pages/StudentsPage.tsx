import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Plus, Search, SortAsc, Trash2, Edit } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { ConfirmDialog } from '../components/ui/ConfirmDialog';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// Mise à jour de l'interface Student pour inclure les nouveaux champs facultatifs
interface Student {
  id: string;
  first_name: string;
  last_name: string;
  class_id: string;
  teacher_id: string;
  created_at: string;
  // Nouveaux champs facultatifs, noms alignés avec la DB
  birth_date?: string; // Date de naissance (format 'YYYY-MM-DD' de PostgreSQL DATE)
  guardian_email?: string; // Email du représentant légal
  guardian_phone?: string; // Téléphone du représentant légal
}

export const StudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { classId } = useParams();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [className, setClassName] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    studentId: '',
    studentName: ''
  });

  // Effet pour charger les données de la classe et des étudiants
  useEffect(() => {
    fetchClassAndStudents();
  }, [classId, user?.id, sortOrder]); // Dépendances pour recharger les données

  const fetchClassAndStudents = async () => {
    try {
      // Récupération du nom de la classe
      const { data: classData, error: classError } = await supabase
        .from('classes')
        .select('name')
        .eq('id', classId)
        .eq('teacher_id', user?.id)
        .single();

      if (classError) throw classError;
      if (classData) {
        setClassName(classData.name);
      }

      // Récupération des étudiants avec teacher_id filter
      // Le select('*') récupérera automatiquement les nouveaux champs une fois ajoutés à la DB Supabase
      const { data: studentsData, error: studentsError } = await supabase
        .from('students')
        .select('*') // 'select(*)' inclura les nouveaux champs
        .eq('class_id', classId)
        .eq('teacher_id', user?.id)
        .order('first_name', { ascending: sortOrder === 'asc' });

      if (studentsError) throw studentsError;
      setStudents(studentsData || []);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  // Gestion de l'ouverture de la boîte de dialogue de confirmation de suppression
  const handleDeleteClick = (id: string, name: string) => {
    setConfirmDialog({
      isOpen: true,
      studentId: id,
      studentName: name
    });
  };

  // Gestion de la confirmation de suppression d'un étudiant et de ses évaluations
  const handleConfirmDelete = async () => {
    try {
      // Suppression de toutes les évaluations associées à l'étudiant
      const { error: evaluationsError } = await supabase
        .from('evaluations')
        .delete()
        .eq('student_id', confirmDialog.studentId)
        .eq('teacher_id', user?.id); // S'assurer que seul le professeur peut supprimer ses évaluations

      if (evaluationsError) throw evaluationsError;

      // Suppression de l'étudiant
      const { error: studentError } = await supabase
        .from('students')
        .delete()
        .eq('id', confirmDialog.studentId)
        .eq('teacher_id', user?.id); // S'assurer que seul le professeur peut supprimer ses étudiants

      if (studentError) throw studentError;

      toast.success('Aluno excluído com sucesso');
      fetchClassAndStudents(); // Recharger la liste des étudiants après suppression
    } catch (error) {
      console.error('Error deleting student:', error);
      toast.error('Erro ao excluir aluno');
    } finally {
      setConfirmDialog({ isOpen: false, studentId: '', studentName: '' }); // Fermer la boîte de dialogue
    }
  };

  // Filtrage des étudiants basé sur le terme de recherche
  const filteredStudents = students.filter(student =>
    `${student.first_name} ${student.last_name}`
      .toLowerCase()
      .includes(searchTerm.toLowerCase())
  );

  // Bascule de l'ordre de tri (ascendant/descendant)
  const toggleSort = () => {
    setSortOrder(current => current === 'asc' ? 'desc' : 'asc');
  };

  return (
    <div className="space-y-6 animate-in">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">
            Alunos - {className}
          </h1>
          <p className="mt-1 text-gray-500">
            Gerencie os alunos desta turma
          </p>
        </div>
        <div className="mt-4 sm:mt-0 flex space-x-3">
          <Button
            variant="outline"
            onClick={() => navigate('/classes')}
            // leftIcon={<ArrowLeft className="h-4 w-4" />} // Exemple d'icône de retour
          >
            Voltar
          </Button>
          <Button
            onClick={() => navigate(`/classes/${classId}/students/new`)}
            leftIcon={<Plus className="h-4 w-4" />}
          >
            Novo Aluno
          </Button>
        </div>
      </div>

      <Card>
        <div className="p-4 border-b border-gray-200">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <Input
                type="search"
                placeholder="Buscar alunos..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                leftIcon={<Search className="h-4 w-4" />}
                fullWidth
              />
            </div>
            <Button
              variant="outline"
              onClick={toggleSort}
              leftIcon={<SortAsc className="h-4 w-4" />}
            >
              {sortOrder === 'asc' ? 'A-Z' : 'Z-A'}
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center">
            {/* Icône de chargement */}
            <div className="animate-spin h-8 w-8 border-4 border-primary-500 rounded-full border-t-transparent mx-auto"></div>
            <p className="mt-2 text-gray-500">Carregando alunos...</p>
          </div>
        ) : filteredStudents.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-gray-500">Nenhum aluno encontrado</p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={() => navigate(`/classes/${classId}/students/new`)}
              leftIcon={<Plus className="h-4 w-4" />}
            >
              Adicionar Aluno
            </Button>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {filteredStudents.map((student) => (
              <div
                key={student.id}
                className="p-4 hover:bg-gray-50 flex items-center justify-between"
              >
                <div>
                  <h3 className="text-lg font-medium text-gray-900">
                    {student.first_name} {student.last_name}
                  </h3>
                  {/* Vous pouvez choisir d'afficher les nouvelles informations ici si pertinent pour cette vue.
                      Par exemple:
                      {student.birth_date && <p className="text-sm text-gray-600">Nascimento: {student.birth_date}</p>}
                      {student.guardian_email && <p className="text-sm text-gray-600">Email Responsável: {student.guardian_email}</p>}
                      {student.guardian_phone && <p className="text-sm text-gray-600">Telefone Responsável: {student.guardian_phone}</p>}
                  */}
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate(`/classes/${classId}/students/${student.id}/edit`)}
                    leftIcon={<Edit className="h-4 w-4" />}
                  >
                    Editar
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteClick(
                      student.id,
                      `${student.first_name} ${student.last_name}`
                    )}
                    leftIcon={<Trash2 className="h-4 w-4" />}
                  >
                    Excluir
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title="Excluir Aluno"
        message={`Tem certeza que deseja excluir o aluno "${confirmDialog.studentName}"? Todas as avaliações associadas a este aluno também serão excluídas.`}
        onConfirm={handleConfirmDelete}
        onCancel={() => setConfirmDialog({ isOpen: false, studentId: '', studentName: '' })}
      />

      {/* Mention LGPD ajoutée en bas de page */}
      <p className="text-xs text-gray-500 text-center mt-8">
        Essas informações são gerenciadas em conformidade com a Lei Geral de Proteção de Dados (LGPD).
      </p>
    </div>
  );
};
