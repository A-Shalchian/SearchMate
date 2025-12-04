use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use std::process::Command;
use walkdir::WalkDir;

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Project {
    pub name: String,
    pub path: String,
    #[serde(rename = "lastModified")]
    pub last_modified: u64,
    #[serde(rename = "hasGit")]
    pub has_git: bool,
    #[serde(rename = "hasPackageJson")]
    pub has_package_json: bool,
}

#[derive(Debug, Serialize, Deserialize, Clone)]
pub struct Settings {
    #[serde(rename = "scanDirectories")]
    pub scan_directories: Vec<String>,
    pub theme: String,
    #[serde(rename = "globalHotkey")]
    pub global_hotkey: String,
    #[serde(rename = "openWith")]
    pub open_with: String,
    #[serde(rename = "customCommand")]
    pub custom_command: String,
}

impl Default for Settings {
    fn default() -> Self {
        let desktop = dirs::desktop_dir()
            .map(|p| p.to_string_lossy().to_string())
            .unwrap_or_default();

        Settings {
            scan_directories: vec![desktop],
            theme: "dark".to_string(),
            global_hotkey: "Ctrl+Space".to_string(),
            open_with: "vscode".to_string(),
            custom_command: String::new(),
        }
    }
}

fn get_settings_path() -> PathBuf {
    let config_dir = dirs::config_dir().unwrap_or_else(|| PathBuf::from("."));
    config_dir.join("searchmate").join("settings.json")
}

fn load_settings() -> Settings {
    let path = get_settings_path();
    if path.exists() {
        if let Ok(content) = fs::read_to_string(&path) {
            if let Ok(settings) = serde_json::from_str(&content) {
                return settings;
            }
        }
    }
    Settings::default()
}

fn save_settings_to_file(settings: &Settings) -> Result<(), String> {
    let path = get_settings_path();
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent).map_err(|e| e.to_string())?;
    }
    let content = serde_json::to_string_pretty(settings).map_err(|e| e.to_string())?;
    fs::write(&path, content).map_err(|e| e.to_string())?;
    Ok(())
}

fn is_project_directory(path: &PathBuf) -> bool {
    // Check for common project indicators
    let indicators = [
        ".git",
        "package.json",
        "Cargo.toml",
        "go.mod",
        "requirements.txt",
        "pom.xml",
        "build.gradle",
        ".csproj",
        "pyproject.toml",
    ];

    for indicator in indicators {
        if path.join(indicator).exists() {
            return true;
        }
    }

    // Also check for any file with common project extensions
    if let Ok(entries) = fs::read_dir(path) {
        for entry in entries.flatten() {
            if let Some(ext) = entry.path().extension() {
                let ext_str = ext.to_string_lossy().to_lowercase();
                if ["csproj", "sln", "xcodeproj"].contains(&ext_str.as_str()) {
                    return true;
                }
            }
        }
    }

    false
}

#[tauri::command]
fn scan_directories() -> Vec<Project> {
    let settings = load_settings();
    let mut projects = Vec::new();

    for dir in &settings.scan_directories {
        let path = PathBuf::from(dir);
        if !path.exists() {
            continue;
        }

        // Walk directory with max depth of 2 for performance
        for entry in WalkDir::new(&path)
            .max_depth(2)
            .min_depth(1)
            .into_iter()
            .filter_map(|e| e.ok())
        {
            let entry_path = entry.path().to_path_buf();

            if entry_path.is_dir() && is_project_directory(&entry_path) {
                let name = entry_path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();

                let last_modified = entry_path
                    .metadata()
                    .and_then(|m| m.modified())
                    .map(|t| t.duration_since(std::time::UNIX_EPOCH).unwrap_or_default().as_secs())
                    .unwrap_or(0);

                let has_git = entry_path.join(".git").exists();
                let has_package_json = entry_path.join("package.json").exists();

                projects.push(Project {
                    name,
                    path: entry_path.to_string_lossy().to_string(),
                    last_modified,
                    has_git,
                    has_package_json,
                });
            }
        }
    }

    // Sort by last modified (most recent first)
    projects.sort_by(|a, b| b.last_modified.cmp(&a.last_modified));
    projects
}

#[tauri::command]
fn open_in_vscode(path: String) -> Result<(), String> {
    let settings = load_settings();

    let result = match settings.open_with.as_str() {
        "cursor" => Command::new("cursor").arg(&path).spawn(),
        "custom" => {
            let cmd = settings.custom_command.replace("{path}", &path);
            if cfg!(target_os = "windows") {
                Command::new("cmd").args(["/C", &cmd]).spawn()
            } else {
                Command::new("sh").args(["-c", &cmd]).spawn()
            }
        }
        _ => Command::new("code").arg(&path).spawn(),
    };

    result.map(|_| ()).map_err(|e| e.to_string())
}

#[tauri::command]
fn get_settings() -> Settings {
    load_settings()
}

#[tauri::command]
fn save_settings(settings: Settings) -> Result<(), String> {
    save_settings_to_file(&settings)
}

#[tauri::command]
async fn pick_directory() -> Option<String> {
    // This will be handled by the dialog plugin on the frontend
    None
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_global_shortcut::Builder::new().build())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            scan_directories,
            open_in_vscode,
            get_settings,
            save_settings,
            pick_directory,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
