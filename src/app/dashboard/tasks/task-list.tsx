"use client";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { CalendarDays, CheckSquare, UserRound } from "lucide-react";
import {
  taskStatuses,
  taskPriorities,
  statusLabels,
  priorityLabels,
  type TaskView,
  type TaskListData,
  type TaskOptions,
  type TaskQuery,
} from "@/features/tasks/schemas";
import { formatTaskDate } from "@/features/tasks/dates";
import styles from "./tasks.module.css";
import common from "../events/events.module.css";

function TaskRow({
  task,
  weddingId,
  timezone,
  readOnly,
  busy,
  onStatus,
  onDelete,
}: {
  task: TaskView;
  weddingId: string;
  timezone: string;
  readOnly: boolean;
  busy: boolean;
  onStatus: (task: TaskView, status: string) => void;
  onDelete: (task: TaskView) => void;
}) {
  return (
    <article className={styles.row}>
      <div className={styles.rowContent}>
        <div className={styles.titleLine}>
          <h2>{task.title}</h2>
          <span
            className={`${styles.badge} ${["HIGH", "URGENT"].includes(task.priority) ? styles.high : ""}`}
          >
            {priorityLabels[task.priority]} priority
          </span>
          {task.overdue && (
            <span className={`${styles.badge} ${styles.overdue}`}>Overdue</span>
          )}
          {task.status === "COMPLETED" && (
            <span className={styles.badge}>Completed</span>
          )}
        </div>
        <div className={styles.metadata}>
          <span>
            <UserRound size={13} />
            {task.memberName}
          </span>
          <span>
            <CalendarDays size={13} />
            {task.eventName}
          </span>
          <span className={task.overdue ? styles.overdueText : ""}>
            {task.dueDate
              ? `Due ${formatTaskDate(task.dueDate)}`
              : "No due date"}
          </span>
          {task.completedAt && (
            <span>
              Completed on{" "}
              {new Intl.DateTimeFormat("en-IN", {
                dateStyle: "medium",
                timeZone: timezone,
              }).format(new Date(task.completedAt))}
            </span>
          )}
        </div>
      </div>
      <div className={styles.rowActions}>
        <select
          aria-label={`Status for ${task.title}`}
          value={task.status}
          disabled={busy || readOnly}
          onChange={(e) => onStatus(task, e.target.value)}
        >
          {taskStatuses.map((s) => (
            <option value={s} key={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
        <Link
          className={common.secondary}
          href={`/dashboard/tasks/${task.id}?workspace=${weddingId}`}
        >
          Details
        </Link>
        {!readOnly && (
          <button
            disabled={busy}
            className={common.danger}
            onClick={() => onDelete(task)}
          >
            Delete
          </button>
        )}
      </div>
    </article>
  );
}

export default function TaskList({
  data,
  options,
  query,
  weddingId,
  readOnly,
  saved,
}: {
  data: TaskListData;
  options: TaskOptions;
  query: TaskQuery;
  weddingId: string;
  readOnly: boolean;
  saved: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(saved ? "Task saved." : ""),
    [busy, setBusy] = useState(false);
  const [pending, startTransition] = useTransition();
  const [deleting, setDeleting] = useState<TaskView | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const disabled = busy || pending;
  useEffect(() => {
    if (deleting) dialogRef.current?.showModal();
    else dialogRef.current?.close();
  }, [deleting]);
  function url(overrides: Partial<TaskQuery> = {}) {
    const params = new URLSearchParams({ workspace: weddingId });
    for (const [key, value] of Object.entries({ ...query, ...overrides }))
      if (value !== undefined && value !== "") params.set(key, String(value));
    return `/dashboard/tasks?${params}`;
  }
  async function mutate(task: TaskView, status?: string) {
    if (disabled) return;
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(
        `/api/v1/weddings/${weddingId}/tasks/${task.id}`,
        {
          method: status ? "PATCH" : "DELETE",
          headers: { "Content-Type": "application/json" },
          ...(status
            ? {
                body: JSON.stringify({
                  status,
                  expectedUpdatedAt: task.updatedAt,
                }),
              }
            : {}),
        },
      );
      const result = await response.json();
      if (!response.ok || !result.success)
        throw new Error(result.error?.message ?? "Could not update the task.");
      setDeleting(null);
      setNotice(status ? "Task status updated." : "Task deleted.");
      startTransition(() => {
        if (!status && data.tasks.length === 1 && query.page > 1)
          router.replace(url({ page: query.page - 1 }));
        router.refresh();
      });
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Could not update the task. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }
  const filtered =
    query.status || query.priority || query.eventId || query.assignedUserId;
  return (
    <>
      <nav className={styles.tabs} aria-label="Task views">
        {(
          [
            ["all", "All Tasks", data.counts.all],
            ["mine", "My Tasks", data.counts.mine],
            ["completed", "Completed", data.counts.completed],
          ] as const
        ).map(([tab, label, count]) => (
          <Link
            className={query.tab === tab ? styles.activeTab : ""}
            aria-current={query.tab === tab ? "page" : undefined}
            href={url({ tab, page: 1 })}
            key={tab}
          >
            {label}
            <span>{count}</span>
          </Link>
        ))}
      </nav>
      <form
        key={JSON.stringify(query)}
        className={styles.filters}
        action="/dashboard/tasks"
      >
        <input type="hidden" name="workspace" value={weddingId} />
        <input type="hidden" name="tab" value={query.tab} />
        <div className={styles.filterGrid}>
          <label>
            Status
            <select name="status" defaultValue={query.status ?? ""}>
              <option value="">All statuses</option>
              {taskStatuses.map((s) => (
                <option key={s} value={s}>
                  {statusLabels[s]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Priority
            <select name="priority" defaultValue={query.priority ?? ""}>
              <option value="">All priorities</option>
              {taskPriorities.map((p) => (
                <option key={p} value={p}>
                  {priorityLabels[p]}
                </option>
              ))}
            </select>
          </label>
          <label>
            Event
            <select name="eventId" defaultValue={query.eventId ?? ""}>
              <option value="">All events</option>
              <option value="general">General wedding tasks</option>
              {query.eventId &&
                query.eventId !== "general" &&
                !options.events.some((e) => e.id === query.eventId) && (
                  <option value={query.eventId}>Unavailable event</option>
                )}
              {options.events.map((e) => (
                <option key={e.id} value={e.id}>
                  {e.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Assigned member
            <select
              name="assignedUserId"
              defaultValue={query.assignedUserId ?? ""}
            >
              <option value="">All members</option>
              <option value="unassigned">Unassigned</option>
              {query.assignedUserId &&
                query.assignedUserId !== "unassigned" &&
                !options.members.some((m) => m.id === query.assignedUserId) && (
                  <option value={query.assignedUserId}>Former member</option>
                )}
              {options.members.map((m) => (
                <option value={m.id} key={m.id}>
                  {m.name} ({m.role})
                </option>
              ))}
            </select>
          </label>
        </div>
        <div className={styles.filterFooter}>
          <span>
            {filtered
              ? `${data.pagination.total} matching tasks`
              : "Showing all wedding tasks"}
          </span>
          <div className={common.actions}>
            {filtered && (
              <Link
                className={common.secondary}
                href={`/dashboard/tasks?workspace=${weddingId}&tab=${query.tab}`}
              >
                Clear filters
              </Link>
            )}
            <button className={common.secondary}>Apply filters</button>
          </div>
        </div>
      </form>
      {notice && (
        <p role="status" className={common.notice}>
          {notice}
        </p>
      )}
      {error && !deleting && (
        <p role="alert" className={common.error}>
          {error}{" "}
          <button className={common.secondary} onClick={() => router.refresh()}>
            Refresh tasks
          </button>
        </p>
      )}
      {data.tasks.length ? (
        <div className={styles.list} aria-busy={disabled}>
          {data.tasks.map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              weddingId={weddingId}
              timezone={options.timezone}
              readOnly={readOnly}
              busy={disabled}
              onStatus={mutate}
              onDelete={(task) => {
                setError("");
                setDeleting(task);
              }}
            />
          ))}
        </div>
      ) : (
        <section className={styles.empty}>
          <CheckSquare size={32} />
          <h2>
            {data.counts.all === 0
              ? "A little planning goes a long way."
              : "No tasks match this view."}
          </h2>
          <p>
            {data.counts.all === 0
              ? "Add your first task to bring your plans to life."
              : "Try another view or clear your filters."}
          </p>
          {!readOnly && (
            <Link
              className={common.primary}
              href={`/dashboard/tasks/new?workspace=${weddingId}${query.eventId && query.eventId !== "general" && options.events.some((e) => e.id === query.eventId) ? `&eventId=${query.eventId}` : ""}`}
            >
              {data.counts.all === 0 ? "+ Add your first task" : "+ Add task"}
            </Link>
          )}
        </section>
      )}
      <nav className={common.pagination} aria-label="Task pages">
        {query.page > 1 && (
          <Link
            className={common.secondary}
            href={url({ page: query.page - 1 })}
          >
            Previous
          </Link>
        )}
        <span>Page {query.page}</span>
        {data.pagination.hasMore && (
          <Link
            className={common.secondary}
            href={url({ page: query.page + 1 })}
          >
            Next
          </Link>
        )}
      </nav>
      <dialog
        className={styles.dialog}
        ref={dialogRef}
        aria-labelledby="delete-task-title"
        onCancel={(e) => {
          if (disabled) e.preventDefault();
          else setDeleting(null);
        }}
      >
        <h2 id="delete-task-title">Delete this task?</h2>
        <p>
          “{deleting?.title}” will be removed from the task list. This cannot be
          undone here.
        </p>
        {error && (
          <p role="alert" className={common.error}>
            {error}
          </p>
        )}
        <div className={common.actions}>
          <button
            autoFocus
            className={common.secondary}
            disabled={disabled}
            onClick={() => setDeleting(null)}
          >
            Keep task
          </button>
          <button
            className={common.danger}
            disabled={disabled}
            onClick={() => deleting && mutate(deleting)}
          >
            {disabled ? "Deleting…" : "Delete task"}
          </button>
        </div>
      </dialog>
    </>
  );
}
