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
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div className="relative bg-white dark:bg-warm-card-dark rounded-2xl shadow-2xl max-w-md w-full p-6 animate-fade-in">
        <h2 className="text-xl font-semibold text-slate-900 dark:text-slate-100 mb-4">
          Create New Brand
        </h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Brand Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-warm-bg-dark text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="My Brand"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Slug
            </label>
            <input
              type="text"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-warm-bg-dark text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary"
              placeholder="my-brand"
              pattern="^[a-z0-9-]+$"
              required
            />
            <p className="mt-1 text-xs text-slate-500">Lowercase letters, numbers, and hyphens only</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              Description (optional)
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full px-3 py-2 border border-gray-200 dark:border-gray-700 rounded-xl bg-white dark:bg-warm-bg-dark text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary/20 focus:border-primary resize-none"
              rows={2}
              placeholder="Brief description of this brand"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 dark:text-red-400">{error}</div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !name || !slug}
              className="btn-primary px-5 py-2 text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
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
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-primary hover:bg-primary/5 rounded-xl transition-colors"
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
          className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-white/50 dark:hover:bg-white/5 rounded-xl transition-colors min-w-[160px]"
          aria-expanded={isOpen}
          aria-haspopup="listbox"
        >
          <Building2 className="h-4 w-4 text-primary" />
          <span className="truncate flex-1 text-left">
            {currentBrand?.name || 'Select Brand'}
          </span>
          <ChevronDown className={`h-4 w-4 text-slate-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </button>

        {isOpen && (
          <div className="absolute top-full left-0 mt-1 w-64 bg-white dark:bg-warm-card-dark rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 py-1 z-50">
            <div className="px-3 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Switch Brand
            </div>

            <div className="max-h-64 overflow-y-auto">
              {brands.map((brand) => (
                <button
                  key={brand.id}
                  onClick={() => handleBrandSelect(brand.id)}
                  className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors"
                  role="option"
                  aria-selected={currentBrand?.id === brand.id}
                >
                  <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                    {brand.logoUrl ? (
                      <img src={brand.logoUrl} alt="" className="w-6 h-6 rounded" />
                    ) : (
                      <Building2 className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate">
                      {brand.name}
                    </div>
                    {brand.role && (
                      <div className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                        {brand.role}
                      </div>
                    )}
                  </div>
                  {currentBrand?.id === brand.id && (
                    <Check className="h-4 w-4 text-primary flex-shrink-0" />
                  )}
                </button>
              ))}
            </div>

            <div className="border-t border-gray-200 dark:border-gray-700 mt-1 pt-1">
              <button
                onClick={() => {
                  setIsOpen(false);
                  setShowCreateModal(true);
                }}
                className="w-full flex items-center gap-3 px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-white/5 transition-colors text-primary"
              >
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center">
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
