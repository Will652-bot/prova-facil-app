import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import toast from 'react-hot-toast';

export const StudentFormPage: React.FC = () => {
  const navigate = useNavigate();
  const { classId, id } = useParams(); // 'id' sera présent en mode édition
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    // Nouveaux champs facultatifs
    birth_date: '', // Initialisé comme chaîne vide pour l'input type="date"
    guardian_email: '',
    guardian_phone: ''
  });

  const isEditing = !!id; // Détermine si nous sommes en mode édition

  // Effet pour charger les données de l'étudiant si nous sommes en mode édition
  useEffect(() => {
    if (isEditing) {
      fetchStudent();
    }
  }, [id, user?.id]); // Dépendances: id de l'étudiant et ID de l'utilisateur

  // Fonction pour récupérer les données de l'étudiant existant
  const fetchStudent = async () => {
    try {
      const { data, error } = await supabase
        .from('students')
        .select('*') // Sélectionne toutes les colonnes, y compris les nouvelles
        .eq('id', id)
        .eq('teacher_id', user?.id) // S'assure que le professeur ne peut éditer que ses propres étudiants
        .single(); // Récupère un seul enregistrement

      if (error) throw error;
      if (data) {
        // Met à jour le formData avec les données récupérées
        setFormData({
          first_name: data.first_name,
          last_name: data.last_name,
          // Assurez-vous de formater la date pour l'input type="date"
          birth_date: data.birth_date ? new Date(data.birth_date).toISOString().split('T')[0] : '',
          guardian_email: data.guardian_email || '', // Utilise une chaîne vide si null
          guardian_phone: data.guardian_phone || ''  // Utilise une chaîne vide si null
        });
      }
    } catch (error) {
      console.error('Error fetching student data:', error);
      toast.error('Erro ao carregar dados do aluno');
      // Redirige en cas d'erreur de chargement (ex: étudiant non trouvé ou non autorisé)
      navigate(`/classes/${classId}/students`);
    }
  };

  // Gère les changements dans les champs du formulaire
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // Gère la soumission du formulaire (création ou mise à jour)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const { first_name, last_name, birth_date, guardian_email, guardian_phone } = formData;

      // Validation des champs obligatoires (nom et prénom)
      if (!first_name.trim() || !last_name.trim()) {
        toast.error('Nome e Sobrenome são obrigatórios.');
        return;
      }

      // Objet de données à envoyer à Supabase
      const studentData = {
        first_name: first_name.trim(),
        last_name: last_name.trim(),
        // Les champs facultatifs sont inclus, s'ils sont vides, ils seront null dans la DB
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
            updated_at: new Date().toISOString(), // Met à jour le timestamp de modification
          })
          .eq('id', id)
          .eq('teacher_id', user?.id); // S'assure que seul le professeur peut modifier ses propres étudiants

        if (error) throw error;
        toast.success('Aluno atualizado com sucesso');
      } else {
        // Logique de création
        const { error } = await supabase
          .from('students')
          .insert({
            ...studentData,
            class_id: classId,
            teacher_id: user?.id, // Associe l'étudiant au professeur connecté
          });

        if (error) throw error;
        toast.success('Aluno cadastrado com sucesso');
      }

      // Redirige vers la liste des étudiants après succès
      navigate(`/classes/${classId}/students`);
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
            name="first_name" // Ajout du nom pour handleChange générique
            value={formData.first_name}
            onChange={handleChange}
            required
            fullWidth
          />

          <Input
            label="Sobrenome"
            name="last_name" // Ajout du nom pour handleChange générique
            value={formData.last_name}
            onChange={handleChange}
            required
            fullWidth
          />

          {/* Nouveaux champs facultatifs */}
          <Input
            label="Data de Nascimento (Opcional)"
            type="date"
            name="birth_date" // Nom de la colonne Supabase
            value={formData.birth_date}
            onChange={handleChange}
            fullWidth
          />

          <Input
            label="Email do Representante Legal (Opcional)"
            type="email"
            name="guardian_email" // Nom de la colonne Supabase
            value={formData.guardian_email}
            onChange={handleChange}
            fullWidth
          />

          <Input
            label="Telefone do Representante Legal (Opcional)"
            type="tel" // Type pour les numéros de téléphone
            name="guardian_phone" // Nom de la colonne Supabase
            value={formData.guardian_phone}
            onChange={handleChange}
            placeholder="(XX) XXXXX-XXXX" // Exemple de format brésilien
            fullWidth
          />

          <div className="flex justify-end space-x-3">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate(`/classes/${classId}/students`)}
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
