// Constructed teaching examples. These arrays are not measurements from the papers.
export const TACIT_UTILITIES = [1.4, 1.2, 0.5];

export function tacitDecision(reputations, utilities = TACIT_UTILITIES) {
  const contributions = utilities.map((u, i) => reputations[i] * Math.log(u));
  const score = contributions.reduce((sum, value) => sum + value, 0);
  return { contributions, score, accepted: score > 0 };
}

export function updateReputations(reputations, correct, accepted) {
  return reputations.map((r, i) => !accepted ? r : correct[i] ? 0.9 * r + 0.1 : 0.7 * r);
}

export const mean = values => values.reduce((sum, value) => sum + value, 0) / values.length;

export function pearson(a, b) {
  const ma = mean(a), mb = mean(b);
  let covariance = 0, va = 0, vb = 0;
  for (let i = 0; i < a.length; i += 1) {
    const x = a[i] - ma, y = b[i] - mb;
    covariance += x * y; va += x * x; vb += y * y;
  }
  // A constant trace has undefined Pearson correlation, not zero similarity.
  return va === 0 || vb === 0 ? null : Math.max(-1, Math.min(1, covariance / Math.sqrt(va * vb)));
}

const throughput = [12, 10, 8, 9, 18, 32, 44, 40, 30, 24, 20, 14];
const modulation = [30, 26, 22, 25, 42, 55, 70, 62, 48, 42, 38, 32];
export const SIMILARITY_TRACES = {
  throughput: {
    target: throughput,
    a: throughput.map(x => 1.8 * x + 10),
    b: [13, 9, 10, 8, 20, 30, 46, 38, 32, 22, 21, 13]
  },
  modulation: {
    target: modulation,
    a: modulation.map(x => 100 - x),
    b: [32, 25, 24, 23, 45, 54, 72, 60, 49, 41, 40, 31]
  }
};

export function peerComparison(scenario) {
  const existing = [96, 97, 98];
  const proposed = scenario === 'risk' ? [90, 92, 94] : [97, 98, 99];
  return { existing, proposed, existingMean: mean(existing), proposedMean: mean(proposed),
    target: 97, flagged: mean(proposed) < 97 };
}
