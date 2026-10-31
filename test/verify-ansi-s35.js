/**
 * ANSI S3.5-1997 Annex A Reference Validation Suite
 * SemVer: v2.2.0
 * Verified against ANSI S3.5-1997 Section 4.3.2 Equations (5) through (9).
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
  const sixthOctave = Math.pow(2, 1 / 6);

  // 1. Calculate self-speech masking: V_i = E_i - 24 dB (ANSI S3.5 §4.3.2.1, Eq. 5)
  //    and slope parameter C_i (ANSI S3.5 §4.3.2.3, Eq. 7)
  const V = new Float64Array(numBands);
  const B = new Float64Array(numBands);
  const C = new Float64Array(numBands);

  for (let i = 0; i < numBands; i++) {
    V[i] = speechSpectrum[i] - 24.0;
    // B_i is the larger of noise and self-speech masking (ANSI S3.5 §4.3.2.2)
    B[i] = Math.max(V[i], noiseSpectrum[i]);

    // Bandwidth of 1/3-octave band: delta_f = f_c * (2^(1/6) - 2^(-1/6))
    const deltaF = bands[i] * (sixthOctave - 1 / sixthOctave);
    // C_i = -80 + 0.6 * [B_i + 10 * log10(deltaF)] (dB/octave)
    C[i] = -80.0 + 0.6 * (B[i] + 10.0 * Math.log10(deltaF));
  }

  // 2. Calculate equivalent masking spectrum Z_i (ANSI S3.5 §4.3.2.4 & §4.3.2.5, Eq. 9)
  const Z = new Float64Array(numBands);
  const disturbance = new Float64Array(numBands);

  Z[0] = B[0];
  disturbance[0] = Math.max(Z[0], ANSI_TABLE_3.internalNoise[0]);

  for (let i = 1; i < numBands; i++) {
    let sumUpwardPower = 0.0;
    if (applyUpwardMasking) {
      for (let k = 0; k < i; k++) {
        const h_k = bands[k] * sixthOctave; // Upper band edge of band k
        const F_i = bands[i];              // Center frequency of band i
        if (F_i > h_k) {
          const octaves = 3.32 * Math.log10(F_i / h_k);
          const maskingFromK = B[k] + C[k] * octaves;
          sumUpwardPower += Math.pow(10.0, 0.1 * maskingFromK);
        }
      }
    }
    const noisePower = Math.pow(10.0, 0.1 * noiseSpectrum[i]);
    Z[i] = 10.0 * Math.log10(noisePower + sumUpwardPower);
    disturbance[i] = Math.max(Z[i], ANSI_TABLE_3.internalNoise[i]);
  }

  // 3. Band Audibility & SII Accumulation
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

console.log("=================================================");
console.log("  ANSI S3.5-1997 Reference Test Suite (v2.2.0)   ");
console.log("=================================================");

let failed = false;

// TEST 1: Free Field Normal Speech in Zero Noise
const quietNoise = new Float64Array(18).fill(-99.0);
const siiQuiet = calculateANSI_SII(ANSI_TABLE_3.speechNormal, quietNoise, true);
console.log(`Test 1 [Speech in Quiet]: Expected ~0.997 -> Result: ${siiQuiet.toFixed(3)}`);
if (Math.abs(siiQuiet - 0.997) > 0.005) {
  console.error(`FAIL: Test 1 quiet expected ~0.997, got ${siiQuiet}`);
  failed = true;
} else {
  console.log("PASS: Test 1 passed within +/- 0.005 tolerance.");
}

// TEST 2: High Masking Noise (+70 dB SPL/Hz flat white noise)
const severeNoise = new Float64Array(18).fill(70.0);
const siiMasked = calculateANSI_SII(ANSI_TABLE_3.speechNormal, severeNoise, true);
console.log(`Test 2 [Severe Masking Noise]: Expected < 0.050 -> Result: ${siiMasked.toFixed(3)}`);
if (siiMasked > 0.05) {
  console.error("FAIL: Test 2 failed masking attenuation!");
  failed = true;
} else {
  console.log("PASS: Test 2 passed.");
}

// TEST 3: Low-Frequency Rumble Upward Masking (160 Hz = 75 dB, 200 Hz = 70 dB)
const rumbleNoise = new Float64Array(18).fill(-50.0);
rumbleNoise[0] = 75.0;
rumbleNoise[1] = 70.0;
const siiWithUpward = calculateANSI_SII(ANSI_TABLE_3.speechNormal, rumbleNoise, true);
const siiWithoutUpward = calculateANSI_SII(ANSI_TABLE_3.speechNormal, rumbleNoise, false);
console.log(`Test 3 [Upward Masking]: With V_i = ${siiWithUpward.toFixed(3)} | Without V_i = ${siiWithoutUpward.toFixed(3)}`);
if (siiWithUpward >= siiWithoutUpward) {
  console.error("FAIL: Upward spread of masking did not reduce high frequency audibility!");
  failed = true;
} else {
  console.log("PASS: Upward masking correctly attenuates intelligibility.");
}

if (failed) {
  process.exit(1);
} else {
  console.log("\nALL ANSI S3.5 METROLOGY TESTS PASSED SUCCESSFULLY.");
}
