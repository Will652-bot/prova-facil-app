import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search, SortAsc } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
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
  // Ajout des nouveaux champs facultatifs
  birth_date?: string; // Date de naissance (format 'YYYY-MM-DD' de PostgreSQL DATE)
  guardian_email?: string; // Email du représentant légal
  guardian_phone?: string; // Téléphone du représentant légal
  class: {
    name: string;
  };
}

export const AllStudentsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  // Effet pour charger tous les étudiants du professeur connecté
  useEffect(() => {
    fetchStudents();
  }, [user, sortOrder]); // Dépendances: utilisateur et ordre de tri

  // Fonction pour récupérer les étudiants
  const fetchStudents = async () => {
    try {
      // La requête select('*', 'class:classes(name)') récupérera toutes les colonnes de la table 'students'
      // y compris les nouvelles, et joindra le nom de la classe associée.
      const { data, error } = await supabase
        .from('students')
        .select(`
          *,
          class:classes(name)
        `)
        .eq('teacher_id', user?.id) // Filtre pour récupérer uniquement les étudiants du professeur connecté
        .order('first_name', { ascending: sortOrder === 'asc' }); // Trie par prénom

      if (error) throw error;
      setStudents(data || []); // Met à jour l'état avec les étudiants récupérés
    } catch (error) {
      console.error('Error fetching students:', error);
      toast.error('Erro ao carregar alunos'); // Affiche une notification d'erreur
    } finally {
      setLoading(false); // Indique que le chargement est terminé
    }
  };

  // Filtrage des étudiants basé sur le terme de recherche
  const filteredStudents = students.filter(student =>
    `${student.first_name} ${student.last_name} ${student.class.name}`
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
          <h1 className="text-3xl font-bold text-gray-900">Todos os Alunos</h1>
          <p className="mt-1 text-gray-500">
            Lista completa de todos os alunos
          </p>
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
            {/* Bouton pour ajouter un élève si la liste est vide (optionnel ici, car il y a déjà un bouton "Novo Aluno" sur StudentsPage) */}
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
                  <p className="text-sm text-gray-500">
                    Turma: {student.class.name}
                  </p>
                  {/* Vous pouvez choisir d'afficher les nouvelles informations ici si pertinent pour cette vue globale.
                      Par exemple, pour un aperçu rapide :
                      {student.birth_date && <p className="text-xs text-gray-500">Nascimento: {student.birth_date}</p>}
                      {student.guardian_email && <p className="text-xs text-gray-500">Email Resp.: {student.guardian_email}</p>}
                      {student.guardian_phone && <p className="text-xs text-gray-500">Tel. Resp.: {student.guardian_phone}</p>}
                  */}
                </div>
                <div>
                  {/* Le bouton "Ver Detalhes" devrait idéalement naviguer vers la page d'édition ou de détails de l'étudiant */}
                  <Button
                    variant="ghost"
                    size="sm"
                    // Assurez-vous que la route est correcte pour naviguer vers la page d'édition de l'étudiant
                    onClick={() => navigate(`/classes/${student.class_id}/students/${student.id}/edit`)}
                  >
                    Ver Detalhes
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Mention LGPD ajoutée en bas de page */}
      <p className="text-xs text-gray-500 text-center mt-8">
        Essas informações são gerenciadas em conformidade com a Lei Geral de Proteção de Dados (LGPD).
      </p>
    </div>
  );
};
