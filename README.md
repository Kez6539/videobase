# VideoBase

A production workbench for business adverts. Develop the idea, show the service, record the actual business copy and compose the edit before treating a render as an advert.

Built around Keiron's preferred [CTN set](https://meetingai.comparethenetworks.com/ads/media/facebook-ready/index.html). The rejected Defined Detail cuts remain as comparisons. The featured project is the new 16.5-second [caption-led visual cut](https://meetingai.comparethenetworks.com/ads/media/defined-detail-colour/index.html): dirty car, actual foam-rinse footage, matching clean result and a new brand-specific read. The separately approved spoken scene remains pending after automatic approval review blocked its reservation. See [the production record](productions/defined-detail-colour/README.md).

## Run it

Requires Node 24 or newer. Local rendering additionally needs FFmpeg and FFprobe on PATH, or `FFMPEG_PATH` and `FFPROBE_PATH` pointing to their executables.

```sh
npm ci
npm run dev
```

The workbench has five views: ideas and service, reference comparison, voice and script, pacing study, and review decisions with the credit lock. It supports new business drafts, project imports/exports and local decision history. Existing voice previews do not incur generation credits.

The page is static. Notes stay in the current browser until exported. Download the project or review receipt to preserve the decision in the repository. There are no account credentials, billing access or generation calls in the web app.

## The actual workflow

Business source -> alternative concepts -> selected script and service coverage -> actual branded read -> timing study -> priced takes -> assembly -> candidate -> human final review -> release.

Changing the brief invalidates downstream reviews. Changing the script invalidates its voice and edit reviews. Changing a voice file invalidates its voice review. Retiming the edit invalidates timing and spend approval. Final approval attaches to the exact candidate file hashes.

Reference selection is not approval of a new recording. The original study retains its zero-credit cap and empty review history. The featured colour-reveal project records Keiron's current instruction to improve the repo and try again without a credit ceiling. It still has no invented human approvals, and its coverage plan alone cannot pass as a finished candidate.

The review rules are workflow controls, not authenticated digital signatures. Reviewers explicitly attest to their decisions; agents must not manufacture those records. See [AGENTS.md](AGENTS.md).

## CLI

```sh
npm run vb -- audit examples/defined-detail.json
npm run vb -- plan examples/defined-detail.json
npm run vb -- review-hashes examples/defined-detail.json
npm run vb -- import-review examples/defined-detail.json downloaded-reviews.json
```

Media stays local and outside Git. Import the source and real logo to reproduce the timing study:

```sh
npm run vb -- import-asset examples/defined-detail.json source path/to/runway-master.mp4
npm run vb -- import-asset examples/defined-detail.json logo path/to/defined-detail-logo.png
npm run vb -- verify-assets examples/defined-detail.json
npm run vb -- render examples/defined-detail.json reels draft
npm run vb -- render examples/defined-detail.json feed draft
```

The CLI verifies each media hash, renders from the edit timeline, adds captions, keeps dialogue at normal speed, produces a real brand card, fully decodes the output and checks its dimensions, duration and 48 kHz audio. Drafts are marked as timing studies. The reviewed project JSON remains the source of editorial decisions.

The renderer supports explicit per-shot Reels/Feed crops, scene-logo placement, verified font assets and measured end-card text bounds. Legacy shots retain full-frame fitting. Actual caption times belong to the performed take. A full spoken VTT is exported; the brand card supplies closing information while narration continues. Explicit caption-led projects bind their visible copy to the selected concept and do not pretend those headlines were spoken. Dialogue projects additionally require actual script-bound spoken setup video.

The creative desk compares five ideas, with an opening image, punchline, service connection, visible payoff, likely failure and selection reason. Rejected-cut lessons remain visible. These are editorial records, not automatic humour scores.

Compile separate scene, coverage, voice and assembly directions without spending credits:

    npm run vb -- creative-audit examples/defined-detail-colour.json
    npm run vb -- prompt-pack examples/defined-detail-colour.json

