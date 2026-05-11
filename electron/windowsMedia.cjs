const { execFile } = require('child_process');
const path = require('path');

const POWERSHELL_TIMEOUT_MS = 10000;

const WINDOWS_AUDIO_SESSION_SCRIPT = String.raw`
function Invoke-LetsPrayAudioSessionCommand {
  param(
    [string]$Action,
    [string]$StatePath,
    [string]$ExcludePids = ''
  )

  $source = @'
using System;
using System.Collections.Generic;
using System.IO;
using System.Linq;
using System.Runtime.InteropServices;
using System.Text;

namespace LetsPrayAudioSessions {
  enum EDataFlow { eRender = 0, eCapture = 1, eAll = 2 }
  enum ERole { eConsole = 0, eMultimedia = 1, eCommunications = 2 }
  enum AudioSessionState { Inactive = 0, Active = 1, Expired = 2 }

  [Flags]
  enum CLSCTX : uint {
    INPROC_SERVER = 0x1,
    INPROC_HANDLER = 0x2,
    LOCAL_SERVER = 0x4,
    REMOTE_SERVER = 0x10,
    ALL = INPROC_SERVER | INPROC_HANDLER | LOCAL_SERVER | REMOTE_SERVER
  }

  [ComImport]
  [Guid("BCDE0395-E52F-467C-8E3D-C4579291692E")]
  class MMDeviceEnumerator { }

  [ComImport]
  [Guid("A95664D2-9614-4F35-A746-DE8DB63617E6")]
  [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDeviceEnumerator {
    [PreserveSig] int EnumAudioEndpoints(EDataFlow dataFlow, uint dwStateMask, out object ppDevices);
    [PreserveSig] int GetDefaultAudioEndpoint(EDataFlow dataFlow, ERole role, out IMMDevice ppEndpoint);
    [PreserveSig] int GetDevice([MarshalAs(UnmanagedType.LPWStr)] string pwstrId, out IMMDevice ppDevice);
    [PreserveSig] int RegisterEndpointNotificationCallback(IntPtr pClient);
    [PreserveSig] int UnregisterEndpointNotificationCallback(IntPtr pClient);
  }

  [ComImport]
  [Guid("D666063F-1587-4E43-81F1-B948E807363F")]
  [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IMMDevice {
    [PreserveSig] int Activate(ref Guid iid, CLSCTX dwClsCtx, IntPtr pActivationParams, [MarshalAs(UnmanagedType.IUnknown)] out object ppInterface);
    [PreserveSig] int OpenPropertyStore(int stgmAccess, out object ppProperties);
    [PreserveSig] int GetId(out IntPtr ppstrId);
    [PreserveSig] int GetState(out int pdwState);
  }

  [ComImport]
  [Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F")]
  [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionManager2 {
    [PreserveSig] int GetAudioSessionControl(ref Guid AudioSessionGuid, int StreamFlags, out IAudioSessionControl SessionControl);
    [PreserveSig] int GetSimpleAudioVolume(ref Guid AudioSessionGuid, int StreamFlags, out ISimpleAudioVolume AudioVolume);
    [PreserveSig] int GetSessionEnumerator(out IAudioSessionEnumerator SessionEnum);
    [PreserveSig] int RegisterSessionNotification(IntPtr SessionNotification);
    [PreserveSig] int UnregisterSessionNotification(IntPtr SessionNotification);
    [PreserveSig] int RegisterDuckNotification(string sessionID, IntPtr duckNotification);
    [PreserveSig] int UnregisterDuckNotification(IntPtr duckNotification);
  }

  [ComImport]
  [Guid("E2F5BB11-0570-40CA-ACDD-3AA01277DEE8")]
  [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionEnumerator {
    [PreserveSig] int GetCount(out int SessionCount);
    [PreserveSig] int GetSession(int SessionCount, out IAudioSessionControl Session);
  }

  [ComImport]
  [Guid("F4B1A599-7266-4319-A8CA-E70ACB11E8CD")]
  [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionControl {
    [PreserveSig] int GetState(out AudioSessionState pRetVal);
    [PreserveSig] int GetDisplayName(out IntPtr pRetVal);
    [PreserveSig] int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
    [PreserveSig] int GetIconPath(out IntPtr pRetVal);
    [PreserveSig] int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
    [PreserveSig] int GetGroupingParam(out Guid pRetVal);
    [PreserveSig] int SetGroupingParam(ref Guid Override, ref Guid EventContext);
    [PreserveSig] int RegisterAudioSessionNotification(IntPtr NewNotifications);
    [PreserveSig] int UnregisterAudioSessionNotification(IntPtr NewNotifications);
  }

  [ComImport]
  [Guid("BFB7FF88-7239-4FC9-8FA2-07C950BE9C6D")]
  [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface IAudioSessionControl2 {
    [PreserveSig] int GetState(out AudioSessionState pRetVal);
    [PreserveSig] int GetDisplayName(out IntPtr pRetVal);
    [PreserveSig] int SetDisplayName([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
    [PreserveSig] int GetIconPath(out IntPtr pRetVal);
    [PreserveSig] int SetIconPath([MarshalAs(UnmanagedType.LPWStr)] string Value, ref Guid EventContext);
    [PreserveSig] int GetGroupingParam(out Guid pRetVal);
    [PreserveSig] int SetGroupingParam(ref Guid Override, ref Guid EventContext);
    [PreserveSig] int RegisterAudioSessionNotification(IntPtr NewNotifications);
    [PreserveSig] int UnregisterAudioSessionNotification(IntPtr NewNotifications);
    [PreserveSig] int GetSessionIdentifier(out IntPtr pRetVal);
    [PreserveSig] int GetSessionInstanceIdentifier(out IntPtr pRetVal);
    [PreserveSig] int GetProcessId(out uint pRetVal);
    [PreserveSig] int IsSystemSoundsSession();
    [PreserveSig] int SetDuckingPreference(bool optOut);
  }

  [ComImport]
  [Guid("87CE5498-68D6-44E5-9215-6DA47EF883D8")]
  [InterfaceType(ComInterfaceType.InterfaceIsIUnknown)]
  interface ISimpleAudioVolume {
    [PreserveSig] int SetMasterVolume(float fLevel, ref Guid EventContext);
    [PreserveSig] int GetMasterVolume(out float pfLevel);
    [PreserveSig] int SetMute(bool bMute, ref Guid EventContext);
    [PreserveSig] int GetMute(out bool pbMute);
  }

  public static class AudioSessionMute {
    static readonly Guid AudioSessionManager2Guid = new Guid("77AA99A0-1BD6-484F-8BC7-2C654C9A9B6F");

    public static string MuteOthers(string excludeCsv, string statePath) {
      HashSet<int> excluded = ParsePids(excludeCsv);
      List<string> mutedSessions = new List<string>();
      Guid eventContext = Guid.Empty;

      foreach (IAudioSessionControl control in GetSessions()) {
        try {
          AudioSessionState state;
          if (control.GetState(out state) != 0 || state != AudioSessionState.Active) continue;

          IAudioSessionControl2 control2 = (IAudioSessionControl2)control;
          uint rawPid;
          if (control2.GetProcessId(out rawPid) != 0) continue;
          int pid = unchecked((int)rawPid);
          if (pid <= 0 || excluded.Contains(pid)) continue;
          if (control2.IsSystemSoundsSession() == 0) continue;

          ISimpleAudioVolume volume = (ISimpleAudioVolume)control;
          bool isMuted;
          if (volume.GetMute(out isMuted) != 0 || isMuted) continue;

          string instanceId = GetSessionInstanceId(control2);
          if (instanceId.Length == 0) continue;

          if (volume.SetMute(true, ref eventContext) == 0) {
            mutedSessions.Add(BuildStateKey(pid, instanceId));
          }
        } catch {
        }
      }

      Directory.CreateDirectory(Path.GetDirectoryName(statePath));
      File.WriteAllLines(statePath, mutedSessions.ToArray());
      return "muted=" + mutedSessions.Count.ToString();
    }

    public static string Restore(string statePath) {
      if (!File.Exists(statePath)) return "restored=0";

      HashSet<string> targets = new HashSet<string>(File.ReadAllLines(statePath).Where(IsValidStateLine));
      if (targets.Count == 0) {
        TryDelete(statePath);
        return "restored=0";
      }

      int restored = 0;
      Guid eventContext = Guid.Empty;

      foreach (IAudioSessionControl control in GetSessions()) {
        try {
          IAudioSessionControl2 control2 = (IAudioSessionControl2)control;
          uint rawPid;
          if (control2.GetProcessId(out rawPid) != 0) continue;
          int pid = unchecked((int)rawPid);
          if (pid <= 0) continue;

          string instanceId = GetSessionInstanceId(control2);
          if (instanceId.Length == 0) continue;

          string key = BuildStateKey(pid, instanceId);
          if (!targets.Contains(key)) continue;

          ISimpleAudioVolume volume = (ISimpleAudioVolume)control;
          bool isMuted;
          if (volume.GetMute(out isMuted) == 0 && isMuted && volume.SetMute(false, ref eventContext) == 0) {
            restored++;
          }
        } catch {
        }
      }

      TryDelete(statePath);
      return "restored=" + restored.ToString();
    }

    static IEnumerable<IAudioSessionControl> GetSessions() {
      IMMDeviceEnumerator enumerator = (IMMDeviceEnumerator)(new MMDeviceEnumerator());
      IMMDevice device;
      int deviceResult = enumerator.GetDefaultAudioEndpoint(EDataFlow.eRender, ERole.eMultimedia, out device);
      if (deviceResult != 0 || device == null) yield break;

      Guid managerGuid = AudioSessionManager2Guid;
      object managerObject;
      int activateResult = device.Activate(ref managerGuid, CLSCTX.ALL, IntPtr.Zero, out managerObject);
      if (activateResult != 0 || managerObject == null) yield break;

      IAudioSessionManager2 manager = (IAudioSessionManager2)managerObject;
      IAudioSessionEnumerator sessionEnumerator;
      if (manager.GetSessionEnumerator(out sessionEnumerator) != 0 || sessionEnumerator == null) yield break;

      int count;
      if (sessionEnumerator.GetCount(out count) != 0) yield break;

      for (int i = 0; i < count; i++) {
        IAudioSessionControl control;
        if (sessionEnumerator.GetSession(i, out control) == 0 && control != null) {
          yield return control;
        }
      }
    }

    static HashSet<int> ParsePids(string csv) {
      HashSet<int> result = new HashSet<int>();
      if (String.IsNullOrWhiteSpace(csv)) return result;

      string[] parts = csv.Split(new char[] { ',' }, StringSplitOptions.RemoveEmptyEntries);
      foreach (string part in parts) {
        int pid;
        if (Int32.TryParse(part.Trim(), out pid) && pid > 0) result.Add(pid);
      }
      return result;
    }

    static string GetSessionInstanceId(IAudioSessionControl2 control) {
      IntPtr value;
      if (control.GetSessionInstanceIdentifier(out value) != 0 || value == IntPtr.Zero) return "";
      try {
        string id = Marshal.PtrToStringUni(value);
        return id ?? "";
      } finally {
        Marshal.FreeCoTaskMem(value);
      }
    }

    static string BuildStateKey(int pid, string instanceId) {
      string encoded = Convert.ToBase64String(Encoding.UTF8.GetBytes(instanceId));
      return pid.ToString() + "|" + encoded;
    }

    static bool IsValidStateLine(string line) {
      if (String.IsNullOrWhiteSpace(line)) return false;
      return line.IndexOf("|", StringComparison.Ordinal) > 0;
    }

    static void TryDelete(string statePath) {
      try {
        File.Delete(statePath);
      } catch {
      }
    }
  }
}
'@

  if (-not ('LetsPrayAudioSessions.AudioSessionMute' -as [type])) {
    Add-Type -TypeDefinition $source -Language CSharp
  }

  if ($Action -eq 'mute') {
    [LetsPrayAudioSessions.AudioSessionMute]::MuteOthers($ExcludePids, $StatePath)
  } elseif ($Action -eq 'restore') {
    [LetsPrayAudioSessions.AudioSessionMute]::Restore($StatePath)
  } else {
    throw "Unsupported action: $Action"
  }
}
`;

