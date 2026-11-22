export const isLocalhost = Boolean(
  window.location.hostname === 'localhost' ||
  window.location.hostname === '[::1]' ||
  /^127(?:\.(?:25[0-5]|2[0-4]\d|[01]?\d\d?)){3}$/.exec(window.location.hostname)
);

/** Unregisters service workers left behind by previous app versions. */
export function unregister() {
  if (!('serviceWorker' in navigator)) {
    return;
  }

  navigator.serviceWorker
    .getRegistrations()
    .then((registrations) =>
      Promise.all(
        registrations.map((registration) => registration.unregister())
      )
    )
    .catch((error) => {
      console.error('Error unregistering service workers:', error);
    });
}
