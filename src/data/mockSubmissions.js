import { proofSceneDataUri } from "../components/ui/proofSceneData.js";

/**
 * MOCK_SUBMISSIONS — dev/demo feed data.
 *
 * Split out of data/game.js so the heavy proofSceneData SVG generator is not
 * pulled into the main bundle (game.js is imported everywhere). Only the
 * lazy-loaded Feed uses these, so they belong in the Feed chunk.
 */
export const MOCK_SUBMISSIONS = [
  {
    id: 1,
    user: "@marina_sol",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Marina&backgroundColor=b6e3f4",
    caption: "Double espresso, no mercy ☕ Day 4 and still standing",
    time: "14 min ago",
    votes: { real: 89, fake: 3 },
    fires: 24,
    status: "verified",
    accuracy: 91,
    location: "Lisbon, Portugal",
    gpsShared: true,
    mediaUrl: proofSceneDataUri({ scene: "cafe", seed: 1, width: 600, height: 400 }),
  },
  {
    id: 2,
    user: "@kai_nomad",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Kai&backgroundColor=c0aede",
    caption: "they said I wouldn't make it. still here. 🏖️",
    time: "31 min ago",
    votes: { real: 124, fake: 2 },
    fires: 67,
    status: "verified",
    accuracy: 84,
    infiltrator: true,
    location: "Tokyo, Japan",
    gpsShared: true,
    mediaUrl: proofSceneDataUri({ scene: "beach", seed: 2, width: 600, height: 400 }),
  },
  {
    id: 3,
    user: "@ghost_protocol",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Ghost&backgroundColor=ffd5dc",
    caption: "Is this even a beach? Looks like someone's backyard pool 🤔",
    time: "52 min ago",
    votes: { real: 38, fake: 41 },
    fires: 3,
    status: "pending",
    accuracy: 72,
    location: null,
    gpsShared: false,
    mediaUrl: proofSceneDataUri({ scene: "beach", seed: 3, width: 600, height: 400 }),
  },
  {
    id: 4,
    user: "@luna_waves",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Luna&backgroundColor=d1d4f9",
    caption: "Sunrise swim while eliminating competition 🌊",
    time: "1h ago",
    votes: { real: 201, fake: 1 },
    fires: 112,
    status: "verified",
    accuracy: 95,
    location: "Nairobi, Kenya",
    gpsShared: true,
    mediaUrl: proofSceneDataUri({ scene: "beach", seed: 4, width: 600, height: 400 }),
  },
  {
    id: 5,
    user: "@spectre_x",
    avatar: "https://api.dicebear.com/9.x/adventurer/svg?seed=Spectre&backgroundColor=ffdfbf",
    caption: "This is my 3rd beach today. I am built different.",
    time: "2h ago",
    votes: { real: 44, fake: 31 },
    fires: 8,
    status: "flagged",
    accuracy: 58,
    infiltrator: true,
    location: "Berlin, Germany",
    gpsShared: false,
    mediaUrl: proofSceneDataUri({ scene: "beach", seed: 5, width: 600, height: 400 }),
  },
];
