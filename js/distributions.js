/**
 * Statistical distribution functions for timing offsets.
 * All return a millisecond offset from the exact beat time.
 * The `spread` parameter controls the scale of each distribution.
 */

/**
 * Normal distribution using Box-Muller transform.
 * @param {number} spread - Standard deviation in ms
 * @returns {number} Offset in ms
 */
export function normal(spread) {
  let u1, u2;
  do {
    u1 = Math.random();
  } while (u1 === 0);
  u2 = Math.random();
  const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z * spread;
}

/**
 * Uniform distribution over [-spread, +spread].
 * @param {number} spread - Half-width of the range in ms
 * @returns {number} Offset in ms
 */
export function uniform(spread) {
  return (Math.random() - 0.5) * 2 * spread;
}

/**
 * Centered exponential distribution.
 * Random sign with exponential magnitude.
 * @param {number} spread - Scale parameter in ms
 * @returns {number} Offset in ms
 */
export function exponential(spread) {
  if (spread === 0) return 0;
  const sign = Math.random() < 0.5 ? -1 : 1;
  let u;
  do {
    u = Math.random();
  } while (u === 0);
  return sign * (-Math.log(u) * spread / 2);
}

/**
 * Laplace distribution.
 * @param {number} spread - Scale maps to b = spread / sqrt(2)
 * @returns {number} Offset in ms
 */
export function laplace(spread) {
  if (spread === 0) return 0;
  const b = spread / Math.SQRT2;
  const u = Math.random() - 0.5;
  return -b * Math.sign(u) * Math.log(1 - 2 * Math.abs(u));
}

/**
 * Beta distribution using Jöhnk's algorithm, mapped to [-spread, +spread].
 * @param {number} spread - Half-width of the output range in ms
 * @param {number} alpha - Alpha shape parameter (default 2)
 * @param {number} beta - Beta shape parameter (default 2)
 * @returns {number} Offset in ms
 */
export function beta(spread, alpha = 2, beta = 2) {
  if (spread === 0) return 0;
  const x = betaSample(alpha, beta);
  // Map [0, 1] to [-spread, +spread]
  return (x * 2 - 1) * spread;
}

/**
 * Sample from Beta(alpha, beta) using the gamma distribution method.
 * More numerically stable than Jöhnk's for a wider range of parameters.
 */
function betaSample(alpha, beta) {
  const ga = gammaSample(alpha);
  const gb = gammaSample(beta);
  return ga / (ga + gb);
}

/**
 * Sample from Gamma(shape, 1) using Marsaglia and Tsang's method.
 */
function gammaSample(shape) {
  if (shape < 1) {
    // For shape < 1, use the relation: Gamma(shape) = Gamma(shape+1) * U^(1/shape)
    const u = Math.random();
    return gammaSample(shape + 1) * Math.pow(u, 1 / shape);
  }

  const d = shape - 1 / 3;
  const c = 1 / Math.sqrt(9 * d);

  while (true) {
    let x, v;
    do {
      x = normalStandard();
      v = 1 + c * x;
    } while (v <= 0);

    v = v * v * v;
    const u = Math.random();

    if (u < 1 - 0.0331 * (x * x) * (x * x)) {
      return d * v;
    }
    if (Math.log(u) < 0.5 * x * x + d * (1 - v + Math.log(v))) {
      return d * v;
    }
  }
}

/**
 * Standard normal sample using Box-Muller.
 */
function normalStandard() {
  let u1, u2;
  do {
    u1 = Math.random();
  } while (u1 === 0);
  u2 = Math.random();
  return Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
}

/** Map of distribution names to their sample functions. */
export const distributions = {
  normal,
  uniform,
  exponential,
  laplace,
  beta,
};

/**
 * Get a timing offset sample for the given distribution.
 * @param {string} type - Distribution name
 * @param {number} spread - Spread parameter in ms
 * @param {number} [alpha] - Beta distribution alpha
 * @param {number} [betaParam] - Beta distribution beta
 * @returns {number} Offset in ms
 */
export function sampleOffset(type, spread, alpha, betaParam) {
  switch (type) {
    case 'normal': return normal(spread);
    case 'uniform': return uniform(spread);
    case 'exponential': return exponential(spread);
    case 'laplace': return laplace(spread);
    case 'beta': return beta(spread, alpha, betaParam);
    default: return normal(spread);
  }
}
