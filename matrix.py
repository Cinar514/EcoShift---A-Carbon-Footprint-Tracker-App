import tkinter as tk
import random

class MatrixApp:
    def __init__(self):
        self.root = tk.Tk()
        self.root.title("Matrix Effect")
        self.width = 800
        self.height = 600
        self.root.geometry(f"{self.width}x{self.height}")
        self.root.configure(bg="black")

        self.canvas = tk.Canvas(
            self.root,
            width=self.width,
            height=self.height,
            bg="black",
            highlightthickness=0
        )
        self.canvas.pack(fill="both", expand=True)

        self.chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789@#$%^&*()"
        self.text_items = []

        self.fullscreen = False
        self.keyboard_enabled = True
        self.mouse_visible = True

        # Kısayol tuşları
        self.root.bind("<F11>", self.toggle_fullscreen)
        self.root.bind("<Escape>", self.safe_close)
        self.root.bind("<ButtonPress-1>", self.start_move)
        self.root.bind("<B1-Motion>", self.do_move)
        self.root.bind("<Configure>", self.on_resize)
        self.root.bind("<Control-Shift-Button-3>", self.hide_mouse)  # Sağ tık + ctrl+shift
        self.root.bind("<Control-Shift-Button-1>", self.show_mouse)  # Sol tık + ctrl+shift
        self.root.bind("<Control-Shift-K>", self.disable_keyboard)
        self.root.bind("<Control-Shift-L>", self.enable_keyboard)

        # Sütunlar ve bağımsız y konumları
        self.font_size = 15
        self.column_width = 20
        self.cols = int(self.width / self.column_width)
        self.drops = [random.randint(0, self.height) for _ in range(self.cols)]
        self.speeds = [random.randint(15, 25) for _ in range(self.cols)]  # Dengeli hız

        # Matrix efekti başlat
        self.update_matrix()
        self.root.mainloop()

    # Tam ekran aç/kapa
    def toggle_fullscreen(self, event=None):
        if self.keyboard_enabled:  # Klavye kapalıyken F11 çalışmasın
            self.fullscreen = not self.fullscreen
            self.root.attributes("-fullscreen", self.fullscreen)

    # Pencereyi sürükleme
    def start_move(self, event):
        self.offset_x = event.x
        self.offset_y = event.y

    def do_move(self, event):
        x = self.root.winfo_x() + (event.x - self.offset_x)
        y = self.root.winfo_y() + (event.y - self.offset_y)
        self.root.geometry(f"+{x}+{y}")

    # Pencere yeniden boyutlandığında sütunları güncelle
    def on_resize(self, event):
        self.width = event.width
        self.height = event.height
        self.canvas.config(width=self.width, height=self.height)
        new_cols = int(self.width / self.column_width)
        if new_cols > len(self.drops):
            self.drops.extend([random.randint(0, self.height) for _ in range(new_cols - len(self.drops))])
            self.speeds.extend([random.randint(15, 25) for _ in range(new_cols - len(self.speeds))])
        elif new_cols < len(self.drops):
            self.drops = self.drops[:new_cols]
            self.speeds = self.speeds[:new_cols]
        self.cols = new_cols

    # Matrix efektini güncelle
    def update_matrix(self):
        for i in range(self.cols):
            char = random.choice(self.chars)
            x = i * self.column_width
            y = self.drops[i]
            item = self.canvas.create_text(x, y, text=char, fill="#00FF00", font=("Courier", self.font_size))
            self.text_items.append({"id": item, "green": 216})

            # Sütunları aşağı kaydır
            self.drops[i] += self.speeds[i]
            if self.drops[i] > self.height:
                self.drops[i] = 0

        self.fade_texts()
        self.root.after(40, self.update_matrix)

    # Yazıları yavaşça kaybolma efekti ile sil
    def fade_texts(self):
        for txt in self.text_items[:]:
            txt["green"] -= 8
            if txt["green"] <= 0:
                self.canvas.delete(txt["id"])
                self.text_items.remove(txt)
            else:
                color = f"#00{txt['green']:02x}00"
                self.canvas.itemconfig(txt["id"], fill=color)

    # ESC ile güvenli kapanış
    def safe_close(self, event=None):
        if self.keyboard_enabled:
            self.root.destroy()

    # Mouse gizleme/gösterme
    def hide_mouse(self, event=None):
        self.mouse_visible = False
        self.root.config(cursor="none")

    def show_mouse(self, event=None):
        self.mouse_visible = True
        self.root.config(cursor="arrow")

    # Klavye açma/kapama
    def disable_keyboard(self, event=None):
        self.keyboard_enabled = False

    def enable_keyboard(self, event=None):
        self.keyboard_enabled = True

if __name__ == "__main__":
    MatrixApp()
