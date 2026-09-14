using System;
using System.IO;
using System.Text;
using System.Threading;
using System.Windows.Forms;
using System.Drawing;
using System.Drawing.Drawing2D;
using System.Runtime.InteropServices;

namespace FiezelDrop
{
    static class Program
    {
        [DllImport("user32.dll")]
        static extern void mouse_event(uint dwFlags, int dx, int dy, uint dwData, UIntPtr dwExtraInfo);

        [DllImport("user32.dll")]
        static extern void keybd_event(byte bVk, byte bScan, uint dwFlags, UIntPtr dwExtraInfo);

        [DllImport("user32.dll", SetLastError = true)]
        static extern bool AddClipboardFormatListener(IntPtr hwnd);

        [DllImport("user32.dll", SetLastError = true)]
        static extern bool RemoveClipboardFormatListener(IntPtr hwnd);

        [DllImport("user32.dll")]
        static extern uint SendInput(uint nInputs, INPUT[] pInputs, int cbSize);

        const uint MOUSEEVENTF_MOVE = 0x0001;
        const uint MOUSEEVENTF_LEFTDOWN = 0x0002;
        const uint MOUSEEVENTF_LEFTUP = 0x0004;
        const uint MOUSEEVENTF_RIGHTDOWN = 0x0008;
        const uint MOUSEEVENTF_RIGHTUP = 0x0009;
        const uint MOUSEEVENTF_WHEEL = 0x0800;

        const uint KEYEVENTF_KEYUP = 0x0002;
        const uint KEYEVENTF_UNICODE = 0x0004;

        const byte VK_BACK = 0x08;
        const byte VK_TAB = 0x09;
        const byte VK_RETURN = 0x0D;
        const byte VK_ESCAPE = 0x1B;
        const byte VK_SPACE = 0x20;
        const byte VK_LWIN = 0x5B;
        const byte VK_VOLUME_MUTE = 0xAD;
        const byte VK_VOLUME_DOWN = 0xAE;
        const byte VK_VOLUME_UP = 0xAF;
        const byte VK_MEDIA_NEXT_TRACK = 0xB0;
        const byte VK_MEDIA_PREV_TRACK = 0xB1;
        const byte VK_MEDIA_PLAY_PAUSE = 0xB3;

        const int WM_CLIPBOARDUPDATE = 0x031D;

        [StructLayout(LayoutKind.Sequential)]
        struct INPUT
        {
            public uint type;
            public InputUnion u;
        }

        [StructLayout(LayoutKind.Explicit)]
        struct InputUnion
        {
            [FieldOffset(0)] public MOUSEINPUT mi;
            [FieldOffset(0)] public KEYBDINPUT ki;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct MOUSEINPUT
        {
            public int dx;
            public int dy;
            public uint mouseData;
            public uint dwFlags;
            public uint time;
            public UIntPtr dwExtraInfo;
        }

        [StructLayout(LayoutKind.Sequential)]
        struct KEYBDINPUT
        {
            public ushort wVk;
            public ushort wScan;
            public uint dwFlags;
            public uint time;
            public UIntPtr dwExtraInfo;
        }

        static string lastSentClipboard = "";
        static bool isInternalClipboardSet = false;
        static ClipboardListenerForm mainListenerForm;

        // OSD Badge Form
        static Form osdForm;
        static Label osdLabel;
        static System.Windows.Forms.Timer osdTimer;

        class ClipboardListenerForm : Form
        {
            public ClipboardListenerForm()
            {
                this.ShowInTaskbar = false;
                this.WindowState = FormWindowState.Minimized;
                this.FormBorderStyle = FormBorderStyle.None;
                this.Size = new Size(0, 0);
            }

            protected override void OnHandleCreated(EventArgs e)
            {
                base.OnHandleCreated(e);
                AddClipboardFormatListener(this.Handle);
            }

            protected override void OnHandleDestroyed(EventArgs e)
            {
                RemoveClipboardFormatListener(this.Handle);
                base.OnHandleDestroyed(e);
            }

            protected override void WndProc(ref Message m)
            {
                if (m.Msg == WM_CLIPBOARDUPDATE)
                {
                    OnClipboardUpdated();
                }
                base.WndProc(ref m);
            }
        }

