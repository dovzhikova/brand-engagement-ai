import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { personasApi } from '../services/api';
import { Plus, Edit2, Trash2, UserCircle } from 'lucide-react';
import type { Persona } from '../types';
import PageHeader from '../components/PageHeader';
import EmptyState from '../components/EmptyState';
import {
  Modal,
  ModalActions,
  useModal,
  SkeletonCard,
  ConfirmDialog,
  useConfirmDialog,
  FormField,
  Input,
  Textarea,
  ButtonSpinner,
  Badge,
} from '../components/ui';

interface PersonaForm {
  name: string;
  description: string;
  toneOfVoice: string;
  goals: string;
  characterTraits: string;
  backgroundStory: string;
  expertiseAreas: string;
  writingGuidelines: string;
  exampleResponses: string;
}

export default function Personas() {
  const queryClient = useQueryClient();
  const [editingPersona, setEditingPersona] = useState<Persona | null>(null);
  const [personaToDelete, setPersonaToDelete] = useState<Persona | null>(null);
  const formModal = useModal();
  const deleteDialog = useConfirmDialog();

  const { data: personas, isLoading } = useQuery({
    queryKey: ['personas'],
    queryFn: () => personasApi.list(),
  });

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<PersonaForm>();

  const createMutation = useMutation({
    mutationFn: (data: Partial<Persona>) => personasApi.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      formModal.close();
      reset();
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Persona> }) =>
      personasApi.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      setEditingPersona(null);
      formModal.close();
      reset();
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => personasApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['personas'] });
      setPersonaToDelete(null);
      deleteDialog.close();
    },
  });

  const handleDeletePersona = (persona: Persona) => {
    setPersonaToDelete(persona);
    deleteDialog.open();
  };

  const confirmDelete = () => {
    if (personaToDelete) {
      deleteMutation.mutate(personaToDelete.id);
    }
  };

  const onSubmit = (data: PersonaForm) => {
    const formatted = {
      name: data.name,
      description: data.description,
      toneOfVoice: data.toneOfVoice,
      goals: data.goals.split('\n').filter(Boolean),
      characterTraits: data.characterTraits.split(',').map((t) => t.trim()).filter(Boolean),
      backgroundStory: data.backgroundStory,
      expertiseAreas: data.expertiseAreas.split(',').map((a) => a.trim()).filter(Boolean),
      writingGuidelines: data.writingGuidelines,
      exampleResponses: data.exampleResponses.split('\n---\n').filter(Boolean),
    };

    if (editingPersona) {
      updateMutation.mutate({ id: editingPersona.id, data: formatted });
    } else {
      createMutation.mutate(formatted);
    }
  };

  const openEditForm = (persona: Persona) => {
    setEditingPersona(persona);
    setValue('name', persona.name);
    setValue('description', persona.description || '');
    setValue('toneOfVoice', persona.toneOfVoice);
    setValue('goals', persona.goals.join('\n'));
    setValue('characterTraits', persona.characterTraits.join(', '));
    setValue('backgroundStory', persona.backgroundStory || '');
    setValue('expertiseAreas', persona.expertiseAreas.join(', '));
    setValue('writingGuidelines', persona.writingGuidelines || '');
    setValue('exampleResponses', persona.exampleResponses.join('\n---\n'));
    formModal.open();
  };

  const openCreateForm = () => {
    reset();
    setEditingPersona(null);
    formModal.open();
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Personas"
        description="Define AI personalities for Reddit engagement"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Personas' }]}
        actions={
          <button onClick={openCreateForm} className="btn btn-primary flex items-center">
            <Plus className="h-4 w-4 mr-2" />
            Create Persona
          </button>
        }
      />

      {/* Persona Form Modal */}
      <Modal
        isOpen={formModal.isOpen}
        onClose={formModal.close}
        title={editingPersona ? 'Edit Persona' : 'Create Persona'}
        size="lg"
      >
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            label="Name"
            htmlFor="persona-name"
            error={errors.name?.message}
            required
          >
            <Input
              {...register('name', { required: 'Name is required' })}
              id="persona-name"
              placeholder="Fitness Enthusiast"
            />
          </FormField>

          <FormField label="Description" htmlFor="persona-description">
            <Input
              {...register('description')}
              id="persona-description"
              placeholder="Brief description"
            />
          </FormField>

          <FormField
            label="Tone of Voice"
            htmlFor="persona-tone"
            error={errors.toneOfVoice?.message}
            required
          >
            <Textarea
              {...register('toneOfVoice', { required: 'Tone of voice is required' })}
              id="persona-tone"
              rows={2}
              placeholder="Casual and encouraging..."
            />
          </FormField>

          <FormField
            label="Goals"
            htmlFor="persona-goals"
            helpText="Enter one goal per line"
          >
            <Textarea
              {...register('goals')}
              id="persona-goals"
              rows={3}
              placeholder="Share genuine experiences&#10;Educate on REHIT benefits"
            />
          </FormField>

          <FormField
            label="Character Traits"
            htmlFor="persona-traits"
            helpText="Separate with commas"
          >
            <Input
              {...register('characterTraits')}
              id="persona-traits"
              placeholder="helpful, curious, data-driven"
            />
          </FormField>

          <FormField label="Background Story" htmlFor="persona-background">
            <Textarea
              {...register('backgroundStory')}
              id="persona-background"
              rows={3}
              placeholder="40-year-old software engineer who..."
            />
          </FormField>

          <FormField
            label="Expertise Areas"
            htmlFor="persona-expertise"
            helpText="Separate with commas"
          >
            <Input
              {...register('expertiseAreas')}
              id="persona-expertise"
              placeholder="REHIT protocol, VO2max tracking"
            />
          </FormField>

          <FormField label="Writing Guidelines" htmlFor="persona-guidelines">
            <Textarea
              {...register('writingGuidelines')}
              id="persona-guidelines"
              rows={2}
              placeholder="DO: Share personal experience. DON'T: Sound promotional"
            />
          </FormField>

          <FormField
            label="Example Responses"
            htmlFor="persona-examples"
            helpText="Separate examples with ---"
          >
            <Textarea
              {...register('exampleResponses')}
              id="persona-examples"
              rows={4}
              placeholder="I was skeptical too when I first heard about...&#10;---&#10;Totally get the Peloton appeal..."
            />
          </FormField>

          <ModalActions>
            <button type="button" onClick={formModal.close} className="btn btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <ButtonSpinner className="mr-2" />
              )}
              {editingPersona ? 'Update' : 'Create'}
            </button>
          </ModalActions>
        </form>
      </Modal>

      {/* Persona Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {isLoading ? (
          <>
            <SkeletonCard />
            <SkeletonCard />
            <SkeletonCard />
          </>
        ) : !Array.isArray(personas?.data) || personas.data.length === 0 ? (
          <div className="col-span-full">
            <EmptyState
              icon={UserCircle}
              title="No personas created"
              description="Define AI personalities to guide how your Reddit engagements are crafted."
              actions={[
                {
                  label: 'Create Persona',
                  onClick: openCreateForm,
                  primary: true,
                },
              ]}
            />
          </div>
        ) : (
          personas.data.map((persona: Persona, index: number) => (
            <div
              key={persona.id}
              className="card p-6 hover:shadow-lg transition-shadow duration-200 animate-slide-up"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100">
                    {persona.name}
                  </h3>
                  {persona.description && (
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                      {persona.description}
                    </p>
                  )}
                </div>
                <div className="flex gap-1">
                  <button
                    onClick={() => openEditForm(persona)}
                    className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                    title="Edit persona"
                  >
                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDeletePersona(persona)}
                    className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    title="Delete persona"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <div className="mt-4 space-y-3">
                <div>
                  <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase">
                    Tone
                  </p>
                  <p className="text-sm text-gray-700 dark:text-gray-300 line-clamp-2">
                    {persona.toneOfVoice}
                  </p>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {persona.characterTraits.slice(0, 4).map((trait) => (
                    <Badge key={trait} variant="gray" size="sm">
                      {trait}
                    </Badge>
                  ))}
                  {persona.characterTraits.length > 4 && (
                    <Badge variant="default" size="sm">
                      +{persona.characterTraits.length - 4}
                    </Badge>
                  )}
                </div>
              </div>
              {persona._count && (
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-4 pt-3 border-t dark:border-gray-700">
                  Used by {persona._count.redditAccounts} account(s)
                </p>
              )}
            </div>
          ))
        )}
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={deleteDialog.isOpen}
        onClose={() => {
          deleteDialog.close();
          setPersonaToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Delete Persona"
        message={`Are you sure you want to delete "${personaToDelete?.name}"? This action cannot be undone.`}
        confirmLabel={deleteMutation.isPending ? 'Deleting...' : 'Delete'}
        variant="danger"
      />
    </div>
  );
}
