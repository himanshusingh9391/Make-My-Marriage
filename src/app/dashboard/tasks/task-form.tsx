"use client";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { readTaskForm } from "@/features/tasks/form";
import {
  taskStatuses,
  taskPriorities,
  statusLabels,
  priorityLabels,
  type TaskOptions,
  type TaskView,
} from "@/features/tasks/schemas";
import { PlanningSection, PlanningField } from "../components/planning-form";
import styles from "../events/events.module.css";

export default function TaskForm({
  weddingId,
  options,
  task,
  readOnly,
  initialEventId,
}: {
  weddingId: string;
  options: TaskOptions;
  task?: TaskView;
  readOnly: boolean;
  initialEventId?: string;
}) {
  const router = useRouter();
  const [dirty, setDirty] = useState(false),
    [busy, setBusy] = useState(false),
    [error, setError] = useState("");
  const errorRef = useRef<HTMLParagraphElement>(null);
  const base = `/dashboard/tasks?workspace=${weddingId}`;
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    const guard = (e: MouseEvent) => {
      if (
        e.target instanceof Element &&
        e.target.closest("a[href]") &&
        !window.confirm("Discard your unsaved task changes?")
      ) {
        e.preventDefault();
        e.stopPropagation();
      }
    };
    window.addEventListener("beforeunload", warn);
    document.addEventListener("click", guard, true);
    return () => {
      window.removeEventListener("beforeunload", warn);
      document.removeEventListener("click", guard, true);
    };
  }, [dirty]);
  useEffect(() => {
    if (error) errorRef.current?.focus();
  }, [error]);
  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (busy || readOnly) return;
    setError("");
    try {
      const input = readTaskForm(new FormData(e.currentTarget));
      setBusy(true);
      const response = await fetch(
        `/api/v1/weddings/${weddingId}/tasks${task ? `/${task.id}` : ""}`,
        {
          method: task ? "PATCH" : "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...input,
            ...(task ? { expectedUpdatedAt: task.updatedAt } : {}),
          }),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(
          result.error?.message ?? "Could not save the task. Please try again.",
        );
      setDirty(false);
      router.push(`${base}&saved=1`);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not save the task. Please try again.",
      );
      setBusy(false);
    }
  }
  const memberMissing =
    task?.assignedUserId &&
    !options.members.some((m) => m.id === task.assignedUserId);
  const eventMissing =
    task?.eventId && !options.events.some((e) => e.id === task.eventId);
  return (
    <form
      onSubmit={submit}
      onChange={() => setDirty(true)}
      className={styles.form}
    >
      {error && (
        <p role="alert" tabIndex={-1} ref={errorRef} className={styles.error}>
          {error}
        </p>
      )}
      <PlanningSection
        title="1. Task details"
        description="Give the task a name and a clear next step."
        disabled={busy || readOnly}
      >
        <PlanningField label="Task title *">
          <input
            name="title"
            required
            maxLength={160}
            defaultValue={task?.title}
            placeholder="e.g. Book a wedding venue"
          />
        </PlanningField>
        <PlanningField label="Description (optional)">
          <textarea
            name="description"
            rows={4}
            maxLength={2000}
            defaultValue={task?.description}
            placeholder="Add helpful details for your wedding team…"
          />
        </PlanningField>
      </PlanningSection>
      <PlanningSection
        title="2. Assignment & planning"
        description="Choose who can help and when this task is due."
        disabled={busy || readOnly}
      >
        <div className={styles.grid}>
          <PlanningField label="Assigned member (optional)">
            <select
              name="assignedUserId"
              defaultValue={task?.assignedUserId ?? ""}
            >
              <option value="">Unassigned</option>
              {memberMissing && (
                <option value={task!.assignedUserId!}>
                  {task!.memberName} (no longer available)
                </option>
              )}
              {options.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </PlanningField>
          <PlanningField label="Related event (optional)">
            <select
              name="eventId"
              defaultValue={task?.eventId ?? initialEventId ?? ""}
            >
              <option value="">General wedding task</option>
              {eventMissing && (
                <option value={task!.eventId!}>{task!.eventName}</option>
              )}
              {options.events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
            {!options.events.length && (
              <span className={styles.help}>
                No active events yet. You can create a general wedding task.
              </span>
            )}
          </PlanningField>
          <PlanningField label="Due date (optional)">
            <input
              type="date"
              name="dueDate"
              defaultValue={task?.dueDate ?? ""}
            />
            <span className={styles.help}>
              Dates follow {options.timezone}. Tasks become overdue after their
              due date.
            </span>
          </PlanningField>
          <PlanningField label="Priority">
            <select name="priority" defaultValue={task?.priority ?? "MEDIUM"}>
              {taskPriorities.map((p) => (
                <option key={p} value={p}>
                  {priorityLabels[p]}
                </option>
              ))}
            </select>
          </PlanningField>
        </div>
        <PlanningField label="Status">
          <select name="status" defaultValue={task?.status ?? "TODO"}>
            {taskStatuses.map((s) => (
              <option key={s} value={s}>
                {statusLabels[s]}
              </option>
            ))}
          </select>
        </PlanningField>
        <details className={styles.additional}>
          <summary>Additional planning details (optional)</summary>
          <PlanningField label="Category">
            <input
              name="category"
              maxLength={100}
              defaultValue={task?.category}
            />
          </PlanningField>
          <PlanningField label="Private notes">
            <textarea
              name="notes"
              rows={3}
              maxLength={2000}
              defaultValue={task?.notes}
            />
          </PlanningField>
        </details>
      </PlanningSection>
      <div className={styles.footer}>
        <span aria-live="polite">
          {dirty ? "Unsaved changes" : "Make the next step clear for everyone"}
        </span>
        <div className={styles.actions}>
          <button
            type="button"
            disabled={busy}
            className={styles.secondary}
            onClick={() => {
              if (
                !dirty ||
                window.confirm("Discard your unsaved task changes?")
              )
                router.push(base);
            }}
          >
            Cancel
          </button>
          {!readOnly && (
            <button className={styles.primary} disabled={busy}>
              {busy ? "Saving…" : task ? "Save changes" : "Create task"}
            </button>
          )}
        </div>
      </div>
    </form>
  );
}
