import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export interface ProviderOption {
  id: string;
  name: string;
  category: string;
  rating: number;
  phone: string | null;
  contact_email: string | null;
}

export function useProviders(categoryFilter?: string) {
  const [providers, setProviders] = useState<ProviderOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetch = async () => {
      setLoading(true);
      let query = supabase
        .from('providers' as any)
        .select('id, name, category, rating, phone, contact_email')
        .eq('is_active', true)
        .order('name');

      if (categoryFilter && categoryFilter !== 'general') {
        // Map maintenance_category to provider_category
        const mapped = categoryFilter === 'construction' ? 'structural' : categoryFilter;
        query = query.or(`category.eq.${mapped},category.eq.general`);
      }

      const { data } = await query;
      setProviders((data as any[]) || []);
      setLoading(false);
    };
    fetch();
  }, [categoryFilter]);

  return { providers, loading };
}
