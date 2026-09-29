import { tacitDecision, updateReputations, mean, pearson, SIMILARITY_TRACES, peerComparison } from './network-math.mjs';

const text = (root, field, value) => root.querySelectorAll(`[data-value="${field}"]`).forEach(n => { n.textContent = value; });
const signed = (value, digits = 3) => `${value >= 0 ? '+' : '−'}${Math.abs(value).toFixed(digits)}`;

export function setupTacit(root) {
  const slider = root.querySelector('[name="reputation"]');
  let weights = [0.8, 0.8, 0.8];
  let feedback = 'No outcome has been observed in this example.';
  function render() {
    const result = tacitDecision(weights);
    slider.value = Math.round(weights[2] * 100);
    slider.setAttribute('aria-valuetext', weights[2].toFixed(3));
    text(root, 'reputation', weights[2].toFixed(3));
    result.contributions.forEach((c, i) => {
      text(root, `weight-${i}`, weights[i].toFixed(3));
      text(root, `contribution-${i}`, signed(c));
      const bar = root.querySelector(`[data-contribution="${i}"]`);
      // Common signed scale from −0.7 to +0.7; zero is at the midpoint.
      bar.style.width = `${Math.abs(c) / 1.4 * 100}%`;
      bar.style.left = c < 0 ? `${50 + c / 1.4 * 100}%` : '50%';
    });
    text(root, 'score', signed(result.score));
    text(root, 'decision', result.accepted ? 'Accept this proposal' : 'Reject this proposal');
    root.querySelector('[data-decision]').classList.toggle('reject', !result.accepted);
    root.querySelectorAll('[data-feedback]').forEach(button => { button.disabled = !result.accepted; });
    root.dataset.accepted = String(result.accepted);
    text(root, 'feedback', feedback);
    text(root, 'status', result.accepted
      ? 'The weighted log-utility sum is positive. An accepted change can generate observations for every participating predictor. Use the outcome buttons to choose an illustrative verification result; A and B are assumed correct.'
      : 'The weighted log-utility sum is not positive. The proposal is rejected, so it produces no outcome for a reputation update. Try lowering C’s assumed prior reputation.');
  }
  function setPrior(value) {
    weights = [0.8, 0.8, value];
    feedback = 'Assumed prior reputations reset. No outcome has been observed in this example.';
    render();
  }
  slider.addEventListener('input', () => setPrior(Number(slider.value) / 100));
  root.querySelectorAll('[data-prior]').forEach(button => button.addEventListener('click', () => setPrior(Number(button.dataset.prior))));
  root.querySelectorAll('[data-feedback]').forEach(button => button.addEventListener('click', () => {
    const result = tacitDecision(weights);
    if (!result.accepted) return;
    const correct = button.dataset.feedback === 'correct';
    const old = weights[2];
    weights = updateReputations(weights, [true, true, correct], true);
    feedback = `After an accepted change: A and B’s predictions were correct; C’s prediction was ${correct ? 'correct' : 'incorrect'}. C’s reputation moves from ${old.toFixed(3)} to ${weights[2].toFixed(3)}. The bars now assess a subsequent proposal with the same utility votes.`;
    render();
  }));
  render();
  root.querySelector('[data-controls]').hidden = false;
}

