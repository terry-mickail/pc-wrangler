# TTRPG Player Disposition Inventory (TPDI)
### Pilot-ready draft, v1.0 — cold-start self-report instrument

**Status.** Fieldable for the validation study (Section 8). NOT yet a validated production scale. Nothing here should be scored as a real profile until it clears validation.

**Purpose.** Produce a per-player Bayesian *prior* across six latent dispositions, used to seed the player-typing model before behavioral session data exists. Stated preference is the prior; observed in-session behavior is the likelihood; the evolving profile is the posterior. The gap between stated and measured is itself a primary signal, not error to be smoothed away.

**Core design principle (carried from the construct model):** direction is compositional, magnitude is normative. The five flavor axes (N, T, O, S, E) describe *what* a player is into and are scored relative to that player's own profile shape. The sixth axis (I) describes *how much* they show up and is scored relative to other people. The instrument enforces that split by design.

---

## 1. The six constructs and their literature anchors

Each construct is a reflective latent factor (the disposition causes the responses). Anchors are the peer-reviewed lineage, so the structure is precedented rather than invented.

| Axis | Construct | Primary anchors |
|------|-----------|-----------------|
| **N** | Narrative / Character Immersion | Bowman & Standiford (2016) character + narrative immersion; Calleja (2011) narrative + affective involvement; Yee (2006) role-playing sub-factor |
| **T** | Tactical / Encounter Engagement | Bowman (2016) "game" immersion; Calleja (2011) tactical involvement; Yee (2006) achievement |
| **O** | Optimization / System Mastery | SDT competence (Ryan, Rigby & Przybylski 2006); Yee (2006) mechanics/advancement; achiever literature |
| **S** | Social / Table Cohesion | SDT relatedness; Bowman (2016) community immersion; Yee (2006) social |
| **E** | Exploration / Discovery | Bowman (2016) environment immersion; Calleja (2011) spatial involvement; Yee (2006) discovery |
| **I** | Engagement Intensity / Presence | Brockmyer et al. (2009) GEQ; Brown & Cairns (2004) engagement-engrossment-immersion gradient; Calleja "incorporation" |

---

## 2. Administration

**Respondent-facing intro (onboarding screen):**
> A few questions about how you like to play. There are no right answers and no "good" player type. This helps the app understand your preferences so it can give your GM a more useful picture of the table. Your answers are combined with session data to build a profile you can change any time. Answer for how you actually play, not how you think you should.

**Instructions:**
> Rate how much you agree with each statement, thinking about your tabletop RPG play in general (not one specific character or session). If you have not played enough to judge a statement, choose "No basis to answer."

**Response scale (core items):** 1 = Strongly disagree, 2 = Disagree, 3 = Neither, 4 = Agree, 5 = Strongly agree, plus a separate **No basis to answer** option (treated as missing, not as a midpoint; important for newer players in cold-start).

**Ordering:** randomize item order in the live form; the axis grouping below is for construction and scoring only. Interleave the Section 5 validity items.

---

## 3. Core item bank (Likert)

Items are written TTRPG-native, not ported from MMO scales. **(R)** marks reverse-keyed items. Each factor is intentionally **over-sampled** (6 to 7 candidate items) so the pilot can prune to the best 4 to 5; the weakest loaders get cut at EFA. "Retain target" per factor is 5.

### N — Narrative / Character Immersion
- N1. I enjoy speaking and acting in my character's voice during play.
- N2. I make in-game choices based on who my character is, even when it is not the optimal play.
- N3. The emotional beats of the story matter more to me than the mechanical outcomes.
- N4. During a strong scene I lose track of myself and feel like I am inside my character.
- N5. I care a lot about my character's relationships with NPCs and their personal arc.
- N6. **(R)** I mostly think of my character as a set of stats and abilities rather than a person.
- N7. **(R)** I would be just as happy playing a blank pre-gen as a character I wrote a backstory for.

### T — Tactical / Encounter Engagement *(situational: this fight, in the moment)*
- T1. In the middle of a fight, I enjoy reading the board and finding the best move available right now.
- T2. While combat is happening I am thinking about positioning, action economy, and turn order.
- T3. I get the most satisfaction when smart in-the-moment play turns a fight around.
- T4. I like adapting my tactics on the fly as an encounter develops.
- T5. A tense, well-designed encounter is more exciting to me than a clever character build. *(T-over-O discriminator)*
- T6. **(R)** Once a fight starts I mostly just attack and do not think much about tactics.

