!macro customInit
  ReadRegDWORD $0 HKLM "SOFTWARE\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  ${If} $0 != 1
    ReadRegDWORD $0 HKLM "SOFTWARE\WOW6432Node\Microsoft\VisualStudio\14.0\VC\Runtimes\x64" "Installed"
  ${EndIf}

  ${If} $0 != 1
    DetailPrint "Downloading Visual C++ Redistributable..."
    NSISdl::download "https://aka.ms/vs/17/release/vc_redist.x64.exe" "$TEMP\vc_redist.x64.exe"
    Pop $0
    ${If} $0 == "success"
      DetailPrint "Installing Visual C++ Redistributable..."
      ExecWait '"$TEMP\vc_redist.x64.exe" /install /quiet /norestart' $1
      Delete "$TEMP\vc_redist.x64.exe"
      ${If} $1 != 0
        MessageBox MB_OK|MB_ICONEXCLAMATION "Visual C++ Redistributable installation may have failed. The application might not work correctly." /SD IDOK
      ${EndIf}
    ${Else}
      MessageBox MB_YESNO|MB_ICONEXCLAMATION "Could not download Visual C++ Redistributable.$\r$\n$\r$\nWould you like to open the download page manually?" /SD IDNO IDYES openDownload
      Goto skipDownload
      openDownload:
        ExecShell "open" "https://aka.ms/vs/17/release/vc_redist.x64.exe"
        MessageBox MB_OK "Please install the Visual C++ Redistributable, then run this installer again." /SD IDOK
        Abort
      skipDownload:
        MessageBox MB_OK|MB_ICONEXCLAMATION "The application may not work correctly without the Visual C++ Redistributable." /SD IDOK
    ${EndIf}
  ${EndIf}
!macroend
