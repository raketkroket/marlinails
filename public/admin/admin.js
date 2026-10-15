// Merged with /admin/config.yml (which holds the editable fields).
// Login runs through this site's own /api/auth and /api/callback (GitHub OAuth).
window.CMS.init({
  config: {
    backend: {
      name: 'github',
      repo: 'raketkroket/marlinails',
      branch: 'main',
      base_url: window.location.origin,
      auth_endpoint: 'api/auth',
      auth_scope: 'public_repo',
      commit_messages: {
        update: 'Inhoud bijgewerkt via beheer: {{slug}}',
        uploadMedia: 'Foto geüpload via beheer: {{path}}',
        deleteMedia: 'Foto verwijderd via beheer: {{path}}'
      }
    }
  }
});