        static void InitOsd()
        {
            osdForm = new Form
            {
                FormBorderStyle = FormBorderStyle.None,
                StartPosition = FormStartPosition.Manual,
                ShowInTaskbar = false,
                TopMost = true,
                BackColor = Color.FromArgb(15, 23, 42),
                Size = new Size(260, 52),
                Opacity = 0.0
            };

            osdLabel = new Label
            {
                Dock = DockStyle.Fill,
                TextAlign = ContentAlignment.MiddleCenter,
                Font = new Font("Segoe UI", 12f, FontStyle.Bold),
                ForeColor = Color.FromArgb(52, 211, 153),
                Text = "[ 📋 Sent to iPhone ]"
            };
            osdForm.Controls.Add(osdLabel);

            // Posisi di tengah atas layar
            Rectangle screen = Screen.PrimaryScreen.Bounds;
            osdForm.Location = new Point((screen.Width - osdForm.Width) / 2, 60);

            osdTimer = new System.Windows.Forms.Timer();
            osdTimer.Interval = 1800;
            osdTimer.Tick += (s, ev) =>
            {
                osdTimer.Stop();
                osdForm.Opacity = 0.0;
                osdForm.Hide();
            };
        }

        static void ShowOsd(string text, Color textColor)
        {
            if (osdForm == null) return;
            if (osdForm.InvokeRequired)
            {
                osdForm.BeginInvoke(new Action(() => ShowOsd(text, textColor)));
                return;
            }

            osdLabel.Text = text;
            osdLabel.ForeColor = textColor;
            osdForm.Opacity = 0.94;
            osdForm.Show();
            osdForm.BringToFront();

            osdTimer.Stop();
            osdTimer.Start();
        }

        static void OnClipboardUpdated()
        {
            if (isInternalClipboardSet)
            {
                isInternalClipboardSet = false;
                return;
            }

            try
            {
                if (Clipboard.ContainsText())
                {
                    string text = Clipboard.GetText();
                    if (!string.IsNullOrEmpty(text) && text != lastSentClipboard)
                    {
                        lastSentClipboard = text;
                        // Format payload base64 agar aman dari karakter newline
                        byte[] bytes = Encoding.UTF8.GetBytes(text);
                        string b64 = Convert.ToBase64String(bytes);

                        Console.WriteLine("CLIP:" + b64);
                        Console.Out.Flush();

                        ShowOsd("[ 📋 Sent to iPhone ]", Color.FromArgb(52, 211, 153));
                    }
                }
            }
            catch {}
        }

