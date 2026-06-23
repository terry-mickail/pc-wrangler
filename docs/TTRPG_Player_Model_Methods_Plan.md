# Player Disposition Model — Methods & Analysis Plan
### Companion to the TPDI instrument. v0.1, pre-registration draft.

**One-line thesis.** Each player's disposition is a six-dimensional latent vector estimated by Bayesian updating: the TPDI instrument supplies the prior, content-coded session behavior supplies the likelihood, and both sit inside a hierarchical model that respects the nesting of utterances in players in sessions in tables.

**Scope of claims.** This is a descriptive and predictive measurement system, not a causal one. Engagement and spotlight are endogenous (attention drives engagement drives more attention), so we estimate and forecast dispositions and equity; we do not claim the GM "caused" anything. Stating this boundary up front protects every downstream metric.

---

## 0. Research design and inferential targets

**Data structure.** Cross-classified multilevel. Observations (coded events) are nested within players and within sessions; players are crossed with sessions (every session contains several players) and nested within tables/campaigns. The GM is a distinct node, not a player. Any model that ignores the session and table levels will mistake a combat-heavy GM for a table full of tacticians.

**Three inferential targets.**
1. Estimate each player's latent disposition vector theta_p across the six axes (N, T, O, S, E, I).
2. Decompose and track that vector over time: trait (stable between-player) vs. state (within-player, session to session).
3. Derive table-level equity functionals (spotlight, loot, arc freshness) from the player-by-session engagement estimates.

**Three methodological layers**, each with its own soundness standard: measurement, model, validation.

---

## 1. Layer one — Measurement: events to behavioral indicators

The goal is to operationalize each latent factor as indicators computable from the events table, mirroring the construct definitions, and respecting the compositional (flavor) vs. normative (intensity) split.

### 1.1 Indicator definitions (parallel to the instrument)
For each flavor axis, define behavioral indicators as **exposure-adjusted rates**, not raw counts.

- **N:** in-character speech share; emotional/relational content per IC utterance; arc-beat engagement given a hook was raised.
- **T:** in-combat tactical talk per round; on-the-fly adaptation events; coordination/setup-for-allies, all scoped to live encounters.
- **O:** build-synergy density (roster-derived, behavior-free); rules citations targeted at the system; resource-timing efficiency, mostly outside the moment of combat.
- **S:** out-of-character positive social acts; inclusion behaviors given someone went quiet; conversational reciprocity from the who-responds-to-whom graph.
- **E:** investigation initiation given a hook dropped; world-directed questions; novel-area drive; cross-session lore callbacks.
- **I (normative):** total participation per unit of exposure; initiative-taking vs. reactive ratio; between-session activity. Scaled across players, never ipsatized.

### 1.2 Opportunity normalization (the exposure model)
Every flavor indicator is a numerator over a denominator of opportunities. Formally treat it like a rate with an offset: indicator = engaged_responses / opportunities_present. A method actor in a dungeon with no NPCs shows low N from zero exposure, not low trait. This is the single most important measurement decision; raw counts reintroduce the volume confound the instrument was built to avoid.

### 1.3 Confound control: partial out the character
A Wizard player reads as tactical partly because the class is tactical. Residualize the behavioral T and O indicators against current class/subclass (captured as a TPDI covariate), or carry class as a covariate in the measurement model, so the factors measure the player and not the sheet.

### 1.4 The LLM extractor is an instrument and must be calibrated like one
The transcript-to-event extraction has measurement error and cannot be taken on faith. Treat it as a content-analysis coding scheme.
- **Reliability:** double-code a stratified subset of sessions with human coders; report **Krippendorff's alpha** for categorical event tags (frame, target, event type) and **ICC** for continuous extractions. Set a floor (alpha >= .80 for tags that feed published-style metrics) before any tag is trusted.
- **Version control:** pin the extraction model version. When it changes, treat it as a new instrument and re-establish reliability and invariance, or you get silent drift in your measuring stick across app releases. This is the sneakiest threat in the whole system.

### 1.5 Measurement invariance across capture modality
Online per-stream, in-person per-mic, and single-room audio differ in quality, and the N/S/E axes (transcript-dependent) degrade most. Before pooling across modalities, test **measurement invariance** (configural, metric, scalar) with capture modality as the grouping variable, equivalently a DIF analysis on the behavioral indicators. If invariance fails, model modality as a moderator rather than pretending the scores are comparable.

### 1.6 Reliability via Generalizability Theory
A player's behavioral score is an average over sessions, indicators, and a fallible coder. That is a multi-facet reliability problem, so use **G-theory** rather than a single alpha. Persons are the object of measurement; sessions, indicators, and coder(LLM-vs-human) are facets. Run a **G-study** to estimate variance components, then a **D-study** to answer the design question that actually matters: how many sessions are needed before a player's disposition estimate is dependable. The trait-vs-state ICC falls out of this directly as the person-variance ratio.

---

## 2. Layer two — Model: latent estimation, dynamics, typology

### 2.1 Measurement sub-model
A confirmatory factor structure mapping the behavioral indicators onto the six latent factors, deliberately parallel to the instrument's CFA so the two methods are estimating the same constructs. Loadings free, structure fixed to the six-factor solution, with the same two danger pairs (N-S, T-O) watched.

### 2.2 Structural sub-model: trait plus state, properly nested
Latent factor scores decompose into a player random intercept (trait) plus session-level deviation (state), in a cross-classified specification with random effects for player, session, and table. Add an **AR(1)** on the state to capture momentum and fatigue across sessions, and a random slope per player to detect directional drift (the new player migrating from Watcher toward Storyteller). Because sessions are irregularly spaced, prefer **continuous-time SEM (ctsem)** over discrete-lag models so the intervals are handled honestly.

