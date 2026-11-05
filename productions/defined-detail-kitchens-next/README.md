# Defined Detail: Kitchen's Next

[Watch the review cut](https://meetingai.comparethenetworks.com/ads/media/defined-detail-kitchens-next/index.html).

The car is so clean that its owner's partner assumes he bought a new one.

> Woman: When did you buy that?
>
> Man: It's ours. Had it detailed.
>
> Woman: Lovely. Kitchen's next.

The closing card names the actual service: car cleaning and detailing in Telford. The authentic Defined Detail logo and message CTA are composed in the edit.

## Why this version exists

Keiron rejected Personal Space: "thats terrible. try again, look at the comparethenetworks ones, they are laods better". He then clarified the actual product: "its about cleaning cars, sparkling clean?"

The CTN wedding and psychic films were inspected as the reference. This remake uses a complete three-turn exchange, a clean car in the foreground, close readable faces and a quiet reaction. It does not rely on spotting a one-inch movement or cutting an unclear line. All three spoken turns remain at their original speed.

This is a new review candidate. Keiron has not accepted the finished creative. Do not describe technical playback or a transcript as a creative approval.

## Spend and provenance

One new ten-second take used 400 credits from the connected Runway workspace. The same generation family used by the CTN wedding and psychic sketches was used here. No paid rerolls or new voice generation were made.

Adam's complete original "There's a simpler way" phrase is reused from the existing selected recording. This is the original performance, without speech acceleration, voice substitution, cloning or new pronunciation. It begins after the last character line and a reaction. The end card holds for 5.5 seconds; each film lasts 15.6 seconds.

The generated couple and scene are fictional. This is not represented as footage of an actual Defined Detail customer or completed job. Paint and glass reflections show the clean finish, with no artificial sparkle effects.

## Rebuild on Hermes

Private assets remain at /opt/videobase/.videobase/projects/defined-detail-kitchens-next/. No media, credentials or signed provider URLs are committed.

- generate_endcards.py builds the cards using the existing logo and Poppins files on Hermes. Run it with /opt/ctn-new-hire-video/ltx-venv/bin/python, which supplies Pillow.
- edit.json holds caption times, original-speed source segment and separate Reels/Feed crops. The native scene is retained in full.
- render.py uses Python 3.12 and ffmpeg to build one shared audio mix, burn the dialogue captions, compose the real logo and append the cards. Both formats copy the same encoded audio. Existing files in publish/ are replaced when explicitly rerendering this private candidate, so preserve a copy before revisions.
- index.html is the hosted preview and download page.
- production.json records the request, actual spend, media hashes and technical checks.

The renderer expects source.mp4 and adam-original-line.wav in the private directory, and the card artwork in output/. It uses the existing original Adam and licensed music files and the logo/font paths written in the scripts. No paid provider client is part of either rebuild script.

Before another paid take, inspect the prior receipt and request. Never resubmit a generation just because a render or page check fails. User rejection is a creative decision; a successful encode cannot override it.

## Technical verification

Both exports fully decoded and played to the end in Chromium on Hermes. Format switching and the selected download link passed. A 390-pixel phone viewport had no horizontal overflow. No browser errors were recorded.

All hosted file hashes match the manifest. Both videos support HTTP range requests. The ZIP passed its CRC check. Reels and Feed carry identical encoded audio packets. Integrated audio loudness measured -16.1 LUFS, with a true peak of -2.0 dBFS. These checks establish file and playback behavior, not creative or listening approval.
