// Small, deterministic calculations used by the paper explanations.
// Equations and public source versions are documented on the companion pages.
export function binaryEntropy(p) {
  if (p === 0 || p === 1) return 0;
  return -p * Math.log2(p) - (1 - p) * Math.log2(1 - p);
}

export function ibExample(d, delta, epsilon = 0.1) {
  const rate = 1 - binaryEntropy(delta);
  const relevance = 1 - binaryEntropy(epsilon + delta - 2 * epsilon * delta);
  return { fullRate: rate + d, reducedRate: rate, relevance, removed: d,
    fullStates: 2 ** (d + 1), reducedStates: 2 };
}

export function redistribute(weights, selected, success, eta = 0.1) {
  const chosen = weights[selected];
  return weights.map((w, i) => {
    if (success) return (1 - eta) * w + (i === selected ? eta : 0);
    if (i === selected) return (1 - eta) * w;
    return w * (1 - chosen + eta * chosen) / (1 - chosen);
  });
}

function binomial(n, p) {
  const masses = [(1 - p) ** n];
  for (let k = 0; k < n; k += 1) {
    masses.push(masses[k] * (n - k) / (k + 1) * p / (1 - p));
  }
  return masses;
}

// Most powerful count test for p0=.2 versus p1=.8, size .1.
// Its boundary count is randomised, as in Section 6 of arXiv:2604.26808v3.
export function countTestPower(n, allowance = 0.1) {
  const nullMass = binomial(n, 0.2);
  const alternativeMass = binomial(n, 0.8);
  let remaining = allowance;
  let power = 0;
  for (let k = n; k >= 0 && remaining > 0; k -= 1) {
    const fraction = Math.min(1, remaining / nullMass[k]);
    power += fraction * alternativeMass[k];
    remaining = Math.max(0, remaining - fraction * nullMass[k]);
  }
  return Math.min(1, power);
}

export function allocationExample(k, population = 96) {
  const size = Math.floor(population / k);
  const extra = population - k * size;
  const sizes = Array.from({ length: k }, (_, i) => size + (i < extra ? 1 : 0));
  const loss = sizes.reduce((sum, m) => sum + m ** 3 - m, 0) / (12 * population ** 3);
  const power = countTestPower(size);
  return { sizes, loss, power, smallest: size,
    allocationPass: loss <= 0.002, verificationPass: power >= 0.8 - 1e-12 };
}
