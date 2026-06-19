/**
 * Runs once when the Node server starts. Forces the runtime timezone to IST so
 * that server-rendered dates and day-boundary queries (today / streak / week /
 * month) match the user's India timezone instead of the host's UTC.
 */
export function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    process.env.TZ = "Asia/Kolkata";
  }
}
