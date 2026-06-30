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
 *   Media         — video section views, lightbox opens, photo clicks
 *   Social        — outbound social link clicks
 *   Sponsors      — sponsor logo clicks
 *   Scroll        — 25/50/75/100% depth milestones
 *   Engagement    — time on page buckets (15s, 30s, 60s, 120s, 300s)
 *   Live Tracker  — map interactions, split markers, elevation, data status
 *   Visibility    — tab focus/blur for session quality
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
    km_status: status,
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
    share_method: method,
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

export function trackDedicationFieldFocus(fieldName, km) {
  trackEvent('dedication_field_focus', {
    field_name: fieldName,
    km_number: km,
  })
}

export function trackDedicationAbandon(km, lastField, hadData) {
  trackEvent('dedication_abandon', {
    km_number: km,
    last_field_touched: lastField,
    had_partial_data: hadData,
  })
}

export function trackMapZoomChange(zoomLevel, action) {
  trackEvent('map_zoom_change', {
    zoom_level: zoomLevel,
    action: action,
  })
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

export function trackPhotoClick(imageSrc, location) {
  trackEvent('photo_click', {
    image_src: imageSrc,
    click_location: location,
  })
}

// ── Social & External Links ──────────────────────────────────

export function trackSocialClick(platform, location) {
  trackEvent('social_click', {
    platform: platform,
    click_location: location,
  })
}

export function trackExternalLink(url, label, location) {
  trackEvent('external_link_click', {
    link_url: url,
    link_text: label,
    click_location: location,
  })
}

// ── Sponsor Clicks ───────────────────────────────────────────

export function trackSponsorClick(sponsorName, url) {
  trackEvent('sponsor_click', {
    sponsor_name: sponsorName,
    link_url: url,
  })
}

// ── Scroll Depth ─────────────────────────────────────────────

const scrollMilestones = new Set()

export function initScrollTracking() {
  if (typeof window === 'undefined') return

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

// ── Engagement Time ──────────────────────────────────────────

let engagementTimers = []
const engagementFired = new Set()

export function initEngagementTracking() {
  if (typeof window === 'undefined') return

  // Clear previous timers and milestones on route change
  engagementTimers.forEach(clearTimeout)
  engagementTimers = []
  engagementFired.clear()

  const buckets = [15, 30, 60, 120, 300] // seconds

  buckets.forEach((seconds) => {
    const timer = setTimeout(() => {
      if (!engagementFired.has(seconds)) {
        engagementFired.add(seconds)
        trackEvent('engagement_time', {
          time_seconds: seconds,
          page_path: window.location.pathname,
        })
      }
    }, seconds * 1000)
    engagementTimers.push(timer)
  })

  return () => {
    engagementTimers.forEach(clearTimeout)
    engagementTimers = []
  }
}

// ── Visibility / Tab Focus ───────────────────────────────────

export function trackVisibilityChange(isVisible) {
  trackEvent('visibility_change', {
    action: isVisible ? 'tab_focus' : 'tab_blur',
    page_path: typeof window !== 'undefined' ? window.location.pathname : '',
  })
}

// ── Live Tracker ─────────────────────────────────────────────

export function trackLiveTrackerView() {
  trackEvent('live_tracker_view')
}

export function trackLiveTrackerMapInteraction(action) {
  trackEvent('live_tracker_interaction', {
    action: action,
  })
}

export function trackSplitMarkerClick(km, hasTime) {
  trackEvent('split_marker_click', {
    km_marker: km,
    has_time_data: hasTime,
  })
}

export function trackElevationProfileInteraction(action, distanceKm) {
  trackEvent('elevation_profile_interaction', {
    action: action,
    distance_km: distanceKm != null ? Number(distanceKm).toFixed(1) : null,
  })
}

export function trackTrackerDataStatus(status, ageSeconds) {
  trackEvent('tracker_data_status', {
    status: status,
    data_age_seconds: ageSeconds,
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

// ── Quiz Night ──────────────────────────────────────────────

export function trackQuizPageView(spotsBooked, status) {
  trackEvent('quiz_page_view', {
    spots_booked: spotsBooked,
    booking_status: status,
  })
}

export function trackQuizFieldFocus(fieldName) {
  trackEvent('quiz_field_focus', {
    field_name: fieldName,
  })
}

export function trackQuizMemberFilled(memberIndex, totalFilled) {
  trackEvent('quiz_member_filled', {
    member_index: memberIndex,
    total_filled: totalFilled,
  })
}

export function trackQuizFormSubmit(teamSize) {
  trackEvent('quiz_form_submit', {
    team_size: teamSize,
  })
}

export function trackQuizBookingSuccess(teamSize, teamName) {
  trackEvent('quiz_booking_success', {
    team_size: teamSize,
    has_team_name: !!teamName,
  })
}

export function trackQuizBookingError(errorMessage, teamSize) {
  trackEvent('quiz_booking_error', {
    error_message: errorMessage,
    team_size: teamSize,
  })
}

export function trackQuizSoldOutView() {
  trackEvent('quiz_sold_out_view')
}

export function trackQuizUrgencyView(tier) {
  trackEvent('quiz_urgency_view', {
    urgency_tier: tier,
  })
}

export function trackQuizDocumentaryClick(location) {
  trackEvent('quiz_documentary_click', {
    click_location: location,
  })
}

export function trackQuizDonateClick(location) {
  trackEvent('quiz_donate_click', {
    click_location: location,
  })
}
