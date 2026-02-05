import { useState, useRef, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Plus, Check, Building2 } from 'lucide-react';
import { useBrandStore } from '../hooks/useBrandStore';
import { brandsApi } from '../services/api';
import type { Brand } from '../types';

interface CreateBrandModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCreated: (brand: Brand) => void;
}

function CreateBrandModal({ isOpen, onClose, onCreated }: CreateBrandModalProps) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Auto-generate slug from name
  useEffect(() => {
    const generatedSlug = name
      .toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim();
    setSlug(generatedSlug);
  }, [name]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsSubmitting(true);

    try {
      const response = await brandsApi.create({ name, slug, description: description || undefined });
      onCreated(response.data);
      setName('');
      setSlug('');
      setDescription('');
      onClose();
    } catch (err: unknown) {
      if (err && typeof err === 'object' && 'response' in err) {
        const error = err as { response?: { data?: { error?: string } } };
        setError(error.response?.data?.error || 'Failed to create brand');
      } else {
        setError('Failed to create brand');
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white dark:bg-surface-800 rounded-2xl shadow-modal max-w-md w-full p-6 animate-scale-in">
        <h2 className="text-xl font-semibold text-surface-900 dark:text-surface-100 mb-4 tracking-tight">
          Create New Brand
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Brand Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="My Brand"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="input"
              placeholder="my-brand"
              pattern="^[a-z0-9-]+$"
              required
            />
            <p className="mt-1 text-xs text-surface-500">Lowercase letters, numbers, and hyphens only</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-surface-700 dark:text-surface-300 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input resize-none"
              rows={2}
              placeholder="Brief description of this brand"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
          )}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-surface-600 dark:text-surface-400 hover:text-surface-800 dark:hover:text-surface-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name || !slug}
              className="btn btn-primary"
            >
              {isSubmitting ? 'Creating...' : 'Create Brand'}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
}

export default function BrandSwitcher() {
  const [isOpen, setIsOpen] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { brands, currentBrand, switchBrand, setBrands } = useBrandStore();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleBrandSelect = (brandId: string) => {
    switchBrand(brandId);
    setIsOpen(false);
    // Reload page to refresh data with new brand context
    window.location.reload();
  };

  const handleBrandCreated = (brand: Brand) => {
    setBrands([...brands, brand]);
    switchBrand(brand.id);
    window.location.reload();
  };

  if (brands.length === 0) {
    return (
      <>
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary-600 dark:text-primary-400 hover:bg-primary-50 dark:hover:bg-primary-900/10 rounded-lg transition-colors"
        >
          <Plus className="h-4 w-4" />
          Create Brand
        </button>
        <CreateBrandModal
          isOpen={showCreateModal}
          onClose={() => setShowCreateModal(false)}
          onCreated={handleBrandCreated}
        />
      </>
    );
  }

  return (
    <>
      <div className="relative" ref={dropdownRef}>
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-surface-700 dark:text-surface-300 hover:bg-surface-100 dark:hover:bg-surface-700 rounded-lg transition-colors min-w-[160px]"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <Building2 className="h-4 w-4 text-primary-500" />
          <span className="truncate flex-1 text-left">
            {currentBrand?.name || 'Select Brand'}
          </span>
          <ChevronDown className={`h-4 w-4 text-surface-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-surface-800 rounded-xl shadow-float border border-surface-200 dark:border-surface-700 py-1 z-50">
            <div className="px-3 py-2 text-[10px] font-semibold text-surface-500 dark:text-surface-400 uppercase tracking-[0.08em]">
              Switch Brand
            </div>

            <div className="max-h-64 overflow-y-auto">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => handleBrandSelect(brand.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors"
                  role="option"
                  aria-selected={currentBrand?.id === brand.id}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center flex-shrink-0">
                    {brand.logoUrl ? (
                      <img src={brand.logoUrl} alt="" className="w-6 h-6 rounded" />
                    ) : (
                      <Building2 className="h-4 w-4 text-primary-500" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-surface-900 dark:text-surface-100 truncate">
                      {brand.name}
                    </div>
                    {brand.role && (
                      <div className="text-xs text-surface-500 dark:text-surface-400 capitalize">
                        {brand.role}
                      </div>
                    )}
                  </div>
                  {currentBrand?.id === brand.id && (
                    <Check className="h-4 w-4 text-primary-500 flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-surface-200 dark:border-surface-700 mt-1 pt-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowCreateModal(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-surface-50 dark:hover:bg-surface-700 transition-colors text-primary-600 dark:text-primary-400"
              >
                <div className="w-8 h-8 rounded-lg bg-primary-50 dark:bg-primary-900/20 flex items-center justify-center">
                  <Plus className="h-4 w-4" />
                </div>
                <span className="text-sm font-medium">Create New Brand</span>
              </button>
            </div>
          </div>
        )}
      </div>

      <CreateBrandModal
        isOpen={showCreateModal}
        onClose={() => setShowCreateModal(false)}
        onCreated={handleBrandCreated}
      />
    </>
  );
}
