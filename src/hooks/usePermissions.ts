import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

// All available permissions in the system
export type Permission =
  | 'canView'
  | 'canEdit'
  | 'canDelete'
  | 'canRequest'
  | 'canManageUsers'
  | 'canManageBuildings'
  | 'canManageFees'
  | 'canManageAnnouncements'
  | 'canViewReports'
  | 'canManageDocuments'
  | 'canManageSettings'
  | 'canViewAnnouncements'
  | 'canViewDocuments'
  | 'canViewOwnFees'
  | 'canEditOwnEstimates';

export function usePermissions() {
  const { roles } = useAuth();
  const [permissions, setPermissions] = useState<Permission[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (roles.length === 0) {
      setPermissions([]);
      setIsLoading(false);
      return;
    }

    const fetchPermissions = async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('role_permissions')
        .select('permission')
        .in('role', roles);

      if (error) {
        console.error('Error fetching permissions:', error);
        setPermissions([]);
      } else {
        // Deduplicate permissions across multiple roles
        const unique = [...new Set((data || []).map(r => r.permission as Permission))];
        setPermissions(unique);
      }
      setIsLoading(false);
    };

    fetchPermissions();
  }, [roles]);

  const hasPermission = (permission: Permission): boolean =>
    permissions.includes(permission);

  const hasAnyPermission = (...perms: Permission[]): boolean =>
    perms.some(p => permissions.includes(p));

  const hasAllPermissions = (...perms: Permission[]): boolean =>
    perms.every(p => permissions.includes(p));

  return {
    permissions,
    isLoading,
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
  };
}
