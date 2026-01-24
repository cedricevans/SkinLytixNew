import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

interface TrackEventParams {
  eventName: string;
  eventCategory: string;
  eventProperties?: Record<string, any>;
}

export const trackEvent = async ({
  eventName,
  eventCategory,
  eventProperties = {},
}: TrackEventParams) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) return; // Only track authenticated users

    await supabase.from('user_events').insert({
      user_id: user.id,
      event_name: eventName,
      event_category: eventCategory,
      event_properties: eventProperties,
      page_url: window.location.pathname,
      referrer: document.referrer,
      user_agent: navigator.userAgent,
    });
  } catch (error) {
    // Silently fail - don't disrupt user experience, but log for debugging
    console.error('Tracking event failed:', error);
  }
};

export const useTracking = (pageName: string) => {
  const location = useLocation();

  useEffect(() => {
    // Auto-track page views
    trackEvent({
      eventName: 'page_viewed',
      eventCategory: 'navigation',
      eventProperties: {
        page_name: pageName,
        path: location.pathname,
      },
    });
  }, [location.pathname, pageName]);

  return { trackEvent };
};

// Pre-defined tracking events for bounce rate optimization
export const trackDemoCTAClicked = (location: string) => {
  trackEvent({
    eventName: 'demo_cta_clicked',
    eventCategory: 'engagement',
    eventProperties: { location }
  });
};

export const trackExitIntentTriggered = (page: string) => {
  trackEvent({
    eventName: 'exit_intent_triggered',
    eventCategory: 'engagement',
    eventProperties: { page }
  });
};

export const trackIgLandingViewed = (referrer: string) => {
  trackEvent({
    eventName: 'ig_landing_viewed',
    eventCategory: 'navigation',
    eventProperties: { referrer }
  });
};
