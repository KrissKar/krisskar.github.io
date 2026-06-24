async function loadRepos() {
  const list = document.querySelector('.repo-list');

  try {
    const res = await fetch('https://api.github.com/users/krisskar/repos?sort=updated&per_page=100');
    if (!res.ok) throw new Error(`GitHub API error: ${res.status}`);

    const repos = await res.json();

    const html = repos
      .filter(repo => !repo.fork)
      .map(repo => `
        <div class="repo-card">
          <div class="repo-head">
            <h3 class="repo-name">${repo.name}</h3>
            <p class="repo-lang">${repo.language ?? ''}</p>
          </div>
          <p class="repo-desc">${repo.description ?? 'No description yet.'}</p>
          <a href="${repo.html_url}" class="repo-link" target="_blank" rel="noopener">view repo</a>
        </div>`)
      .join('');

    list.innerHTML = html;
  } catch (err) {
    console.error(err);
    list.innerHTML = '<p class="repo-desc">Could not load repos right now.</p>';
  }
}

loadRepos();