/**
 * Idempotently add workout-day templates (skips any that already exist by name).
 * Usage: npx tsx prisma/add-days.ts
 */
import "dotenv/config";
import { db } from "../src/lib/db";

const NEW_DAYS: { day: string; exercises: string[] }[] = [
  {
    day: "Triceps",
    exercises: [
      "Tricep Pushdown",
      "Overhead Tricep Extension",
      "Skull Crushers",
      "Close-Grip Bench Press",
      "Dips",
      "Tricep Kickback",
    ],
  },
  {
    day: "Biceps",
    exercises: [
      "Barbell Curl",
      "Dumbbell Curl",
      "Hammer Curl",
      "Preacher Curl",
      "Concentration Curl",
      "Cable Curl",
    ],
  },
  {
    day: "Forearm",
    exercises: [
      "Wrist Curl",
      "Reverse Wrist Curl",
      "Reverse Barbell Curl",
      "Farmer's Walk",
      "Wrist Roller",
      "Plate Pinch",
    ],
  },
  {
    day: "Triceps + Chest",
    exercises: [
      "Bench Press",
      "Incline Dumbbell Press",
      "Chest Fly",
      "Tricep Pushdown",
      "Skull Crushers",
      "Dips",
    ],
  },
  {
    day: "Biceps + Back",
    exercises: [
      "Deadlift",
      "Pull-ups",
      "Bent-over Row",
      "Lat Pulldown",
      "Barbell Curl",
      "Hammer Curl",
    ],
  },
  {
    day: "Shoulder + Leg",
    exercises: [
      "Overhead Press",
      "Lateral Raise",
      "Squats",
      "Leg Press",
      "Lunges",
      "Calf Raises",
    ],
  },
  {
    day: "Shoulders + Forearm",
    exercises: [
      "Overhead Press",
      "Lateral Raise",
      "Front Raise",
      "Shrugs",
      "Wrist Curl",
      "Reverse Wrist Curl",
    ],
  },
  {
    day: "Tricep + Bicep",
    exercises: [
      "Barbell Curl",
      "Hammer Curl",
      "Preacher Curl",
      "Tricep Pushdown",
      "Skull Crushers",
      "Overhead Tricep Extension",
    ],
  },
];

async function main() {
  const maxAgg = await db.workoutDay.aggregate({ _max: { displayOrder: true } });
  let order = (maxAgg._max.displayOrder ?? -1) + 1;

  for (const { day, exercises } of NEW_DAYS) {
    const exists = await db.workoutDay.findFirst({ where: { name: day } });
    if (exists) {
      console.log(`Skipping "${day}" (already exists)`);
      continue;
    }
    await db.workoutDay.create({
      data: {
        name: day,
        displayOrder: order++,
        exercises: {
          create: exercises.map((name, i) => ({
            name,
            type: "STRENGTH",
            displayOrder: i,
          })),
        },
      },
    });
    console.log(`Added "${day}" (${exercises.length} exercises)`);
  }
  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
