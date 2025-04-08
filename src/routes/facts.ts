import { Router } from "express";

const router = Router();

const facts = [
  "The Great Pyramid of Giza is the only one of the Seven Wonders of the Ancient World still standing!",
  "Egyptians were the first to invent written language using hieroglyphics.",
  "Egypt is home to the longest river in the world – the Nile."
];

router.get("/", (_req, res) => {
  const randomFact = facts[Math.floor(Math.random() * facts.length)];
  res.json({ fact: randomFact });
});

export default router;
