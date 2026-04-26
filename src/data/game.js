export const DAILY_THEMES = [
  { id: 1, theme: "AT A CAFÉ", emoji: "☕", description: "Find a café, grab a seat, take the shot", color: "#FFB800" },
  { id: 2, theme: "AT A PARK", emoji: "🌳", description: "Touch grass. Literally.", color: "#00FF94" },
  { id: 3, theme: "AT A GYM", emoji: "🏋️", description: "No pain, no staying in the game", color: "#FF6B00" },
  { id: 4, theme: "WITH A FRIEND", emoji: "🤝", description: "Prove you have at least one", color: "#FF1A1A" },
  { id: 5, theme: "OUTSIDE AT SUNRISE", emoji: "🌅", description: "Early humans get the prize pool", color: "#FFB800" },
  { id: 6, theme: "AT A BOOKSTORE", emoji: "📚", description: "Rare breed. Show yourself.", color: "#00C8FF" },
  { id: 7, theme: "EATING SOMETHING", emoji: "🍜", description: "Humans gotta eat. Prove it.", color: "#FF6B00" },
  { id: 8, theme: "ON PUBLIC TRANSIT", emoji: "🚇", description: "We see you, commuter", color: "#AA55FF" },
  { id: 9, theme: "AT A GROCERY STORE", emoji: "🛒", description: "Domestic. But make it survival", color: "#00FF94" },
  { id: 10, theme: "AT A BEACH OR WATER", emoji: "🌊", description: "Coastal humans only (for now)", color: "#00C8FF" },
];

export const TODAY_THEME = DAILY_THEMES[Math.floor(Date.now() / (1000 * 60 * 60 * 24)) % DAILY_THEMES.length];

export const MOCK_SUBMISSIONS = [
  {
    id: 1,
    user: "0xHuman_7734",
    avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=human1",
    caption: "Double espresso, no mercy ☕",
    time: "14 min ago",
    votes: { real: 89, fake: 3 },
    status: "verified",
    image: "café"
  },
  {
    id: 2,
    user: "0xSurvivor_2291",
    avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=human2",
    caption: "they said I wouldn't make it. day 47.",
    time: "31 min ago",
    votes: { real: 124, fake: 2 },
    status: "verified",
    image: "café"
  },
  {
    id: 3,
    user: "0xGhost_4459",
    avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=human3",
    caption: "cold brew, warm soul, still breathing",
    time: "52 min ago",
    votes: { real: 67, fake: 18 },
    status: "pending",
    image: "café"
  },
  {
    id: 4,
    user: "0xLastOnes_8823",
    avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=human4",
    caption: "Matcha latte while eliminating competition 🍵",
    time: "1h ago",
    votes: { real: 201, fake: 1 },
    status: "verified",
    image: "café"
  },
  {
    id: 5,
    user: "0xSpectre_1107",
    avatar: "https://api.dicebear.com/7.x/identicon/svg?seed=human5",
    caption: "This is my 3rd café today. I am built different.",
    time: "2h ago",
    votes: { real: 44, fake: 31 },
    status: "flagged",
    image: "café"
  },
];

export const CHAT_MESSAGES = [
  { id: 1, user: "0xHuman_7734", msg: "day 47 let's gooo, who's still standing?", time: "2m" },
  { id: 2, user: "0xSurvivor_2291", msg: "flagging everyone who went to starbucks. that ain't a café", time: "5m" },
  { id: 3, user: "0xGhost_4459", msg: "my submission better not get flagged i literally walked 2km for this shot", time: "8m" },
  { id: 4, user: "0xLastOnes_8823", msg: "the prize pool is at 2.4 ETH now. i'm not sleeping", time: "11m" },
  { id: 5, user: "0xSpectre_1107", msg: "anyone else think today's theme was too easy? getting boring", time: "14m" },
  { id: 6, user: "0xHuman_7734", msg: "bro you have 31 fake votes lmaooo", time: "15m" },
  { id: 7, user: "0xSpectre_1107", msg: "those are my enemies voting. i have enemies because i'm winning", time: "16m" },
  { id: 8, user: "0xSurvivor_2291", msg: "tomorrow better be something hard. outside at sunrise let's goooo", time: "20m" },
];

export const GAME_STATS = {
  totalPlayers: 1247,
  eliminated: 8941,
  prizePool: "2.4 ETH",
  day: 47,
  hoursLeft: 6,
  minutesLeft: 23,
};
