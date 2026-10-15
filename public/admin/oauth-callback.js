// Completes the Decap CMS login handshake in the GitHub login popup.
// The token is only sent to the admin window on this same origin.
(() => {
  const result = JSON.parse(document.getElementById('oauth-result').textContent);
  const message = `authorization:github:${result.status}:${JSON.stringify(result.content)}`;
  const opener = window.opener;
  if (!opener) {
    document.getElementById('oauth-message').textContent = 'Open het beheer via /admin en log daar in.';
    return;
  }
  window.addEventListener('message', event => {
    if (event.origin !== window.location.origin || event.source !== opener || event.data !== 'authorizing:github') return;
    opener.postMessage(message, window.location.origin);
  });
  opener.postMessage('authorizing:github', window.location.origin);
})();
