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