### O — Optimization / System Mastery *(systemic: the build and rules as objects, mostly between sessions)*
- O1. I enjoy designing a character build for mechanical power, apart from any particular fight.
- O2. I read rules, splatbooks, or theorycrafting threads for fun between sessions.
- O3. I take satisfaction in understanding rules interactions deeply, even ones that rarely come up.
- O4. I plan my character's progression several levels ahead.
- O5. I would enjoy optimizing a character even if I never got to play them in a real fight. *(O-over-T discriminator)*
- O6. **(R)** I do not really care how mechanically optimized my character is.

### S — Social / Table Cohesion *(real-table, out-of-character, player-directed)*
- S1. Spending time with the people at the table is a big part of why I play.
- S2. I try to pull quieter players into the action.
- S3. I enjoy the out-of-character jokes and banter as much as the game itself.
- S4. I keep an eye on whether everyone at the table is having a good time.
- S5. The friendships and group dynamic matter more to me than the campaign itself. *(S-over-N discriminator: real people over fiction)*
- S6. **(R)** I stay focused on my own character and do not really track how others are doing.

### E — Exploration / Discovery
- E1. I love uncovering the lore and history of the game world.
- E2. When the GM describes a new place, I want to investigate every corner.
- E3. I ask a lot of questions about how the world works.
- E4. Finding a hidden secret is more rewarding to me than winning a fight. *(E-over-T discriminator)*
- E5. I enjoy poking at parts of the world the GM did not obviously set up as content.
- E6. **(R)** I do not care much about the setting's backstory; I am here for the action.

### I — Engagement Intensity / Presence *(normative magnitude axis)*
- I1. I think about the campaign between sessions.
- I2. I look forward to game day for much of the week beforehand.
- I3. When it is not my turn, I am still fully tracking what is happening.
- I4. I am rarely distracted during play.
- I5. I put real effort into preparing for sessions (notes, planning, recaps).
- I6. **(R)** My attention often drifts during sessions (phone, side conversations).

*Note on I:* intensity self-report is the most exposed to social desirability ("of course I'm engaged"). Keep wording behaviorally concrete, lean on the Section 5 impression-management probe, and weight the behavioral likelihood heavily over this axis once session data arrives.

---

## 4. Covariates and demographics (collected once, used as model controls)

Not scored as personality. These exist because the construct model requires partialling them out, especially **class/role**, so the factors measure the player and not the character sheet.

- Years playing tabletop RPGs (continuous).
- Primary role: mostly player / mostly GM / roughly both.
- Number of different systems played (proxy for system breadth).
- **Current character class and subclass** (used to residualize T and O behavioral features later).
- Typical play format: in person / online / mixed (drives audio-capture reliability expectations).
- Tenure with current group (months).
- Sessions per month (engagement-opportunity baseline; denominator for some behavioral rates).

---

## 5. Validity and quality-control items

Embed these, scattered, among the core items.

- **Attention check (directed response):** "For quality control, please select Strongly disagree for this item."
- **Impression-management probe (idealized self):** "I always contribute exactly my fair share and never dominate the table." High agreement flags social-desirability responding; use to down-weight, not to exclude.
- **Reverse-consistency pair:** one near-paraphrase of an early item, reverse-worded, placed late. A large within-pair discrepancy flags careless responding.

---

## 6. Forced-choice supplement (optional; anti-gaming, ipsative)

Likert items are transparent and gameable, and acquiescence inflates them. For the five flavor axes, a forced-choice block reduces both problems and naturally enforces the compositional principle. Each block presents one statement per flavor axis; the respondent picks **most like me** and **least like me**. Use rotated framings so no axis wins on wording alone.

> **Scoring:** use a **Thurstonian IRT model**, not naive ipsative summing. Classic ipsative scoring induces artificial negative inter-scale correlations that break factor analysis; Thurstonian IRT recovers quasi-normative latent estimates from the comparisons, so these can share a latent space with the behavioral data.

