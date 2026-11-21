(() => {
  'use strict';

  const PAWN_COLORS = [
    { id: 'coral', name: 'Coral', hex: '#E87A64' },
    { id: 'yellow', name: 'Buttercup', hex: '#F2C14E' },
    { id: 'teal', name: 'Seafoam', hex: '#4FB3A5' },
    { id: 'blue', name: 'Harbour', hex: '#5B9BD5' },
    { id: 'plum', name: 'Heather', hex: '#9B8EC7' },
  ];

  const CATEGORIES = [
    {
      key: 'terrace',
      label: 'Terrace Cards',
      hint: 'Feature matching & simple ends (+2)',
      iconClass: 'cat-terrace',
      svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M9 20v-6h6v6"/></svg>`,
    },
    {
      key: 'pier',
      label: 'Pier Cards',
      hint: 'Pier scoring & simple pier ends',
      iconClass: 'cat-pier',
      svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 18c2.5 1.5 5 1.5 7.5 0s5-1.5 7.5 0 3.5 1.2 5 .5"/><path d="M4 12h16"/><path d="M7 12v5"/><path d="M12 12v5"/><path d="M17 12v5"/><path d="M4 9l3-3 3 3"/></svg>`,
    },
    {
      key: 'landmark',
      label: 'Landmark Cards',
      hint: 'One landmark max per street',
      iconClass: 'cat-landmark',
      svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 21h8"/><path d="M9 21l1-12h4l1 12"/><path d="M9 9h6"/><path d="M10 9V6a2 2 0 1 1 4 0v3"/><path d="M4 6l2 1"/><path d="M20 6l-2 1"/></svg>`,
    },
    {
      key: 'resident',
      label: 'Resident Cards',
      hint: 'Higher tier if street has sea at both ends',
      iconClass: 'cat-resident',
      svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>`,
    },
    {
      key: 'distinction',
      label: 'Distinctions',
      hint: 'Shared accolades (ties split, rounded down)',
      iconClass: 'cat-distinction',
      optional: true,
      svg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M8.5 12.5 7 21l5-3 5 3-1.5-8.5"/></svg>`,
    },
  ];

  function createPlayer(index) {
    return {
      id: `p${index + 1}`,
      name: `Player ${index + 1}`,
      colorIndex: index % PAWN_COLORS.length,
      scores: {
        terrace: 0,
        pier: 0,
        landmark: 0,
        resident: 0,
        distinction: 0,
      },
      stepSizes: {
        terrace: 1,
        pier: 1,
        landmark: 1,
        resident: 1,
        distinction: 1,
      },
      completedStreets: 0,
    };
  }

  const state = {
    playerCount: 2,
    activeMobileIndex: 0,
    includeDistinctions: true,
    players: Array.from({ length: 5 }, (_, i) => createPlayer(i)),
  };

  // DOM References
  const playerCountContainer = document.getElementById('player-count-buttons');
  const toggleDistinctionsBtn = document.getElementById('toggle-distinctions');
  const resetBtn = document.getElementById('reset-btn');
  const mobileTabsEl = document.getElementById('mobile-player-tabs');
  const playersGridEl = document.getElementById('players-grid');
  const standingsEl = document.getElementById('standings-section');

  function getActivePlayers() {
    return state.players.slice(0, state.playerCount);
  }

  function getPlayerTotal(player) {
    const s = player.scores;
    return (
      (Number(s.terrace) || 0) +
      (Number(s.pier) || 0) +
      (Number(s.landmark) || 0) +
      (Number(s.resident) || 0) +
      (state.includeDistinctions ? Number(s.distinction) || 0 : 0)
    );
  }

  function escapeHtml(str) {
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function getRankedPlayers() {
    const active = getActivePlayers().map((p, idx) => ({
      player: p,
      originalIndex: idx,
      total: getPlayerTotal(p),
      streets: Number(p.completedStreets) || 0,
      resident: Number(p.scores.resident) || 0,
    }));

    active.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.streets !== a.streets) return b.streets - a.streets;
      if (b.resident !== a.resident) return b.resident - a.resident;
      return a.originalIndex - b.originalIndex;
    });

    // Assign competition ranks (1, 1, 3...) when all tiebreakers match
    let currentRank = 1;
    for (let i = 0; i < active.length; i++) {
      if (i > 0) {
        const prev = active[i - 1];
        const curr = active[i];
        const exactTie =
          prev.total === curr.total &&
          prev.streets === curr.streets &&
          prev.resident === curr.resident;
        if (!exactTie) {
          currentRank = i + 1;
        }
      }
      active[i].rank = currentRank;
    }

    return active;
  }

  function renderControls() {
    const buttons = playerCountContainer.querySelectorAll('button[data-count]');
    buttons.forEach((btn) => {
      const count = Number(btn.dataset.count);
      btn.classList.toggle('active', count === state.playerCount);
    });
    toggleDistinctionsBtn.setAttribute('aria-pressed', String(state.includeDistinctions));
  }

  function renderMobileTabs() {
    const active = getActivePlayers();
    if (state.playerCount <= 1) {
      mobileTabsEl.innerHTML = '';
      mobileTabsEl.style.display = 'none';
      return;
    }
    mobileTabsEl.style.display = '';
    mobileTabsEl.innerHTML = active
      .map((player, idx) => {
        const color = PAWN_COLORS[player.colorIndex].hex;
        const total = getPlayerTotal(player);
        const isActive = idx === state.activeMobileIndex;
        return `
          <button
            type="button"
            class="player-tab ${isActive ? 'active' : ''}"
            data-tab-index="${idx}"
            style="--player-color: ${color}"
          >
            <span class="player-tab-left">
              <span class="pawn-dot" style="background: ${color}"></span>
              <span class="player-tab-name">${escapeHtml(player.name || `Player ${idx + 1}`)}</span>
            </span>
            <span class="player-tab-score" data-tab-score="${player.id}">${total}</span>
          </button>
        `;
      })
      .join('');
  }

  function renderPlayerCards() {
    const active = getActivePlayers();
    const ranked = getRankedPlayers();
    const hasAnyPoints = ranked.some((r) => r.total > 0);
    const winnerIds = new Set(
      hasAnyPoints && state.playerCount > 1
        ? ranked.filter((r) => r.rank === 1).map((r) => r.player.id)
        : []
    );

    playersGridEl.setAttribute('data-count', String(state.playerCount));

    playersGridEl.innerHTML = active
      .map((player, idx) => {
        const color = PAWN_COLORS[player.colorIndex];
        const total = getPlayerTotal(player);
        const isHiddenMobile = state.playerCount > 1 && idx !== state.activeMobileIndex;
        const isWinner = winnerIds.has(player.id);

        const visibleCategories = CATEGORIES.filter(
          (c) => !c.optional || state.includeDistinctions
        );

        const rowsHtml = visibleCategories
          .map((cat) => {
            const val = player.scores[cat.key];
            const stepVal = player.stepSizes[cat.key] || 1;
            const pct = (stepVal - 1) / 9;
            return `
              <div class="score-row">
                <div class="score-row-top">
                  <div class="category-info">
                    <div class="category-icon ${cat.iconClass}" aria-hidden="true">${cat.svg}</div>
                    <div class="category-text">
                      <span class="category-name">${cat.label}</span>
                      <span class="category-hint">${cat.hint}</span>
                    </div>
                  </div>
                  <input
                    type="number"
                    inputmode="numeric"
                    class="score-input"
                    data-player-id="${player.id}"
                    data-category="${cat.key}"
                    value="${val}"
                    aria-label="${escapeHtml(player.name)} ${cat.label}"
                  />
                </div>
                <div class="delta-adder">
                  <button type="button" class="delta-btn delta-minus" data-delta-dir="-1" data-player-id="${player.id}" data-category="${cat.key}" aria-label="Subtract from ${cat.label}">&minus;</button>
                  <div class="delta-slider-wrap" style="--pct: ${pct}">
                    <input
                      type="range"
                      min="1"
                      max="10"
                      step="1"
                      class="delta-range"
                      data-delta-range="${player.id}"
                      data-category="${cat.key}"
                      value="${stepVal}"
                      aria-label="Points per tap for ${escapeHtml(player.name)} ${cat.label}"
                    />
                    <div class="delta-track" aria-hidden="true">
                      <div class="delta-fill"></div>
                      <span class="delta-thumb">${stepVal}</span>
                    </div>
                  </div>
                  <button type="button" class="delta-btn delta-plus" data-delta-dir="1" data-player-id="${player.id}" data-category="${cat.key}" aria-label="Add to ${cat.label}">+</button>
                </div>
              </div>
            `;
          })
          .join('');

        return `
          <article
            class="player-card ${isHiddenMobile ? 'hidden-mobile' : ''} ${isWinner ? 'is-winner' : ''}"
            data-player-card="${player.id}"
            style="--player-color: ${color.hex}"
          >
            <header class="player-header">
              <div class="player-identity">
                <button
                  type="button"
                  class="color-cycle-btn"
                  data-cycle-color="${player.id}"
                  style="background: ${color.hex}"
                  title="Pawn color: ${color.name} (click to change)"
                  aria-label="Change pawn color for ${escapeHtml(player.name)}, currently ${color.name}"
                ></button>
                <input
                  type="text"
                  class="player-name-input"
                  data-name-input="${player.id}"
                  value="${escapeHtml(player.name)}"
                  maxlength="24"
                  aria-label="Player ${idx + 1} name"
                />
              </div>
              <div class="player-total-badge">
                <span class="total-label">Total</span>
                <span class="total-value" data-card-total="${player.id}">${total}</span>
              </div>
            </header>

            <div class="score-rows">
              ${rowsHtml}

              ${
                state.playerCount > 1
                  ? `
                <div class="tiebreaker-box">
                  <div class="category-info">
                    <div class="category-icon cat-streets" aria-hidden="true">
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M2 12c2-1.5 4-1.5 6 0"/><path d="M16 12c2-1.5 4-1.5 6 0"/><rect x="8" y="8" width="8" height="8" rx="1.5"/></svg>
                    </div>
                    <div class="category-text">
                      <span class="category-name">Completed Streets</span>
                      <span class="category-hint">Sea at both ends (tiebreaker)</span>
                    </div>
                  </div>
                  <div class="tiebreaker-controls">
                    <button type="button" class="mini-step-btn" data-streets-step="-1" data-player-id="${player.id}" aria-label="Decrease completed streets">&minus;</button>
                    <input
                      type="number"
                      inputmode="numeric"
                      min="0"
                      class="score-input"
                      data-streets-input="${player.id}"
                      value="${player.completedStreets}"
                      aria-label="${escapeHtml(player.name)} completed streets"
                    />
                    <button type="button" class="mini-step-btn" data-streets-step="1" data-player-id="${player.id}" aria-label="Increase completed streets">+</button>
                  </div>
                </div>
              `
                  : ''
              }
            </div>
          </article>
        `;
      })
      .join('');
  }

  function renderStandings() {
    if (state.playerCount === 1) {
      const solo = state.players[0];
      const total = getPlayerTotal(solo);
      const s = solo.scores;
      standingsEl.innerHTML = `
        <div class="standings-header">
          <h2>Solo Summary</h2>
        </div>
        <div class="solo-summary">
          <div class="solo-score-hero">
            <div>
              <div class="total-label">Final Score</div>
              <div style="font-size: 0.85rem; color: var(--ink-muted); margin-top: 0.15rem;">
                ${escapeHtml(solo.name || 'Solo Player')}
              </div>
            </div>
            <div class="solo-hero-value">${total} <span style="font-size: 0.95rem; font-weight: 500; color: var(--ink-muted);">pts</span></div>
          </div>
          <div class="solo-breakdown-pills">
            <span class="solo-pill">Terraces: <strong>${s.terrace}</strong></span>
            <span class="solo-pill">Piers: <strong>${s.pier}</strong></span>
            <span class="solo-pill">Landmarks: <strong>${s.landmark}</strong></span>
            <span class="solo-pill">Residents: <strong>${s.resident}</strong></span>
            ${state.includeDistinctions ? `<span class="solo-pill">Distinctions: <strong>${s.distinction}</strong></span>` : ''}
          </div>
        </div>
      `;
      return;
    }

    const ranked = getRankedPlayers();
    const hasAnyPoints = ranked.some((r) => r.total > 0);
    const winners = ranked.filter((r) => r.rank === 1);

    let bannerText = 'Enter scores above to crown the winner';
    if (hasAnyPoints) {
      if (winners.length > 1) {
        const names = winners.map((w) => escapeHtml(w.player.name)).join(' & ');
        bannerText = `Shared Victory: ${names} (${winners[0].total} pts)`;
      } else {
        const w = winners[0];
        const runnerUp = ranked[1];
        let tieNote = '';
        if (runnerUp && runnerUp.total === w.total) {
          if (w.streets !== runnerUp.streets) {
            tieNote = ` — won on completed streets (${w.streets} vs ${runnerUp.streets})`;
          } else if (w.resident !== runnerUp.resident) {
            tieNote = ` — won on Resident pts (${w.resident} vs ${runnerUp.resident})`;
          }
        }
        bannerText = `Winner: ${escapeHtml(w.player.name)} (${w.total} pts)${tieNote}`;
      }
    }

    const rowsHtml = ranked
      .map((entry) => {
        const p = entry.player;
        const color = PAWN_COLORS[p.colorIndex].hex;
        const s = p.scores;
        const isFirst = hasAnyPoints && entry.rank === 1;
        return `
          <div class="standing-row ${isFirst ? 'rank-1' : ''}">
            <div class="rank-badge">${entry.rank}</div>
            <div class="standing-player">
              <div class="standing-name-row">
                <span class="pawn-dot" style="background: ${color}"></span>
                <span class="standing-name">${escapeHtml(p.name)}</span>
              </div>
              <div class="standing-breakdown">
                <span>Terraces ${s.terrace}</span>
                <span>Piers ${s.pier}</span>
                <span>Landmarks ${s.landmark}</span>
                <span>Residents ${s.resident}</span>
                ${state.includeDistinctions ? `<span>Distinctions ${s.distinction}</span>` : ''}
                <span>Streets ${entry.streets}</span>
              </div>
            </div>
            <div class="standing-score">${entry.total}</div>
          </div>
        `;
      })
      .join('');

    standingsEl.innerHTML = `
      <div class="standings-header">
        <h2>Standings</h2>
        <div class="winner-banner">${bannerText}</div>
      </div>
      <div class="standings-list">${rowsHtml}</div>
    `;
  }

  function updateLiveTotalsAndStandings(playerId) {
    const player = state.players.find((p) => p.id === playerId);
    if (player) {
      const total = getPlayerTotal(player);
      const cardTotalEl = playersGridEl.querySelector(`[data-card-total="${playerId}"]`);
      if (cardTotalEl) cardTotalEl.textContent = String(total);

      const tabScoreEl = mobileTabsEl.querySelector(`[data-tab-score="${playerId}"]`);
      if (tabScoreEl) tabScoreEl.textContent = String(total);
    }

    // Update winner highlight on cards without re-rendering inputs
    const ranked = getRankedPlayers();
    const hasAnyPoints = ranked.some((r) => r.total > 0);
    const winnerIds = new Set(
      hasAnyPoints && state.playerCount > 1
        ? ranked.filter((r) => r.rank === 1).map((r) => r.player.id)
        : []
    );
    playersGridEl.querySelectorAll('.player-card').forEach((card) => {
      card.classList.toggle('is-winner', winnerIds.has(card.dataset.playerCard));
    });

    renderStandings();
  }

  function renderAll() {
    renderControls();
    renderMobileTabs();
    renderPlayerCards();
    renderStandings();
  }

  // Event Listeners
  playerCountContainer.addEventListener('click', (e) => {
    const btn = e.target.closest('button[data-count]');
    if (!btn) return;
    const count = Number(btn.dataset.count);
    if (count >= 1 && count <= 5 && count !== state.playerCount) {
      state.playerCount = count;
      if (state.activeMobileIndex >= count) {
        state.activeMobileIndex = count - 1;
      }
      renderAll();
    }
  });

  toggleDistinctionsBtn.addEventListener('click', () => {
    state.includeDistinctions = !state.includeDistinctions;
    renderAll();
  });

  resetBtn.addEventListener('click', () => {
    const hasScores = getActivePlayers().some(
      (p) => getPlayerTotal(p) !== 0 || p.completedStreets !== 0
    );
    if (hasScores && !window.confirm('Clear all scores and start a new game?')) {
      return;
    }
    state.players.forEach((p) => {
      p.scores = { terrace: 0, pier: 0, landmark: 0, resident: 0, distinction: 0 };
      p.stepSizes = { terrace: 1, pier: 1, landmark: 1, resident: 1, distinction: 1 };
      p.completedStreets = 0;
    });
    renderAll();
  });

  mobileTabsEl.addEventListener('click', (e) => {
    const tab = e.target.closest('button[data-tab-index]');
    if (!tab) return;
    state.activeMobileIndex = Number(tab.dataset.tabIndex);
    renderMobileTabs();
    renderPlayerCards();
  });

  function applyDelta(playerId, category, dir) {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return;

    const amount = Number(player.stepSizes[category]) || 1;
    const nextVal = (Number(player.scores[category]) || 0) + amount * dir;
    player.scores[category] = nextVal;

    const scoreInput = playersGridEl.querySelector(
      `input[data-player-id="${playerId}"][data-category="${category}"]`
    );
    if (scoreInput) scoreInput.value = String(nextVal);

    updateLiveTotalsAndStandings(playerId);
  }

  playersGridEl.addEventListener('click', (e) => {
    const deltaBtn = e.target.closest('button[data-delta-dir]');
    if (deltaBtn) {
      const { playerId, category, deltaDir } = deltaBtn.dataset;
      applyDelta(playerId, category, Number(deltaDir));
      return;
    }

    const streetsBtn = e.target.closest('button[data-streets-step]');
    if (streetsBtn) {
      const { playerId, streetsStep } = streetsBtn.dataset;
      const player = state.players.find((p) => p.id === playerId);
      if (!player) return;
      const nextVal = Math.max(0, (Number(player.completedStreets) || 0) + Number(streetsStep));
      player.completedStreets = nextVal;
      const input = playersGridEl.querySelector(`input[data-streets-input="${playerId}"]`);
      if (input) input.value = String(nextVal);
      updateLiveTotalsAndStandings(playerId);
      return;
    }

    const colorBtn = e.target.closest('button[data-cycle-color]');
    if (colorBtn) {
      const playerId = colorBtn.dataset.cycleColor;
      const player = state.players.find((p) => p.id === playerId);
      if (!player) return;
      player.colorIndex = (player.colorIndex + 1) % PAWN_COLORS.length;
      renderMobileTabs();
      renderPlayerCards();
      renderStandings();
    }
  });

  playersGridEl.addEventListener('input', (e) => {
    const deltaRange = e.target.closest('input[data-delta-range]');
    if (deltaRange) {
      const playerId = deltaRange.dataset.deltaRange;
      const category = deltaRange.dataset.category;
      const player = state.players.find((p) => p.id === playerId);
      if (!player) return;
      const val = Math.min(10, Math.max(1, parseInt(deltaRange.value, 10) || 1));
      player.stepSizes[category] = val;
      const wrap = deltaRange.closest('.delta-slider-wrap');
      if (wrap) {
        wrap.style.setProperty('--pct', String((val - 1) / 9));
        const thumb = wrap.querySelector('.delta-thumb');
        if (thumb) thumb.textContent = String(val);
      }
      return;
    }

    const scoreInput = e.target.closest('input[data-category]');
    if (scoreInput) {
      const { playerId, category } = scoreInput.dataset;
      const player = state.players.find((p) => p.id === playerId);
      if (!player) return;
      const parsed = parseInt(scoreInput.value, 10);
      player.scores[category] = Number.isNaN(parsed) ? 0 : parsed;
      updateLiveTotalsAndStandings(playerId);
      return;
    }

    const streetsInput = e.target.closest('input[data-streets-input]');
    if (streetsInput) {
      const playerId = streetsInput.dataset.streetsInput;
      const player = state.players.find((p) => p.id === playerId);
      if (!player) return;
      const parsed = parseInt(streetsInput.value, 10);
      player.completedStreets = Number.isNaN(parsed) ? 0 : Math.max(0, parsed);
      updateLiveTotalsAndStandings(playerId);
      return;
    }

    const nameInput = e.target.closest('input[data-name-input]');
    if (nameInput) {
      const playerId = nameInput.dataset.nameInput;
      const idx = state.players.findIndex((p) => p.id === playerId);
      if (idx === -1) return;
      state.players[idx].name = nameInput.value;
      const tabNameEl = mobileTabsEl.querySelector(
        `button[data-tab-index="${idx}"] .player-tab-name`
      );
      if (tabNameEl) {
        tabNameEl.textContent = nameInput.value || `Player ${idx + 1}`;
      }
      renderStandings();
    }
  });

  playersGridEl.addEventListener('focusin', (e) => {
    if (e.target.matches('input[type="number"]')) {
      e.target.select();
    }
  });

  // Initial render
  renderAll();
})();
