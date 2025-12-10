const { shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');

async function openPath(filePath) {
  try {
    await shell.openPath(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function openInExplorer(filePath) {
  try {
    shell.showItemInFolder(filePath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function openFolder(filePath) {
  try {
    const stats = await fs.promises.stat(filePath);
    const folderPath = stats.isDirectory() ? filePath : path.dirname(filePath);
    await shell.openPath(folderPath);
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function openInVscode(filePath) {
  try {
    exec(`code "${filePath}"`, { shell: true }, (error) => {
      if (error) {
        const vscodePath = path.join(process.env.LOCALAPPDATA, 'Programs', 'Microsoft VS Code', 'Code.exe');
        exec(`"${vscodePath}" "${filePath}"`, { shell: true });
      }
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function openInTerminal(filePath) {
  try {
    const stats = await fs.promises.stat(filePath);
    const folderPath = stats.isDirectory() ? filePath : path.dirname(filePath);

    exec(`start wt -d "${folderPath}"`, { shell: true }, (error) => {
      if (error) {
        exec(`start cmd /k "cd /d "${folderPath}""`, { shell: true });
      }
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function openTerminalClaude(filePath) {
  try {
    const stats = await fs.promises.stat(filePath);
    const folderPath = stats.isDirectory() ? filePath : path.dirname(filePath);

    exec(`start wt -d "${folderPath}" cmd /k "claude"`, { shell: true }, (error) => {
      if (error) {
        exec(`start cmd /k "cd /d "${folderPath}" && claude"`, { shell: true });
      }
    });
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

async function openVscodeClaude(filePath) {
  try {
    const stats = await fs.promises.stat(filePath);
    const folderPath = stats.isDirectory() ? filePath : path.dirname(filePath);

    exec(`code "${folderPath}"`, { shell: true });

    setTimeout(() => {
      exec(`code -r --command workbench.action.terminal.new`, { shell: true });

      setTimeout(() => {
        const psCommand = `powershell -Command "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('claude{ENTER}')"`;
        exec(psCommand, { shell: true });
      }, 800);
    }, 2000);

    return { success: true };
  } catch (err) {
    return { success: false, error: err.message };
  }
}

module.exports = {
  openPath,
  openInExplorer,
  openFolder,
  openInVscode,
  openInTerminal,
  openTerminalClaude,
  openVscodeClaude,
};
