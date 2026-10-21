import { ibExample, redistribute, allocationExample, ensembleVariances, ENSEMBLE_EXAMPLE, maskSquares } from './explainer-math.mjs';
import { setupTacit, setupOracle, setupPecdafs, setupSimilarity } from './network-explainers.mjs';

const fixed = (x, places = 3) => x.toFixed(places);
const setText = (root, field, value) => {
  root.querySelectorAll(`[data-value="${field}"]`).forEach(node => { node.textContent = value; });
};

function setupIB(root) {
  const dimension = root.querySelector('[name="nuisance"]');
  const noise = root.querySelector('[name="encoder-noise"]');
  const button = root.querySelector('[data-action="reduce"]');
  function render() {
    const d = Number(dimension.value);
    const delta = Number(noise.value) / 100;
    const result = ibExample(d, delta);
    setText(root, 'dimension', `${d} bits`);
    setText(root, 'noise', `${noise.value}%`);
    dimension.setAttribute('aria-valuetext', `${d} irrelevant source bits`);
    noise.setAttribute('aria-valuetext', `${noise.value} percent flip probability`);
    for (const field of ['fullRate', 'reducedRate', 'relevance', 'removed']) {
      setText(root, field, fixed(result[field]));
    }
    setText(root, 'states', `${result.fullStates} → 2`);
    root.querySelector('[data-meter="fullRate"]').style.width = `${result.fullRate / 9 * 100}%`;
    root.querySelector('[data-meter="reducedRate"]').style.width = `${result.reducedRate / 9 * 100}%`;
    root.querySelectorAll('[data-meter="relevance"]').forEach(bar => {
      bar.style.width = `${result.relevance * 100}%`;
    });
    const strip = root.querySelector('[data-bits]');
    strip.replaceChildren();
    for (let i = 0; i <= d; i += 1) {
      const bit = document.createElement('span');
      bit.className = i === 0 ? 'bit' : 'bit nuisance';
      bit.textContent = i === 0 ? 'Z' : 'W';
      strip.append(bit);
    }
    const reduced = root.dataset.reduced === 'true';
    const prefix = reduced
      ? 'The reduced encoder no longer copies the nuisance bits.'
      : 'The full representation copies both the encoded signal and the nuisance bits.';
    setText(root, 'status', `${prefix} Source information falls from ${fixed(result.fullRate)} to ${fixed(result.reducedRate)} bits; information about the target stays at ${fixed(result.relevance)} bits. These are mutual information values, not prediction accuracies.`);
    root.dataset.removed = String(d);
  }
  dimension.addEventListener('input', render);
  noise.addEventListener('input', render);
  button.addEventListener('click', () => {
    const reduced = root.dataset.reduced !== 'true';
    root.dataset.reduced = String(reduced);
    button.setAttribute('aria-pressed', String(reduced));
    button.textContent = reduced ? 'Show full source again' : 'Show the reduction';
    render();
  });
  render();
  root.querySelector('[data-controls]').hidden = false;
}