        static void ProcessStdin()
        {
            try
            {
                string line;
                while ((line = Console.ReadLine()) != null)
                {
                    line = line.Trim();
                    if (string.IsNullOrEmpty(line)) continue;

                    string[] parts = line.Split(new char[] { ' ' }, 3);
                    string cmd = parts[0].ToUpperInvariant();

                    if (cmd == "MOVE" && parts.Length >= 3)
                    {
                        int dx, dy;
                        if (int.TryParse(parts[1], out dx) && int.TryParse(parts[2], out dy))
                        {
                            mouse_event(MOUSEEVENTF_MOVE, dx, dy, 0, UIntPtr.Zero);
                        }
                    }
                    else if (cmd == "CLICK" && parts.Length >= 2)
                    {
                        string btn = parts[1].ToLowerInvariant();
                        if (btn == "left")
                        {
                            mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
                            mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
                        }
                        else if (btn == "right")
                        {
                            mouse_event(MOUSEEVENTF_RIGHTDOWN, 0, 0, 0, UIntPtr.Zero);
                            mouse_event(MOUSEEVENTF_RIGHTUP, 0, 0, 0, UIntPtr.Zero);
                        }
                    }
                    else if (cmd == "DOWN" && parts.Length >= 2)
                    {
                        if (parts[1].ToLowerInvariant() == "left")
                            mouse_event(MOUSEEVENTF_LEFTDOWN, 0, 0, 0, UIntPtr.Zero);
                    }
                    else if (cmd == "UP" && parts.Length >= 2)
                    {
                        if (parts[1].ToLowerInvariant() == "left")
                            mouse_event(MOUSEEVENTF_LEFTUP, 0, 0, 0, UIntPtr.Zero);
                    }
                    else if (cmd == "SCROLL" && parts.Length >= 2)
                    {
                        int dy;
                        if (int.TryParse(parts[1], out dy))
                        {
                            mouse_event(MOUSEEVENTF_WHEEL, 0, 0, (uint)dy, UIntPtr.Zero);
                        }
                    }
                    else if (cmd == "KEY" && parts.Length >= 2)
                    {
                        string key = parts[1].ToUpperInvariant();
                        byte vk = 0;
                        if (key == "ENTER") vk = VK_RETURN;
                        else if (key == "BACKSPACE") vk = VK_BACK;
                        else if (key == "ESC") vk = VK_ESCAPE;
                        else if (key == "TAB") vk = VK_TAB;
                        else if (key == "SPACE") vk = VK_SPACE;
                        else if (key == "WIN") vk = VK_LWIN;
                        else if (key == "VOLUP") vk = VK_VOLUME_UP;
                        else if (key == "VOLDOWN") vk = VK_VOLUME_DOWN;
                        else if (key == "MUTE") vk = VK_VOLUME_MUTE;
                        else if (key == "PLAYPAUSE") vk = VK_MEDIA_PLAY_PAUSE;
                        else if (key == "NEXT") vk = VK_MEDIA_NEXT_TRACK;
                        else if (key == "PREV") vk = VK_MEDIA_PREV_TRACK;

                        if (vk != 0)
                        {
                            keybd_event(vk, 0, 0, UIntPtr.Zero);
                            keybd_event(vk, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                        }
                        else if (key == "DESKTOP") // Win+D
                        {
                            keybd_event(VK_LWIN, 0, 0, UIntPtr.Zero);
                            keybd_event(0x44, 0, 0, UIntPtr.Zero); // 'D'
                            keybd_event(0x44, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                            keybd_event(VK_LWIN, 0, KEYEVENTF_KEYUP, UIntPtr.Zero);
                        }
                    }
                    else if (cmd == "TEXT" && parts.Length >= 2)
                    {
                        string textToSend = line.Substring(5);
                        SendUnicodeText(textToSend);
                    }
                    else if (cmd.StartsWith("SETCLIP:"))
                    {
                        string b64 = line.Substring(8);
                        byte[] bytes = Convert.FromBase64String(b64);
                        string text = Encoding.UTF8.GetString(bytes);

                        if (mainListenerForm != null && mainListenerForm.IsHandleCreated)
                        {
                            mainListenerForm.BeginInvoke(new Action(() => {
                                string cleanText = text;
                                if (cleanText.TrimStart().StartsWith("{\\rtf"))
                                {
                                    try
                                    {
                                        using (RichTextBox rtb = new RichTextBox())
                                        {
                                            rtb.Rtf = cleanText;
                                            cleanText = rtb.Text;
                                        }
                                    }
                                    catch {}
                                }

                                isInternalClipboardSet = true;
                                lastSentClipboard = cleanText;

                                for (int attempt = 0; attempt < 5; attempt++)
                                {
                                    try
                                    {
                                        Clipboard.SetDataObject(cleanText, true, 5, 100);
                                        break;
                                    }
                                    catch { Thread.Sleep(50); }
                                }
                                ShowOsd("[ 📥 Received from iPhone ]", Color.FromArgb(56, 189, 248));

                                byte[] cleanBytes = Encoding.UTF8.GetBytes(cleanText);
                                Console.WriteLine("CLEANED:" + Convert.ToBase64String(cleanBytes));
                                Console.Out.Flush();
                            }));
                        }
                    }
                }
            }
            catch {}
        }

        static void SendUnicodeText(string text)
        {
            if (string.IsNullOrEmpty(text)) return;
            INPUT[] inputs = new INPUT[text.Length * 2];

            for (int i = 0; i < text.Length; i++)
            {
                char c = text[i];

                inputs[i * 2] = new INPUT
                {
                    type = 1, // INPUT_KEYBOARD
                    u = new InputUnion
                    {
                        ki = new KEYBDINPUT
                        {
                            wVk = 0,
                            wScan = (ushort)c,
                            dwFlags = KEYEVENTF_UNICODE,
                            time = 0,
                            dwExtraInfo = UIntPtr.Zero
                        }
                    }
                };

                inputs[i * 2 + 1] = new INPUT
                {
                    type = 1,
                    u = new InputUnion
                    {
                        ki = new KEYBDINPUT
                        {
                            wVk = 0,
                            wScan = (ushort)c,
                            dwFlags = KEYEVENTF_UNICODE | KEYEVENTF_KEYUP,
                            time = 0,
                            dwExtraInfo = UIntPtr.Zero
                        }
                    }
                };
            }

            SendInput((uint)inputs.Length, inputs, Marshal.SizeOf(typeof(INPUT)));
        }

        [STAThread]
        static void Main()
        {
            Application.EnableVisualStyles();
            Application.SetCompatibleTextRenderingDefault(false);

            InitOsd();

            mainListenerForm = new ClipboardListenerForm();

            Thread stdinThread = new Thread(ProcessStdin);
            stdinThread.IsBackground = true;
            stdinThread.Start();

            Application.Run(mainListenerForm);
        }
    }
}
