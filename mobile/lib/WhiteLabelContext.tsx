// Context that loads org branding from Supabase after auth.
// Falls back to BioPrecision defaults when org has no branding or white_label_slug is null.
import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

export interface WhiteLabelTheme {
  brandColor: string;
  orgName: string | null;
  coachName: string;
  isWhiteLabeled: boolean;
}

const DEFAULTS: WhiteLabelTheme = {
  brandColor: '#C96A2B',
  orgName: null,
  coachName: 'Your AI Coach',
  isWhiteLabeled: false,
};

const WhiteLabelContext = createContext<WhiteLabelTheme>(DEFAULTS);

export function WhiteLabelProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<WhiteLabelTheme>(DEFAULTS);

  useEffect(() => {
    async function loadBranding() {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.user) return;

        const { data, error } = await supabase
          .from('profiles')
          .select('organizations(name, white_label_slug, branding)')
          .eq('id', session.user.id)
          .single();

        if (error || !data) return;

        const org = data.organizations as unknown as {
          name: string;
          white_label_slug: string | null;
          branding: { primaryColor?: string; coachName?: string } | null;
        } | null;

        if (!org) return;

        const isWhiteLabeled = org.white_label_slug != null;
        const brandColor = org.branding?.primaryColor ?? DEFAULTS.brandColor;
        const coachName = org.branding?.coachName ?? DEFAULTS.coachName;

        setTheme({
          brandColor,
          orgName: org.name ?? null,
          coachName,
          isWhiteLabeled,
        });
      } catch {
        // Fail silently — BioPrecision defaults remain in place
      }
    }

    loadBranding();

    // Re-load branding when auth state changes (e.g. sign-in after boot)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') loadBranding();
      if (event === 'SIGNED_OUT') setTheme(DEFAULTS);
    });

    return () => subscription.unsubscribe();
  }, []);

  return (
    <WhiteLabelContext.Provider value={theme}>
      {children}
    </WhiteLabelContext.Provider>
  );
}

export function useWhiteLabel(): WhiteLabelTheme {
  return useContext(WhiteLabelContext);
}