function setupPlayer(root, frames, draw) {
  let step = 0;
  let timer = null;
  const play = root.querySelector('[data-action="play"]');
  const next = root.querySelector('[data-action="next"]');
  const reset = root.querySelector('[data-action="reset"]');
  const progress = root.querySelector('[data-progress]');
  function stop() {
    if (timer !== null) window.clearInterval(timer);
    timer = null;
    play.textContent = step === frames.length - 1 ? 'Replay explanation' : 'Play explanation';
    play.setAttribute('aria-pressed', 'false');
  }
  function render() {
    draw(step);
    setText(root, 'status', frames[step]);
    setText(root, 'step', `${step + 1} / ${frames.length}`);
    root.dataset.step = String(step);
    next.disabled = step === frames.length - 1;
    progress.replaceChildren(...frames.map((_, i) => {
      const marker = document.createElement('span');
      if (i <= step) marker.className = 'done';
      return marker;
    }));
    if (step === frames.length - 1) stop();
    else if (timer === null) play.textContent = 'Play explanation';
  }
  play.addEventListener('click', () => {
    if (timer !== null) { stop(); return; }
    if (step === frames.length - 1) { step = 0; render(); }
    play.textContent = 'Pause';
    play.setAttribute('aria-pressed', 'true');
    timer = window.setInterval(() => { step += 1; render(); }, 2600);
  });
  next.addEventListener('click', () => {
    stop();
    if (step < frames.length - 1) step += 1;
    render();
  });
  reset.addEventListener('click', () => { stop(); step = 0; render(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  window.addEventListener('pagehide', stop);
  render();
  root.querySelector('[data-controls]').hidden = false;
}

function setupHierarchical(root) {
  const initial = [0.5, 0.5];
  const firstRoot = redistribute(initial, 0, true);
  const firstLocal = redistribute(initial, 0, true);
  const secondRoot = redistribute(firstRoot, 0, false);
  const secondLocal = redistribute(firstLocal, 1, false);
  const frames = [
    'Start with equal allocations. Every selector assigns half its traffic to each child. The update rate is 0.1. These are the two rounds in Table 2 of the paper.',
    'Round 1 selects Root → Selector 1 → a. Selector 2 is inactive. A selected path is fixed here so that you can follow the arithmetic; the mechanism normally samples children using their allocation weights.',
    'The root observes success and changes its allocations to 0.550 and 0.450. Selector 1 can see that its own incoming share increased. The root sends it no separate outcome message.',
    'Because it was selected, Selector 1 decodes the increase as 1 (success). It applies the same update locally: a receives 0.550 and b receives 0.450. Selector 2 does not decode its decrease or update its children.',
    'Round 2 selects Root → Selector 1 → b. The allocations left by round 1 are the starting point. Selector 2 remains inactive.',
    'The root observes failure. Selector 1’s incoming share falls from 0.550 to 0.495; Selector 2’s rises to 0.505. The sign means failure only for the selected child.',
    'Selector 1 decodes its decrease as 0 (failure). It reduces selected child b from 0.450 to 0.405 and redistributes the difference to a, now 0.595. Inactive Selector 2 leaves c and d at 0.500, even though its own incoming share increased.'
  ];
  setupPlayer(root, frames, step => {
    const top = step >= 5 ? secondRoot : step >= 2 ? firstRoot : initial;
    const local = step >= 6 ? secondLocal : step >= 3 ? firstLocal : initial;
    setText(root, 'v1', fixed(top[0]));
    setText(root, 'v2', fixed(top[1]));
    setText(root, 'a', fixed(local[0]));
    setText(root, 'b', fixed(local[1]));
    setText(root, 'root-outcome', step >= 5 ? 'Observes failure: 0' : step >= 2 && step < 4 ? 'Observes success: 1' : 'Awaiting the outcome');
    const decoded = step === 3 || step === 6;
    setText(root, 'signal', step === 3 ? 'Decoded: 1' : step === 6 ? 'Decoded: 0' : step >= 1 ? 'Selected' : 'Not yet selected');
    root.querySelector('[data-signal]').classList.toggle('decoded', decoded);
    root.querySelector('[data-branch="v1"]').classList.toggle('active', step >= 1);
    root.querySelector('[data-tree]').dataset.active = String(step >= 1);
    root.querySelector('[data-leaf="a"]').classList.toggle('selected', step >= 1 && step < 4);
    root.querySelector('[data-leaf="b"]').classList.toggle('selected', step >= 4);
    setText(root, 'path', step === 0 ? 'No path selected' : step < 4 ? 'Round 1 · Root → Selector 1 → a' : 'Round 2 · Root → Selector 1 → b');
    root.dataset.rootWeights = top.join(',');
    root.dataset.localWeights = local.join(',');
  });
}

function setupAllocation(root) {
  const slider = root.querySelector('[name="categories"]');
  function render() {
    const k = Number(slider.value);
    const result = allocationExample(k);
    setText(root, 'categories', `${k} categories`);
    slider.setAttribute('aria-valuetext', `${k} categories`);
    setText(root, 'loss', fixed(result.loss, 8));
    setText(root, 'power', `${fixed(100 * result.power, 2)}%`);
    setText(root, 'smallest', `${result.smallest}`);
    setText(root, 'allocation-check', result.allocationPass ? 'Pass: loss ≤ 0.002' : 'Fail: loss > 0.002');
    setText(root, 'verification-check', result.verificationPass ? 'Pass: power ≥ 80%' : 'Fail: power < 80%');
    for (const [field, pass] of [['loss', result.allocationPass], ['power', result.verificationPass]]) {
      const node = root.querySelector(`[data-value="${field}"]`);
      node.classList.toggle('pass', pass);
      node.classList.toggle('fail', !pass);
    }
    root.querySelector('[data-position]').style.left = `${(k - 0.5) / 48 * 100}%`;
    const grid = root.querySelector('[data-pools]');
    grid.replaceChildren(...result.sizes.map((size, index) => {
      const pool = document.createElement('div');
      pool.className = size < 3 ? 'pool small' : 'pool';
      const label = document.createElement('span');
      label.className = 'pool-label';
      label.textContent = `#${index + 1} · ${size}`;
      const members = document.createElement('span');
      members.className = 'pool-members';
      for (let i = 0; i < size; i += 1) members.append(document.createElement('i'));
      pool.append(label, members);
      return pool;
    }));
    root.querySelectorAll('[data-preset]').forEach(button => {
      button.setAttribute('aria-pressed', String(Number(button.dataset.preset) === k));
    });
    let status;
    if (!result.allocationPass) {
      status = 'Too few categories. Even the best allocation design cannot meet the loss tolerance at this category count.';
    } else if (!result.verificationPass) {
      status = 'Too many categories. At least one pool has fewer than three agents, so no design can meet the every-category detection target.';
    } else {
      status = 'Both targets are met by this balanced design. The theorem guarantees that a suitable design exists at this count; it does not say every partition works.';
    }
    setText(root, 'status', `${k} categories, ${result.smallest} agents in the smallest pool. ${status}`);
    root.dataset.feasible = String(result.allocationPass && result.verificationPass);
  }
  slider.addEventListener('input', render);
  root.querySelectorAll('[data-preset]').forEach(button => {
    button.addEventListener('click', () => { slider.value = button.dataset.preset; render(); });
  });
  render();
  root.querySelector('[data-controls]').hidden = false;
}

function setupCamino(root) {
  const frames = [
    'An application proposes increasing a cell’s maximum target block error rate (BLER). CAMINO assesses the proposed action before it is applied. This sequence follows the qualitative example in Figure 7 of the published paper.',
    'Predictions based on comparable cells are favourable overall. CAMINO also considers which KPIs matter to the operator and how their predicted values compare with the relevant targets.',
    'Traffic context adds a small favourable contribution in this example. A favourable prediction still has to be considered alongside the other available evidence.',
    'Anomalous weather adds a substantial adverse contribution to accessibility. The contextual effects change the assessment of the same proposed action.',
    'The combined assessment rejects the proposal. The application remains available to make other proposals. The diagram follows the reported qualitative decision; it does not reproduce the scoring model or simulate a live network.'
  ];
  setupPlayer(root, frames, step => {
    root.querySelectorAll('[data-reveal-step]').forEach(card => {
      const cardStep = Number(card.dataset.revealStep);
      card.classList.toggle('future', cardStep > step);
      card.classList.toggle('current', cardStep === step);
    });
    setText(root, 'decision', step === 4 ? 'Decision: reject this proposal' : 'Decision pending: assessing the proposal');
    root.querySelector('[data-decision]').classList.toggle('reject', step === 4);
  });
}

const SVG_NS = 'http://www.w3.org/2000/svg';

function setupEnsembleDemo(root) {
  const stage = root.querySelector('[data-stage]');
  const mask = root.querySelector('[data-mask]');
  const buttons = Object.fromEntries(['start', 'yes', 'no', 'again']
    .map(action => [action, root.querySelector(`[data-action="${action}"]`)]));
  const headings = { intro: 'Just look at the circles', set: 'Just look at the circles', mask: 'Just look at the circles',
    probe: 'Was this circle in the set?', reveal: 'What you saw' };
  const statusText = {
    intro: 'Press “Show the circles”. Twelve circles appear for one second, followed by a mask for half a second. Just look at them.',
    set: 'Look at the circles.',
    mask: 'Masked.',
    probe: 'Was this circle in the set? Choose yes or no.'
  };
  let timers = [];
  let run = 0;
  function clearTimers() { timers.forEach(timer => window.clearTimeout(timer)); timers = []; }
  const stageLabels = {
    intro: 'A blank area with a small cross at its centre.',
    set: 'Twelve dark circles in four sizes.',
    mask: 'A mask of overlapping grey squares.',
    probe: 'A single dark circle, the test circle.',
    reveal: 'The twelve dark circles in four sizes. On the right, the blue test circle, whose diameter is the average of the twelve.'
  };
  function show(phase, status = statusText[phase]) {
    stage.setAttribute('data-phase', phase);
    stage.setAttribute('aria-label', stageLabels[phase]);
    root.dataset.phase = phase;
    setText(root, 'demo-heading', headings[phase]);
    buttons.start.hidden = phase !== 'intro';
    buttons.yes.hidden = phase !== 'probe';
    buttons.no.hidden = phase !== 'probe';
    buttons.again.hidden = phase !== 'reveal';
    setText(root, 'status', status);
  }
  function drawMask() {
    run += 1;
    mask.replaceChildren(...maskSquares(run).map(({ x, y, side, grey, angle }) => {
      const square = document.createElementNS(SVG_NS, 'rect');
      square.setAttribute('x', (x - side / 2).toFixed(1));
      square.setAttribute('y', (y - side / 2).toFixed(1));
      square.setAttribute('width', side.toFixed(1));
      square.setAttribute('height', side.toFixed(1));
      square.setAttribute('fill', `rgb(${grey},${grey},${grey})`);
      square.setAttribute('transform', `rotate(${angle.toFixed(1)} ${x.toFixed(1)} ${y.toFixed(1)})`);
      return square;
    }));
  }
  function start() {
    clearTimers();
    drawMask();
    show('set');
    timers.push(window.setTimeout(() => show('mask'), 1000));
    timers.push(window.setTimeout(() => { show('probe'); buttons.yes.focus(); }, 1500));
  }
  function answer(saidYes) {
    clearTimers();
    show('reveal', saidYes
      ? 'You said yes. It was not in the set. Its diameter is exactly the average of the twelve, and no circle of that size was shown.'
      : 'You said no, and you were right. It was not in the set, even though its diameter is exactly the average of the twelve.');
    buttons.again.focus();
  }
  buttons.start.addEventListener('click', start);
  buttons.again.addEventListener('click', start);
  buttons.yes.addEventListener('click', () => answer(true));
  buttons.no.addEventListener('click', () => answer(false));
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && ['set', 'mask'].includes(stage.getAttribute('data-phase'))) {
      clearTimers();
      show('intro', 'The test stopped because the page was hidden. Press “Show the circles” to try again.');
    }
  });
  show('intro');
  root.querySelector('[data-controls]').hidden = false;
}