**Block 1 — Most satisfaction in a session comes from:**
- (N) Living a moment fully as my character
- (T) Out-thinking a tough encounter through smart play
- (O) Pulling off a build or rules combo exactly as designed
- (S) Big laughs and good energy with the group
- (E) Discovering something hidden in the world or its lore

**Block 2 — After a great session, what I remember most is:**
- (N) An emotional beat my character lived through
- (T) A clutch tactical play that swung a fight
- (O) A mechanical move that worked perfectly
- (S) A moment of connection with the people at the table
- (E) Something surprising we found out about the world

**Block 3 — Where I put the most effort between sessions:**
- (N) Developing my character's personality and backstory
- (T) Thinking through tactics for likely encounters
- (O) Refining my build and reading rules
- (S) Keeping the group connected and scheduling
- (E) Theorizing about the setting and its mysteries

**Block 4 — The part of the game I would least want to lose:**
- (N) Getting to be someone else for a few hours
- (T) The thrill of a hard-fought encounter
- (O) The depth of the system to master
- (S) The table and the people
- (E) The world left to explore

**Block 5 — What most pulls me back to the table:**
- (N) My character's unfinished story
- (T) The next challenging fight
- (O) A build idea I want to try
- (S) Seeing my friends
- (E) What is around the next corner

---

## 7. Scoring

