import { useState, useEffect, useCallback, KeyboardEvent } from 'react';
import { X } from 'lucide-react';
import { useBrandStore } from '../hooks/useBrandStore';
import { brandsApi } from '../services/api';
import PageHeader from '../components/PageHeader';
import { Alert, Input, Textarea, ButtonSpinner, LoadingSpinner } from '../components/ui';
import type { Brand } from '../types';

interface TagInputProps {
  label: string;
  helpText?: string;
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
}

function TagInput({ label, helpText, values, onChange, placeholder }: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  const addTag = () => {
    const trimmed = inputValue.trim();
    if (trimmed && !values.includes(trimmed)) {
      onChange([...values, trimmed]);
      setInputValue('');
    }
  };

  const removeTag = (index: number) => {
    onChange(values.filter((_, i) => i !== index));
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addTag();
    }
  };

  return (
    <div className="form-field">
      <label className="form-label">{label}</label>
      {helpText && (
        <p className="text-xs text-slate-500 dark:text-slate-400 mb-1.5">{helpText}</p>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="input flex-1"
        />
        <button
          type="button"
          onClick={addTag}
          disabled={!inputValue.trim()}
          className="btn btn-secondary px-4"
        >
          Add
        </button>
      </div>
      {values.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {values.map((value, index) => (
            <span
              key={index}
              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300"
            >
              {value}
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="text-brand-500 hover:text-brand-700 dark:hover:text-brand-200"
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default function BrandSettings() {
  const { currentBrand, setBrands } = useBrandStore();
  const [brand, setBrand] = useState<Brand | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Form state
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [website, setWebsite] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [toneOfVoice, setToneOfVoice] = useState('');
  const [messagingStrategy, setMessagingStrategy] = useState('');
  const [contentGuidelines, setContentGuidelines] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [productDescription, setProductDescription] = useState('');
  const [goals, setGoals] = useState<string[]>([]);
  const [brandValues, setBrandValues] = useState<string[]>([]);
  const [keyDifferentiators, setKeyDifferentiators] = useState<string[]>([]);

  const populateForm = useCallback((b: Brand) => {
    setName(b.name);
    setSlug(b.slug);
    setDescription(b.description || '');
    setWebsite(b.website || '');
    setLogoUrl(b.logoUrl || '');
    setToneOfVoice(b.toneOfVoice || '');
    setMessagingStrategy(b.messagingStrategy || '');
    setContentGuidelines(b.contentGuidelines || '');
    setTargetAudience(b.targetAudience || '');
    setProductDescription(b.productDescription || '');
    setGoals(b.goals || []);
    setBrandValues(b.brandValues || []);
    setKeyDifferentiators(b.keyDifferentiators || []);
  }, []);

  useEffect(() => {
    if (!currentBrand) return;

    const fetchBrand = async () => {
      try {
        setLoading(true);
        const response = await brandsApi.get(currentBrand.id);
        const data = response.data as Brand;
        setBrand(data);
        populateForm(data);
      } catch {
        setMessage({ type: 'error', text: 'Failed to load brand settings' });
      } finally {
        setLoading(false);
      }
    };

    fetchBrand();
  }, [currentBrand, populateForm]);

  const handleSave = async () => {
    if (!brand) return;

    try {
      setSaving(true);
      setMessage(null);

      await brandsApi.update(brand.id, {
        name,
        slug,
        description: description || undefined,
        website: website || undefined,
        logoUrl: logoUrl || undefined,
        toneOfVoice: toneOfVoice || undefined,
        messagingStrategy: messagingStrategy || undefined,
        contentGuidelines: contentGuidelines || undefined,
        targetAudience: targetAudience || undefined,
        productDescription: productDescription || undefined,
        goals,
        brandValues,
        keyDifferentiators,
      });

      // Refresh brand list so the store is up to date
      const listResponse = await brandsApi.list();
      setBrands(listResponse.data);

      setMessage({ type: 'success', text: 'Brand settings saved successfully' });
    } catch (err: any) {
      const errorMessage = err.response?.data?.message || 'Failed to save brand settings';
      setMessage({ type: 'error', text: errorMessage });
    } finally {
      setSaving(false);
    }
  };

  if (!currentBrand) {
    return (
      <div className="text-center py-12 text-slate-500 dark:text-slate-400">
        No brand selected. Please select a brand from the sidebar.
      </div>
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="max-w-3xl">
      <PageHeader
        title="Brand Settings"
        description="Configure your brand parameters to inform AI-generated content."
      />

      {message && (
        <div className="mb-6">
          <Alert variant={message.type}>{message.text}</Alert>
        </div>
      )}

      <div className="space-y-8">
        {/* Identity Section */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Identity
          </h2>
          <div className="space-y-4">
            <Input
              label="Brand Name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
            <Input
              label="Slug"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              helpText="URL-friendly identifier (lowercase, hyphens only)"
              required
            />
            <Input
              label="Website"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              placeholder="https://example.com"
            />
            <Textarea
              label="Description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Brief description of the brand..."
              rows={2}
            />
            <Input
              label="Logo URL"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://example.com/logo.png"
            />
          </div>
        </section>

        {/* Voice & Strategy Section */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Voice & Strategy
          </h2>
          <div className="space-y-4">
            <Textarea
              label="Tone of Voice"
              value={toneOfVoice}
              onChange={(e) => setToneOfVoice(e.target.value)}
              placeholder="e.g. Professional yet approachable, warm, knowledgeable..."
              helpText="Describes how the brand should sound in written content"
              rows={3}
            />
            <Textarea
              label="Messaging Strategy"
              value={messagingStrategy}
              onChange={(e) => setMessagingStrategy(e.target.value)}
              placeholder="e.g. Value-first approach, soft CTA, educational content..."
              helpText="Overall approach to messaging and calls-to-action"
              rows={3}
            />
            <Textarea
              label="Content Guidelines"
              value={contentGuidelines}
              onChange={(e) => setContentGuidelines(e.target.value)}
              placeholder="e.g. Always mention free trial, avoid aggressive sales language..."
              helpText="Specific dos and don'ts for content creation"
              rows={3}
            />
          </div>
        </section>

        {/* Audience & Goals Section */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Audience & Goals
          </h2>
          <div className="space-y-4">
            <Input
              label="Target Audience"
              value={targetAudience}
              onChange={(e) => setTargetAudience(e.target.value)}
              placeholder="e.g. Fitness enthusiasts ages 25-45, small business owners..."
            />
            <TagInput
              label="Goals"
              values={goals}
              onChange={setGoals}
              placeholder="e.g. Increase brand awareness"
              helpText="What the brand aims to achieve through engagement"
            />
            <TagInput
              label="Brand Values"
              values={brandValues}
              onChange={setBrandValues}
              placeholder="e.g. Innovation"
              helpText="Core values that define the brand"
            />
            <TagInput
              label="Key Differentiators"
              values={keyDifferentiators}
              onChange={setKeyDifferentiators}
              placeholder="e.g. Only AI-powered solution in market"
              helpText="What sets the brand apart from competitors"
            />
          </div>
        </section>

        {/* Product Section */}
        <section className="card p-6">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">
            Product
          </h2>
          <div className="space-y-4">
            <Textarea
              label="Product Description"
              value={productDescription}
              onChange={(e) => setProductDescription(e.target.value)}
              placeholder="Describe what the brand/product is and what it does..."
              helpText="Used by AI to understand and accurately represent the product"
              rows={4}
            />
          </div>
        </section>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving || !name || !slug}
            className="btn btn-primary px-8"
          >
            {saving ? <ButtonSpinner /> : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}