function quotePowerShellString(value) {
  return `'${String(value).replace(/'/g, "''")}'`;
}

function getMuteStatePath(userDataPath) {
  return path.join(userDataPath, 'adhan-muted-audio-sessions.txt');
}

function runAudioSessionCommand(action, userDataPath, excludePids = []) {
  if (process.platform !== 'win32') {
    return Promise.resolve({ skipped: true, reason: 'unsupported-platform' });
  }

  const statePath = getMuteStatePath(userDataPath);
  const excludeCsv = [...new Set(excludePids.filter((pid) => Number.isInteger(pid) && pid > 0))].join(',');
  const command = [
    '$ErrorActionPreference = \'Stop\'',
    WINDOWS_AUDIO_SESSION_SCRIPT,
    `Invoke-LetsPrayAudioSessionCommand -Action ${quotePowerShellString(action)} -StatePath ${quotePowerShellString(statePath)} -ExcludePids ${quotePowerShellString(excludeCsv)}`,
  ].join('\n');

  return new Promise((resolve, reject) => {
    execFile(
      'powershell.exe',
      ['-NoProfile', '-ExecutionPolicy', 'Bypass', '-Command', command],
      { windowsHide: true, timeout: POWERSHELL_TIMEOUT_MS },
      (error, stdout, stderr) => {
        if (error) {
          error.stderr = stderr;
          reject(error);
          return;
        }
        resolve({ stdout: String(stdout || '').trim(), stderr: String(stderr || '').trim() });
      }
    );
  });
}

function muteOtherApps(userDataPath, excludePids) {
  return runAudioSessionCommand('mute', userDataPath, excludePids);
}

function restoreMutedApps(userDataPath) {
  return runAudioSessionCommand('restore', userDataPath);
}

module.exports = {
  muteOtherApps,
  restoreMutedApps,
};
