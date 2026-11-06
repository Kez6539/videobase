# Project format and review boundaries

`src/project.ts` is the strict, versioned schema. `examples/defined-detail.json` is a real unapproved project rather than a fake completed example.

- `brief`: audience, problem, supported promise, action, tone and public sources.
- `brand`: business-specific headline, authentic logo path, colours, one action and destination.
- `script`: character lines with performance and real timings, closing copy, delivery and pronunciation.
- `voice`: casting references and the separately imported actual business recording. The recording carries its script hash.
- `assets`: local relative paths and SHA-256 hashes. Signed URLs and credentials do not belong in public manifests.
- `timeline`: independent beats, source trims, native speech region and intentional narrator space. `audioUntil` is relative to the start of that beat. Spoken beats must keep speed 1.
- `policy`: minimum reaction and end-card space, speech-rate ceiling, narrator entry and project credit cap. Timing values are review defaults, not universal laws of comedy.
- `generation`: an optional exact tool request, workspace and current credit quote. It is null in the supplied project.
- `reviews`: explicit reviewer decisions and evidence, attached to hashes of the relevant inputs. The latest dated decision wins. Historical approvals cannot override newer feedback by being imported later.
- `delivery`: exact candidate paths and hashes; final approval includes this evidence.

## Hash scope

Brief → brief and brand. Script → brief, brand and words. Voice → all of those, casting direction and the voice file's asset record. Timing → those inputs plus media, timeline and policy. Spend → timing inputs plus the exact request and quote. Final → those inputs plus the candidate artifacts.

This is an offline review receipt, not an identity or authentication system. Browser exports are imported with `import-review`; stale receipts are rejected. Production agents must preserve the user's actual decisions and must never fabricate approval records.

## Media and evidence

The source repository is public. Keep local media and account data in ignored `.videobase/`. `verify-assets` resolves paths and checks bytes before rendering. A generated voice must not be accepted merely because a transcription has the right words. Listen to it dry and with the picture; inspect actual delivery, accent and brand pronunciation.

Candidate checks include decode, dimensions, duration and audio sample rate. Loudness is normalized during rendering. A technical report does not certify performance, typography, humour, lip sync or visual continuity. Human review remains explicit.


## Creative development

creative records alternatives, selectionReason, service truth, continuity references, rejected-cut lessons, process/result coverage and spokenClose (businessName, service, action). The chosen dialogue must match script.lines; the complete closing copy must match script.closingCopy.

Optional authorization records an explicit agent-directed-development instruction, grantedBy=user and an ISO time. It permits development, not final creative acceptance. Missing authority retains review-first behavior. Future-dated grants cannot bypass review.

policy.maxCredits is a nonnegative integer or null. Null means no project ceiling; zero disables spend. Requests still need current quotes. A stable request identity excludes volatile quote dates. generation.takeLabel names an intentional extra performance; generation.purpose identifies scene, process or result.

Timeline shots may declare role and per-profile framing rectangles. Assets may declare scriptHash; a spoken source in a creative candidate must match dialogueHash. A creative candidate requires actual video assets for process and result. Placeholders remain draft-only.

Brand settings support fontFamily, a verified fontAsset and per-profile sceneLogo coordinates. Fonts remain private assets. Measured end-card bounds are written next to each generated card. Media paths keep the existing workspace boundary checks.

## Caption-led visual projects

script.format can explicitly be caption-led, with no invented character lines. script.displayCopy and display captions carry the visible words, bound to the selected concept. They do not enter the spoken VTT. Dialogue projects still need actual spoken setup video before a candidate render. Both formats require produced process and result footage, an actual script-bound brand read, and separate final human review. The visual colour project is a distinct alternative; it does not complete the blocked spoken plan.

## Exact narrator identity

voice.requireExactSelectedVoice can require the selected library identity. Candidate and release checks require matching referenceVoiceId with library or existing-recording provenance. A reference recreation remains an audition even when it has the same source voice ID. Character-scene development eligibility is unchanged; it must not silently relax this final narrator requirement.
