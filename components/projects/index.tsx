"use client";
import { useRef, useState } from "react";
import { FolderKanban } from "lucide-react";
import type { Organisation, Project } from "../../lib/storage";
import { Button } from "../ui/button";

type Action = "New organisation" | "New project" | "Rename project";
export function Projects({
  organisations,
  organisation,
  project,
  select,
  save,
}: {
  organisations: Organisation[];
  organisation: Organisation;
  project: Project;
  select: (id: string) => void;
  save: (action: Action, name: string, firstProject: string) => void;
}) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [action, setAction] = useState<Action>("New project");
  const [name, setName] = useState("");
  const [firstProject, setFirstProject] = useState("");
  const [error, setError] = useState("");
  function open(next: Action) {
    setAction(next);
    setName(next === "Rename project" ? project.name : "");
    setFirstProject("");
    setError("");
    dialog.current?.showModal();
  }
  return (
    <div className="project-controls">
      <label>
        Organisation
        <select
          value={organisation.id}
          onChange={(event) => {
            const next = organisations.find(
              (item) => item.id === event.target.value,
            );
            if (next) select(next.projects[0].id);
          }}
        >
          {organisations.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Project
        <select
          value={project.id}
          onChange={(event) => select(event.target.value)}
        >
          {organisation.projects.map((item) => (
            <option key={item.id} value={item.id}>
              {item.name}
            </option>
          ))}
        </select>
      </label>
      <Button onClick={() => open("New project")}>
        <FolderKanban size={15} /> New project
      </Button>
      <Button onClick={() => open("Rename project")}>Rename project</Button>
      <Button onClick={() => open("New organisation")}>New organisation</Button>
      <dialog
        ref={dialog}
        className="panel account-dialog"
        aria-labelledby="project-dialog-heading"
      >
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const cleaned = name.trim();
            if (
              !cleaned ||
              (action === "New organisation" && !firstProject.trim())
            ) {
              setError("Enter a name for each field.");
              return;
            }
            const matches = (item: { name: string }) =>
              item.name.toLowerCase() === cleaned.toLowerCase();
            const duplicate =
              action === "New organisation"
                ? organisations.some(matches)
                : organisation.projects.some(
                    (item) =>
                      (action !== "Rename project" || item.id !== project.id) &&
                      matches(item),
                  );
            if (duplicate) {
              setError("That name is already in use.");
              return;
            }
            save(action, cleaned, firstProject.trim());
            dialog.current?.close();
          }}
        >
          <h2 id="project-dialog-heading">{action}</h2>
          <label>
            {action === "New organisation"
              ? "Organisation name"
              : "Project name"}
            <input
              required
              maxLength={80}
              value={name}
              onChange={(event) => {
                setName(event.target.value);
                setError("");
              }}
            />
          </label>
          {action === "New organisation" && (
            <label>
              First project name
              <input
                required
                maxLength={80}
                value={firstProject}
                onChange={(event) => setFirstProject(event.target.value)}
              />
            </label>
          )}
          {error && (
            <p role="alert" className="error">
              {error}
            </p>
          )}
          <div className="actions">
            <Button variant="primary" type="submit">
              {action === "Rename project" ? "Save name" : "Create"}
            </Button>
            <Button type="button" onClick={() => dialog.current?.close()}>
              Cancel
            </Button>
          </div>
        </form>
      </dialog>
    </div>
  );
}
