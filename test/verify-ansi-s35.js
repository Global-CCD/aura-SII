/**
 * ANSI S3.5-1997 Annex A Validation Test Suite
 * SemVer: v2.1.0
 */
const ANSI_TABLE_3 = {
  bands: [160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000],
  weights: [
    0.0114, 0.0153, 0.0179, 0.0558, 0.0898, 0.0944,
    0.0709, 0.0660, 0.0628, 0.0672, 0.0747, 0.0755,
    0.0820, 0.0808, 0.0483, 0.0453, 0.0274, 0.0145
  ],
  speechNormal: [32.41, 34.48, 34.75, 33.98, 34.59, 34.27, 32.06, 28.30, 25.01, 23.00, 20.15, 17.32, 13.18, 11.55, 9.33, 5.31, 2.59, 1.13],
  internalNoise: [0.6, -1.7, -3.9, -6.1, -8.2, -9.7, -10.8, -11.9, -12.5, -13.5, -15.4, -17.7, -21.2, -24.2, -25.9, -23.6, -15.8, -7.1]
};

function calculateANSI_SII(speechSpectrum, noiseSpectrum, applyUpwardMasking = true) {
  const bands = ANSI_TABLE_3.bands;
  const numBands = bands.length;
  const disturbance = new Float64Array(numBands);

  let cumulativeUpward = -999.0;
  for (let i = 0; i < numBands; i++) {
    const N_i = noiseSpectrum[i];
    const X_i = ANSI_TABLE_3.internalNoise[i];

    if (applyUpwardMasking && i > 0) {
      const B_prev = Math.max(speechSpectrum[i - 1], noiseSpectrum[i - 1]);
      const f_prev = bands[i - 1];
      const f_curr = bands[i];
      const C_i = 0.6 * (B_prev + 10 * Math.log10(f_prev)) - 6.35;
      const V_i = B_prev - 3.32 * C_i * Math.log10(f_curr / f_prev);
      cumulativeUpward = Math.max(cumulativeUpward - 15.0, V_i);
    }

    disturbance[i] = Math.max(N_i, X_i, cumulativeUpward);
  }

  let totalSII = 0.0;
  for (let i = 0; i < numBands; i++) {
    const E_i = speechSpectrum[i];
    const D_i = disturbance[i];
    const snr = E_i - D_i;

    let K_i = (snr + 15.0) / 30.0;
    K_i = Math.max(0.0, Math.min(1.0, K_i));

    let L_i = 1.0;
    const normRef = ANSI_TABLE_3.speechNormal[i] + 10.0;
    if (E_i > normRef) {
      L_i = 1.0 - (E_i - normRef) / 160.0;
      L_i = Math.max(0.0, Math.min(1.0, L_i));
    }

    totalSII += ANSI_TABLE_3.weights[i] * (L_i * K_i);
  }

  return Math.max(0.0, Math.min(1.0, totalSII));
}

console.log("Running ANSI S3.5-1997 Reference Test Suite (v2.1.0)...");
const quietNoise = new Float64Array(18).fill(-99.0);
const siiQuiet = calculateANSI_SII(ANSI_TABLE_3.speechNormal, quietNoise);
if (Math.abs(siiQuiet - 0.997) > 0.005) {
  console.error(`FAIL: Test 1 quiet expected ~0.997, got ${siiQuiet}`);
  process.exit(1);
}
console.log(`PASS: Free-field speech in quiet SII = ${siiQuiet.toFixed(3)} (within +/- 0.005 tolerance).`);