function setupEnsembleRoutes(root) {
  const SCALE = 10;
  let n = 8;
  let reading = 'subset';
  let sigmaR2 = 1;
  const readoutButton = root.querySelector('[data-action="readout"]');
  const one = x => x.toFixed(1);
  const signedOne = x => `${x >= 0 ? '+' : '−'}${Math.abs(x).toFixed(1)}`;
  function segment(name, value) {
    const node = root.querySelector(`[data-segment="${name}"]`);
    node.style.width = `${value / SCALE * 100}%`;
    node.title = one(value);
  }
  function render() {
    const v = ensembleVariances(n, reading, { sigmaR2 });
    segment('item-subset', v.itemSubset);
    segment('item-sensory', v.itemSensory);
    segment('pooled-subset', v.pooledSubset);
    segment('pooled-noise', v.pooling);
    segment('pooled-readout', v.readout);
    setText(root, 'vi', one(v.VI));
    setText(root, 'va', one(v.VA));
    setText(root, 'keff', String(v.keff));
    setText(root, 'margin', signedOne(v.margin));
    const pooledWins = v.VA < v.VI;
    setText(root, 'winner', pooledWins ? 'Pooled route' : 'Item route');
    root.querySelector('[data-value="winner"]').classList.toggle('pass', pooledWins);
    root.querySelector('[data-value="winner"]').classList.toggle('fail', !pooledWins);
    root.querySelector('[data-bars]').setAttribute('aria-label',
      `Item route error ${one(v.VI)}. Pooled route error ${one(v.VA)}.`);
    root.querySelectorAll('[data-n]').forEach(button => button.setAttribute('aria-pressed', String(Number(button.dataset.n) === n)));
    root.querySelectorAll('[data-reading]').forEach(button => button.setAttribute('aria-pressed', String(button.dataset.reading === reading)));
    readoutButton.setAttribute('aria-pressed', String(sigmaR2 === 8));
    const parts = [`${n} circles shown. The pool takes in ${v.keff} effective items${n > ENSEMBLE_EXAMPLE.keffCap ? ', its limit in this example' : ''}.`];
    if (n <= ENSEMBLE_EXAMPLE.keffCap) {
      parts.push('Pooling is exhaustive at this set size, so both readings give the same pooled error.');
    } else if (reading === 'subset') {
      parts.push(`Only ${v.keff} of the ${n} circles get in, so the pooled estimate also carries subset error of (1 − ${v.keff}/${n}) × 16/${v.keff} = ${one(v.pooledSubset)}.`);
    } else {
      parts.push(`Every circle contributes, so there is no subset error. Overlap keeps the effective count at ${v.keff}.`);
    }
    if (sigmaR2 === 8) parts.push('Raising only the pooled route’s comparison noise from 1 to 8 adds 7 to its error.');
    parts.push(pooledWins
      ? `The pooled route has the smaller error, by ${one(v.margin)}.`
      : `The item route now has the smaller error, by ${one(-v.margin)}. The ordering reverses.`);
    if (n === 16 && sigmaR2 === 1) {
      parts.push(reading === 'subset'
        ? 'Compared with eight circles, pooled error rises by exactly 16(1/8 − 1/16) = 1, an amount set by the display with nothing fitted.'
        : 'Compared with eight circles, pooled error does not change.');
    }
    if (n === 16 && sigmaR2 === 8) {
      parts.push(reading === 'subset'
        ? 'The margin is the same as at eight circles. Above saturation, subset pooling leaves the margin unchanged as circles are added.'
        : 'Under this reading the margin grows as circles are added, so the pooled route wins again.');
    }
    setText(root, 'status', parts.join(' '));
    root.dataset.n = String(n);
    root.dataset.reading = reading;
    root.dataset.readout = String(sigmaR2);
  }
  root.querySelectorAll('[data-n]').forEach(button => button.addEventListener('click', () => { n = Number(button.dataset.n); render(); }));
  root.querySelectorAll('[data-reading]').forEach(button => button.addEventListener('click', () => { reading = button.dataset.reading; render(); }));
  readoutButton.addEventListener('click', () => { sigmaR2 = sigmaR2 === 1 ? 8 : 1; render(); });
  render();
  root.querySelector('[data-controls]').hidden = false;
}

const setups = { ib: setupIB, hierarchical: setupHierarchical, allocation: setupAllocation, camino: setupCamino,
  tacit: setupTacit, oracle: root => setupOracle(root, setupPlayer),
  pecdafs: root => setupPecdafs(root, setupPlayer), similarity: setupSimilarity,
  'ensemble-demo': setupEnsembleDemo, 'ensemble-routes': setupEnsembleRoutes };
document.querySelectorAll('[data-explainer]').forEach(root => {
  const setup = setups[root.dataset.explainer];
  if (setup) setup(root);
});
