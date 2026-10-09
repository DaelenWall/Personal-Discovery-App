import { repository } from "../src/server/repository";

const db = repository();
const state = db.read();
console.log(
  `Database ready: ${state.ideas.length} ideas, ${state.sessions.length} sessions. Existing data preserved.`,
);
db.close();
