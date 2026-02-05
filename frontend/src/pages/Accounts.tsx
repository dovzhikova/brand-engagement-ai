import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { accountsApi, personasApi } from '../services/api';
import { Plus, Trash2, ExternalLink, Shield, ShieldAlert, Heart, RefreshCw, AlertTriangle, Download, Users } from 'lucide-react';
import type { RedditAccount, Persona } from '../types';
import { exportRedditAccounts } from '../utils/csvExport';
import PageHeader from '../components/PageHeader';
import SearchInput from '../components/SearchInput';
import EmptyState from '../components/EmptyState';
import InfoTooltip from '../components/InfoTooltip';
import { metricExplanations } from '../constants/metricExplanations';
import { SkeletonTable, ConfirmDialog, useConfirmDialog, StatusBadge } from '../components/ui';

// Extended type for account with health/shadowban fields
interface ExtendedRedditAccount extends RedditAccount {
  healthScore?: number | null;
  healthFactors?: Record<string, number> | null;
  shadowbanStatus?: string | null;
  lastShadowbanCheck?: string | null;
  lastHealthCheck?: string | null;
}

export default function Accounts() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [accountToDelete, setAccountToDelete] = useState<ExtendedRedditAccount | null>(null);
  const confirmDialog = useConfirmDialog();

  const { data: accounts, isLoading } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => accountsApi.list(),
  });

  const { data: personas } = useQuery({
    queryKey: ['personas'],
    queryFn: () => personasApi.list(),
  });

  const initOAuthMutation = useMutation({
    mutationFn: () => accountsApi.initOAuth(),
    onSuccess: (data) => {
      window.location.href = data.data.authUrl;
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, personaId }: { id: string; personaId: string | null }) =>
      accountsApi.update(id, { personaId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => accountsApi.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
      setAccountToDelete(null);
    },
  });

  const checkShadowbanMutation = useMutation({
    mutationFn: (id: string) => accountsApi.checkShadowban(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const checkHealthMutation = useMutation({
    mutationFn: (id: string) => accountsApi.getHealth(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['accounts'] });
    },
  });

  const handleDeleteAccount = (account: ExtendedRedditAccount) => {
    setAccountToDelete(account);
    confirmDialog.open();
  };

  const confirmDelete = () => {
    if (accountToDelete) {
      deleteMutation.mutate(accountToDelete.id);
    }
  };

  const getHealthColor = (score: number | null | undefined) => {
    if (score === null || score === undefined) return 'text-surface-400';
    if (score >= 85) return 'text-green-500';
    if (score >= 70) return 'text-green-400';
    if (score >= 50) return 'text-yellow-500';
    if (score >= 30) return 'text-orange-500';
    return 'text-red-500';
  };

  const getShadowbanIcon = (status: string | null | undefined) => {
    switch (status) {
      case 'clear':
        return <span title="No shadowban detected"><Shield className="h-4 w-4 text-green-500" /></span>;
      case 'suspected':
        return <span title="Suspected shadowban"><ShieldAlert className="h-4 w-4 text-yellow-500" /></span>;
      case 'confirmed':
        return <span title="Shadowbanned"><AlertTriangle className="h-4 w-4 text-red-500" /></span>;
      default:
        return <span title="Not checked"><Shield className="h-4 w-4 text-surface-400" /></span>;
    }
  };

  // Safe array accessors
  const personasList = Array.isArray(personas?.data) ? personas.data : [];

  // Filter accounts based on search
  const filteredAccounts = useMemo(() => {
    const accountsList = Array.isArray(accounts?.data) ? accounts.data : [];
    if (!searchTerm.trim()) return accountsList;
    const search = searchTerm.toLowerCase();
    return accountsList.filter((account: ExtendedRedditAccount) =>
      account.username.toLowerCase().includes(search) ||
      account.status.toLowerCase().includes(search)
    );
  }, [accounts?.data, searchTerm]);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Reddit Accounts"
        description="Manage connected Reddit accounts"
        breadcrumbs={[{ label: 'Settings' }, { label: 'Accounts' }]}
        actions={
          <div className="flex items-center gap-2">
            {accounts?.data && accounts.data.length > 0 && (
              <button
                onClick={() => exportRedditAccounts(accounts.data)}
                className="btn btn-secondary flex items-center"
                title="Export to CSV"
              >
                <Download className="h-4 w-4 mr-2" />
                Export
              </button>
            )}
            <button
              onClick={() => initOAuthMutation.mutate()}
              disabled={initOAuthMutation.isPending}
              className="btn btn-primary flex items-center"
            >
              <Plus className="h-4 w-4 mr-2" />
              Connect Account
            </button>
          </div>
        }
      />

      {/* Search */}
      {accounts?.data && accounts.data.length > 0 && (
        <div className="max-w-md">
          <SearchInput
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search accounts..."
          />
          {searchTerm && (
            <p className="mt-2 text-sm text-surface-500 dark:text-surface-400">
              Showing {filteredAccounts.length} of {accounts.data.length} accounts
            </p>
          )}
        </div>
      )}

      <div className="card">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-surface-200 dark:divide-surface-700">
            <thead className="bg-surface-50 dark:bg-surface-900">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  Account
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    Health
                    <InfoTooltip content={metricExplanations.healthScore} iconClassName="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  <div className="flex items-center gap-1">
                    Shadowban
                    <InfoTooltip content={metricExplanations.shadowbanStatus} iconClassName="h-3 w-3" />
                  </div>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  Karma / Age
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  Persona
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-surface-500 dark:text-surface-400 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-surface-800 divide-y divide-surface-200 dark:divide-surface-700">
              {isLoading ? (
                <SkeletonTable rows={5} columns={7} />
              ) : !Array.isArray(accounts?.data) || accounts.data.length === 0 ? (
                <tr>
                  <td colSpan={7}>
                    <EmptyState
                      icon={Users}
                      title="No accounts connected"
                      description="Connect your Reddit accounts to start engaging with your target audience."
                      actions={[
                        {
                          label: 'Connect Account',
                          onClick: () => initOAuthMutation.mutate(),
                          primary: true,
                        },
                      ]}
                    />
                  </td>
                </tr>
              ) : filteredAccounts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-8 text-center text-surface-500 dark:text-surface-400">
                    No accounts match "{searchTerm}"
                  </td>
                </tr>
              ) : (
                filteredAccounts.map((account: ExtendedRedditAccount) => (
                  <tr key={account.id}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div>
                          <p className="text-sm font-medium text-surface-900 dark:text-surface-100">
                            u/{account.username}
                          </p>
                        </div>
                        <a
                          href={`https://reddit.com/u/${account.username}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="ml-2 text-surface-400 hover:text-surface-600 dark:hover:text-surface-300"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={account.status} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1">
                          <Heart className={`h-4 w-4 ${getHealthColor(account.healthScore)}`} />
                          <span className={`text-sm font-medium ${getHealthColor(account.healthScore)}`}>
                            {account.healthScore !== null && account.healthScore !== undefined
                              ? account.healthScore
                              : '—'}
                          </span>
                        </div>
                        <button
                          onClick={() => checkHealthMutation.mutate(account.id)}
                          disabled={checkHealthMutation.isPending}
                          className="text-surface-400 hover:text-primary-600 dark:hover:text-primary-400"
                          title="Refresh health score"
                        >
                          <RefreshCw className={`h-3 w-3 ${checkHealthMutation.isPending ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        {getShadowbanIcon(account.shadowbanStatus)}
                        <span className="text-sm text-surface-600 dark:text-surface-400">
                          {account.shadowbanStatus || 'unchecked'}
                        </span>
                        <button
                          onClick={() => checkShadowbanMutation.mutate(account.id)}
                          disabled={checkShadowbanMutation.isPending}
                          className="text-surface-400 hover:text-primary-600 dark:hover:text-primary-400"
                          title="Check for shadowban"
                        >
                          <RefreshCw className={`h-3 w-3 ${checkShadowbanMutation.isPending ? 'animate-spin' : ''}`} />
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-surface-500 dark:text-surface-400">
                      <div>
                        <span className="font-medium">{account.karma?.toLocaleString() || '—'}</span>
                        <span className="text-surface-400 mx-1">·</span>
                        <span>{account.accountAgeDays ? `${account.accountAgeDays}d` : '—'}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <select
                        value={account.personaId || ''}
                        onChange={(e) =>
                          updateMutation.mutate({
                            id: account.id,
                            personaId: e.target.value || null,
                          })
                        }
                        className="input text-sm py-1"
                      >
                        <option value="">No persona</option>
                        {personasList.map((persona: Persona) => (
                          <option key={persona.id} value={persona.id}>
                            {persona.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right">
                      <button
                        onClick={() => handleDeleteAccount(account)}
                        className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-2 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                        title="Disconnect account"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Health Score Legend */}
      <div className="card p-4">
        <h3 className="text-sm font-medium text-surface-900 dark:text-surface-100 mb-3">Health Score Guide</h3>
        <div className="flex flex-wrap gap-4 text-sm">
          <div className="flex items-center gap-1">
            <Heart className="h-4 w-4 text-green-500" />
            <span className="text-surface-600 dark:text-surface-400">85+ Excellent</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="h-4 w-4 text-green-400" />
            <span className="text-surface-600 dark:text-surface-400">70-84 Good</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="h-4 w-4 text-yellow-500" />
            <span className="text-surface-600 dark:text-surface-400">50-69 Fair</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="h-4 w-4 text-orange-500" />
            <span className="text-surface-600 dark:text-surface-400">30-49 Poor</span>
          </div>
          <div className="flex items-center gap-1">
            <Heart className="h-4 w-4 text-red-500" />
            <span className="text-surface-600 dark:text-surface-400">&lt;30 Critical</span>
          </div>
        </div>
        <p className="text-xs text-surface-500 dark:text-surface-500 mt-2">
          Health score is calculated based on karma, account age, engagement rate, and shadowban risk.
        </p>
      </div>

      {/* Confirm Delete Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        onClose={() => {
          confirmDialog.close();
          setAccountToDelete(null);
        }}
        onConfirm={confirmDelete}
        title="Disconnect Account"
        message={`Are you sure you want to disconnect u/${accountToDelete?.username}? This will remove the account from Brand Engage but won't affect the Reddit account itself.`}
        confirmLabel={deleteMutation.isPending ? 'Disconnecting...' : 'Disconnect'}
        variant="danger"
      />
    </div>
  );
}
