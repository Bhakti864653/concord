"use client";

import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import Card from "@/components/ui/Card";
import Input from "@/components/ui/Input";
import { buttonClasses } from "@/components/ui/Button";
import MilestonePath from "@/components/mentorship/MilestonePath";
import ContextualEmptyState from "@/components/mentorship/ContextualEmptyState";

type Goal = {
  id: string;
  title: string;
  deadline: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
};

type Milestone = {
  id: string;
  goal_id: string;
  title: string;
  done: boolean;
  created_at: string;
};

const MAX_GOALS = 3;

export default function GoalsList({
  matchId,
  currentUserId,
  initialGoals,
  initialMilestones,
}: {
  matchId: string;
  currentUserId: string;
  initialGoals: Goal[];
  initialMilestones: Milestone[];
}) {
  const [supabase] = useState(() => createClient());
  const [goals, setGoals] = useState<Goal[]>(initialGoals);
  const [milestones, setMilestones] = useState<Milestone[]>(initialMilestones);
  const [newTitle, setNewTitle] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  async function addGoal(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = newTitle.trim();
    if (!trimmed) return;

    setSaving(true);
    setError(null);
    const { data, error } = await supabase
      .from("match_goals")
      .insert({ match_id: matchId, title: trimmed, created_by: currentUserId })
      .select()
      .single();
    setSaving(false);

    if (error) {
      setError(error.message);
      return;
    }
    setGoals((prev) => [...prev, data as Goal]);
    setNewTitle("");
  }

  async function updateGoal(id: string, patch: Partial<Pick<Goal, "deadline" | "notes">>) {
    const { data, error } = await supabase
      .from("match_goals")
      .update({ ...patch, updated_at: new Date().toISOString() })
      .eq("id", id)
      .select()
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setGoals((prev) => prev.map((g) => (g.id === id ? (data as Goal) : g)));
  }

  async function deleteGoal(id: string) {
    const { error } = await supabase.from("match_goals").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setGoals((prev) => prev.filter((g) => g.id !== id));
    setMilestones((prev) => prev.filter((m) => m.goal_id !== id));
  }

  async function addMilestone(goalId: string, title: string) {
    const trimmed = title.trim();
    if (!trimmed) return;
    const { data, error } = await supabase
      .from("match_milestones")
      .insert({ goal_id: goalId, title: trimmed })
      .select()
      .single();
    if (error) {
      setError(error.message);
      return;
    }
    setMilestones((prev) => [...prev, data as Milestone]);
  }

  async function toggleMilestone(id: string, done: boolean) {
    const { error } = await supabase.from("match_milestones").update({ done }).eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setMilestones((prev) => prev.map((m) => (m.id === id ? { ...m, done } : m)));
  }

  async function deleteMilestone(id: string) {
    const { error } = await supabase.from("match_milestones").delete().eq("id", id);
    if (error) {
      setError(error.message);
      return;
    }
    setMilestones((prev) => prev.filter((m) => m.id !== id));
  }

  return (
    <div className="flex flex-col gap-4">
      {error && <p className="text-sm text-danger">{error}</p>}

      {goals.length < MAX_GOALS && (
        <form onSubmit={addGoal} className="flex items-end gap-2">
          <div className="flex-1">
            <Input
              label="New goal"
              hideLabel
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              maxLength={300}
              placeholder="e.g. Prepare for university applications"
            />
          </div>
          <button
            type="submit"
            disabled={saving || !newTitle.trim()}
            className={buttonClasses("primary")}
          >
            Add goal
          </button>
        </form>
      )}
      {goals.length >= MAX_GOALS && (
        <p className="text-xs text-muted">You have the max of {MAX_GOALS} shared goals.</p>
      )}

      {goals.length === 0 && (
        <ContextualEmptyState
          kind="goal"
          title="No shared goals yet"
          description="Add one above to give this mentorship a clear focus."
        />
      )}

      <div className="flex flex-col gap-3">
        {goals.map((goal) => (
          <GoalCard
            key={goal.id}
            goal={goal}
            milestones={milestones.filter((m) => m.goal_id === goal.id)}
            onUpdate={(patch) => updateGoal(goal.id, patch)}
            onDelete={() => deleteGoal(goal.id)}
            onAddMilestone={(title) => addMilestone(goal.id, title)}
            onToggleMilestone={toggleMilestone}
            onDeleteMilestone={deleteMilestone}
          />
        ))}
      </div>
    </div>
  );
}

function GoalCard({
  goal,
  milestones,
  onUpdate,
  onDelete,
  onAddMilestone,
  onToggleMilestone,
  onDeleteMilestone,
}: {
  goal: Goal;
  milestones: Milestone[];
  onUpdate: (patch: Partial<Pick<Goal, "deadline" | "notes">>) => void;
  onDelete: () => void;
  onAddMilestone: (title: string) => void;
  onToggleMilestone: (id: string, done: boolean) => void;
  onDeleteMilestone: (id: string) => void;
}) {
  const [notes, setNotes] = useState(goal.notes ?? "");
  const [deadline, setDeadline] = useState(goal.deadline ?? "");
  const [milestoneTitle, setMilestoneTitle] = useState("");
  const doneCount = milestones.filter((m) => m.done).length;

  return (
    <Card padding="sm" className="flex flex-col gap-3">
      <div className="flex items-start justify-between gap-2">
        <h3 className="font-medium text-ink">{goal.title}</h3>
        <button onClick={onDelete} className="focus-ring rounded text-xs text-muted hover:text-danger">
          Remove
        </button>
      </div>

      {milestones.length > 0 && (
        <p className="text-xs text-muted">
          {doneCount} of {milestones.length} milestones done
        </p>
      )}

      <MilestonePath
        milestones={milestones}
        onToggle={onToggleMilestone}
        onDelete={onDeleteMilestone}
      />

      <form
        onSubmit={(e) => {
          e.preventDefault();
          onAddMilestone(milestoneTitle);
          setMilestoneTitle("");
        }}
        className="flex items-end gap-2"
      >
        <div className="flex-1">
          <Input
            label="Add a milestone"
            hideLabel
            value={milestoneTitle}
            onChange={(e) => setMilestoneTitle(e.target.value)}
            maxLength={300}
            placeholder="Add a milestone"
          />
        </div>
        <button
          type="submit"
          disabled={!milestoneTitle.trim()}
          className={buttonClasses("secondary", "sm")}
        >
          Add
        </button>
      </form>

      <div className="grid grid-cols-1 gap-2 border-t border-line pt-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-xs text-muted">
          Deadline (optional)
          <input
            type="date"
            value={deadline}
            onChange={(e) => setDeadline(e.target.value)}
            onBlur={() => onUpdate({ deadline: deadline || null })}
            className="rounded-[var(--radius-control)] border border-line bg-paper px-2 py-1 text-sm text-ink focus-ring focus:border-ink"
          />
        </label>
        <label className="flex flex-col gap-1 text-xs text-muted sm:col-span-2">
          Notes
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            onBlur={() => onUpdate({ notes: notes.trim() || null })}
            rows={2}
            maxLength={2000}
            placeholder="Any context worth keeping around"
            className="rounded-[var(--radius-control)] border border-line bg-paper px-2 py-1.5 text-sm text-ink focus-ring focus:border-ink"
          />
        </label>
      </div>
    </Card>
  );
}
