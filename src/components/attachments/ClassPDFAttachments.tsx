import React, { useState, useEffect } from 'react';
import { Upload, Eye, Trash2, FileText, AlertCircle, CheckCircle, Lock } from 'lucide-react';
import { Button } from '../ui/Button';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../../contexts/AuthContext';
import toast from 'react-hot-toast';

interface ClassPDFAttachmentsProps {
  classId: string;
  className: string;
}

// L'interface a été simplifiée car le composant ne gère plus les détails d'évaluation
interface ClassAttachmentRecord {
  file_path: string;
}

export const ClassPDFAttachments: React.FC<ClassPDFAttachmentsProps> = ({
  classId,
  className
}) => {
  const { user } = useAuth();
  const [attachment, setAttachment] = useState<ClassAttachmentRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  const isPro = user?.current_plan === 'pro' || user?.pro_subscription_active === true;

  useEffect(() => {
    fetchAttachment();
  }, [classId, user?.id]);

  const fetchAttachment = async () => {
    try {
      setLoading(true);
      // Récupérer la classe et son file_storage_id
      const { data, error } = await supabase
        .from('classes')
        .select('file_storage_id')
        .eq('id', classId)
        .maybeSingle();

      if (error) throw error;

      if (data?.file_storage_id) {
        // Si un ID de fichier est trouvé, on le stocke
        setAttachment({ file_path: data.file_storage_id });
      } else {
        setAttachment(null);
      }
    } catch (error) {
      console.error('Error fetching class attachment:', error);
      toast.error('Erro ao carregar anexo da turma');
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    if (!isPro) {
      toast.error('Funcionalidade exclusiva para usuários do plano Pro');
      return;
    }

    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.includes('pdf')) {
      toast.error('Apenas arquivos PDF são permitidos');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error('O arquivo deve ter no máximo 10MB');
      return;
    }

    if (!user?.id) {
      toast.error('Usuário não autenticado');
      return;
    }

    try {
      setUploading(true);
      setUploadProgress(0);

      // Chemin de stockage unique
      const sanitizedFileName = file.name.replace(/[^a-zA-Z0-9.]/g, '_');
      const filePath = `${user.id}/${classId}/${sanitizedFileName}`;

      // Supprimer l'ancien fichier s'il existe
      if (attachment) {
        const { error: removeError } = await supabase.storage
          .from('classes-attachments') // <--- UTILISE LE BON BUCKET
          .remove([attachment.file_path]);
        if (removeError) {
          console.error('Erreur lors de la suppression de l\'ancien fichier:', removeError);
          // Ne pas bloquer l'upload si la suppression échoue
        }
      }

      // Upload du nouveau fichier
      const { data: storageData, error: storageError } = await supabase.storage
        .from('classes-attachments') // <--- UTILISE LE BON BUCKET
        .upload(filePath, file, {
          upsert: true,
          contentType: 'application/pdf',
          onUploadProgress: (progress) => {
            const percent = Math.round((progress.loaded / progress.total) * 100);
            setUploadProgress(percent);
          }
        });
      if (storageError) throw storageError;

      // Mise à jour de la table "classes"
      const { error: dbError } = await supabase
        .from('classes') // <--- CIBLE LA BONNE TABLE
        .update({ file_storage_id: storageData.path }) // <--- MET À JOUR LA BONNE COLONNE
        .eq('id', classId);

      if (dbError) throw dbError;

      setAttachment({ file_path: storageData.path });
      toast.success('Arquivo anexado com sucesso');
        
      event.target.value = ''; // Réinitialise l'input
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error('Erro ao anexar arquivo: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  const handlePreviewFile = async () => {
    if (!attachment) return;

    try {
      const { data, error } = await supabase.storage
        .from('classes-attachments') // <--- UTILISE LE BON BUCKET
        .createSignedUrl(attachment.file_path, 60);

      if (error) throw error;

      if (data?.signedUrl) {
        window.open(data.signedUrl, '_blank');
      } else {
        toast.error('Não foi possível gerar o link para visualização');
      }
    } catch (error) {
      console.error('Error previewing file:', error);
      toast.error('Erro ao visualizar arquivo');
    }
  };

  const handleDeleteFile = async () => {
    if (!attachment) return;

    const confirmed = window.confirm(
      'Tem certeza que deseja remover este anexo? Esta ação não pode ser desfeita.'
    );

    if (!confirmed) {
      return;
    }

    try {
      setLoading(true);

      // Supprimer le fichier du bucket
      const { error: storageError } = await supabase.storage
        .from('classes-attachments') // <--- UTILISE LE BON BUCKET
        .remove([attachment.file_path]);

      if (storageError) {
        throw storageError;
      }

      // Mettre à jour la table "classes" pour retirer le lien
      const { error: dbError } = await supabase
        .from('classes') // <--- CIBLE LA BONNE TABLE
        .update({ file_storage_id: null }) // <--- MET LE CHAMP À NULL
        .eq('id', classId);

      if (dbError) {
        throw dbError;
      }

      setAttachment(null);
      toast.success('Anexo removido com sucesso');
    } catch (error: any) {
      console.error('Error deleting file:', error);
      toast.error('Erro ao remover anexo: ' + (error.message || 'Erro desconhecido'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
        <div className="flex items-center justify-center">
          <div className="animate-spin h-5 w-5 border-2 border-primary-500 rounded-full border-t-transparent mr-2"></div>
          <p className="text-sm text-gray-600">Carregando anexos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-sm font-medium text-gray-700 flex items-center">
          <FileText className="h-4 w-4 mr-2" />
          Anexo PDF para {className}
        </h4>
        
        {attachment && (
          <div className="flex items-center text-xs text-green-600">
            <CheckCircle className="h-3 w-3 mr-1" />
            Arquivo anexado
          </div>
        )}
      </div>

      {/* File Upload Section */}
      <div className="space-y-3">
        <div className="relative">
          {isPro ? (
            <label className={`
              flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium 
              border border-gray-300 rounded-md shadow-sm transition-colors
              ${uploading || loading 
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                : 'bg-white text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
              }
            `}>
              <Upload className="mr-2 h-4 w-4" />
              <span>
                {uploading ? 'Enviando...' : attachment ? 'Substituir PDF' : 'Selecionar PDF'}
              </span>
              <input
                type="file"
                accept=".pdf"
                onChange={handleFileUpload}
                disabled={uploading || loading}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
              />
            </label>
          ) : (
            <div className="flex items-center justify-center w-full h-10 px-4 py-2 text-sm font-medium border border-gray-300 rounded-md shadow-sm bg-gray-100 text-gray-500">
              <Lock className="mr-2 h-4 w-4" />
              <span>Funcionalidade exclusiva para usuários do plano Pro</span>
            </div>
          )}
        </div>

        {/* Upload Progress */}
        {uploading && uploadProgress > 0 && (
          <div className="space-y-1">
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div 
                className="bg-primary-600 h-2 rounded-full transition-all duration-300" 
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 text-center">
              Enviando: {uploadProgress}%
            </p>
          </div>
        )}
      </div>

      {/* Attachment Display */}
      {attachment && (
        <div className="bg-white border border-gray-200 rounded-md p-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between">
            <div className="flex items-center space-x-3 mb-3 sm:mb-0">
              <FileText className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-gray-900">
                  {attachment.file_path.split('/').pop()}
                </p>
                <p className="text-xs text-gray-500">
                  Adicionado em: {new Date(attachment.created_at).toLocaleDateString('pt-BR')}
                </p>
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              <Button
                variant="ghost"
                size="sm"
                onClick={handlePreviewFile}
                leftIcon={<Eye className="h-4 w-4" />}
                disabled={uploading}
              >
                Visualizar
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleDeleteFile}
                leftIcon={<Trash2 className="h-4 w-4" />}
                disabled={uploading}
                className="text-red-600 hover:text-red-700"
              >
                Remover
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* No Attachment State */}
      {!attachment && !uploading && (
        <div className="text-center py-2">
          <AlertCircle className="h-8 w-8 text-gray-400 mx-auto mb-2" />
          <p className="text-sm text-gray-500">
            Nenhum arquivo PDF anexado para esta turma
          </p>
          {!isPro && (
            <p className="text-xs text-blue-600 mt-1">
              Faça upgrade para o plano Pro para anexar arquivos
            </p>
          )}
        </div>
      )}
    </div>
  );
};
