import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

// Interface pour les classes, nécessaire pour le sélecteur
interface Class {
  id: string;
  name: string;
}

export const StudentFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { classId, id } = useParams(); // 'id' sera présent en mode édition, classId peut être undefined si on vient du dashboard
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [classes, setClasses] = useState<Class[]>([]); // Nouvel état pour stocker les classes
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    birth_date: '',
    guardian_email: '',
    guardian_phone: '',
    selectedClassId: classId || '' // Initialiser avec classId de l'URL si présent, sinon vide
  });

  const isEditing = !!id; // Détermine si nous sommes en mode édition

  // Effet pour charger les données de l'étudiant si nous sommes en mode édition
  // Ou pour charger les classes si nous sommes en mode création
  useEffect(() => {
    if (isEditing) {
      fetchStudent();
    } else {
      fetchClasses(); // Charger les classes uniquement en mode création
    }
  }, [id, user?.id, isEditing]); // Dépendances: id de l'étudiant, ID de l'utilisateur, et mode édition

  // Fonction pour récupérer les données de l'étudiant existant
  const fetchStudent = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*')
        .eq('id', id)
        .eq('teacher_id', user?.id)
        .single();

      if (error) throw error;
      if (data) {
        setFormData({
          first_name: data.first_name,
          last_name: data.last_name,
          birth_date: data.birth_date ? new Date(data.birth_date).toISOString().split('T')[0] : '',
          guardian_email: data.guardian_email || '',
          guardian_phone: data.guardian_phone || '',
          selectedClassId: data.class_id // Pré-sélectionne la classe de l'étudiant en mode édition
        });
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast.error('Erro ao carregar dados do aluno');
      navigate(`/app/classes/${classId || ''}/students`); // Redirige de manière sécurisée
    }
  };

  // Nouvelle fonction pour récupérer la liste des classes du professeur
  const fetchClasses = async () => {
    if (!user?.id) return;
    try {
      const { data, error } = await supabase
        .from('classes')
        .select('id, name')
        .eq('teacher_id', user.id)
        .order('name', { ascending: true });

      if (error) throw error;
      setClasses(data || []);
      // Si aucune classe n'est pré-sélectionnée et qu'il y en a, sélectionner la première par défaut
      if (!formData.selectedClassId && data && data.length > 0) {
        setFormData(prev => ({ ...prev, selectedClassId: data[0].id }));
      }
    } catch (error) {
      console.error('Error fetching classes:', error);
      toast.error('Erro ao carregar turmas.');
    }
  };

  // Gère les changements dans les champs du formulaire
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Gère la soumission du formulaire (création ou mise à jour)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { first_name, last_name, birth_date, guardian_email, guardian_phone, selectedClassId } = formData;

      // Validation des champs obligatoires (nom, prénom)
      if (!first_name.trim() || !last_name.trim()) {
        toast.error('Nome e Sobrenome são obrigatórios.');
        setLoading(false);
        return;
      }

      // NOUVELLE LOGIQUE : Validation de la sélection de classe en mode création
      if (!isEditing && !selectedClassId) {
        toast.error('Por favor, selecione uma turma para o aluno.');
        setLoading(false);
        return;
      }

      // Objet de données à envoyer à Supabase
      const studentData = {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        birth_date: birth_date || null,
        guardian_email: guardian_email || null,
        guardian_phone: guardian_phone || null,
      };

      if (isEditing) {
        // Logique de mise à jour
        const { error } = await supabase
          .from('students')
          .update({
            ...studentData,
            updated_at: new Date().toISOString(),
            class_id: selectedClassId // Permet de changer la classe en édition
          })
          .eq('id', id)
          .eq('teacher_id', user?.id);

        if (error) throw error;
        toast.success('Aluno atualizado com sucesso');
      } else {
        // Logique de création
        const { error } = await supabase
          .from('students')
          .insert({
            ...studentData,
            class_id: selectedClassId, // Utilise la classe sélectionnée par l'utilisateur
            teacher_id: user?.id,
          });

        if (error) throw error;
        toast.success('Aluno cadastrado com sucesso');
      }

      // Redirige vers la liste des étudiants de la classe sélectionnée
      navigate(`/app/classes/${selectedClassId || classId}/students`);
    } catch (error) {
      console.error('Error saving student:', error);
      toast.error('Erro ao salvar aluno');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">
          {isEditing ? 'Editar Aluno' : 'Novo Aluno'}
        </h1>
        <p className="mt-1 text-gray-500">
          {isEditing
            ? 'Atualize as informações do aluno'
            : 'Preencha as informações para cadastrar um novo aluno'}
        </p>
      </div>

      <Card>
        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          {/* Champs existants */}
          <Input
            label="Nome"
            name="first_name"
            value={formData.first_name}
            onChange={handleChange}
            required
            fullWidth
          />

          <Input
            label="Sobrenome"
            name="last_name"
            value={formData.last_name}
            onChange={handleChange}
            required
            fullWidth
          />

          {/* Sélecteur de classe (uniquement en mode création) */}
          {!isEditing && (
            <div>
              <label htmlFor="selectedClassId" className="block text-sm font-medium text-gray-700 mb-1">
                Turma <span className="text-red-500">*</span>
              </label>
              <select
                id="selectedClassId"
                name="selectedClassId"
                value={formData.selectedClassId}
                onChange={handleChange}
                required // Rendre obligatoire la sélection d'une classe en mode création
                className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-primary-500 focus:border-primary-500 sm:text-sm rounded-md"
              >
                <option value="" disabled>Selecione uma turma</option>
                {classes.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Nouveaux champs facultatifs */}
          <Input
            label="Data de Nascimento (Opcional)"
            type="date"
            name="birth_date"
            value={formData.birth_date}
            onChange={handleChange}
            fullWidth
          />

          <Input
            label="Email do Representante Legal (Opcional)"
            type="email"
            name="guardian_email"
            value={formData.guardian_email}
            onChange={handleChange}
            fullWidth
          />

          <Input
            label="Telefone do Representante Legal (Opcional)"
            type="tel"
            name="guardian_phone"
            value={formData.guardian_phone}
            onChange={handleChange}
            placeholder="(XX) XXXXX-XXXX"
            fullWidth
          />

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/app/classes/${formData.selectedClassId || classId || ''}/students`)} // Retourne à la liste des étudiants de la classe sélectionnée ou à la page des classes
            >
              Cancelar
            </Button>
            <Button type="submit" isLoading={loading}>
              {isEditing ? 'Salvar Alterações' : 'Cadastrar Aluno'}
            </Button>
          </div>
        </form>
      </Card>

      {/* Mention LGPD ajoutée en bas de page */}
      <p className="text-xs text-gray-500 text-center mt-8">
        Essas informações são gerenciadas em conformidade com a Lei Geral de Proteção de Dados (LGPD).
      </p>
    </div>
  );
};