**Flavor axes (N, T, O, S, E): compositional.**
1. Reverse-score (R) items.
2. Average retained items within each axis to a raw score (treat "No basis to answer" as missing; require a minimum answered-item count per axis or flag low confidence).
3. Ipsatize within respondent (subtract the person's mean across the five flavor axes) to recover *profile shape* independent of overall response level. This is what puts a quiet method actor and a loud method actor in the same place.

**Intensity axis (I): normative.**
- Reverse-score, average, standardize *across respondents* (z-score against the population). Never ipsatize I against the flavor axes; that would re-merge magnitude into direction and reintroduce the volume confound.

**Cold-start handoff.**
- Convert axis scores to factor scores; treat as a prior mean per player. Because the instrument is short (low information), set a wide prior variance and shrink toward the population profile. Each subsequent session's behavioral estimate updates the posterior. Report the stated-minus-measured gap explicitly once both exist.

**Soft membership, not hard type.**
- Express the final profile as convex weights over archetypes (archetypal analysis or LPA posterior probabilities), e.g. "0.6 N, 0.3 E, 0.1 S," never a single bucket.

---

## 8. Validation plan (the rigor pass; clear before trusting any score)

1. **Cognitive pretest first.** Before any pilot, 6 to 10 players think aloud through every item. Fix wording the target audience misreads. TTRPG-native phrasing is easy to get subtly wrong.
2. **Pilot and dimensionality.** Target N >= 250 to 300 for stable EFA. Confirm the six-factor solution. Be prepared for T and O to collapse into one "Mastery" factor on early data; that is an honest outcome, not a failure. The discriminator items (T5, O5) are the main defense against it.
3. **Confirmation.** CFA on a held-out sample. Targets: standardized loadings > .50, no large cross-loadings, CFI/TLI > .90, RMSEA < .08.
4. **Reliability.** McDonald's omega (preferred) or Cronbach's alpha > .70 per retained factor.
5. **Discriminant validity.** Watch the two danger pairs: **N vs. S** (fiction/character-directed vs. real-table/player-directed) and **T vs. O** (situational vs. systemic). Bar: HTMT < .85.
6. **Convergent validity.** Correlate against an existing scale (PENS or the Online Gaming Motivations Scale) and confirm the established typologies project on cleanly: Power Gamer = high O, Tactician = high T, Method Actor = high N, Socializer = high S, Explorer = high E, Casual = low I.
7. **Test-retest stability.** Re-administer at 2 to 4 weeks; report ICC per axis. The trait-vs-state check.

---

## 9. Long form vs. production short form

There is a real tension: validation wants many items; onboarding cannot be 45 items or players abandon it.

- **Long form (this document, ~36 core + FC + covariates):** used only for the validation study.
- **Production short form (derived, not designed):** after validation, select the 2 to 3 highest-loading, most discriminating items per flavor axis plus 3 intensity items (roughly 13 to 18 items, about two minutes). It inherits validity *only* from the items the long form proved. Do not field a hand-picked short form as "validated."
- The forced-choice supplement is optional in both; offer it to players who want the harder-to-game version.

---

## 10. Ethics and presentation guardrails

- **Reactivity:** keep raw profiles GM-only at first. Players who see their type may perform to it or rebel, contaminating the behavioral signal.
- **Labeling harm:** "Casual" or "Butt-Kicker" can read as a verdict on a friend. Frame every output as a *preference*, always mutable, never a fixed judgment. Decide deliberately which labels a player ever sees.
- **Consent:** the prior is low-risk self-report, but it joins behavioral data captured from recorded sessions. The session-level consent gate covers both; state plainly that the questionnaire feeds the same profile.

---

## Appendix A — Scoring key (item to factor, reverse flags)

- **N:** N1, N2, N3, N4, N5, N6(R), N7(R)
- **T:** T1, T2, T3, T4, T5, T6(R)
- **O:** O1, O2, O3, O4, O5, O6(R)
- **S:** S1, S2, S3, S4, S5, S6(R)
- **E:** E1, E2, E3, E4, E5, E6(R)
- **I:** I1, I2, I3, I4, I5, I6(R) — normative scaling, do not ipsatize
- **Discriminator items (highest scrutiny at EFA):** T5 (T over O), O5 (O over T), S5 (S over N), E4 (E over T)
- **Validity items:** scored separately, not part of any factor.

---

## References

- Bowman, S. L. (2018). Immersion and shared imagination in role-playing games. In Zagal, J. & Deterding, S. (Eds.), *Role-Playing Game Studies: Transmedia Foundations*. Routledge. (Six RPG immersion categories: activity, game, environment, narrative, character, community.)
- Brockmyer, J. H., Fox, C. M., Curtiss, K. A., McBroom, E., Burkhart, K. M., & Pidruzny, J. N. (2009). The development of the Game Engagement Questionnaire. *Journal of Experimental Social Psychology, 45*, 624-634.
- Brown, E., & Cairns, P. (2004). A grounded investigation of game immersion. *CHI Extended Abstracts.* (Engagement, engrossment, total immersion.)
- Calleja, G. (2011). *In-Game: From Immersion to Incorporation.* MIT Press. (Six involvement dimensions: tactical, performative, affective, shared/social, narrative, spatial.)
- Kahn, A. S., Shen, C., Lu, L., Ratan, R. A., Coary, S., Hou, J., et al. (2015). The Trojan Player Typology: A cross-genre, cross-cultural, behaviorally validated scale of video game play motivations. *Computers in Human Behavior, 49*, 354-361.
- Motivation to Play Scale (MOPS) (2024). *Current Psychology.* DOI: 10.1007/s12144-024-06631-z. (LPA-derived four-profile typology; ESEM cross-validation.)
- Phan, M. H., Keebler, J. R., & Chaparro, B. S. (2016). The development and validation of the Game User Experience Satisfaction Scale (GUESS). *Human Factors, 58*(8), 1217-1247.
- Ryan, R. M., Rigby, C. S., & Przybylski, A. (2006). The motivational pull of video games: A self-determination theory approach. *Motivation and Emotion, 30*(4), 344-360. (SDT needs: autonomy, competence, relatedness; basis of PENS.)
- Przybylski, A. K., Rigby, C. S., & Ryan, R. M. (2010). A motivational model of video game engagement. *Review of General Psychology, 14*(2), 154-166.
- Yee, N. (2006). Motivations for play in online games. *CyberPsychology & Behavior, 9*(6), 772-775.
- Yee, N., Ducheneaut, N., & Nelson, L. (2012). Online gaming motivations scale: Development and validation. *Proceedings of CHI 2012*, 2803-2806.
- Also worth retrieving: Jennett et al. (2008), Immersive Experience Questionnaire (IEQ); and "The Challenge of Evaluating Player Experience in Tabletop Role-Playing Games" (2023) for a TTRPG-specific critique of porting video-game instruments.

---

*Draft v1.0, pilot-ready. Items are unvalidated until Section 8 clears. Build the production short form only from items the long form proves.*
