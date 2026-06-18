/**
 * Seeds a full starter library of workout days + exercises, and ensures the
 * settings singleton exists. Idempotent: skips seeding days if any already exist.
 * Usage: npm run db:seed
 */
import "dotenv/config";
import { db } from "../src/lib/db";

type Ex = { name: string; type?: "STRENGTH" | "CARDIO" };

const LIBRARY: { day: string; exercises: Ex[] }[] = [
  {
    day: "Chest Day",
    exercises: [
      { name: "Bench Press" },
      { name: "Incline Dumbbell Press" },
      { name: "Decline Bench Press" },
      { name: "Chest Fly" },
      { name: "Cable Crossover" },
      { name: "Pushups" },
      { name: "Dips" },
    ],
  },
  {
    day: "Back Day",
    exercises: [
      { name: "Deadlift" },
      { name: "Pull-ups" },
      { name: "Bent-over Row" },
      { name: "Lat Pulldown" },
      { name: "Seated Cable Row" },
      { name: "T-Bar Row" },
      { name: "Face Pull" },
    ],
  },
  {
    day: "Leg Day",
    exercises: [
      { name: "Squats" },
      { name: "Leg Press" },
      { name: "Lunges" },
      { name: "Romanian Deadlift" },
      { name: "Leg Extension" },
      { name: "Leg Curl" },
      { name: "Calf Raises" },
    ],
  },
  {
    day: "Shoulder Day",
    exercises: [
      { name: "Overhead Press" },
      { name: "Dumbbell Shoulder Press" },
      { name: "Lateral Raise" },
      { name: "Front Raise" },
      { name: "Rear Delt Fly" },
      { name: "Arnold Press" },
      { name: "Shrugs" },
    ],
  },
  {
    day: "Arm Day",
    exercises: [
      { name: "Barbell Curl" },
      { name: "Dumbbell Curl" },
      { name: "Hammer Curl" },
      { name: "Preacher Curl" },
      { name: "Tricep Pushdown" },
      { name: "Overhead Tricep Extension" },
      { name: "Skull Crushers" },
    ],
  },
  {
    day: "Push Day",
    exercises: [
      { name: "Bench Press" },
      { name: "Overhead Press" },
      { name: "Incline Dumbbell Press" },
      { name: "Lateral Raise" },
      { name: "Tricep Pushdown" },
      { name: "Chest Fly" },
    ],
  },
  {
    day: "Pull Day",
    exercises: [
      { name: "Deadlift" },
      { name: "Pull-ups" },
      { name: "Bent-over Row" },
      { name: "Lat Pulldown" },
      { name: "Barbell Curl" },
      { name: "Hammer Curl" },
      { name: "Face Pull" },
    ],
  },
  {
    day: "Full Body",
    exercises: [
      { name: "Squats" },
      { name: "Bench Press" },
      { name: "Deadlift" },
      { name: "Overhead Press" },
      { name: "Pull-ups" },
      { name: "Plank" },
    ],
  },
  {
    day: "Cardio Day",
    exercises: [
      { name: "Running", type: "CARDIO" },
      { name: "Walking", type: "CARDIO" },
      { name: "Cycling", type: "CARDIO" },
      { name: "Treadmill", type: "CARDIO" },
      { name: "Jump Rope", type: "CARDIO" },
      { name: "Stair Climber", type: "CARDIO" },
      { name: "Rowing Machine", type: "CARDIO" },
      { name: "Elliptical", type: "CARDIO" },
    ],
  },
];

async function main() {
  // Ensure settings singleton exists (PIN starts unset -> first-run set flow).
  await db.setting.upsert({
    where: { id: "singleton" },
    update: {},
    create: { id: "singleton" },
  });

  const existing = await db.workoutDay.count();
  if (existing > 0) {
    console.log(`Skipping seed: ${existing} workout day(s) already exist.`);
    return;
  }

  for (let d = 0; d < LIBRARY.length; d++) {
    const { day, exercises } = LIBRARY[d];
    await db.workoutDay.create({
      data: {
        name: day,
        displayOrder: d,
        exercises: {
          create: exercises.map((ex, i) => ({
            name: ex.name,
            type: ex.type ?? "STRENGTH",
            displayOrder: i,
          })),
        },
      },
    });
    console.log(`Seeded ${day} (${exercises.length} exercises)`);
  }

  console.log("Seed complete.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
