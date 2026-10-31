/**
 * ANSI S3.5-1997 Annex A Validation Test Suite
 * SemVer: v2.0.0
 */
const ANSI_TABLE_3 = {
  bands: [160, 200, 250, 315, 400, 500, 630, 800, 1000, 1250, 1600, 2000, 2500, 3150, 4000, 5000, 6300, 8000],
  weights: [
    0.0114, 0.0153, 0.0179, 0.0558, 0.0898, 0.0944,
    0.0709, 0.0660, 0.0628, 0.0672, 0.0747, 0.0755,
    0.0820, 0.0808, 0.0483, 0.0453, 0.0274, 0.0145
  ],
  speechNormal: [32.41, 34.48, 34.75, 33.98, 34.59, 34.27, 32.06, 28.30, 25.01, 23.00, 20.15, 17.32, 13.18, 11.55, 9.33, 5.31, 2.59, 1.13],
  speechShout:  [30.77, 36.65, 42.50, 46.51, 47.40, 49.24, 51.21, 51.44, 51.31, 49.63, 47.65, 44.32, 40.80, 38.13, 34.41, 28.24, 23.45, 20.72],
  internalNoise: [0.6, -1.7, -3.9, -6.1, -8.2, -9.7, -10.8, -11.9, -12.5, -13.5, -15.4, -17.7, -21.2, -24.2, -25.9, -23.6, -15.8, -7.1]
};

function calculateANSI_SII(speechSpectrum, noiseSpectrum, applyUpwardMasking = true) {
  const bands = ANSI_TABLE_3.bands;
  const numBands = bands.length;
  const disturbance = new Float64Array(numBands);

  // Upward Spread of Masking (ANSI S3.5-1997 §4.3.2.1)
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

    // Level Distortion Factor (ANSI S3.5 §4.3.2.2)
    let L_i = 1.0;
    const normRef = ANSI_TABLE_3.speechNormal[i] + 10.0;
    if (E_i > normRef) {
      L_i = 1.0 - (E_i - normRef) / 160.0;
      L_i = Math.max(0.0, Math.min(1.0, L_i));
    }

    const A_i = L_i * K_i;
    totalSII += ANSI_TABLE_3.weights[i] * A_i;
  }

  return Math.max(0.0, Math.min(1.0, totalSII));
}

console.log("=================================================");
console.log("  ANSI S3.5-1997 Reference Test Suite (v2.0.0)   ");
console.log("=================================================");

let failed = false;

// TEST 1: Free Field Speech in Zero Noise
const quietNoise = new Float64Array(18).fill(-99.0);
const siiQuiet = calculateANSI_SII(ANSI_TABLE_3.speechNormal, quietNoise);
console.log(`Test 1 [Speech in Quiet]: Expected ~0.997 -> Result: ${siiQuiet.toFixed(3)}`);
if (Math.abs(siiQuiet - 0.997) > 0.005) {
  console.error("FAIL: Test 1 failed ANSI tolerance!");
  failed = true;
} else {
  console.log("PASS: Test 1 passed within +/- 0.005 tolerance.");
}

// TEST 2: High Masking Noise (+80 dB SPL white spectrum)
const severeNoise = new Float64Array(18).fill(70.0);
const siiMasked = calculateANSI_SII(ANSI_TABLE_3.speechNormal, severeNoise);
console.log(`Test 2 [Severe Masking Noise]: Expected < 0.050 -> Result: ${siiMasked.toFixed(3)}`);
if (siiMasked > 0.05) {
  console.error("FAIL: Test 2 failed masking attenuation!");
  failed = true;
} else {
  console.log("PASS: Test 2 passed.");
}

// TEST 3: Low-Frequency Rumble Upward Masking Verification
const rumbleNoise = new Float64Array(18).fill(-50.0);
rumbleNoise[0] = 75.0; // 160 Hz rumble
rumbleNoise[1] = 70.0; // 200 Hz rumble
const siiWithUpward = calculateANSI_SII(ANSI_TABLE_3.speechNormal, rumbleNoise, true);
const siiWithoutUpward = calculateANSI_SII(ANSI_TABLE_3.speechNormal, rumbleNoise, false);
console.log(`Test 3 [Upward Masking]: With V_i = ${siiWithUpward.toFixed(3)} | Without V_i = ${siiWithoutUpward.toFixed(3)}`);
if (siiWithUpward >= siiWithoutUpward) {
  console.error("FAIL: Upward spread of masking did not reduce high frequency audibility!");
  failed = true;
} else {
  console.log("PASS: Upward masking correctly depresses intelligibility.");
}

if (failed) {
  process.exit(1);
} else {
  console.log("\nALL ANSI METROLOGY TESTS PASSED SUCCESSFULLY.");
}
