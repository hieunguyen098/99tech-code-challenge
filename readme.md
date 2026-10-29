# 99Tech Code Challenge

My solutions to the [99Tech code challenge](https://github.com/99techteam/code-challenge). Each problem is self-contained in its own folder, with a README explaining how to run it and any assumptions I made.

| Problem                       | Folder                           | Summary                                                                                                                                                                                                                                                                                                                        |
| ----------------------------- | -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| **2. Fancy Form**             | [`src/problem2`](./src/problem2) | Currency swap form with **Vite + React 19 + strict TypeScript + Tailwind + TanStack Query**: live prices, token picker, two-way conversion, validation, mocked wallet and simulated submit, with unit and user-flow tests.                                                                                                     |
| **4. Three ways to sum to n** | [`src/problem4`](./src/problem4) | Formula (O(1)), loop (O(n)) and divide-and-conquer recursion (O(n) time, O(log n) stack), with measured timings, input validation, and tests against an exact `BigInt` reference.                                                                                                                                              |
| **5. A Crude Server**         | [`src/problem5`](./src/problem5) | **Express 5 + TypeScript + SQLite** CRUD API for tasks, with filtering, search, sorting, pagination and Zod validation. Production touches: a service layer, versioned migrations, indexed queries (with a benchmark), structured logs with request ids, health checks and graceful shutdown, plus unit and integration tests. |
| **6. Architecture**           | [`src/problem6`](./src/problem6) | Spec for a live top-10 scoreboard module: server-decided points through signed single-use action tickets, a Kafka queue so bursts cause delay instead of failure, exactly-once counting, a Redis ranking with SSE live updates, failure handling per data store, Mermaid diagrams and scaling notes.                           |

## Quick start

Requires Node.js 22.9+.

```bash
# Problem 2 — http://localhost:5173
cd src/problem2 && npm install && npm run dev

# Problem 4
cd src/problem4 && npm install && npm test

# Problem 5 — http://localhost:3000/api/tasks
cd src/problem5 && npm install && npm run seed && npm run dev
```

Problems 2, 4 and 5 each have `npm test`.