export function setupOracle(root, player) {
  const frames = [
    'Start with seven registered rApps. Registry records establish who may participate. This is a schematic workflow with illustrative votes, not a live ledger.',
    'A registered rApp submits proposal P1. The Proposal Contract records it and opens prediction collection.',
    'Three of seven illustrative responses have arrived. In this scenario the configured quorum has not yet been reached.',
    'An early decision attempt is rejected: QuorumNotReached. P1 remains open for collection; the rejected attempt creates no decision record.',
    'Collection is now complete: all seven illustrative responses are recorded, with four supporting and three opposing the proposal. The quorum requirement is satisfied.',
    'The Decision Contract applies the majority policy to these recorded inputs and records an acceptance. The four validator nodes agree on contract execution; their consensus is separate from the rApps’ policy votes.',
    'After the observation period, an outcome record links P1 to the submitted KPI observations. The record makes the sequence auditable; the measurement pipeline still determines whether the observations are correct.'
  ];
  player(root, frames, step => {
    text(root, 'proposal', step >= 1 ? 'P1 recorded' : 'Awaiting P1');
    text(root, 'predictions', step >= 4 ? '7 / 7 recorded' : step >= 2 ? '3 / 7 recorded' : '0 / 7 recorded');
    text(root, 'ledger-decision', step >= 5 ? 'Accept · majority 4–3' : 'No decision recorded');
    text(root, 'outcome', step >= 6 ? 'P1 observations recorded' : 'Awaiting observations');
    text(root, 'guard', step === 3 ? 'Early decision rejected · QuorumNotReached' : 'Workflow checks apply before every state change');
    root.querySelector('[data-guard]').classList.toggle('reject', step === 3);
    root.querySelectorAll('[data-record-step]').forEach(node => {
      const threshold = Number(node.dataset.recordStep);
      node.classList.toggle('recorded', step >= threshold);
      node.classList.toggle('current', step === threshold);
    });
    root.querySelectorAll('[data-ballot]').forEach((node, i) => {
      const received = step >= 4 || (step >= 2 && i < 3);
      node.textContent = received ? (i < 4 ? 'Support' : 'Oppose') : 'Pending';
      node.className = received ? `ballot ${i < 4 ? 'support' : 'oppose'}` : 'ballot';
    });
    root.dataset.decisionRecorded = String(step >= 5);
  });
}

export function setupPecdafs(root, player) {
  let scenario = 'risk';
  let current = 0;
  const frames = [
    'A target cell currently uses setting A. An rApp proposes changing it to setting B. Its current access success rate is 97% in this constructed example.',
    'Separate the comparison cells by the parameter being changed: existing setting A, proposed setting B, and other settings. Exclude the third group from this comparison.',
    'Within A and B, identify peers with similar usage patterns and similar remaining configuration. Exclude the parameter being changed from that configuration comparison. Three peers in each group are shown for readability.',
    'Compare the KPI observations in the selected groups with the target cell. The plot uses the same 85–100% scale for both groups. Switch the scenario to inspect a different proposed-setting cohort.',
    'Report the expected KPI effect to the proposing rApp. It decides whether the tradeoff is acceptable in light of network goals. Detecting a risk does not itself impose a veto.'
  ];
  function draw(step) {
    current = step;
    const values = peerComparison(scenario);
    root.querySelectorAll('[data-peer-group]').forEach(node => {
      node.classList.toggle('selected', step >= 2 && node.dataset.peerGroup !== 'other');
      node.classList.toggle('excluded', step >= 1 && node.dataset.peerGroup === 'other');
    });
    text(root, 'peer-stage', step >= 2 ? 'Similar peers selected within each eligible group' : step >= 1 ? 'Groups separated by configuration setting' : 'Proposal: A → B');
    text(root, 'existing-mean', `${values.existingMean.toFixed(1)}%`);
    text(root, 'proposed-mean', `${values.proposedMean.toFixed(1)}%`);
    text(root, 'proposed-values', values.proposed.map(x => `${x}%`).join(', '));
    const plot = root.querySelector('[data-peer-plot]');
    plot.classList.toggle('pending-plot', step < 3);
    for (const name of ['existing', 'proposed']) {
      const row = root.querySelector(`[data-cohort="${name}"]`);
      row.querySelectorAll('[data-dot]').forEach((dot, i) => {
        dot.style.left = `${(values[name][i] - 85) / 15 * 100}%`;
      });
      const band = row.querySelector('[data-range]');
      band.style.left = `${(Math.min(...values[name]) - 85) / 15 * 100}%`;
      band.style.width = `${(Math.max(...values[name]) - Math.min(...values[name])) / 15 * 100}%`;
    }
    text(root, 'comparison', step < 3 ? 'KPI comparison appears at step 4.' : `Target: 97%. Existing-setting peers average ${values.existingMean.toFixed(1)}%; proposed-setting peers average ${values.proposedMean.toFixed(1)}%. Higher access success is better.`);
    text(root, 'risk-decision', step < 4 ? 'Assessment pending' : values.flagged ? 'Flag possible access degradation' : 'No access degradation flagged in this example');
    root.querySelector('[data-decision]').classList.toggle('reject', step >= 4 && values.flagged);
    root.dataset.flagged = String(step >= 4 && values.flagged);
  }
  player(root, frames, draw);
  root.querySelectorAll('[data-scenario]').forEach(button => button.addEventListener('click', () => {
    scenario = button.dataset.scenario;
    root.querySelectorAll('[data-scenario]').forEach(b => b.setAttribute('aria-pressed', String(b === button)));
    draw(current);
  }));
}

