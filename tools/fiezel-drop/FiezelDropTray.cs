using System;
using System.Diagnostics;
using System.Drawing;
using System.IO;
using System.Threading;
using System.Windows.Forms;
using Microsoft.Win32;

namespace FiezelDrop
{
    static class TrayProgram
    {
        static NotifyIcon trayIcon;
        static Process nodeProcess;
        static string appDir;
        static System.Windows.Forms.Timer watchdogTimer;

        [STAThread]
        static void Main(string[] args)
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            appDir = AppDomain.CurrentDomain.BaseDirectory;
            string logFile = Path.Combine(appDir, "tray.log");

            try
            {
                File.WriteAllText(logFile, "Tray starting at " + DateTime.Now + "\n");
                bool createdNew;
                using (Mutex mutex = new Mutex(true, "Local\\FiezelDrop_Tray_Mutex", out createdNew))
                {
                    File.AppendAllText(logFile, "Mutex createdNew=" + createdNew + "\n");
                    if (!createdNew)
                    {
                        File.AppendAllText(logFile, "Another instance running. Exiting.\n");
                        try { Process.Start("http://localhost:5050"); } catch {}
                        return;
                    }

                    EnsureAutoRun();
                    File.AppendAllText(logFile, "AutoRun ensured.\n");

                    StartNodeServer();
                    File.AppendAllText(logFile, "StartNodeServer called.\n");

                    InitTray();
                    File.AppendAllText(logFile, "InitTray called.\n");
                    File.AppendAllText(logFile, "Tray initialized.\n");

                    watchdogTimer = new System.Windows.Forms.Timer();
                    watchdogTimer.Interval = 10000;
                    watchdogTimer.Tick += (s, e) => EnsureServerAlive();
                    watchdogTimer.Start();

                    bool isSilent = args != null && Array.Exists(args, a => a.Equals("--silent", StringComparison.OrdinalIgnoreCase));
                    if (!isSilent)
                    {
                        try { Process.Start("http://localhost:5050"); } catch {}
                    }

                    File.AppendAllText(logFile, "Entering Application.Run()\n");
                    Application.Run();
                }
            }
            catch (Exception ex)
            {
                File.AppendAllText(logFile, "FATAL: " + ex.ToString() + "\n");
            }
        }

        static void EnsureAutoRun()
        {
            try
            {
                string exePath = Application.ExecutablePath;
                using (RegistryKey key = Registry.CurrentUser.OpenSubKey(@"Software\Microsoft\Windows\CurrentVersion\Run", true))
                {
                    if (key != null)
                    {
                        key.SetValue("FiezelDrop", "\"" + exePath + "\" --silent");
                    }
                }
            }
            catch {}
        }

        static string FindNodeExe()
        {
            string standard = @"C:\Program Files\nodejs\node.exe";
            if (File.Exists(standard)) return standard;
            string standard86 = @"C:\Program Files (x86)\nodejs\node.exe";
            if (File.Exists(standard86)) return standard86;
            return "node.exe";
        }

        static void StartNodeServer()
        {
            try
            {
                KillExistingServers();

                string serverJs = Path.Combine(appDir, "server.mjs");
                if (!File.Exists(serverJs)) return;

                ProcessStartInfo psi = new ProcessStartInfo
                {
                    FileName = FindNodeExe(),
                    Arguments = "\"" + serverJs + "\"",
                    WorkingDirectory = appDir,
                    CreateNoWindow = true,
                    UseShellExecute = false,
                    RedirectStandardOutput = true,
                    RedirectStandardError = true,
                    WindowStyle = ProcessWindowStyle.Hidden
                };

                nodeProcess = Process.Start(psi);
                nodeProcess.OutputDataReceived += (s, e) => {
                    if (e.Data != null) {
                        try { File.AppendAllText(Path.Combine(appDir, "node_out.log"), e.Data + "\n"); } catch {}
                    }
                };
                nodeProcess.ErrorDataReceived += (s, e) => {
                    if (e.Data != null) {
                        try { File.AppendAllText(Path.Combine(appDir, "node_err.log"), e.Data + "\n"); } catch {}
                    }
                };
                nodeProcess.BeginOutputReadLine();
                nodeProcess.BeginErrorReadLine();
            }
            catch (Exception ex)
            {
                try { File.AppendAllText(Path.Combine(appDir, "tray.log"), "StartNodeServer error: " + ex + "\n"); } catch {}
            }
        }

