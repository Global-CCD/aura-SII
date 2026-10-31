# Speech Intelligibility Index (SII) Pro — v2.0.0
### ANSI S3.5-1997 (R2024) / ISO 16832 Acoustic Metrology Web Suite

An industrial-grade, zero-dependency, real-time Speech Intelligibility Index (SII) analyzer and diagnostic platform running in pure HTML5, CSS3, and modern ES6+ Web Audio API.

## Production Features & Audit Resolution

- **Standard Spectrum Level Normalization (ANSI S3.5 §3.6):** Converts integrated 1/3-octave band powers to physical spectrum levels ($dB\text{ re }20\,\mu Pa^2/Hz$), preventing artificial SNR suppression.
- **Upward Spread of Masking ($V_i$, §4.3.2.1):** Calculates basilar excitation leakage from high-level low frequencies into higher speech bands.
- **Continuous Time-Invariant Decoupling:** Evaluates EMA smoothing and envelope followers via continuous $\alpha = 1 - e^{-\Delta t / \tau}$, guaranteeing deterministic smoothing across $60\text{ Hz}$, $120\text{ Hz}$, and $144\text{ Hz}$ displays.
- **Acoustically Grounded Visual Metrology:** Renders the dynamic speech range ($[-15\text{ dB}, +15\text{ dB}]$ relative to speech RMS) and highlights audibility above masking rather than anchoring to the baseline.
- **Non-Destructive Pause/Resume:** Retains audio tracks on pause, avoiding permissions re-prompts and hardware latency.

## Verification & Automated Testing

Verify the engine against ANSI S3.5-1997 Annex A test vectors:

```bash
npm test
```

## Cloudflare Pages Deployment

Deploy directly to Cloudflare Pages:
- **Build Output Directory:** `public`
- **Build Command:** *(None required - static assets)*
