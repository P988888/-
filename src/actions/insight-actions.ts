"use server";

import { eq } from "drizzle-orm";
import { db, schema } from "@/lib/db";
import { requireGuide } from "@/lib/auth/session";
import { asArray, getMembers, getQuestions } from "@/lib/db/queries";
import type { QuestionItem } from "@/lib/contracts";

export async function getQuestionsForGuide(tourCode: string, intent?: QuestionItem["intent"]) {
  await requireGuide(tourCode); return getQuestions(tourCode, intent);
}

export async function getStoryProgress(tourCode: string) {
  await requireGuide(tourCode);
  const task = db.select().from(schema.storyTasks).where(eq(schema.storyTasks.tourCode, tourCode.toUpperCase())).get();
  const members = getMembers(tourCode);
  const cards = db.select({ memberId: schema.storyCards.memberId, id: schema.storyCards.id }).from(schema.storyCards).where(eq(schema.storyCards.tourCode, tourCode.toUpperCase())).all();
  return {
    task: task ? { title: task.title, brief: task.brief, clues: asArray<string>(task.clues) } : null,
    done: members.filter((m) => m.storyDone).length, total: members.length,
    perMember: members.map((member) => ({ ...member, storyCardId: cards.find((card) => card.memberId === member.id)?.id })),
  };
}
