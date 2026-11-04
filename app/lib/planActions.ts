import { hasAccount } from "./account";
import { track } from "./analytics";
import { markPrayed } from "./api/today";
import { reportError } from "./errorReporting";
import { schedulePlanReminders } from "./notifications";
import {
  dayChapters,
  finishDay,
  nextDay,
  noteChapterRead,
  planById,
  planProgress,
  planReady,
  readingLabel,
  readingMinutes,
  startPlan,
  stopPlan,
  today,
} from "./readingPlans";

// What happens around reading-plan progress: reminders, the prayer week and analytics (lib/readingPlans.ts keeps
// the progress itself).

/** Re-schedules the reading reminders from the current progress (no plan, or plan finished: none) */
export async function refreshPlanReminders() {
  await planReady();
  const p = planProgress();
  const plan = p && planById(p.planId);
  const day = p && plan ? nextDay(plan, p) : null;
  if (!p || !plan || day === null) return schedulePlanReminders({ time: null, doneToday: false, title: "", body: "" });
  const chapters = dayChapters(plan, day);
  await schedulePlanReminders({
    time: p.reminder,
    doneToday: p.lastDoneOn === today(),
    title: "Time for today’s Bible reading",
    body: `${plan.title}, day ${day + 1}: ${readingLabel(chapters)} (about ${readingMinutes(plan, chapters)} min)`,
  });
}

// A finished reading day also counts for the prayer week, which lives on the account
function dayFinished(day: number) {
  const p = planProgress();
  if (p) track("reading_plan_day_done", { plan_id: p.planId, day: day + 1 });
  if (hasAccount()) markPrayed().catch(reportError);
  refreshPlanReminders().catch(reportError);
}

export function beginPlan(planId: string, reminder: string | null) {
  startPlan(planId, reminder);
  track("reading_plan_started", { plan_id: planId, reminder: Boolean(reminder) });
  refreshPlanReminders().catch(reportError);
}

export function endPlan() {
  const p = planProgress();
  if (p) track("reading_plan_stopped", { plan_id: p.planId, days_done: p.done.length });
  stopPlan();
  refreshPlanReminders().catch(reportError);
}

/** "Mark as read" on the plan screen */
export function completeDay(day: number) {
  if (finishDay(day)) dayFinished(day);
}

/** The Bible reader shows a chapter: ticks it in today's reading */
export function chapterOpened(osis: string, chapter: number) {
  const day = noteChapterRead(osis, chapter);
  if (day !== null) dayFinished(day);
}
