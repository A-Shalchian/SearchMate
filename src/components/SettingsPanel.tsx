import { useState, useEffect } from "react";
import { invoke } from "@tauri-apps/api/core";
import { Settings } from "../types";

interface SettingsPanelProps {
  onClose: () => void;
}

function SettingsPanel({ onClose }: SettingsPanelProps) {
  const [settings, setSettings] = useState<Settings>({
    scanDirectories: [],
    theme: "dark",
    globalHotkey: "Ctrl+Space",
    openWith: "vscode",
    customCommand: "",
  });
  const [newDirectory, setNewDirectory] = useState("");

  useEffect(() => {
    async function loadSettings() {
      try {
        const result = await invoke<Settings>("get_settings");
        setSettings(result);
      } catch (error) {
        console.error("Failed to load settings:", error);
      }
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    try {
      await invoke("save_settings", { settings });
      onClose();
    } catch (error) {
      console.error("Failed to save settings:", error);
    }
  };

  const addDirectory = async () => {
    if (newDirectory && !settings.scanDirectories.includes(newDirectory)) {
      setSettings({
        ...settings,
        scanDirectories: [...settings.scanDirectories, newDirectory],
      });
      setNewDirectory("");
    }
  };

  const removeDirectory = (dir: string) => {
    setSettings({
      ...settings,
      scanDirectories: settings.scanDirectories.filter((d) => d !== dir),
    });
  };

  const browseDirectory = async () => {
    try {
      const selected = await invoke<string | null>("pick_directory");
      if (selected) {
        setNewDirectory(selected);
      }
    } catch (error) {
      console.error("Failed to pick directory:", error);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
      onClick={onClose}
    >
      <div
        className="bg-dark-900 border border-dark-700 rounded-2xl w-full max-w-lg mx-4
                   shadow-2xl animate-slide-up"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-dark-700">
          <h2 className="text-lg font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-dark-700 rounded-lg transition-colors"
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
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {/* Scan Directories */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Scan Directories
            </label>
            <div className="space-y-2 mb-3">
              {settings.scanDirectories.map((dir) => (
                <div
                  key={dir}
                  className="flex items-center gap-2 px-3 py-2 bg-dark-800 rounded-lg"
                >
                  <svg
                    className="w-4 h-4 text-dark-400"
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
                  <span className="flex-1 text-sm truncate">{dir}</span>
                  <button
                    onClick={() => removeDirectory(dir)}
                    className="p-1 hover:bg-dark-700 rounded text-dark-400 hover:text-red-400"
                  >
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M6 18L18 6M6 6l12 12"
                      />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={newDirectory}
                onChange={(e) => setNewDirectory(e.target.value)}
                placeholder="Add directory path..."
                className="flex-1 px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg
                           text-sm focus:outline-none focus:border-primary-500"
              />
              <button
                onClick={browseDirectory}
                className="px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg
                           hover:bg-dark-700 transition-colors"
              >
                Browse
              </button>
              <button
                onClick={addDirectory}
                className="px-3 py-2 bg-primary-600 rounded-lg hover:bg-primary-500 transition-colors"
              >
                Add
              </button>
            </div>
          </div>

          {/* Open With */}
          <div>
            <label className="block text-sm font-medium mb-2">Open With</label>
            <select
              value={settings.openWith}
              onChange={(e) =>
                setSettings({
                  ...settings,
                  openWith: e.target.value as Settings["openWith"],
                })
              }
              className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg
                         focus:outline-none focus:border-primary-500"
            >
              <option value="vscode">Visual Studio Code</option>
              <option value="cursor">Cursor</option>
              <option value="custom">Custom Command</option>
            </select>
          </div>

          {/* Custom Command */}
          {settings.openWith === "custom" && (
            <div>
              <label className="block text-sm font-medium mb-2">
                Custom Command
              </label>
              <input
                type="text"
                value={settings.customCommand}
                onChange={(e) =>
                  setSettings({ ...settings, customCommand: e.target.value })
                }
                placeholder="e.g., webstorm {path}"
                className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg
                           focus:outline-none focus:border-primary-500"
              />
              <p className="text-xs text-dark-500 mt-1">
                Use {"{path}"} as placeholder for the project path
              </p>
            </div>
          )}

          {/* Global Hotkey */}
          <div>
            <label className="block text-sm font-medium mb-2">
              Global Hotkey
            </label>
            <input
              type="text"
              value={settings.globalHotkey}
              onChange={(e) =>
                setSettings({ ...settings, globalHotkey: e.target.value })
              }
              placeholder="e.g., Ctrl+Space"
              className="w-full px-3 py-2 bg-dark-800 border border-dark-700 rounded-lg
                         focus:outline-none focus:border-primary-500"
            />
            <p className="text-xs text-dark-500 mt-1">
              Press this hotkey anywhere to open SearchMate
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-dark-700">
          <button
            onClick={onClose}
            className="px-4 py-2 text-dark-400 hover:text-dark-200 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-primary-600 rounded-lg hover:bg-primary-500 transition-colors"
          >
            Save Changes
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsPanel;