Read [the creative-director brief](prompts/creative-director.md) before writing filming prompts. A generic narrator sentence cannot substitute for the actual business close. A plan cannot substitute for produced process/result footage. Changed dialogue cannot silently retain an old filming prompt or spoken-source binding.

For another business, use **New business** in the workbench and export its project. Fill the brief, sources, script, voice direction, brand and media records. Do not copy the Defined Detail joke into an unrelated company.

## Spending

There is deliberately no paid generation client in this version. A concrete request can be configured in the project JSON and reserved only after current brief, script, voice, timing and spend reviews. Prices must be checked within 24 hours against the connected account and provider. API and web-workspace balances are separate; do not assume one funds the other. [Runway pricing](https://docs.dev.runwayml.com/guides/pricing/) is a reference, not a promise of a fixed price.

```sh
npm run vb -- reserve examples/your-project.json
# Inspect .videobase/requests/<request-id>.json, submit once using the approved connection.
npm run vb -- record-task <request-id> <runway-task-id>
npm run vb -- record-task <request-id> <runway-task-id> <actual-credits>
```

Explicit authorization permits agent-directed development without manufacturing human reviews. A null project cap means no credit ceiling; zero still disables spend. Final release requires human approval of the exact candidate. Current prices and provider balances still apply.

Reservations use an exclusive file lock. An identical request cannot be reserved twice, even after its quote is refreshed. Purposeful extra takes need an explicit takeLabel, and reserved plus spent credits count against the project cap. Record the provider task id before moving on. The tool does not automatically retry, purchase credits or change models. A crash leaves the reservation in place so the operator investigates rather than risks a duplicate submission.

## Candidate and release

Attach the actual recording with its listening-preview URL. This imports the bytes, measures the duration and binds the recording to the current closing script. It does not approve the voice:

```sh
npm run vb -- attach-voice examples/your-project.json path/to/recording.mp3 https://your-host/recording.mp3
```

Listen to that exact recording and record current reviews. Candidate renders are not paid operations:

```sh
npm run vb -- render examples/your-project.json reels candidate
npm run vb -- render examples/your-project.json feed candidate
# Watch/listen to both candidates, then import final review of their hashes.
npm run vb -- release examples/your-project.json
```

`release` verifies the current approvals and file hashes, then copies the exact candidate bytes into a separate release directory. It does not publish an advert or launch an advertising campaign.

## Checks and hosting

```sh
npm run check
npm run build
```

The tests cover creative/script consistency, produced service coverage, branded narration, development authority, unlimited budgeting, quote-refresh duplicates, stale approvals, wrong voice scripts, rushed lines, missing reaction time, short closes, duplicate and concurrent reservations, cap enforcement, task receipts and asset boundaries. GitHub Actions runs the checks and static build on `main`. Playback review evidence counts the union of audible, visible, normal-speed intervals; looping one fragment or seeking cannot inflate coverage.

Serve `dist/` from any static web host. Add the locally rendered study at `public/media/defined-detail-pacing-study.mp4` before building if you want the sample study to play. Video media is intentionally not redistributed in the public source repository. A build without that file still supports the comparison and editor, and clearly reports the missing study rather than pretending it played.

See [the editorial comparison](docs/defined-detail-review.md) and [the project format](docs/project-format.md).


## Reference-based voice auditions

The optional scripts/reference_voice.py creates a new labelled audition from an authorised reference on the production host. It uses an isolated Qwen TTS environment and makes no paid provider calls. It records the source hash, script, model revision, output hash and duration. It does not claim the output is the original recording or an official voice-library render.

Install the CPU PyTorch build and scripts/requirements-voice.txt in a separate environment. The current project does this work on Hermes. [Qwen's official documentation](https://github.com/QwenLM/Qwen3-TTS#voice-clone) describes the reference-audio and transcript interface. Pronunciation, delivery and voice similarity still need listening review.
