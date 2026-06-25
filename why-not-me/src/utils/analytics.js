/*
 * ============================================================
 * ANALYTICS.JS - Centralized GA4 Event Tracking
 * ============================================================
 * All custom event tracking lives here. Import the helpers
 * you need in each component. GA4 measurement ID is set in
 * index.html via the gtag snippet.
 *
 * EVENTS TRACKED:
 *   Navigation    — nav link clicks, mobile menu, logo
 *   Pages         — SPA route changes (virtual pageviews)
 *   CTAs          — every button/link that leads to action
 *   Donations     — donate clicks, tracker interactions
 *   Dedications   — km selection, form steps, submission, share
 *   Media         — video section views, lightbox opens
 *   Social        — outbound social link clicks
 *   Scroll        — 25/50/75/100% depth milestones
 *   Engagement    — time on page buckets
 * ============================================================
 */

function gtag() {
  if (typeof window !== 'undefined' && window.gtag) {
    window.gtag(...arguments)
  }
}

// ── Core ─────────────────────────────────────────────────────

export function trackEvent(eventName, params = {}) {
  gtag('event', eventName, params)
}

export function trackPageView(path, title) {
  gtag('event', 'page_view', {
    page_path: path,
    page_title: title,
  })
}

// ── Navigation ───────────────────────────────────────────────

export function trackNavClick(label, destination) {
  trackEvent('nav_click', {
    link_text: label,
    link_url: destination,
  })
}

export function trackMobileMenuToggle(isOpen) {
  trackEvent('mobile_menu_toggle', {
    action: isOpen ? 'open' : 'close',
  })
}

// ── CTA Buttons ──────────────────────────────────────────────

export function trackCtaClick(ctaLabel, location, destination) {
  trackEvent('cta_click', {
    cta_label: ctaLabel,
    cta_location: location,
    link_url: destination || '',
  })
}

// ── Donation ─────────────────────────────────────────────────

export function trackDonateClick(location) {
  trackEvent('donate_click', {
    cta_location: location,
    link_url: 'https://nogoingback.nz/nicole-white',
  })
}

export function trackDonationTrackerView(variant) {
  trackEvent('donation_tracker_view', {
    tracker_variant: variant,
  })
}

export function trackDonationSortChange(sortBy) {
  trackEvent('donation_sort_change', {
    sort_method: sortBy,
  })
}

// ── Dedicate a Km ────────────────────────────────────────────

export function trackKmClick(km, status) {
  trackEvent('km_click', {
    km_number: km,
    km_status: status, // 'open', 'claimed', 'finish'
  })
}

export function trackKmHover(km) {
  trackEvent('km_hover', {
    km_number: km,
  })
}

export function trackDedicationFormOpen(km) {
  trackEvent('dedication_form_open', {
    km_number: km,
  })
}

export function trackDedicationFormSubmit(km) {
  trackEvent('dedication_form_submit', {
    km_number: km,
  })
}

export function trackDedicationSuccess(km) {
  trackEvent('dedication_success', {
    km_number: km,
  })
}

export function trackDedicationError(km, errorMessage) {
  trackEvent('dedication_error', {
    km_number: km,
    error_message: errorMessage,
  })
}

export function trackDedicationShare(km, method) {
  trackEvent('dedication_share', {
    km_number: km,
    share_method: method, // 'native_share', 'download', 'facebook_fallback'
  })
}

export function trackDedicationViewModal(km) {
  trackEvent('dedication_view', {
    km_number: km,
  })
}

export function trackSupportMessageSubmit() {
  trackEvent('support_message_submit')
}

export function trackSupportMessageFormOpen() {
  trackEvent('support_message_form_open')
}

// ── Media ────────────────────────────────────────────────────

export function trackLightboxOpen(imageSrc) {
  trackEvent('lightbox_open', {
    image_src: imageSrc,
  })
}

export function trackVideoSectionView(videoId, location) {
  trackEvent('video_section_view', {
    video_id: videoId,
    video_location: location,
  })
}

// ── Social & External Links ──────────────────────────────────

export function trackSocialClick(platform, location) {
  trackEvent('social_click', {
    platform: platform, // 'facebook', 'tiktok', 'youtube', 'email'
    click_location: location, // 'footer', 'connect_section', 'documentary'
  })
}

export function trackExternalLink(url, label, location) {
  trackEvent('external_link_click', {
    link_url: url,
    link_text: label,
    click_location: location,
  })
}

// ── Scroll Depth ─────────────────────────────────────────────

const scrollMilestones = new Set()

export function initScrollTracking() {
  if (typeof window === 'undefined') return

  // Reset milestones on route change
  scrollMilestones.clear()

  const handler = () => {
    const scrollTop = window.scrollY
    const docHeight = document.documentElement.scrollHeight - window.innerHeight
    if (docHeight <= 0) return

    const percent = Math.round((scrollTop / docHeight) * 100)
    const thresholds = [25, 50, 75, 100]

    for (const threshold of thresholds) {
      if (percent >= threshold && !scrollMilestones.has(threshold)) {
        scrollMilestones.add(threshold)
        trackEvent('scroll_depth', {
          depth_percent: threshold,
          page_path: window.location.pathname,
        })
      }
    }
  }

  window.addEventListener('scroll', handler, { passive: true })
  return () => window.removeEventListener('scroll', handler)
}

// ── Live Tracker ─────────────────────────────────────────────

export function trackLiveTrackerView() {
  trackEvent('live_tracker_view')
}

export function trackLiveTrackerMapInteraction(action) {
  trackEvent('live_tracker_interaction', {
    action: action, // 'zoom', 'pan', 'recenter', 'basemap_change'
  })
}

// ── Marathon Page ─────────────────────────────────────────────

export function trackMarathonPhotoClick(photoSrc) {
  trackEvent('marathon_photo_click', {
    image_src: photoSrc,
  })
}

// ── Elevation Explorer (TrailElevationExplorer component) ────

export function trackElevationExplorerInteraction(action) {
  trackEvent('elevation_explorer_interaction', {
    action: action,
  })
}
