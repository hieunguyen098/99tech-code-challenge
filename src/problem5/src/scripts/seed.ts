import { loadConfigOrExit } from "../config.js";
import { createDatabase } from "../db/database.js";
import { TaskRepository } from "../tasks/task.repository.js";
import { TaskService } from "../tasks/task.service.js";
import { seedSampleTasks } from "./sample-tasks.js";

const config = loadConfigOrExit();
const db = createDatabase(config.databasePath);
const added = seedSampleTasks(new TaskService(new TaskRepository(db)));
console.log(
  added > 0
    ? `Seeded ${added} tasks into ${config.databasePath}`
    : `${config.databasePath} already has tasks; nothing seeded`,
);
db.close();