### 2.3 Bayesian updating: prior to posterior
The instrument-derived theta_self enters as an **informative prior** on each player's trait mean. Because the production short form is low-information, set wide prior variance and shrink toward the population profile. Each session's behavioral likelihood updates the posterior. Quantify cold-start explicitly via the D-study: report the session count at which the behavioral likelihood dominates the prior, and surface uncertainty (credible intervals) in the UI until then. Estimate in **Stan / brms / PyMC**; full posteriors are needed for the alerting in 2.6.

### 2.4 Typology: learn the space globally, position the individual
Do not cluster a single table (n=5 is noise). Learn the archetype space from the **pooled** trait estimates across all tables, then position each player in it. Use **archetypal analysis** (profiles are pure extremes, every real player a convex combination) or **LPA/GMM** with profile-count selection by BIC, sample-size-adjusted BIC, entropy, and the bootstrap LRT. Express membership as soft posterior weights, never a hard bucket.

### 2.5 Type trajectory over time
For the discrete-membership view, use **Latent Transition Analysis** (Collins & Lanza) to model movement between archetypes across a campaign. It complements the continuous state-space view: ctsem tracks the continuous vector, LTA narrates the archetype migration for the DM.

### 2.6 Personalized metrics and decision-theoretic alerting
Spotlight equity and the other metrics are **type-weighted functionals** of the same engagement events: each player's "fulfillment" weights the event stream by their posterior profile (a method actor's spotlight is scene focus, not combat turns). Dispersion across players (Gini or coefficient of variation) trended over sessions gives table equity.

Alerts ("wants more, getting less") must be decision-theoretic, not significance-based, because the governing principle is that a wrong alert is worse than a missed one. Fire only when the **posterior probability** that the stated-minus-measured gap exceeds a **region of practical equivalence** (a minimally meaningful gap, ROPE in Kruschke's sense) crosses a high threshold, under an asymmetric loss that penalizes false alarms more than misses. This operationalizes "wrong is worse than missing" as math, not vibes.

---

## 3. Layer three — Validation: the construct-validity bridge

The instrument half and the behavioral half must be shown to measure the same six things. This is the crux, and the right framework is named and old.

### 3.1 Multitrait-multimethod
Build the **MTMM matrix** (Campbell & Fiske): six traits by two methods (self-report TPDI, behavioral coding). Estimate it with a **CFA-MTMM** model (correlated traits with a correlated-methods or CT-C(M-1) parameterization).
- **Convergent validity:** monotrait-heteromethod correlations (self-report N vs. behavioral N) should be substantial.
- **Discriminant validity:** convergent correlations should exceed heterotrait values, with special attention to the N-S and T-O pairs.
A behavioral axis that does not converge with its self-report twin is not the construct you named; rename or redesign it before shipping a metric built on it.

### 3.2 Criterion and predictive validity
The disposition vector and, critically, the **stated-minus-measured gap** must predict something real: post-session vibe-check satisfaction, attendance, retention. The "neglected player" alert earns its place only if the gap predicts actual reported dissatisfaction. Validate it against the vibe check before it is ever shown to a GM.

### 3.3 External convergent validity
Correlate TPDI and behavioral factors against established scales (PENS, the Online Gaming Motivations Scale) and confirm the canonical typologies project on cleanly (Power Gamer high O, Method Actor high N, and so on).

---

## 4. Threats to validity and mitigations

- **Non-ignorable missingness (MNAR).** A disengaged player is also more likely to be off-mic or absent, so missingness encodes the signal. Model presence/attendance explicitly (a selection or pattern-mixture component); do not treat absence as missing-at-random.
- **Endogeneity / feedback loop.** Spotlight and engagement co-cause each other. Keep claims predictive; if any causal question arises, it needs a design (for example a GM-side nudge experiment), not just the observational stream.
- **LLM extractor drift.** Covered in 1.4: version-pin, re-validate on change.
- **Reactivity.** Players who see their type may perform to or rebel against it, contaminating the likelihood. Keep raw profiles GM-only during validation.
- **Small n per table.** Justifies the hierarchical model: partial pooling borrows strength across tables so table-level estimates are not built on five points.
- **Multiplicity.** Many players times axes times sessions of potential alerts. The ROPE-plus-asymmetric-loss rule in 2.6 controls false alarms better than a stack of p-values.

---

## 5. Estimation, sampling, sequencing

- **Tooling.** R (brms, ctsem, lavaan/OpenMx for CFA-MTMM, lme4 for variance components, gtheory) and Python (PyMC, factor-analyzer); Stan underneath for the dynamic factor model and the decision layer.
- **Sample/power.** Instrument pilot N >= 250 to 300 for stable EFA, held-out sample for CFA (Section 8 of the instrument). Behavioral validation needs both breadth and depth: enough players for the population typology and enough sessions per player for the D-study to certify dependability; set targets from a pilot variance-components run rather than guessing now.
- **Preregistration.** Register the six-factor structure, the convergent/discriminant predictions and danger pairs, the ROPE bounds and loss asymmetry for alerting, and the invariance tests, before touching confirmatory data. This is the credibility move that separates this from a hobby model.

**Build order.** (1) Cognitive-pretest and pilot the instrument. (2) Stand up the extraction pipeline and establish coder reliability (1.4) on a small hand-coded corpus. (3) G-study to size the design. (4) Fit the measurement and dynamic models on accumulating sessions. (5) MTMM and criterion validation. (6) Only then expose metrics to GMs, behind uncertainty and the ROPE gate.

---

*v0.1. Every threshold here (alpha floors, ROPE bounds, session counts) is a placeholder until the pilot variance components are in hand. The architecture is the deliverable; the numbers come from data.*
