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

router.get("/music/search", async (req, res) => {
  const { q } = req.query;
  if (!q) {
    res.status(400).json({ error: "Query parameter 'q' is required" });
    return;
  }
  try {
    const jamendoRes = await fetch(
      `https://api.jamendo.com/v3.0/tracks/?client_id=b6747d04&format=json&search=${encodeURIComponent(
        q as string
      )}&limit=15&audioformat=mp31&imagesize=200&order=popularity_total`
    );
    const data = await jamendoRes.json();
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: "Failed to fetch from Jamendo" });
  }
});

export default router;
