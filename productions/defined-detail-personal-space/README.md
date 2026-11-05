# Personal Space

[Watch the new review cut](https://meetingai.comparethenetworks.com/ads/media/defined-detail-personal-space/index.html).

A nervous supercar owner hovers over a detailer. Asked for a little space, he moves a tiny distance. The detailer replies, "Perfect." The visual joke leads into the original Adam recording and a six-second Defined Detail close: "Particular? So are we."

This is a review candidate. Keiron has not yet accepted the finished creative. Technical checks do not establish that the voice or performance works.

## Production record

- One 10-second Runway take, 170 credits total. No paid rerolls.
- The selected Adam Stone recording supplies the complete phrase "There's a simpler way." No new voice generation, substitution or speech acceleration.
- The unclear owner question was removed. Retained source segments and captions are in edit.json.
- Reels: 1080 x 1920. Feed: 1080 x 1350. Both 13.5 seconds, H.264, 30 fps, stereo AAC at 48 kHz.
- The fictional generated scene illustrates the situation. It is not footage of an actual Defined Detail customer or completed job.
- The real logo, service names, captions and CTA are composed in the edit. No unverified certification, guarantee or price claims.
- Rendering, media inspection and browser checks ran on Hermes after the user requested VPS production. Previous advert links remain available.

## Reuse without more generation

The private production directory on Hermes is /opt/videobase/.videobase/projects/defined-detail-personal-space/. It retains the raw take, native-speed edit, original Adam excerpt, card artwork and exported files. Media and signed provider URLs are deliberately excluded from Git.

render.py records the actual compositor, captions, safe framing, foot insert, incidental plate mask, audio assembly and export settings. edit.json records the retained source segments. index.html is the deployed review/download page. production.json records provenance, spend and exact public hashes.

The renderer expects edited-source.mp4, edited-metadata.json, adam-original-line.wav, edit.json, output/endcard-reels.png, output/endcard-feed.png, output/ and publish/ in that private directory. It uses the existing real logo and Poppins fonts at the Hermes paths in the script.

Existing movies are skipped to avoid accidental replacement. For a revision, copy the production to a new private directory and preserve the previous exports. No provider call is part of rendering. Do not imply final approval, silently replace a master, or commission another paid take from this recipe.

## Verification

Both final files fully decoded. Hosted bytes match SHA-256 hashes in the manifest. Both played to the end in headless Chromium on Hermes. Format switching, voice file loading, HTTP range requests and phone-width layout were checked. The page had no browser errors; previous advert links returned HTTP 200. These are technical checks, not a listening or creative approval.
