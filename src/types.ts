export interface Project {
  name: string;
  path: string;
  lastModified: number;
  hasGit: boolean;
  hasPackageJson: boolean;
}

export interface Settings {
  scanDirectories: string[];
  theme: "dark" | "light";
  globalHotkey: string;
  openWith: "vscode" | "cursor" | "custom";
  customCommand: string;
}
