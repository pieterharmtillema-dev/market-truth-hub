// Chrome Extension sync utility for Trade Detector

interface UserCredentials {
  api_key?: string | null;
  user_id?: string | null;
  role?: string | null;
}

/**
 * Syncs user credentials with the Trade Detector Chrome extension.
 * Sends SET_API_DETAILS when user is logged in, CLEAR_API_DETAILS when logged out.
 */
export function syncExtensionWithUser(user: UserCredentials | null) {
  if (user && user.api_key && user.user_id) {
    // Set global variables for extension access
    window.__USER_API_KEY = user.api_key;
    window.__USER_ID = user.user_id;
    window.__USER_ROLE = user.role || 'user';

    window.postMessage(
      {
        source: "TD_WEB",
        type: "SET_API_DETAILS",
        apiKey: user.api_key,
        userId: user.user_id,
        role: user.role || 'user',
      },
      "*"
    );
    console.log("[TD WEB] Sent SET_API_DETAILS to extension with role:", user.role || 'user');
  } else {
    // Clear global variables
    window.__USER_API_KEY = undefined;
    window.__USER_ID = undefined;
    window.__USER_ROLE = undefined;
    window.__TD_LAST_PLATFORM = undefined;
    window.__TD_LAST_ACTIVE = undefined;

    window.postMessage(
      {
        source: "TD_WEB",
        type: "CLEAR_API_DETAILS",
      },
      "*"
    );
    console.log("[TD WEB] Sent CLEAR_API_DETAILS to extension");
  }
}

/**
 * Sends activity state to the extension
 */
export function sendActivityState(activity: {
  platform?: string | null;
  is_active?: boolean;
  last_activity_at?: string | null;
}) {
  window.__TD_LAST_PLATFORM = activity.platform || undefined;
  window.__TD_LAST_ACTIVE = activity.is_active;

  window.postMessage(
    {
      source: "TD_WEB",
      type: "TD_ACTIVITY_STATE",
      platform: activity.platform,
      isActive: activity.is_active,
      lastActivity: activity.last_activity_at,
    },
    "*"
  );
}

/**
 * Sends page change notification to extension
 */
export function sendPageChange(pathname: string, userId?: string) {
  window.postMessage(
    {
      source: "TD_WEB",
      type: "TD_PAGE_CHANGE",
      path: pathname,
      userId: userId || window.__USER_ID,
    },
    "*"
  );
}

/**
 * Sends site closed notification to extension
 */
export function sendSiteClosed() {
  window.postMessage(
    {
      source: "TD_WEB",
      type: "TD_SITE_CLOSED",
    },
    "*"
  );
}

/**
 * Sends logout notification to extension
 */
export function sendLogout() {
  window.postMessage(
    {
      source: "TD_WEB",
      type: "TD_LOGOUT",
    },
    "*"
  );
}
