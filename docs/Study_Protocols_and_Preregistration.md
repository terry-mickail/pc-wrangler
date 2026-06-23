# Study Protocols and Preregistration
### Companion to the methods plan. v0.1. Part 3 is the registerable core.

Three parts, in execution order:
- **Part 1 — Pilot and G-study protocol:** replaces the placeholder numbers with estimates.
- **Part 2 — GM-nudge trial:** the design that licenses causal claims about acting on alerts.
- **Part 3 — Preregistration:** the timestampable hypotheses, design, and decision rules governing both.

---

## PART 1 — Pilot and G-study protocol

Two bundled sub-studies. 1A validates the instrument (the prior). 1B sizes the behavioral measurement (the likelihood).

### 1A. Instrument validation
**Steps.** Cognitive pretest (6 to 10 players, think-aloud, fix misread items) then quantitative pilot then held-out confirmation.

**Recruitment.** English-language 5e and 5.5e players to start (matches the seed domain), drawn from online communities and play groups, deliberately sampling both online and in-person tables so modality invariance is testable.

**Sample, with justification.**
- EFA: N >= 300. At roughly 36 items this gives a subjects-to-items ratio near 8:1, and supports parallel analysis and the MAP test for factor count.
- CFA: a separate held-out N >= 200.
- Test-retest: subset of n approximately 60, re-administered at 2 to 4 weeks.

**Measures.** TPDI long form, the covariate block, and a post-session vibe check (single-item satisfaction plus stems for "wanted more / about right / wanted less spotlight").

**Analysis and pass criteria.** Factor count by parallel analysis and MAP; EFA with oblique rotation; CFA targets CFI/TLI > .90, RMSEA < .08, loadings > .50; reliability by McDonald's omega > .70 per retained factor; discriminant by HTMT < .85 (watch N-S and T-O); test-retest ICC per axis. Output: confirmed factor structure, retained item set, and the derived production short form.

### 1B. Behavioral G-study
**Goal.** Estimate variance components so the D-study can answer: how many sessions before a player's behavioral disposition estimate is dependable.

**Corpus.** Approximately 15 to 25 tables (roughly 75 to 125 players), each recorded for 6 to 8 sessions, spanning online and in-person capture.

**Coder reliability.** Double-code 20 to 30 sessions (LLM extractor vs. trained human). Krippendorff's alpha floor of .80 for any tag feeding a metric; continuous extractions by ICC. Pin the extractor model version for the entire corpus.

**Analysis.** Variance-components model with persons as the object of measurement and sessions, indicators, and rater (LLM vs. human) as facets (lme4 / gtheory). Report generalizability and dependability coefficients; run the D-study curve. Pin the modality-invariance result here too (configural / metric / scalar across online vs. in-person).

**What gets pinned.** The alpha pass/fail, the sessions-needed-for-dependability >= .80, the trait-vs-state ICC, and whether scores are poolable across modality.

**Ethics.** Recording consent from every participant at the table; this is also the consent gate the product ships with. If results are for publication, route through IRB given human-subjects audio.

---

## PART 2 — GM-nudge trial (causal)

**Question.** Does surfacing the spotlight-equity alert (and its suggested nudge) to the GM causally improve the under-served player's engagement and satisfaction, versus not surfacing it?

