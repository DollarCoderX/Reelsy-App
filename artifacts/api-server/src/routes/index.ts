import { Router, type IRouter } from "express";
import healthRouter from "./health";
import authRouter from "./auth";
import verificationRouter from "./verification";
import mediaRouter from "./media";
import engagementRouter from "./engagement";
import groqRouter from "./groq";
import postsRouter from "./posts";
import usersRouter from "./users";
import friendsRouter from "./friends";
import messagesRouter from "./messages";
import storiesRouter from "./stories";
import blocksRouter from "./blocks";
import hashtagsRouter from "./hashtags";

const router: IRouter = Router();

router.use(healthRouter);
router.use("/auth", authRouter);
router.use("/engagement", engagementRouter);
router.use(verificationRouter);
router.use(mediaRouter);
router.use(groqRouter);
router.use(postsRouter);
router.use(usersRouter);
router.use(friendsRouter);
router.use(messagesRouter);
router.use(storiesRouter);
router.use(blocksRouter);
router.use(hashtagsRouter);

/**
 * Music search powered by Apple iTunes Search API.
 * Returns tracks in the same shape the frontend already expects from Jamendo:
 *   { results: [{ id, name, artist_name, audio, image }] }
 *
 * Each `audio` field is a free 30-second AAC/M4A preview URL that plays
 * in-browser with `new Audio(url)` — no API key required.
 *
 * Note: SERPER_API_KEY is stored as a secret and available for future
 * search features via process.env.SERPER_API_KEY.
 */
router.get("/music/search", async (req, res) => {
  const { q } = req.query;
  if (!q) {
    res.status(400).json({ error: "Query parameter 'q' is required" });
    return;
  }
  try {
    const itunesRes = await fetch(
      `https://itunes.apple.com/search?term=${encodeURIComponent(q as string)}&media=music&entity=song&limit=15&country=us`
    );
    if (!itunesRes.ok) throw new Error(`iTunes API error: ${itunesRes.status}`);
    const data = await itunesRes.json() as { results: any[] };

    // Map to Jamendo-compatible shape so the PostComposer needs no changes
    const results = (data.results || [])
      .filter((t: any) => t.previewUrl) // skip tracks with no preview
      .map((t: any) => ({
        id: t.trackId,
        name: t.trackName,
        artist_name: t.artistName,
        audio: t.previewUrl,
        image: t.artworkUrl100?.replace("100x100bb", "200x200bb") ?? t.artworkUrl100,
        album: t.collectionName,
        releaseYear: t.releaseDate ? new Date(t.releaseDate).getFullYear() : null,
      }));

    res.json({ results });
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch music from iTunes" });
  }
});

export default router;
