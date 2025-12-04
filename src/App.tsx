import { useState, useEffect, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import Fuse from "fuse.js";
import SearchBar from "./components/SearchBar";
import ResultsList from "./components/ResultsList";
import SettingsPanel from "./components/SettingsPanel";
import { Project } from "./types";

function App() {
  const [query, setQuery] = useState("");
  const [projects, setProjects] = useState<Project[]>([]);
  const [filteredProjects, setFilteredProjects] = useState<Project[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [showSettings, setShowSettings] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Load projects from Rust backend
  useEffect(() => {
    async function loadProjects() {
      try {
        const result = await invoke<Project[]>("scan_directories");
        setProjects(result);
        setFilteredProjects(result);
      } catch (error) {
        console.error("Failed to load projects:", error);
      } finally {
        setIsLoading(false);
      }
    }
    loadProjects();
  }, []);

  // Fuzzy search with Fuse.js
  useEffect(() => {
    if (!query.trim()) {
      setFilteredProjects(projects);
      setSelectedIndex(0);
      return;
    }

    const fuse = new Fuse(projects, {
      keys: ["name", "path"],
      threshold: 0.4,
      distance: 100,
    });

    const results = fuse.search(query).map((result) => result.item);
    setFilteredProjects(results);
    setSelectedIndex(0);
  }, [query, projects]);

  // Keyboard navigation
  const handleKeyDown = useCallback(
    async (e: KeyboardEvent) => {
      switch (e.key) {
        case "ArrowDown":
          e.preventDefault();
          setSelectedIndex((prev) =>
            Math.min(prev + 1, filteredProjects.length - 1)
          );
          break;
        case "ArrowUp":
          e.preventDefault();
          setSelectedIndex((prev) => Math.max(prev - 1, 0));
          break;
        case "Enter":
          e.preventDefault();
          if (filteredProjects[selectedIndex]) {
            try {
              await invoke("open_in_vscode", {
                path: filteredProjects[selectedIndex].path,
              });
            } catch (error) {
              console.error("Failed to open project:", error);
            }
          }
          break;
        case "Escape":
          if (showSettings) {
            setShowSettings(false);
          } else {
            setQuery("");
          }
          break;
        case ",":
          if (e.ctrlKey || e.metaKey) {
            e.preventDefault();
            setShowSettings((prev) => !prev);
          }
          break;
      }
    },
    [filteredProjects, selectedIndex, showSettings]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      const result = await invoke<Project[]>("scan_directories");
      setProjects(result);
      setFilteredProjects(result);
    } catch (error) {
      console.error("Failed to refresh projects:", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark-950 text-dark-50 no-select">
      <div className="flex flex-col h-screen">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-dark-800">
          <h1 className="text-lg font-semibold text-primary-400">SearchMate</h1>
          <div className="flex gap-2">
            <button
              onClick={handleRefresh}
              className="p-2 rounded-lg hover:bg-dark-800 transition-colors"
              title="Refresh (Ctrl+R)"
            >
              <svg
                className={`w-5 h-5 ${isLoading ? "animate-spin" : ""}`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                />
              </svg>
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-dark-800 transition-colors"
              title="Settings (Ctrl+,)"
            >
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
                  d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                />
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                />
              </svg>
            </button>
          </div>
        </header>

        {/* Search Bar */}
        <SearchBar query={query} setQuery={setQuery} />

        {/* Results */}
        <ResultsList
          projects={filteredProjects}
          selectedIndex={selectedIndex}
          setSelectedIndex={setSelectedIndex}
          isLoading={isLoading}
        />

        {/* Footer */}
        <footer className="px-4 py-2 border-t border-dark-800 text-xs text-dark-500">
          <div className="flex justify-between">
            <span>{filteredProjects.length} projects</span>
            <span>
              <kbd className="px-1.5 py-0.5 bg-dark-800 rounded text-dark-400">
                ↑↓
              </kbd>{" "}
              navigate{" "}
              <kbd className="px-1.5 py-0.5 bg-dark-800 rounded text-dark-400 ml-2">
                Enter
              </kbd>{" "}
              open{" "}
              <kbd className="px-1.5 py-0.5 bg-dark-800 rounded text-dark-400 ml-2">
                Esc
              </kbd>{" "}
              clear
            </span>
          </div>
        </footer>
      </div>

      {/* Settings Modal */}
      {showSettings && <SettingsPanel onClose={() => setShowSettings(false)} />}
    </div>
  );
}

export default App;