export function setupSimilarity(root) {
  let counter = 'throughput', peer = 'a';
  const NS = 'http://www.w3.org/2000/svg';
  function render() {
    const data = SIMILARITY_TRACES[counter];
    const values = data[peer];
    const r = pearson(data.target, values);
    const name = counter === 'throughput' ? 'Throughput counter' : 'Modulation counter';
    text(root, 'counter-name', name);
    text(root, 'peer-name', `Cell ${peer.toUpperCase()}`);
    text(root, 'correlation', r.toFixed(3));
    text(root, 'target-mean', mean(data.target).toFixed(2));
    text(root, 'peer-mean', mean(values).toFixed(2));
    // Same fixed 0–100 vertical scale in all four views.
    for (const [key, series] of [['target', data.target], ['peer', values]]) {
      const points = series.map((value, i) => `${45 + i * 46},${215 - value * 1.9}`).join(' ');
      root.querySelector(`[data-trace="${key}"]`).setAttribute('points', points);
      const dots = root.querySelector(`[data-points="${key}"]`);
      dots.replaceChildren(...series.map((value, i) => {
        const dot = document.createElementNS(NS, 'circle');
        dot.setAttribute('cx', 45 + i * 46); dot.setAttribute('cy', 215 - value * 1.9); dot.setAttribute('r', 3.5);
        return dot;
      }));
    }
    text(root, 'chart-description', `${name}, target versus cell ${peer.toUpperCase()}. Twelve constructed samples, 0–100 arbitrary units. Pearson correlation ${r.toFixed(3)}. Target mean ${mean(data.target).toFixed(2)}, comparison mean ${mean(values).toFixed(2)}.`);
    text(root, 'status', peer === 'a'
      ? counter === 'throughput'
        ? 'Cell A has exactly the same throughput pattern at a different level: A = 1.8 × target + 10, so r = 1. Its modulation pattern is reversed. One matching counter is not enough to justify similarity across the whole operating environment.'
        : 'Cell A’s modulation pattern moves in the opposite direction: A = 100 − target, so r = −1. The perfect throughput correlation does not carry over to this counter.'
      : 'Cell B follows both target patterns closely, with small deviations. It is the more consistent comparison across these two dimensions. This says nothing by itself about the causal effect of copying its configuration.');
    root.querySelectorAll('[data-counter]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.counter === counter)));
    root.querySelectorAll('[data-peer]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.peer === peer)));
    root.querySelectorAll('[data-correlation]').forEach(cell => {
      const [dimension, candidate] = cell.dataset.correlation.split(':');
      const traces = SIMILARITY_TRACES[dimension];
      cell.textContent = pearson(traces.target, traces[candidate]).toFixed(3);
      cell.classList.toggle('active-correlation', dimension === counter && candidate === peer);
    });
    for (let i = 0; i < data.target.length; i++) {
      text(root, `sample-target-${i}`, String(data.target[i]));
      text(root, `sample-peer-${i}`, values[i].toFixed(1));
    }
    root.dataset.counter = counter; root.dataset.peer = peer;
  }
  root.querySelectorAll('[data-counter]').forEach(b => b.addEventListener('click', () => { counter = b.dataset.counter; render(); }));
  root.querySelectorAll('[data-peer]').forEach(b => b.addEventListener('click', () => { peer = b.dataset.peer; render(); }));
  render();
  root.querySelector('[data-controls]').hidden = false;
}
