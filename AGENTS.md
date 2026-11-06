# VideoBase production rules

This is the reusable production base for Keiron's business adverts. Read the project JSON and the current review history before producing an advert. The user's current instruction overrides these defaults.

## The reference and the failure

The CTN Facebook set is Keiron's chosen quality reference. Its selected narrator is Adam Stone, voice ID `DEFpwxCUkrj3WAbTDRTZ`. This is a casting and direction reference, not blanket approval to reuse CTN audio for another business.

The first Defined Detail advert was rejected for its voice and rushed delivery. Do not describe it as approved or use it as a quality template. See `docs/defined-detail-review.md`.

## Work in this order

1. Read the business source, write the brief, choose one concrete audience problem and one action.
2. Follow [prompts/creative-director.md](prompts/creative-director.md). Write several business-specific ideas. Pick one with an understandable situation, a real character exchange and a reason the joke relates to the service. Do not recycle a CTN script with business names changed.
3. Review the words and intended performance before commissioning new footage.
4. Listen to existing casting references. Create a short dry recording of the actual proposed business copy only when that audition spend is explicitly authorized. Let Keiron choose the read. Never silently replace an unavailable voice with a preset. Do not use music to conceal a poor performance.
5. Build an offline timing study from existing media, stills or explicit placeholders. Preserve reaction space, normal speech speed and a readable close. Blank narration is labelled as blank, not represented as a finished voiceover.
6. Get explicit script, voice and timing approval. Reviews record the exact input hash, reviewer, decision and evidence. Do not invent human approvals, write approvals on Keiron's behalf or treat an automated test as an approval. A prior good CTN advert is not an approval of a new script or recording.
7. Price one concrete generation request in the connected workspace. Verify current capabilities and cost. Set a project cap and obtain approval of that request. Run `reserve` before submitting it once through Runway. Record its task id immediately. On ambiguous errors, inspect the task/ledger; do not blindly submit again or buy credits.
8. Reuse footage, logos, selected recordings and existing takes wherever the idea permits. Keep generated typography out of the footage; compose the real brand and captions in the edit.
9. Render a candidate only after the relevant reviews are current. Do not truncate or speed up a spoken line to make the duration fit. Adjust the edit or re-perform it after review.
10. Watch and listen to the candidate at phone size. Check performance, accent, pronunciation, intelligibility, humour, timing, continuity, service relevance and the close. Decode, loudness and transcript checks are separate technical evidence. They cannot tell you that a voice is good or that a joke lands.
11. Record final approval of the exact candidate hashes, then `release` copies those exact bytes. Deployment does not imply approval; never replace an approved master silently.

## Explicit development authority

The user's current instruction overrides the default per-stage approval workflow. An explicit instruction to develop and try the advert autonomously can be recorded in authorization, with the exact instruction and time. This permits agent-directed development without fabricating human approvals. It does not grant final creative acceptance or bypass actual-script, coverage, recording, quote or task-receipt checks. Projects without that authority remain review-first.

A null maxCredits means no user-imposed project ceiling. Zero still disables spend. Every request needs a current quote and receipt. Do not buy credits automatically. Name purposeful additional takes; refreshing a quote must not disguise a duplicate request.

A creative candidate needs actual process/result video assets and a spoken source bound to the exact character script. A plan is not produced footage. Release still requires final human approval of the exact files.

A new read recreated from the selected narrator reference must be labelled reference-based with reference/output hashes. Never describe it as the original recording or an official library render. The actual business, service and action must be spoken.

## Project and delivery

- Repository: personal account `Kez6539/videobase`, default branch `main`. Confirm the remote before publishing code.
- TypeScript strict mode; run `npm run check` and `npm run build`.
- Keep API keys, signed asset URLs, local media, ledgers and generated work out of Git. `.videobase/` and `public/media/` are ignored.
- No paid provider client is included. The workbench cannot spend credits. The reservation command produces a request receipt for an external, explicitly authorized submission. This protects the workflow only when the agent follows it.
- Public review hosting uses a static build. Browser notes remain in that browser until the user exports a project or review receipt and it is imported into the repository. Do not claim server persistence.
- Keep previous versions available for comparison. A timing study is a draft, not a replacement finished advert.

The fourth Defined Detail cut was rejected for replacing acted comedy with silent captions. Preserve brief.format across production failures. A blocker does not authorise a format change; mark the performance pending and retain the rejection. Do not spend on another render before presenting the revised spoken script and filming direction to Keiron.
