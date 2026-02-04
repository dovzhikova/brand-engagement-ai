import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { OrgRole } from '../types';

export interface OrganizationInfo {
  id: string;
  name: string;
  slug: string;
  role: OrgRole;
  _count?: {
    members: number;
    redditAccounts: number;
    personas: number;
    keywords: number;
    engagementItems: number;
  };
}

interface OrganizationState {
  currentOrganization: OrganizationInfo | null;
  organizations: OrganizationInfo[];
  isLoading: boolean;
  setOrganizations: (organizations: OrganizationInfo[]) => void;
  switchOrganization: (orgId: string) => void;
  setCurrentOrganization: (org: OrganizationInfo | null) => void;
  clearOrganizations: () => void;
}

export const useOrganizationStore = create<OrganizationState>()(
  persist(
    (set, get) => ({
      currentOrganization: null,
      organizations: [],
      isLoading: false,

      setOrganizations: (organizations) => {
        const current = get().currentOrganization;

        // If no current org set, or current org not in new list, select first one
        let newCurrent = current;
        if (!current || !organizations.find(o => o.id === current.id)) {
          newCurrent = organizations[0] || null;
        } else {
          // Update current org with new data
          newCurrent = organizations.find(o => o.id === current.id) || null;
        }

        // Update localStorage for API interceptor
        if (newCurrent) {
          localStorage.setItem('currentOrganizationId', newCurrent.id);
        } else {
          localStorage.removeItem('currentOrganizationId');
        }

        set({
          organizations,
          currentOrganization: newCurrent,
        });
      },

      switchOrganization: (orgId) => {
        const org = get().organizations.find(o => o.id === orgId);
        if (org) {
          localStorage.setItem('currentOrganizationId', orgId);
          set({ currentOrganization: org });
        }
      },

      setCurrentOrganization: (org) => {
        if (org) {
          localStorage.setItem('currentOrganizationId', org.id);
        } else {
          localStorage.removeItem('currentOrganizationId');
        }
        set({ currentOrganization: org });
      },

      clearOrganizations: () => {
        localStorage.removeItem('currentOrganizationId');
        set({
          currentOrganization: null,
          organizations: [],
        });
      },
    }),
    {
      name: 'organization-storage',
      partialize: (state) => ({
        currentOrganization: state.currentOrganization,
        organizations: state.organizations,
      }),
    }
  )
);
