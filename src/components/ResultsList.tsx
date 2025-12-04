import { invoke } from "@tauri-apps/api/core";
import { Project } from "../types";

interface ResultsListProps {
  projects: Project[];
  selectedIndex: number;
  setSelectedIndex: (index: number) => void;
  isLoading: boolean;
}

function ResultsList({
  projects,
  selectedIndex,
  setSelectedIndex,
  isLoading,
}: ResultsListProps) {
  const handleClick = async (project: Project) => {
    try {
      await invoke("open_in_vscode", { path: project.path });
    } catch (error) {
      console.error("Failed to open project:", error);
    }
  };

  if (isLoading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg
            className="w-8 h-8 animate-spin text-primary-500"
            fill="none"
            viewBox="0 0 24 24"
          >
            <circle
              className="opacity-25"
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="4"
            />
            <path
              className="opacity-75"
              fill="currentColor"
              d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
            />
          </svg>
          <span className="text-dark-400">Scanning directories...</span>
        </div>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="text-center">
          <svg
            className="w-12 h-12 mx-auto text-dark-600 mb-3"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
            />
          </svg>
          <p className="text-dark-400">No projects found</p>
          <p className="text-dark-600 text-sm mt-1">
            Try adjusting your search or check settings
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-2">
      <div className="space-y-1">
        {projects.map((project, index) => (
          <div
            key={project.path}
            onClick={() => handleClick(project)}
            onMouseEnter={() => setSelectedIndex(index)}
            className={`
              flex items-center gap-3 px-4 py-3 rounded-lg cursor-pointer
              transition-all duration-150 animate-fade-in
              ${
                index === selectedIndex
                  ? "bg-primary-500/20 border border-primary-500/50"
                  : "hover:bg-dark-800 border border-transparent"
              }
            `}
          >
            {/* Folder icon */}
            <div
              className={`
              p-2 rounded-lg
              ${index === selectedIndex ? "bg-primary-500/30" : "bg-dark-800"}
            `}
            >
              <svg
                className={`w-5 h-5 ${
                  index === selectedIndex ? "text-primary-400" : "text-dark-400"
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z"
                />
              </svg>
            </div>

            {/* Project info */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-medium text-dark-50 truncate">
                  {project.name}
                </span>
                {project.hasGit && (
                  <span className="px-1.5 py-0.5 text-xs bg-orange-500/20 text-orange-400 rounded">
                    git
                  </span>
                )}
                {project.hasPackageJson && (
                  <span className="px-1.5 py-0.5 text-xs bg-green-500/20 text-green-400 rounded">
                    npm
                  </span>
                )}
              </div>
              <p className="text-sm text-dark-500 truncate">{project.path}</p>
            </div>

            {/* Open indicator */}
            {index === selectedIndex && (
              <div className="text-dark-400">
                <svg
                  className="w-5 h-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 7l5 5m0 0l-5 5m5-5H6"
                  />
                </svg>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default ResultsList;
