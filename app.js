(() => {
  'use strict';

  const PAWN_COLORS = [
    { id: 'coral', name: 'Coral', hex: '#E87A64' },
    { id: 'yellow', name: 'Buttercup', hex: '#F2C14E' },
    { id: 'teal', name: 'Seafoam', hex: '#4FB3A5' },
    { id: 'blue', name: 'Harbour', hex: '#5B9BD5' },
    { id: 'plum', name: 'Heather', hex: '#9B8EC7' },
  ];

  const ICONS = {
    street: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h14V9.5"/><path d="M9 20v-6h6v6"/></svg>`,
    resident: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="4"/><path d="M5 20a7 7 0 0 1 14 0"/></svg>`,
    distinction: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="5"/><path d="M8.5 12.5 7 21l5-3 5 3-1.5-8.5"/></svg>`,
  };

  function createDefaultStreets() {
    return [
      { score: 0, step: 1 },
      { score: 0, step: 1 },
      { score: 0, step: 1 },
    ];
  }

  function createPlayer(index) {
    return {
      id: `p${index + 1}`,
      name: `Player ${index + 1}`,
      colorIndex: index % PAWN_COLORS.length,
      streets: createDefaultStreets(),
      resident: { score: 0, step: 1 },
      distinction: { score: 0, step: 1 },
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

  function getStreetsTotal(player) {
    return player.streets.reduce((sum, st) => sum + (Number(st.score) || 0), 0);
  }

  function getPlayerTotal(player) {
    return (
      getStreetsTotal(player) +
      (Number(player.resident.score) || 0) +
      (state.includeDistinctions ? Number(player.distinction.score) || 0 : 0)
    );
  }

  function getRowEntry(player, rowKey) {
    if (rowKey.startsWith('street-')) {
      const idx = parseInt(rowKey.slice(7), 10);
      return player.streets[idx] || null;
    }
    if (rowKey === 'resident') return player.resident;
    if (rowKey === 'distinction') return player.distinction;
    return null;
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
      streetsScore: getStreetsTotal(p),
      completedStreets: Number(p.completedStreets) || 0,
      resident: Number(p.resident.score) || 0,
      distinction: Number(p.distinction.score) || 0,
    }));

    active.sort((a, b) => {
      if (b.total !== a.total) return b.total - a.total;
      if (b.completedStreets !== a.completedStreets) return b.completedStreets - a.completedStreets;
      if (b.resident !== a.resident) return b.resident - a.resident;
      return a.originalIndex - b.originalIndex;
    });

    let currentRank = 1;
    for (let i = 0; i < active.length; i++) {
      if (i > 0) {
        const prev = active[i - 1];
        const curr = active[i];
        const exactTie =
          prev.total === curr.total &&
          prev.completedStreets === curr.completedStreets &&
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

  function renderScoreRow({ player, rowKey, label, hint, iconClass, svg, entry, removeIndex }) {
    const stepVal = entry.step || 1;
    const pct = (stepVal - 1) / 9;
    const removeBtn =
      removeIndex !== undefined
        ? `<button type="button" class="remove-street-btn" data-remove-street="${removeIndex}" data-player-id="${player.id}" title="Remove ${label}" aria-label="Remove ${label}">&times;</button>`
        : '';

    return `
      <div class="score-row">
        <div class="score-row-top">
          <div class="category-info">
            <div class="category-icon ${iconClass}" aria-hidden="true">${svg}</div>
            <div class="category-text">
              <span class="category-name">${label}${removeBtn}</span>
              <span class="category-hint">${hint}</span>
            </div>
          </div>
          <div class="score-input-wrap">
            <input
              type="number"
              inputmode="numeric"
              class="score-input"
              data-player-id="${player.id}"
              data-row-key="${rowKey}"
              value="${entry.score}"
              aria-label="${escapeHtml(player.name)} ${label}"
            />
          </div>
        </div>
        <div class="delta-adder">
          <button type="button" class="delta-btn delta-minus" data-delta-dir="-1" data-player-id="${player.id}" data-row-key="${rowKey}" aria-label="Subtract from ${label}">&minus;</button>
          <div class="delta-slider-wrap" style="--pct: ${pct}">
            <input
              type="range"
              min="1"
              max="10"
              step="1"
              class="delta-range"
              data-delta-range="${player.id}"
              data-row-key="${rowKey}"
              value="${stepVal}"
              aria-label="Points per tap for ${escapeHtml(player.name)} ${label}"
            />
            <div class="delta-track" aria-hidden="true">
              <div class="delta-fill"></div>
              <span class="delta-thumb">${stepVal}</span>
            </div>
          </div>
          <button type="button" class="delta-btn delta-plus" data-delta-dir="1" data-player-id="${player.id}" data-row-key="${rowKey}" aria-label="Add to ${label}">+</button>
        </div>
      </div>
    `;
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

        const streetRowsHtml = player.streets
          .map((streetEntry, sIdx) =>
            renderScoreRow({
              player,
              rowKey: `street-${sIdx}`,
              label: `Street ${sIdx + 1}`,
              hint: 'Terraces, piers & landmark in this street',
              iconClass: 'cat-terrace',
              svg: ICONS.street,
              entry: streetEntry,
              removeIndex: sIdx >= 3 ? sIdx : undefined,
            })
          )
          .join('');

        const addStreetHtml = `
          <button type="button" class="add-street-btn" data-add-street="${player.id}">
            + Add Street
          </button>
        `;

        const residentRowHtml = renderScoreRow({
          player,
          rowKey: 'resident',
          label: 'Resident Cards',
          hint: 'Higher tier if street has sea at both ends',
          iconClass: 'cat-resident',
          svg: ICONS.resident,
          entry: player.resident,
        });

        const distinctionRowHtml = state.includeDistinctions
          ? renderScoreRow({
              player,
              rowKey: 'distinction',
              label: 'Distinctions',
              hint: 'Shared accolades (ties split, rounded down)',
              iconClass: 'cat-distinction',
              svg: ICONS.distinction,
              entry: player.distinction,
            })
          : '';

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
              ${streetRowsHtml}
              ${addStreetHtml}
              ${residentRowHtml}
              ${distinctionRowHtml}

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
      const streetsScore = getStreetsTotal(solo);
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
            <span class="solo-pill">Streets (${solo.streets.length}): <strong>${streetsScore}</strong></span>
            <span class="solo-pill">Residents: <strong>${solo.resident.score}</strong></span>
            ${state.includeDistinctions ? `<span class="solo-pill">Distinctions: <strong>${solo.distinction.score}</strong></span>` : ''}
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
          if (w.completedStreets !== runnerUp.completedStreets) {
            tieNote = ` — won on completed streets (${w.completedStreets} vs ${runnerUp.completedStreets})`;
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
                <span>Streets ${entry.streetsScore}</span>
                <span>Residents ${entry.resident}</span>
                ${state.includeDistinctions ? `<span>Distinctions ${entry.distinction}</span>` : ''}
                <span>Completed ${entry.completedStreets}</span>
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
      (p) => getPlayerTotal(p) !== 0 || p.completedStreets !== 0 || p.streets.length > 3
    );
    if (hasScores && !window.confirm('Clear all scores and start a new game?')) {
      return;
    }
    state.players.forEach((p) => {
      p.streets = createDefaultStreets();
      p.resident = { score: 0, step: 1 };
      p.distinction = { score: 0, step: 1 };
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

  function spawnFloatPop(container, text, variantClass, replaceExisting) {
    if (!container) return;
    if (replaceExisting) {
      container.querySelectorAll('.float-pop').forEach((el) => el.remove());
    }
    const pop = document.createElement('span');
    pop.className = `float-pop ${variantClass}`;
    pop.textContent = text;
    pop.setAttribute('aria-hidden', 'true');
    pop.addEventListener('animationend', () => pop.remove(), { once: true });
    container.appendChild(pop);
  }

  function applyDelta(playerId, rowKey, dir) {
    const player = state.players.find((p) => p.id === playerId);
    if (!player) return;
    const entry = getRowEntry(player, rowKey);
    if (!entry) return;

    const amount = Number(entry.step) || 1;
    const nextVal = (Number(entry.score) || 0) + amount * dir;
    entry.score = nextVal;

    const scoreInput = playersGridEl.querySelector(
      `input[data-player-id="${playerId}"][data-row-key="${rowKey}"]`
    );
    if (scoreInput) {
      scoreInput.value = String(nextVal);
      const label = dir > 0 ? `+${amount}` : `−${amount}`;
      const variant = dir > 0 ? 'float-pop--plus' : 'float-pop--minus';
      spawnFloatPop(scoreInput.closest('.score-input-wrap'), label, variant, false);
    }

    updateLiveTotalsAndStandings(playerId);
  }

  playersGridEl.addEventListener('click', (e) => {
    const deltaBtn = e.target.closest('button[data-delta-dir]');
    if (deltaBtn) {
      const { playerId, rowKey, deltaDir } = deltaBtn.dataset;
      applyDelta(playerId, rowKey, Number(deltaDir));
      return;
    }

    const addStreetBtn = e.target.closest('button[data-add-street]');
    if (addStreetBtn) {
      const playerId = addStreetBtn.dataset.addStreet;
      const player = state.players.find((p) => p.id === playerId);
      if (!player) return;
      player.streets.push({ score: 0, step: 1 });
      renderPlayerCards();
      renderStandings();
      return;
    }

    const removeStreetBtn = e.target.closest('button[data-remove-street]');
    if (removeStreetBtn) {
      const playerId = removeStreetBtn.dataset.playerId;
      const idx = Number(removeStreetBtn.dataset.removeStreet);
      const player = state.players.find((p) => p.id === playerId);
      if (!player || idx < 3 || idx >= player.streets.length) return;
      player.streets.splice(idx, 1);
      renderMobileTabs();
      renderPlayerCards();
      renderStandings();
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
      const rowKey = deltaRange.dataset.rowKey;
      const player = state.players.find((p) => p.id === playerId);
      if (!player) return;
      const entry = getRowEntry(player, rowKey);
      if (!entry) return;

      const prevVal = entry.step || 1;
      const val = Math.min(10, Math.max(1, parseInt(deltaRange.value, 10) || 1));
      entry.step = val;

      const wrap = deltaRange.closest('.delta-slider-wrap');
      if (wrap) {
        wrap.style.setProperty('--pct', String((val - 1) / 9));
        const thumb = wrap.querySelector('.delta-thumb');
        if (thumb) thumb.textContent = String(val);
        if (val !== prevVal) {
          spawnFloatPop(wrap.querySelector('.delta-track'), String(val), 'float-pop--slider', true);
        }
      }
      return;
    }

    const scoreInput = e.target.closest('input[data-row-key]');
    if (scoreInput) {
      const { playerId, rowKey } = scoreInput.dataset;
      const player = state.players.find((p) => p.id === playerId);
      if (!player) return;
      const entry = getRowEntry(player, rowKey);
      if (!entry) return;
      const parsed = parseInt(scoreInput.value, 10);
      entry.score = Number.isNaN(parsed) ? 0 : parsed;
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
