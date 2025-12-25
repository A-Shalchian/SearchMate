const { shell } = require('electron');
const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

function findExecutable(name) {
  const paths = (process.env.PATH || '').split(path.delimiter);
  const extensions = ['', '.exe', '.cmd', '.bat', '.com'];

  for (const dir of paths) {
    for (const ext of extensions) {
      const fullPath = path.join(dir, name + ext);
      try {
        if (fs.existsSync(fullPath)) {
          return fullPath;
        }
      } catch (e) {}
    }
  }
  return null;
}

function spawnSafe(command, args, onError) {
  const exePath = findExecutable(command);
  if (!exePath) {
    if (onError) onError();
    return null;
  }

  const child = spawn(exePath, args, {
    detached: true,
    stdio: 'ignore',
    windowsHide: false,
  });
  child.unref();

  if (onError) {
    child.on('error', onError);
  }

  return child;
}

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
    spawnSafe('code', [filePath], () => {
      const vscodePath = path.join(
        process.env.LOCALAPPDATA,
        'Programs',
        'Microsoft VS Code',
        'Code.exe'
      );
      if (fs.existsSync(vscodePath)) {
        spawn(vscodePath, [filePath], {
          detached: true,
          stdio: 'ignore',
        }).unref();
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

    spawnSafe('wt', ['-d', folderPath], () => {
      const cmdPath = process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe';
      spawn(cmdPath, ['/k', `cd /d "${folderPath}"`], {
        detached: true,
        stdio: 'ignore',
        shell: true,
      }).unref();
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

    spawnSafe('wt', ['-d', folderPath, 'cmd', '/k', 'claude'], () => {
      const cmdPath = process.env.COMSPEC || 'C:\\Windows\\System32\\cmd.exe';
      spawn(cmdPath, ['/k', `cd /d "${folderPath}" && claude`], {
        detached: true,
        stdio: 'ignore',
        shell: true,
      }).unref();
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

    spawnSafe('code', [folderPath]);

    setTimeout(() => {
      spawnSafe('code', ['-r', '--command', 'workbench.action.terminal.new']);

      setTimeout(() => {
        const psPath = path.join(
          process.env.SYSTEMROOT || 'C:\\Windows',
          'System32',
          'WindowsPowerShell',
          'v1.0',
          'powershell.exe'
        );
        spawn(psPath, [
          '-Command',
          "Add-Type -AssemblyName System.Windows.Forms; [System.Windows.Forms.SendKeys]::SendWait('claude{ENTER}')"
        ], { stdio: 'ignore' }).unref();
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