**Primary design: micro-randomized trial (MRT).** Treat the alert as a just-in-time adaptive intervention. At each alert-eligible moment (a player's gap crosses the ROPE threshold), the app randomizes whether to surface the nudge to the GM. This isolates the causal effect of the nudge itself and naturally handles the fact that eligibility is time-varying and player-specific. (Methodology: Klasnja, Murphy et al. on MRTs / JITAIs.)

**Simpler alternative: stepped-wedge cluster RCT.** Randomize tables to crossover times from control (alert withheld) to treatment (alert shown). All tables eventually receive the feature, which resolves the ethics of withholding a useful alert, and the staggered rollout matches a realistic launch.

**Randomization unit and contamination.** Nudging for one player shifts the whole table, so a naive within-table player-level assignment leaks. MRT handles this by being the unit-of-decision design; the stepped-wedge handles it by clustering at the table.

**Outcomes.**
- Primary: targeted player's next-session vibe-check satisfaction and the change in their measured spotlight gap.
- Secondary: attendance, retention, table-level equity (Gini), and GM compliance (did the nudge actually change GM behavior).

**Non-compliance.** GMs will ignore some nudges. Report intention-to-treat, but also estimate the complier effect via CACE / instrumental variables, using random assignment as the instrument for actual nudge uptake. ITT answers "does shipping the alert help"; CACE answers "does the nudge work when followed."

**Mediation.** The causal chain is nudge then GM behavior change then player engagement then satisfaction. Pre-specify GM behavior change as the mediator so a null primary effect can be diagnosed (bad nudge vs. ignored nudge).

**Threats.** Hawthorne effects (GMs aware of observation), differential attrition, and contamination across co-played tables. Power and the assumed effect size are placeholders until Part 1 yields the engagement variance and clustering ICC.

---

## PART 3 — Preregistration (registerable core)

OSF-style. Bracketed values are placeholders to be fixed from Part 1 before confirmatory data collection, then frozen.

**Title.** A behaviorally grounded latent typology of tabletop role-playing players.

**Confirmatory hypotheses.**
- H1 (structure): a six-factor model (N, T, O, S, E, I) fits better than 1-, 3-, and 5-factor alternatives. Pre-registered contingency: if T and O fail discriminant validity, a five-factor model merging them into Mastery is the fallback, declared in advance.
- H2 (reliability): omega >= .70 for each retained factor.
- H3 (discriminant): HTMT < .85 for the N-S and T-O pairs.
- H4 (convergent, MTMM): for each axis, the monotrait-heteromethod correlation (self-report vs. behavioral) exceeds its heterotrait-heteromethod and heterotrait-monomethod values.
- H5 (criterion): the stated-minus-measured gap positively predicts vibe-check dissatisfaction for the affected player.
- H6 (causal): the ITT effect of the nudge on the targeted player's next-session satisfaction is greater than zero; the CACE exceeds the ITT.

**Design plan.** Observational measurement (Parts 1A, 1B) plus the randomized nudge trial (Part 2). Cross-classified structure (player crossed with session, nested in table). Continuous-time SEM for the irregularly spaced session trajectory.

**Sampling and stopping.** As Part 1 (EFA N >= 300; CFA N >= 200; G-study 15 to 25 tables at 6 to 8 sessions). Trial sample sized from Part 1 variance components to detect a standardized effect of [d = 0.3] at 80 percent power given table-level ICC of [rho = TBD]. No optional stopping; sample sizes fixed in advance.

**Variables.**
- Measured: TPDI factor scores; behavioral indicators per axis (exposure-normalized, class-residualized); vibe-check satisfaction; attendance; retention.
- Manipulated (trial only): nudge surfaced vs. withheld.
- Derived indices: ipsatized flavor profile; normative intensity; spotlight-equity dispersion; stated-minus-measured gap.

**Analysis plan.** Bayesian hierarchical estimation (Stan / brms / ctsem). Report full posteriors. Inference by the region of practical equivalence: an effect counts when the posterior mass beyond a ROPE of [+/- 0.2 SD] exceeds [95 percent], under an asymmetric loss penalizing false alarms more than misses. Measurement invariance tested across capture modality before pooling. MTMM estimated via CFA (CT-C(M-1)).

**Missing data.** Absence and off-mic are treated as potentially non-ignorable (MNAR); presence is modeled explicitly (selection or pattern-mixture), not assumed missing-at-random.

**Outliers and exclusions.** Careless responders excluded by the attention check and the reverse-consistency pair, declared before scoring. No behavioral session excluded except for documented capture failure.

**Confirmatory vs. exploratory.** H1 to H6 are confirmatory. Archetype discovery (LPA / archetypal analysis count and labels) and the LTA transition structure are exploratory in this round and labeled as such in any report.

---

*v0.1. The architecture is frozen; every bracketed number is provisional until the pilot variance components are in hand, at which point this document is updated once and timestamped.*