        static void EnsureServerAlive()
        {
            if (nodeProcess == null || nodeProcess.HasExited)
            {
                StartNodeServer();
            }
        }

        static void KillExistingServers()
        {
            try
            {
                if (nodeProcess != null && !nodeProcess.HasExited)
                {
                    nodeProcess.Kill();
                }
            }
            catch {}
        }

        static void InitTray()
        {
            // Buat ikon tray dinamis
            Icon icon = CreateTrayIcon();

            ContextMenu menu = new ContextMenu();
            menu.MenuItems.Add(new MenuItem("⚡ Buka Dashboard / QR Code", (s, e) => {
                try { Process.Start("http://localhost:5050"); } catch {}
            }) { DefaultItem = true });

            menu.MenuItems.Add(new MenuItem("🚨 Ghost Sentinel (Anti-Maling & GPS)", (s, e) => {
                try { Process.Start("http://localhost:5050/sentinel.html"); } catch {}
            }));

            menu.MenuItems.Add(new MenuItem("📂 Buka Folder Dari_iPhone", (s, e) => {
                try {
                    string folder = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), "Downloads", "Dari_iPhone");
                    if (Directory.Exists(folder)) Process.Start("explorer.exe", folder);
                } catch {}
            }));

            menu.MenuItems.Add("-");

            menu.MenuItems.Add(new MenuItem("🔄 Restart Layanan FiezelDrop", (s, e) => {
                StartNodeServer();
                trayIcon.ShowBalloonTip(2000, "FiezelDrop", "Server berhasil direstart di latar belakang.", ToolTipIcon.Info);
            }));

            menu.MenuItems.Add("-");

            menu.MenuItems.Add(new MenuItem("❌ Keluar", (s, e) => {
                if (watchdogTimer != null) watchdogTimer.Stop();
                KillExistingServers();
                try
                {
                    // Kill helper juga jika ada
                    foreach (var p in Process.GetProcessesByName("FiezelInputHelper"))
                    {
                        try { p.Kill(); } catch {}
                    }
                }
                catch {}
                trayIcon.Visible = false;
                Application.Exit();
            }));

            trayIcon = new NotifyIcon
            {
                Icon = icon,
                Text = "FiezelDrop — Aktif di Latar Belakang (Port 5050)",
                ContextMenu = menu,
                Visible = true
            };

            trayIcon.DoubleClick += (s, e) => {
                try { Process.Start("http://localhost:5050"); } catch {}
            };
        }

        static Icon CreateTrayIcon()
        {
            // Render ikon 16x16 dengan simbol petir/transfer biru
            Bitmap bmp = new Bitmap(16, 16);
            using (Graphics g = Graphics.FromImage(bmp))
            {
                g.Clear(Color.Transparent);
                g.SmoothingMode = System.Drawing.Drawing2D.SmoothingMode.AntiAlias;

                // Lingkaran biru latar
                using (Brush b = new SolidBrush(Color.FromArgb(14, 165, 233)))
                {
                    g.FillEllipse(b, 1, 1, 14, 14);
                }

                // Simbol petir putih
                Point[] pts = new Point[] {
                    new Point(9, 2),
                    new Point(5, 8),
                    new Point(8, 8),
                    new Point(7, 14),
                    new Point(12, 7),
                    new Point(9, 7)
                };
                using (Brush b = new SolidBrush(Color.White))
                {
                    g.FillPolygon(b, pts);
                }
            }
            return Icon.FromHandle(bmp.GetHicon());
        }
    }
}
