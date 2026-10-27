/* Fiezel Kakijun Studio Data - Standard Japanese Stroke Order Vector Bank */
(function(root) {
  'use strict';
  var STROKES = {
  "あ": {
    "char": "あ",
    "romaji": "a",
    "script": "hiragana",
    "strokeCount": 3,
    "strokes": [
      {
        "order": 1,
        "hint": "Tarik garis mendatar dari kiri ke kanan dengan sedikit melengkung",
        "hintTh": "ลากเส้นแนวนอนจากซ้ายไปขวา",
        "start": [
          24,
          32
        ],
        "end": [
          76,
          28
        ],
        "direction": "right",
        "d": "M 24,32 Q 50,30 76,28"
      },
      {
        "order": 2,
        "hint": "Tarik garis vertikal sedikit melengkung memotong garis pertama",
        "hintTh": "ลากเส้นแนวตั้งตัดกับเส้นแรก",
        "start": [
          50,
          16
        ],
        "end": [
          46,
          84
        ],
        "direction": "down",
        "d": "M 50,16 Q 48,50 46,84"
      },
      {
        "order": 3,
        "hint": "Lengkungkan spiral memutar dari tengah ke bawah lalu melingkar",
        "hintTh": "สร้างส่วนโค้งวนเป็นวงกลม",
        "start": [
          36,
          44
        ],
        "end": [
          42,
          60
        ],
        "direction": "loop",
        "d": "M 36,44 C 24,70 56,88 78,64 C 88,48 64,44 42,60"
      }
    ]
  },
  "い": {
    "char": "い",
    "romaji": "i",
    "script": "hiragana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Tarik garis lengkung ke bawah di kiri, lalu buat sentakan kecil (hane) ke atas",
        "hintTh": "ลากเส้นโค้งลงทางซ้ายแล้วสะบัดขึ้นเล็กน้อย",
        "start": [
          30,
          26
        ],
        "end": [
          34,
          76
        ],
        "direction": "down",
        "d": "M 30,26 C 26,50 28,68 34,76"
      },
      {
        "order": 2,
        "hint": "Tarik garis lengkung lebih pendek di sisi kanan dari atas ke bawah",
        "hintTh": "ลากเส้นโค้งสั้นกว่าทางด้านขวาจากบนลงล่าง",
        "start": [
          68,
          34
        ],
        "end": [
          74,
          66
        ],
        "direction": "down",
        "d": "M 68,34 Q 72,50 74,66"
      }
    ]
  },
  "う": {
    "char": "う",
    "romaji": "u",
    "script": "hiragana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Tarik titik/garis pendek miring di bagian atas",
        "hintTh": "ลากเส้นเฉียงสั้นๆ ด้านบน",
        "start": [
          42,
          20
        ],
        "end": [
          58,
          26
        ],
        "direction": "right",
        "d": "M 42,20 Q 50,22 58,26"
      },
      {
        "order": 2,
        "hint": "Mulai dari kiri atas, buat lengkungan besar ke kanan lalu turun membulat ke bawah",
        "hintTh": "ลากเส้นโค้งใหญ่ไปทางขวาแล้วโค้งลงด้านล่าง",
        "start": [
          34,
          38
        ],
        "end": [
          42,
          82
        ],
        "direction": "curve_right",
        "d": "M 34,38 C 72,32 78,64 42,82"
      }
    ]
  },
  "え": {
    "char": "え",
    "romaji": "e",
    "script": "hiragana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Tarik titik miring pendek di bagian atas",
        "hintTh": "ลากเส้นเฉียงสั้นๆ ด้านบน",
        "start": [
          44,
          20
        ],
        "end": [
          56,
          26
        ],
        "direction": "right",
        "d": "M 44,20 Q 50,23 56,26"
      },
      {
        "order": 2,
        "hint": "Tarik garis zig-zag: miring ke bawah, lalu naik mendatar, lalu gelombang ke kanan",
        "hintTh": "ลากเส้นซิกแซกโค้งเหมือนคลื่น",
        "start": [
          32,
          42
        ],
        "end": [
          78,
          80
        ],
        "direction": "zigzag",
        "d": "M 32,42 L 56,38 L 34,76 Q 54,66 72,74 L 78,80"
      }
    ]
  },
  "お": {
    "char": "お",
    "romaji": "o",
    "script": "hiragana",
    "strokeCount": 3,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis mendatar pendek dari kiri ke kanan",
        "hintTh": "ลากเส้นแนวนอนสั้นๆ จากซ้ายไปขวา",
        "start": [
          24,
          36
        ],
        "end": [
          62,
          34
        ],
        "direction": "right",
        "d": "M 24,36 L 62,34"
      },
      {
        "order": 2,
        "hint": "Tarik garis turun vertikal, buat simpul kecil ke kiri, lalu lengkungkan membulat ke kanan",
        "hintTh": "ลากลงมาทำห่วงเล็กๆ แล้วโค้งออกไปทางขวา",
        "start": [
          46,
          20
        ],
        "end": [
          44,
          76
        ],
        "direction": "loop",
        "d": "M 46,20 L 46,62 C 46,74 32,70 36,58 C 42,46 76,52 74,74 C 70,84 56,84 44,76"
      },
      {
        "order": 3,
        "hint": "Tambahkan titik miring di kanan atas",
        "hintTh": "แต้มจุดเฉียงที่ด้านขวาบน",
        "start": [
          70,
          28
        ],
        "end": [
          80,
          38
        ],
        "direction": "down_right",
        "d": "M 70,28 Q 76,34 80,38"
      }
    ]
  },
  "か": {
    "char": "か",
    "romaji": "ka",
    "script": "hiragana",
    "strokeCount": 3,
    "strokes": [
      {
        "order": 1,
        "hint": "Tarik garis melintang ke kanan, tekuk ke bawah dengan sedikit sentakan",
        "hintTh": "ลากเส้นไปทางขวา หักมุมลงแล้วสะบัดขึ้น",
        "start": [
          24,
          38
        ],
        "end": [
          50,
          78
        ],
        "direction": "hook",
        "d": "M 24,38 L 54,34 Q 62,34 60,46 L 50,78"
      },
      {
        "order": 2,
        "hint": "Tarik garis lengkung melintasi goresan pertama dari atas ke kiri bawah",
        "hintTh": "ลากเส้นโค้งตัดเส้นแรกจากบนลงล่างซ้าย",
        "start": [
          38,
          22
        ],
        "end": [
          30,
          80
        ],
        "direction": "down_left",
        "d": "M 38,22 Q 36,52 30,80"
      },
      {
        "order": 3,
        "hint": "Beri titik goresan miring di kanan atas",
        "hintTh": "แต้มจุดเฉียงที่ด้านขวาบน",
        "start": [
          72,
          30
        ],
        "end": [
          82,
          42
        ],
        "direction": "down_right",
        "d": "M 72,30 Q 78,36 82,42"
      }
    ]
  },
  "き": {
    "char": "き",
    "romaji": "ki",
    "script": "hiragana",
    "strokeCount": 4,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis horizontal atas agak miring ke atas",
        "hintTh": "ลากเส้นแนวนอนเส้นบนเฉียงขึ้นเล็กน้อย",
        "start": [
          30,
          32
        ],
        "end": [
          70,
          26
        ],
        "direction": "right",
        "d": "M 30,32 L 70,26"
      },
      {
        "order": 2,
        "hint": "Garis horizontal kedua di bawahnya sejajar",
        "hintTh": "ลากเส้นแนวนอนเส้นที่สองขนานกัน",
        "start": [
          26,
          46
        ],
        "end": [
          74,
          40
        ],
        "direction": "right",
        "d": "M 26,46 L 74,40"
      },
      {
        "order": 3,
        "hint": "Tarik garis diagonal memotong kedua garis lalu buat sentakan ke kiri",
        "hintTh": "ลากเส้นทแยงตัดทั้งสองเส้นแล้วสะบัดไปทางซ้าย",
        "start": [
          56,
          16
        ],
        "end": [
          42,
          64
        ],
        "direction": "down_left",
        "d": "M 56,16 L 44,60 Q 42,64 36,62"
      },
      {
        "order": 4,
        "hint": "Lengkungkan senyum terbuka di bawah",
        "hintTh": "สร้างเส้นโค้งด้านล่าง",
        "start": [
          36,
          72
        ],
        "end": [
          64,
          76
        ],
        "direction": "curve_right",
        "d": "M 36,72 Q 48,84 64,76"
      }
    ]
  },
  "く": {
    "char": "く",
    "romaji": "ku",
    "script": "hiragana",
    "strokeCount": 1,
    "strokes": [
      {
        "order": 1,
        "hint": "Satu tarikan: garis diagonal ke kiri bawah lalu tekuk ke kanan bawah (sudut lancip)",
        "hintTh": "ลากเส้นทแยงลงซ้ายแล้วหักมุมเฉียงลงขวา",
        "start": [
          64,
          20
        ],
        "end": [
          66,
          80
        ],
        "direction": "angle",
        "d": "M 64,20 L 32,50 L 66,80"
      }
    ]
  },
  "け": {
    "char": "け",
    "romaji": "ke",
    "script": "hiragana",
    "strokeCount": 3,
    "strokes": [
      {
        "order": 1,
        "hint": "Tarik garis vertikal di kiri dengan sentakan kecil di ujung bawah",
        "hintTh": "ลากเส้นแนวตั้งทางซ้ายแล้วสะบัดขึ้นเล็กน้อย",
        "start": [
          30,
          24
        ],
        "end": [
          28,
          76
        ],
        "direction": "down",
        "d": "M 30,24 Q 28,52 28,76"
      },
      {
        "order": 2,
        "hint": "Tarik garis horizontal di kanan atas",
        "hintTh": "ลากเส้นแนวนอนด้านขวาบน",
        "start": [
          48,
          36
        ],
        "end": [
          76,
          32
        ],
        "direction": "right",
        "d": "M 48,36 L 76,32"
      },
      {
        "order": 3,
        "hint": "Tarik garis vertikal memotong garis kedua dan melengkung lembut ke kiri bawah",
        "hintTh": "ลากเส้นแนวตั้งตัดเส้นที่สองแล้วโค้งลงซ้าย",
        "start": [
          64,
          20
        ],
        "end": [
          56,
          82
        ],
        "direction": "down_left",
        "d": "M 64,20 Q 64,52 56,82"
      }
    ]
  },
  "こ": {
    "char": "こ",
    "romaji": "ko",
    "script": "hiragana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis horizontal atas melengkung sedikit dengan sentakan kecil di kanan",
        "hintTh": "ลากเส้นแนวนอนด้านบนแล้วสะบัดเบาๆ",
        "start": [
          32,
          34
        ],
        "end": [
          68,
          32
        ],
        "direction": "right",
        "d": "M 32,34 Q 50,30 68,32"
      },
      {
        "order": 2,
        "hint": "Garis horizontal bawah melengkung lembut membentuk mangkok datar",
        "hintTh": "ลากเส้นแนวนอนด้านล่างโค้งรับ",
        "start": [
          30,
          70
        ],
        "end": [
          70,
          68
        ],
        "direction": "right",
        "d": "M 30,70 Q 52,74 70,68"
      }
    ]
  },
  "さ": {
    "char": "さ",
    "romaji": "sa",
    "script": "hiragana",
    "strokeCount": 3,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis horizontal mendatar agak naik ke kanan",
        "hintTh": "ลากเส้นแนวนอนเฉียงขึ้นทางขวา",
        "start": [
          28,
          36
        ],
        "end": [
          72,
          28
        ],
        "direction": "right",
        "d": "M 28,36 L 72,28"
      },
      {
        "order": 2,
        "hint": "Garis diagonal memotong garis pertama dengan sentakan di kiri bawah",
        "hintTh": "ลากเส้นทแยงตัดเส้นแรกแล้วสะบัดปลาย",
        "start": [
          56,
          18
        ],
        "end": [
          42,
          60
        ],
        "direction": "down_left",
        "d": "M 56,18 L 44,56 Q 42,60 38,58"
      },
      {
        "order": 3,
        "hint": "Lengkungan melingkar terbuka di bawah",
        "hintTh": "ลากเส้นโค้งด้านล่าง",
        "start": [
          34,
          68
        ],
        "end": [
          66,
          74
        ],
        "direction": "curve_right",
        "d": "M 34,68 Q 48,84 66,74"
      }
    ]
  },
  "し": {
    "char": "し",
    "romaji": "shi",
    "script": "hiragana",
    "strokeCount": 1,
    "strokes": [
      {
        "order": 1,
        "hint": "Satu tarikan: garis vertikal dari atas lalu melengkung ke kanan seperti kait pancing",
        "hintTh": "ลากตรงลงมาแล้วโค้งขึ้นขวาเหมือนเบ็ดตกปลา",
        "start": [
          38,
          20
        ],
        "end": [
          72,
          54
        ],
        "direction": "curve_up",
        "d": "M 38,20 L 38,60 C 38,76 60,82 72,54"
      }
    ]
  },
  "す": {
    "char": "す",
    "romaji": "su",
    "script": "hiragana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis horizontal panjang dari kiri ke kanan",
        "hintTh": "ลากเส้นแนวนอนยาวจากซ้ายไปขวา",
        "start": [
          22,
          34
        ],
        "end": [
          78,
          30
        ],
        "direction": "right",
        "d": "M 22,34 L 78,30"
      },
      {
        "order": 2,
        "hint": "Tarik garis turun, buat simpul memutar ke kiri di tengah, lalu lanjut lurus ke bawah",
        "hintTh": "ลากเส้นตรงลงมา ทำห่วงกลมตรงกลางแล้วลากลงต่อ",
        "start": [
          52,
          16
        ],
        "end": [
          40,
          84
        ],
        "direction": "loop_down",
        "d": "M 52,16 L 52,50 C 52,60 40,64 42,50 C 44,40 56,44 52,56 L 40,84"
      }
    ]
  },
  "せ": {
    "char": "せ",
    "romaji": "se",
    "script": "hiragana",
    "strokeCount": 3,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis horizontal mendatar panjang melintasi bagian atas",
        "hintTh": "ลากเส้นแนวนอนยาว",
        "start": [
          20,
          42
        ],
        "end": [
          80,
          36
        ],
        "direction": "right",
        "d": "M 20,42 L 80,36"
      },
      {
        "order": 2,
        "hint": "Garis vertikal di kanan melengkung ke kiri bawah",
        "hintTh": "ลากเส้นแนวตั้งทางขวาแล้วหักเลี้ยวซ้าย",
        "start": [
          66,
          24
        ],
        "end": [
          48,
          76
        ],
        "direction": "down_left",
        "d": "M 66,24 L 66,62 Q 66,74 48,76"
      },
      {
        "order": 3,
        "hint": "Garis vertikal di kiri turun dan menyentak ke kanan atas",
        "hintTh": "ลากเส้นแนวตั้งทางซ้ายแล้วสะบัดขึ้น",
        "start": [
          36,
          26
        ],
        "end": [
          40,
          78
        ],
        "direction": "down_hook",
        "d": "M 36,26 L 36,70 Q 36,78 44,76"
      }
    ]
  },
  "そ": {
    "char": "そ",
    "romaji": "so",
    "script": "hiragana",
    "strokeCount": 1,
    "strokes": [
      {
        "order": 1,
        "hint": "Satu tarikan: garis mendatar, miring diagonal ke bawah, balik ke kanan, lalu lengkungkan membulat ke bawah",
        "hintTh": "ลากเส้นซิกแซกต่อด้วยเส้นโค้งด้านล่างในจังหวะเดียว",
        "start": [
          32,
          28
        ],
        "end": [
          66,
          80
        ],
        "direction": "complex_z",
        "d": "M 32,28 L 62,26 L 34,54 L 66,50 C 66,78 40,84 66,80"
      }
    ]
  },
  "た": {
    "char": "た",
    "romaji": "ta",
    "script": "hiragana",
    "strokeCount": 4,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis horizontal mendatar pendek di kiri atas",
        "hintTh": "ลากเส้นแนวนอนสั้นๆ ด้านบนซ้าย",
        "start": [
          24,
          38
        ],
        "end": [
          56,
          32
        ],
        "direction": "right",
        "d": "M 24,38 L 56,32"
      },
      {
        "order": 2,
        "hint": "Garis diagonal memotong garis pertama dari atas ke kiri bawah",
        "hintTh": "ลากเส้นทแยงตัดเส้นแรกจากบนลงล่างซ้าย",
        "start": [
          42,
          22
        ],
        "end": [
          30,
          72
        ],
        "direction": "down_left",
        "d": "M 42,22 L 30,72"
      },
      {
        "order": 3,
        "hint": "Garis horizontal kecil di kanan tengah",
        "hintTh": "ลากเส้นแนวนอนเล็กๆ ตรงกลางขวา",
        "start": [
          52,
          46
        ],
        "end": [
          74,
          44
        ],
        "direction": "right",
        "d": "M 52,46 L 74,44"
      },
      {
        "order": 4,
        "hint": "Garis melengkung kecil di bawah garis ketiga",
        "hintTh": "ลากเส้นโค้งเล็กๆ ใต้เส้นที่สาม",
        "start": [
          50,
          66
        ],
        "end": [
          76,
          68
        ],
        "direction": "curve_right",
        "d": "M 50,66 Q 64,74 76,68"
      }
    ]
  },
  "ち": {
    "char": "ち",
    "romaji": "chi",
    "script": "hiragana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis horizontal mendatar dari kiri ke kanan",
        "hintTh": "ลากเส้นแนวนอนจากซ้ายไปขวา",
        "start": [
          26,
          34
        ],
        "end": [
          72,
          30
        ],
        "direction": "right",
        "d": "M 26,34 L 72,30"
      },
      {
        "order": 2,
        "hint": "Tarik garis turun vertikal lalu buat lengkungan membulat besar seperti angka 5",
        "hintTh": "ลากเส้นตรงลงมาแล้ววาดส่วนโค้งใหญ่คล้ายเลข 5",
        "start": [
          48,
          18
        ],
        "end": [
          42,
          82
        ],
        "direction": "loop",
        "d": "M 48,18 L 48,46 C 74,38 78,74 42,82"
      }
    ]
  },
  "つ": {
    "char": "つ",
    "romaji": "tsu",
    "script": "hiragana",
    "strokeCount": 1,
    "strokes": [
      {
        "order": 1,
        "hint": "Satu tarikan: garis horizontal melengkung ke kanan lalu turun membulat seperti ombak besar",
        "hintTh": "ลากเส้นโค้งแนวนอนแล้วโค้งตวัดลงมาเหมือนเกลียวคลื่น",
        "start": [
          24,
          40
        ],
        "end": [
          40,
          78
        ],
        "direction": "curve_wave",
        "d": "M 24,40 C 56,26 84,40 76,64 C 70,82 46,84 40,78"
      }
    ]
  },
  "て": {
    "char": "て",
    "romaji": "te",
    "script": "hiragana",
    "strokeCount": 1,
    "strokes": [
      {
        "order": 1,
        "hint": "Satu tarikan: garis horizontal ke kanan lalu melengkung turun ke kiri membulat",
        "hintTh": "ลากแนวนอนไปขวาแล้วโค้งย้อนกลับลงมาทางซ้าย",
        "start": [
          28,
          34
        ],
        "end": [
          66,
          76
        ],
        "direction": "curve_c",
        "d": "M 28,34 L 70,30 C 70,54 36,60 66,76"
      }
    ]
  },
  "と": {
    "char": "と",
    "romaji": "to",
    "script": "hiragana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis diagonal pendek dari atas condong ke kanan bawah",
        "hintTh": "ลากเส้นเฉียงสั้นๆ จากบนลงล่างขวา",
        "start": [
          38,
          22
        ],
        "end": [
          50,
          44
        ],
        "direction": "down_right",
        "d": "M 38,22 L 50,44"
      },
      {
        "order": 2,
        "hint": "Garis lengkungan C terbuka memeluk goresan pertama dari kiri ke bawah",
        "hintTh": "ลากเส้นโค้งอ้อมโอบเส้นแรกจากซ้ายลงล่าง",
        "start": [
          62,
          38
        ],
        "end": [
          66,
          78
        ],
        "direction": "curve_c",
        "d": "M 62,38 C 30,52 34,76 66,78"
      }
    ]
  },
  "な": {
    "char": "な",
    "romaji": "na",
    "script": "hiragana",
    "strokeCount": 4,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis horizontal mendatar pendek di kiri atas",
        "hintTh": "ลากเส้นแนวนอนสั้นๆ",
        "start": [
          24,
          34
        ],
        "end": [
          50,
          30
        ],
        "direction": "right",
        "d": "M 24,34 L 50,30"
      },
      {
        "order": 2,
        "hint": "Garis diagonal memotong garis pertama dari atas ke kiri bawah",
        "hintTh": "ลากเส้นทแยงตัดเส้นแรก",
        "start": [
          38,
          20
        ],
        "end": [
          30,
          64
        ],
        "direction": "down_left",
        "d": "M 38,20 L 30,64"
      },
      {
        "order": 3,
        "hint": "Titik miring kecil di kanan tengah",
        "hintTh": "แต้มจุดเฉียงเล็กๆ ด้านขวา",
        "start": [
          62,
          36
        ],
        "end": [
          70,
          44
        ],
        "direction": "down_right",
        "d": "M 62,36 L 70,44"
      },
      {
        "order": 4,
        "hint": "Garis vertikal di kanan bawah membuat simpul melingkar kecil",
        "hintTh": "ลากเส้นแนวตั้งแล้วม้วนทำห่วงเล็กๆ",
        "start": [
          66,
          52
        ],
        "end": [
          52,
          82
        ],
        "direction": "loop",
        "d": "M 66,52 L 66,70 C 66,78 54,80 54,72 C 54,64 68,66 64,80 L 52,82"
      }
    ]
  },
  "に": {
    "char": "に",
    "romaji": "ni",
    "script": "hiragana",
    "strokeCount": 3,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis vertikal melengkung di sisi kiri dengan sentakan kecil di bawah",
        "hintTh": "ลากเส้นแนวตั้งทางซ้ายแล้วสะบัดขึ้น",
        "start": [
          30,
          24
        ],
        "end": [
          28,
          76
        ],
        "direction": "down",
        "d": "M 30,24 Q 28,52 28,76"
      },
      {
        "order": 2,
        "hint": "Garis horizontal atas di sisi kanan",
        "hintTh": "ลากเส้นแนวนอนด้านขวาบน",
        "start": [
          52,
          40
        ],
        "end": [
          76,
          38
        ],
        "direction": "right",
        "d": "M 52,40 L 76,38"
      },
      {
        "order": 3,
        "hint": "Garis horizontal bawah di sisi kanan melengkung lembut",
        "hintTh": "ลากเส้นแนวนอนด้านขวาล่าง",
        "start": [
          50,
          66
        ],
        "end": [
          78,
          64
        ],
        "direction": "right",
        "d": "M 50,66 Q 64,70 78,64"
      }
    ]
  },
  "ぬ": {
    "char": "ぬ",
    "romaji": "nu",
    "script": "hiragana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis diagonal miring dari kiri atas ke tengah bawah",
        "hintTh": "ลากเส้นทแยงจากบนซ้ายลงกลางล่าง",
        "start": [
          38,
          24
        ],
        "end": [
          30,
          74
        ],
        "direction": "down_left",
        "d": "M 38,24 L 30,74"
      },
      {
        "order": 2,
        "hint": "Mulai dari tengah atas, turun melingkar membentuk badan lalu buat simpul kecil di kanan bawah",
        "hintTh": "ลากโค้งวนเป็นรูปไข่แล้วทำห่วงเล็กที่มุมขวาล่าง",
        "start": [
          26,
          40
        ],
        "end": [
          78,
          80
        ],
        "direction": "complex_loop",
        "d": "M 26,40 C 62,32 76,64 42,76 C 28,80 50,44 72,66 C 76,70 78,80 78,80"
      }
    ]
  },
  "ね": {
    "char": "ね",
    "romaji": "ne",
    "script": "hiragana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis vertikal lurus di sebelah kiri",
        "hintTh": "ลากเส้นแนวตั้งตรงทางซ้าย",
        "start": [
          32,
          22
        ],
        "end": [
          32,
          80
        ],
        "direction": "down",
        "d": "M 32,22 L 32,80"
      },
      {
        "order": 2,
        "hint": "Garis zig-zag melintasi garis pertama lalu buat simpul kecil di ujung kanan",
        "hintTh": "ลากเส้นซิกแซกตัดเส้นตรงแล้วม้วนห่วงที่ปลายขวา",
        "start": [
          22,
          44
        ],
        "end": [
          76,
          76
        ],
        "direction": "zigzag_loop",
        "d": "M 22,44 L 56,38 L 26,76 Q 50,56 70,68 C 76,72 74,80 70,78 L 76,76"
      }
    ]
  },
  "の": {
    "char": "の",
    "romaji": "no",
    "script": "hiragana",
    "strokeCount": 1,
    "strokes": [
      {
        "order": 1,
        "hint": "Satu tarikan: garis diagonal pendek dari kanan atas ke tengah, lalu melingkar besar ke kanan membulat",
        "hintTh": "ลากเฉียงลงกลางแล้ววาดวงกลมโค้งมนออกไปทางขวา",
        "start": [
          52,
          28
        ],
        "end": [
          34,
          68
        ],
        "direction": "spiral",
        "d": "M 52,28 L 38,58 C 24,78 68,90 76,56 C 82,32 46,30 34,68"
      }
    ]
  },
  "は": {
    "char": "は",
    "romaji": "ha",
    "script": "hiragana",
    "strokeCount": 3,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis vertikal kiri dengan sentakan kecil di bawah",
        "hintTh": "ลากเส้นแนวตั้งทางซ้ายแล้วสะบัดขึ้น",
        "start": [
          30,
          22
        ],
        "end": [
          28,
          78
        ],
        "direction": "down",
        "d": "M 30,22 Q 28,52 28,78"
      },
      {
        "order": 2,
        "hint": "Garis horizontal mendatar pendek di kanan atas",
        "hintTh": "ลากเส้นแนวนอนสั้นๆ ด้านขวา",
        "start": [
          50,
          36
        ],
        "end": [
          74,
          34
        ],
        "direction": "right",
        "d": "M 50,36 L 74,34"
      },
      {
        "order": 3,
        "hint": "Garis vertikal memotong garis kedua lalu membentuk simpul melingkar ke kiri",
        "hintTh": "ลากเส้นแนวตั้งตัดเส้นที่สองแล้วทำห่วงกลมไปทางซ้าย",
        "start": [
          64,
          20
        ],
        "end": [
          50,
          78
        ],
        "direction": "loop",
        "d": "M 64,20 L 64,64 C 64,74 50,78 50,68 C 50,58 64,60 62,74 L 50,78"
      }
    ]
  },
  "ひ": {
    "char": "ひ",
    "romaji": "hi",
    "script": "hiragana",
    "strokeCount": 1,
    "strokes": [
      {
        "order": 1,
        "hint": "Satu tarikan: garis horizontal pendek, lengkung mangkok besar ke bawah, lalu naik dan turun miring",
        "hintTh": "ลากแนวนอนสั้นๆ โค้งเป็นรูปถ้วยใหญ่แล้วลากลงเฉียงๆ",
        "start": [
          24,
          38
        ],
        "end": [
          76,
          68
        ],
        "direction": "complex_u",
        "d": "M 24,38 L 44,34 C 26,68 64,84 66,54 L 76,68"
      }
    ]
  },
  "ふ": {
    "char": "ふ",
    "romaji": "fu",
    "script": "hiragana",
    "strokeCount": 4,
    "strokes": [
      {
        "order": 1,
        "hint": "Titik miring pendek di bagian atas",
        "hintTh": "แต้มจุดเฉียงสั้นๆ ด้านบน",
        "start": [
          48,
          18
        ],
        "end": [
          54,
          28
        ],
        "direction": "down",
        "d": "M 48,18 Q 50,24 54,28"
      },
      {
        "order": 2,
        "hint": "Garis vertikal melengkung di tengah dengan sentakan",
        "hintTh": "ลากเส้นโค้งตรงกลางแล้วสะบัดปลาย",
        "start": [
          50,
          36
        ],
        "end": [
          44,
          76
        ],
        "direction": "down_hook",
        "d": "M 50,36 Q 48,56 44,76"
      },
      {
        "order": 3,
        "hint": "Titik melengkung di sisi kiri",
        "hintTh": "แต้มจุดโค้งทางด้านซ้าย",
        "start": [
          26,
          48
        ],
        "end": [
          32,
          60
        ],
        "direction": "down_left",
        "d": "M 26,48 Q 28,54 32,60"
      },
      {
        "order": 4,
        "hint": "Titik miring di sisi kanan",
        "hintTh": "แต้มจุดเฉียงทางด้านขวา",
        "start": [
          72,
          46
        ],
        "end": [
          80,
          58
        ],
        "direction": "down_right",
        "d": "M 72,46 Q 76,52 80,58"
      }
    ]
  },
  "へ": {
    "char": "へ",
    "romaji": "he",
    "script": "hiragana",
    "strokeCount": 1,
    "strokes": [
      {
        "order": 1,
        "hint": "Satu tarikan: naik miring seperti atap gunung lalu melandai panjang ke kanan bawah",
        "hintTh": "ลากขึ้นเฉียงเหมือนยอดเขาแล้วลากเฉียงลงทางขวา",
        "start": [
          24,
          60
        ],
        "end": [
          78,
          56
        ],
        "direction": "mountain",
        "d": "M 24,60 L 46,32 L 78,56"
      }
    ]
  },
  "ほ": {
    "char": "ほ",
    "romaji": "ho",
    "script": "hiragana",
    "strokeCount": 4,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis vertikal di kiri dengan sentakan kecil",
        "hintTh": "ลากเส้นแนวตั้งทางซ้าย",
        "start": [
          28,
          22
        ],
        "end": [
          26,
          78
        ],
        "direction": "down",
        "d": "M 28,22 L 26,78"
      },
      {
        "order": 2,
        "hint": "Garis horizontal atas di sebelah kanan",
        "hintTh": "ลากเส้นแนวนอนด้านบนขวา",
        "start": [
          46,
          32
        ],
        "end": [
          76,
          30
        ],
        "direction": "right",
        "d": "M 46,32 L 76,30"
      },
      {
        "order": 3,
        "hint": "Garis horizontal kedua di bawahnya",
        "hintTh": "ลากเส้นแนวนอนเส้นที่สองด้านขวา",
        "start": [
          48,
          46
        ],
        "end": [
          74,
          44
        ],
        "direction": "right",
        "d": "M 48,46 L 74,44"
      },
      {
        "order": 4,
        "hint": "Garis vertikal memotong garis kedua lalu membuat simpul melingkar di bawah",
        "hintTh": "ลากเส้นแนวตั้งตัดเส้นที่สามแล้วทำห่วงกลม",
        "start": [
          62,
          22
        ],
        "end": [
          50,
          80
        ],
        "direction": "loop",
        "d": "M 62,22 L 62,64 C 62,74 48,78 48,68 C 48,58 62,60 60,74 L 50,80"
      }
    ]
  },
  "ま": {
    "char": "ま",
    "romaji": "ma",
    "script": "hiragana",
    "strokeCount": 3,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis horizontal mendatar atas",
        "hintTh": "ลากเส้นแนวนอนเส้นบน",
        "start": [
          28,
          32
        ],
        "end": [
          72,
          28
        ],
        "direction": "right",
        "d": "M 28,32 L 72,28"
      },
      {
        "order": 2,
        "hint": "Garis horizontal mendatar kedua di bawahnya",
        "hintTh": "ลากเส้นแนวนอนเส้นที่สอง",
        "start": [
          32,
          46
        ],
        "end": [
          68,
          44
        ],
        "direction": "right",
        "d": "M 32,46 L 68,44"
      },
      {
        "order": 3,
        "hint": "Garis vertikal memotong kedua garis lalu membuat simpul melingkar ke kiri",
        "hintTh": "ลากเส้นแนวตั้งตัดทั้งสองเส้นแล้วทำห่วงกลมไปทางซ้าย",
        "start": [
          52,
          18
        ],
        "end": [
          40,
          82
        ],
        "direction": "loop",
        "d": "M 52,18 L 52,62 C 52,72 38,76 38,66 C 38,56 52,58 50,72 L 40,82"
      }
    ]
  },
  "み": {
    "char": "み",
    "romaji": "mi",
    "script": "hiragana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis meluncur ke kiri, membuat simpul miring ke kanan, lalu tarik panjang mendatar",
        "hintTh": "ลากเส้นลงเฉียง ทำห่วงแล้วตวัดขนานไปทางขวา",
        "start": [
          30,
          28
        ],
        "end": [
          76,
          60
        ],
        "direction": "complex_knot",
        "d": "M 30,28 L 52,24 L 32,60 C 26,68 38,72 46,64 L 76,60"
      },
      {
        "order": 2,
        "hint": "Garis lengkung melintasi ekor garis pertama dari atas ke kanan bawah",
        "hintTh": "ลากเส้นโค้งตัดปลายเส้นแรกจากบนลงล่างขวา",
        "start": [
          66,
          36
        ],
        "end": [
          56,
          78
        ],
        "direction": "down_left",
        "d": "M 66,36 Q 64,56 56,78"
      }
    ]
  },
  "む": {
    "char": "む",
    "romaji": "mu",
    "script": "hiragana",
    "strokeCount": 3,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis horizontal mendatar dari kiri ke kanan",
        "hintTh": "ลากเส้นแนวนอนจากซ้ายไปขวา",
        "start": [
          24,
          36
        ],
        "end": [
          60,
          32
        ],
        "direction": "right",
        "d": "M 24,36 L 60,32"
      },
      {
        "order": 2,
        "hint": "Garis vertikal turun memotong garis pertama, membuat simpul kecil, naik ke kanan atas",
        "hintTh": "ลากเส้นแนวตั้งลงมา ทำห่วงเล็กแล้วสะบัดขึ้นทางขวา",
        "start": [
          44,
          20
        ],
        "end": [
          74,
          52
        ],
        "direction": "loop_up",
        "d": "M 44,20 L 44,60 C 44,70 32,74 34,62 C 36,50 56,58 66,66 L 74,52"
      },
      {
        "order": 3,
        "hint": "Beri titik miring di kanan atas",
        "hintTh": "แต้มจุดเฉียงที่ด้านขวาบน",
        "start": [
          72,
          30
        ],
        "end": [
          80,
          40
        ],
        "direction": "down_right",
        "d": "M 72,30 L 80,40"
      }
    ]
  },
  "め": {
    "char": "め",
    "romaji": "me",
    "script": "hiragana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis diagonal pendek melengkung dari kiri atas ke tengah bawah",
        "hintTh": "ลากเส้นเฉียงสั้นๆ จากบนซ้ายลงกลางล่าง",
        "start": [
          40,
          24
        ],
        "end": [
          30,
          72
        ],
        "direction": "down_left",
        "d": "M 40,24 L 30,72"
      },
      {
        "order": 2,
        "hint": "Mulai dari kiri tengah, melengkung besar membulat memotong garis pertama lalu menyapu ke kanan",
        "hintTh": "ลากเส้นโค้งใหญ่ตัดเส้นแรกแล้วปัดลงทางขวา",
        "start": [
          28,
          42
        ],
        "end": [
          76,
          76
        ],
        "direction": "curve_sweep",
        "d": "M 28,42 C 60,30 76,58 50,76 C 36,82 52,48 76,76"
      }
    ]
  },
  "も": {
    "char": "も",
    "romaji": "mo",
    "script": "hiragana",
    "strokeCount": 3,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis vertikal melengkung di bawah seperti kail pancing (mirip し)",
        "hintTh": "ลากเส้นแนวตั้งแล้วโค้งขึ้นคล้ายเบ็ดตกปลา",
        "start": [
          48,
          18
        ],
        "end": [
          72,
          68
        ],
        "direction": "hook_up",
        "d": "M 48,18 L 48,64 C 48,78 64,82 72,68"
      },
      {
        "order": 2,
        "hint": "Garis horizontal mendatar atas memotong garis vertikal",
        "hintTh": "ลากเส้นแนวนอนเส้นบนตัดเส้นตรง",
        "start": [
          30,
          36
        ],
        "end": [
          70,
          32
        ],
        "direction": "right",
        "d": "M 30,36 L 70,32"
      },
      {
        "order": 3,
        "hint": "Garis horizontal mendatar kedua di bawahnya",
        "hintTh": "ลากเส้นแนวนอนเส้นที่สองตัดเส้นตรง",
        "start": [
          28,
          50
        ],
        "end": [
          72,
          46
        ],
        "direction": "right",
        "d": "M 28,50 L 72,46"
      }
    ]
  },
  "や": {
    "char": "や",
    "romaji": "ya",
    "script": "hiragana",
    "strokeCount": 3,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis melengkung ke kanan atas, turun melengkung ke bawah dengan sentakan",
        "hintTh": "ลากเส้นโค้งขึ้นขวาแล้วโค้งลงพร้อมสะบัดปลาย",
        "start": [
          28,
          40
        ],
        "end": [
          50,
          78
        ],
        "direction": "hook",
        "d": "M 28,40 C 44,28 66,32 64,48 L 50,78"
      },
      {
        "order": 2,
        "hint": "Titik miring pendek di bagian atas",
        "hintTh": "แต้มจุดเฉียงสั้นๆ ด้านบน",
        "start": [
          44,
          24
        ],
        "end": [
          48,
          34
        ],
        "direction": "down",
        "d": "M 44,24 L 48,34"
      },
      {
        "order": 3,
        "hint": "Garis diagonal panjang dari atas memotong goresan pertama ke kiri bawah",
        "hintTh": "ลากเส้นทแยงยาวตัดเส้นแรกจากบนลงล่างซ้าย",
        "start": [
          66,
          20
        ],
        "end": [
          30,
          80
        ],
        "direction": "down_left",
        "d": "M 66,20 L 30,80"
      }
    ]
  },
  "ゆ": {
    "char": "ゆ",
    "romaji": "yu",
    "script": "hiragana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis turun vertikal, melingkar membulat ke kanan, lalu memotong dirinya sendiri ke atas",
        "hintTh": "ลากเส้นตรงลงมา ทำส่วนโค้งมนไปทางขวาแล้วตวัดขึ้น",
        "start": [
          36,
          22
        ],
        "end": [
          66,
          52
        ],
        "direction": "complex_bowl",
        "d": "M 36,22 L 36,60 C 36,78 68,76 68,52 L 66,52"
      },
      {
        "order": 2,
        "hint": "Garis vertikal lurus memotong lengkungan dari atas ke bawah",
        "hintTh": "ลากเส้นแนวตั้งตรงตัดผ่านส่วนโค้งจากบนลงล่าง",
        "start": [
          58,
          20
        ],
        "end": [
          52,
          82
        ],
        "direction": "down",
        "d": "M 58,20 L 52,82"
      }
    ]
  },
  "よ": {
    "char": "よ",
    "romaji": "yo",
    "script": "hiragana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis horizontal mendatar pendek di kiri atas",
        "hintTh": "ลากเส้นแนวนอนสั้นๆ ด้านบนซ้าย",
        "start": [
          30,
          36
        ],
        "end": [
          56,
          34
        ],
        "direction": "right",
        "d": "M 30,36 L 56,34"
      },
      {
        "order": 2,
        "hint": "Garis vertikal turun memotong garis pertama, membuat simpul melingkar di kiri, lalu menyapu ke kanan",
        "hintTh": "ลากเส้นแนวตั้งลงมา ทำห่วงทางซ้ายแล้วปัดไปทางขวา",
        "start": [
          54,
          18
        ],
        "end": [
          74,
          76
        ],
        "direction": "loop_right",
        "d": "M 54,18 L 54,64 C 54,76 38,76 38,66 C 38,56 56,58 54,74 L 74,76"
      }
    ]
  },
  "ら": {
    "char": "ら",
    "romaji": "ra",
    "script": "hiragana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Titik miring pendek di bagian atas",
        "hintTh": "แต้มจุดเฉียงสั้นๆ ด้านบน",
        "start": [
          42,
          22
        ],
        "end": [
          52,
          28
        ],
        "direction": "right",
        "d": "M 42,22 L 52,28"
      },
      {
        "order": 2,
        "hint": "Garis turun sedikit lalu melengkung membulat besar seperti angka 5 terbalik",
        "hintTh": "ลากเส้นลงมาเล็กน้อยแล้ววาดส่วนโค้งใหญ่",
        "start": [
          38,
          40
        ],
        "end": [
          44,
          80
        ],
        "direction": "curve_c",
        "d": "M 38,40 L 42,46 C 74,42 74,76 44,80"
      }
    ]
  },
  "り": {
    "char": "り",
    "romaji": "ri",
    "script": "hiragana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis vertikal pendek di sebelah kiri dengan sentakan kecil ke atas",
        "hintTh": "ลากเส้นแนวตั้งสั้นทางซ้ายแล้วสะบัดขึ้น",
        "start": [
          36,
          28
        ],
        "end": [
          34,
          60
        ],
        "direction": "down_hook",
        "d": "M 36,28 L 34,56 Q 34,60 38,58"
      },
      {
        "order": 2,
        "hint": "Garis vertikal panjang di kanan melengkung anggun ke kiri bawah",
        "hintTh": "ลากเส้นแนวตั้งยาวทางขวาโค้งมนลงล่างซ้าย",
        "start": [
          64,
          20
        ],
        "end": [
          52,
          82
        ],
        "direction": "down_left",
        "d": "M 64,20 Q 64,56 52,82"
      }
    ]
  },
  "る": {
    "char": "る",
    "romaji": "ru",
    "script": "hiragana",
    "strokeCount": 1,
    "strokes": [
      {
        "order": 1,
        "hint": "Satu tarikan: garis mendatar, diagonal turun, lengkung membulat, dan simpul lingkaran kecil di ujung",
        "hintTh": "ลากแนวนอน เฉียงลง โค้งมนคล้ายเลข 3 แล้วม้วนห่วงกลมที่ปลาย",
        "start": [
          30,
          26
        ],
        "end": [
          52,
          74
        ],
        "direction": "complex_loop",
        "d": "M 30,26 L 66,24 L 38,52 C 72,46 76,78 48,78 C 42,78 42,70 48,70 C 54,70 54,76 52,74"
      }
    ]
  },
  "れ": {
    "char": "れ",
    "romaji": "re",
    "script": "hiragana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis vertikal lurus di sebelah kiri",
        "hintTh": "ลากเส้นแนวตั้งตรงทางซ้าย",
        "start": [
          32,
          22
        ],
        "end": [
          32,
          80
        ],
        "direction": "down",
        "d": "M 32,22 L 32,80"
      },
      {
        "order": 2,
        "hint": "Garis zig-zag melintasi garis pertama lalu melengkung keluar dan menyentak ke kanan atas",
        "hintTh": "ลากเส้นซิกแซกตัดเส้นตรงแล้วตวัดปลายขึ้นขวา",
        "start": [
          22,
          44
        ],
        "end": [
          76,
          68
        ],
        "direction": "zigzag_wave",
        "d": "M 22,44 L 56,38 L 28,76 Q 48,56 62,64 L 76,68"
      }
    ]
  },
  "ろ": {
    "char": "ろ",
    "romaji": "ro",
    "script": "hiragana",
    "strokeCount": 1,
    "strokes": [
      {
        "order": 1,
        "hint": "Satu tarikan: garis mendatar, diagonal turun, lalu lengkung membulat seperti angka 3 (tanpa simpul)",
        "hintTh": "ลากแนวนอน เฉียงลง แล้ววาดส่วนโค้งมนคล้ายเลข 3 (ไม่มีห่วง)",
        "start": [
          30,
          26
        ],
        "end": [
          42,
          80
        ],
        "direction": "three",
        "d": "M 30,26 L 66,24 L 36,52 C 76,46 76,82 42,80"
      }
    ]
  },
  "わ": {
    "char": "わ",
    "romaji": "wa",
    "script": "hiragana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis vertikal lurus di sisi kiri",
        "hintTh": "ลากเส้นแนวตั้งตรงทางซ้าย",
        "start": [
          32,
          22
        ],
        "end": [
          32,
          80
        ],
        "direction": "down",
        "d": "M 32,22 L 32,80"
      },
      {
        "order": 2,
        "hint": "Garis zig-zag melintasi garis vertikal lalu membulat besar ke kanan",
        "hintTh": "ลากเส้นซิกแซกตัดเส้นตรงแล้วโค้งมนออกไปทางขวา",
        "start": [
          22,
          44
        ],
        "end": [
          44,
          80
        ],
        "direction": "zigzag_bowl",
        "d": "M 22,44 L 54,38 L 28,76 C 54,54 78,54 74,72 C 70,82 56,82 44,80"
      }
    ]
  },
  "を": {
    "char": "を",
    "romaji": "wo",
    "script": "hiragana",
    "strokeCount": 3,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis horizontal mendatar di bagian atas",
        "hintTh": "ลากเส้นแนวนอนด้านบน",
        "start": [
          26,
          30
        ],
        "end": [
          66,
          28
        ],
        "direction": "right",
        "d": "M 26,30 L 66,28"
      },
      {
        "order": 2,
        "hint": "Garis diagonal turun memotong garis pertama lalu melengkung ke kanan",
        "hintTh": "ลากเส้นเฉียงตัดเส้นแรกแล้วหักเลี้ยวขวา",
        "start": [
          48,
          18
        ],
        "end": [
          68,
          54
        ],
        "direction": "down_right",
        "d": "M 48,18 L 38,54 L 68,54"
      },
      {
        "order": 3,
        "hint": "Lengkungkan pola C memotong garis kedua di bagian bawah",
        "hintTh": "วาดเส้นโค้งตัว C ตัดเส้นที่สองด้านล่าง",
        "start": [
          42,
          60
        ],
        "end": [
          74,
          76
        ],
        "direction": "curve_c",
        "d": "M 42,60 C 26,72 50,86 74,76"
      }
    ]
  },
  "ん": {
    "char": "ん",
    "romaji": "n",
    "script": "hiragana",
    "strokeCount": 1,
    "strokes": [
      {
        "order": 1,
        "hint": "Satu tarikan: garis diagonal turun, naik miring, lalu buat lengkungan ombak ke kanan bawah (seperti huruf 'n')",
        "hintTh": "ลากเส้นเฉียงลง ลากขึ้นแล้วทำส่วนโค้งคล้ายตัวอักษร 'n'",
        "start": [
          34,
          24
        ],
        "end": [
          76,
          70
        ],
        "direction": "n_wave",
        "d": "M 34,24 L 28,68 Q 42,42 56,54 C 64,62 70,72 76,70"
      }
    ]
  },
  "ア": {
    "char": "ア",
    "romaji": "a",
    "script": "katakana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Tarik garis horizontal ke kanan lalu tekuk miring ke kiri bawah",
        "hintTh": "ลากเส้นแนวนอนไปขวาแล้วหักมุมลงซ้าย",
        "start": [
          28,
          30
        ],
        "end": [
          44,
          52
        ],
        "direction": "hook_left",
        "d": "M 28,30 L 68,26 L 44,52"
      },
      {
        "order": 2,
        "hint": "Tarik garis lengkung diagonal dari tengah atas menyapu ke kiri bawah",
        "hintTh": "ลากเส้นโค้งทแยงจากตรงกลางลงซ้ายล่าง",
        "start": [
          52,
          28
        ],
        "end": [
          30,
          80
        ],
        "direction": "down_left",
        "d": "M 52,28 Q 50,56 30,80"
      }
    ]
  },
  "イ": {
    "char": "イ",
    "romaji": "i",
    "script": "katakana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis diagonal miring dari atas ke kiri bawah",
        "hintTh": "ลากเส้นทแยงจากบนลงล่างซ้าย",
        "start": [
          52,
          20
        ],
        "end": [
          30,
          52
        ],
        "direction": "down_left",
        "d": "M 52,20 L 30,52"
      },
      {
        "order": 2,
        "hint": "Garis vertikal lurus turun dari tengah goresan pertama",
        "hintTh": "ลากเส้นแนวตั้งตรงลงมาจากกึ่งกลางเส้นแรก",
        "start": [
          42,
          38
        ],
        "end": [
          42,
          82
        ],
        "direction": "down",
        "d": "M 42,38 L 42,82"
      }
    ]
  },
  "ウ": {
    "char": "ウ",
    "romaji": "u",
    "script": "katakana",
    "strokeCount": 3,
    "strokes": [
      {
        "order": 1,
        "hint": "Titik vertikal pendek di atas tengah",
        "hintTh": "แต้มจุดแนวตั้งสั้นตรงกลางบน",
        "start": [
          50,
          18
        ],
        "end": [
          50,
          28
        ],
        "direction": "down",
        "d": "M 50,18 L 50,28"
      },
      {
        "order": 2,
        "hint": "Garis vertikal pendek di sebelah kiri",
        "hintTh": "ลากเส้นแนวตั้งสั้นทางซ้าย",
        "start": [
          30,
          36
        ],
        "end": [
          30,
          48
        ],
        "direction": "down",
        "d": "M 30,36 L 30,48"
      },
      {
        "order": 3,
        "hint": "Garis horizontal ke kanan lalu tekuk menyapu miring ke kiri bawah",
        "hintTh": "ลากเส้นแนวนอนไปขวาแล้วหักมุมโค้งลงซ้าย",
        "start": [
          30,
          38
        ],
        "end": [
          38,
          80
        ],
        "direction": "hook_left",
        "d": "M 30,38 L 72,34 L 70,44 Q 64,68 38,80"
      }
    ]
  },
  "エ": {
    "char": "エ",
    "romaji": "e",
    "script": "katakana",
    "strokeCount": 3,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis horizontal mendatar bagian atas",
        "hintTh": "ลากเส้นแนวนอนด้านบน",
        "start": [
          30,
          26
        ],
        "end": [
          70,
          26
        ],
        "direction": "right",
        "d": "M 30,26 L 70,26"
      },
      {
        "order": 2,
        "hint": "Garis vertikal lurus di tengah menghubungkan kedua garis",
        "hintTh": "ลากเส้นแนวตั้งตรงกลางเชื่อมสองเส้น",
        "start": [
          50,
          26
        ],
        "end": [
          50,
          74
        ],
        "direction": "down",
        "d": "M 50,26 L 50,74"
      },
      {
        "order": 3,
        "hint": "Garis horizontal mendatar bagian bawah (sedikit lebih panjang)",
        "hintTh": "ลากเส้นแนวนอนด้านล่าง (ยาวกว่าเล็กน้อย)",
        "start": [
          24,
          74
        ],
        "end": [
          76,
          74
        ],
        "direction": "right",
        "d": "M 24,74 L 76,74"
      }
    ]
  },
  "オ": {
    "char": "オ",
    "romaji": "o",
    "script": "katakana",
    "strokeCount": 3,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis horizontal mendatar dari kiri ke kanan",
        "hintTh": "ลากเส้นแนวนอนจากซ้ายไปขวา",
        "start": [
          24,
          34
        ],
        "end": [
          76,
          32
        ],
        "direction": "right",
        "d": "M 24,34 L 76,32"
      },
      {
        "order": 2,
        "hint": "Garis vertikal turun memotong garis pertama dengan sentakan kait ke kiri",
        "hintTh": "ลากเส้นแนวตั้งตัดเส้นแรกแล้วสะบัดขึ้นซ้าย",
        "start": [
          56,
          18
        ],
        "end": [
          56,
          80
        ],
        "direction": "down_hook",
        "d": "M 56,18 L 56,76 Q 56,80 48,78"
      },
      {
        "order": 3,
        "hint": "Garis diagonal miring meluncur ke kiri bawah",
        "hintTh": "ลากเส้นทแยงเฉียงลงซ้ายล่าง",
        "start": [
          54,
          40
        ],
        "end": [
          26,
          78
        ],
        "direction": "down_left",
        "d": "M 54,40 L 26,78"
      }
    ]
  },
  "カ": {
    "char": "カ",
    "romaji": "ka",
    "script": "katakana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis horizontal ke kanan lalu tekuk miring ke kiri bawah dengan sentakan",
        "hintTh": "ลากเส้นแนวนอนไปขวาแล้วหักมุมลงซ้ายพร้อมสะบัดปลาย",
        "start": [
          26,
          34
        ],
        "end": [
          46,
          78
        ],
        "direction": "hook_left",
        "d": "M 26,34 L 66,30 L 62,40 Q 56,66 46,78"
      },
      {
        "order": 2,
        "hint": "Garis diagonal melengkung dari atas menyapu ke kiri bawah",
        "hintTh": "ลากเส้นโค้งทแยงจากบนลงล่างซ้าย",
        "start": [
          44,
          20
        ],
        "end": [
          24,
          76
        ],
        "direction": "down_left",
        "d": "M 44,20 Q 42,52 24,76"
      }
    ]
  },
  "シ": {
    "char": "シ",
    "romaji": "shi",
    "script": "katakana",
    "strokeCount": 3,
    "strokes": [
      {
        "order": 1,
        "hint": "Titik pendek atas miring ke bawah",
        "hintTh": "แต้มจุดสั้นบนสุด",
        "start": [
          32,
          28
        ],
        "end": [
          42,
          34
        ],
        "direction": "down_right",
        "d": "M 32,28 L 42,34"
      },
      {
        "order": 2,
        "hint": "Titik pendek kedua di bawahnya sejajar",
        "hintTh": "แต้มจุดสั้นจุดที่สองขนานกัน",
        "start": [
          28,
          48
        ],
        "end": [
          38,
          54
        ],
        "direction": "down_right",
        "d": "M 28,48 L 38,54"
      },
      {
        "order": 3,
        "hint": "Tarik garis menyapu dari kiri bawah melesat ke kanan atas",
        "hintTh": "ลากเส้นปัดจากล่างซ้ายพุ่งขึ้นขวาบน",
        "start": [
          24,
          78
        ],
        "end": [
          74,
          32
        ],
        "direction": "up_right",
        "d": "M 24,78 Q 42,66 74,32"
      }
    ]
  },
  "ス": {
    "char": "ス",
    "romaji": "su",
    "script": "katakana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis horizontal ke kanan lalu tekuk menyapu ke kiri bawah",
        "hintTh": "ลากเส้นแนวนอนไปขวาแล้วหักมุมลงซ้าย",
        "start": [
          30,
          32
        ],
        "end": [
          42,
          78
        ],
        "direction": "hook_left",
        "d": "M 30,32 L 68,28 L 42,78"
      },
      {
        "order": 2,
        "hint": "Garis diagonal pendek meluncur ke kanan bawah",
        "hintTh": "ลากเส้นทแยงสั้นลงขวาล่าง",
        "start": [
          48,
          54
        ],
        "end": [
          76,
          78
        ],
        "direction": "down_right",
        "d": "M 48,54 L 76,78"
      }
    ]
  },
  "セ": {
    "char": "セ",
    "romaji": "se",
    "script": "katakana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis horizontal ke kanan lalu tekuk vertikal ke bawah dengan sentakan",
        "hintTh": "ลากเส้นแนวนอนไปขวาแล้วหักลงพร้อมสะบัดขึ้น",
        "start": [
          26,
          40
        ],
        "end": [
          50,
          76
        ],
        "direction": "hook_left",
        "d": "M 26,40 L 72,34 L 72,66 Q 72,76 62,76 L 50,76"
      },
      {
        "order": 2,
        "hint": "Garis vertikal di kiri turun melintasi garis pertama",
        "hintTh": "ลากเส้นแนวตั้งทางซ้ายตัดเส้นแรก",
        "start": [
          42,
          22
        ],
        "end": [
          42,
          80
        ],
        "direction": "down",
        "d": "M 42,22 L 42,80"
      }
    ]
  },
  "ソ": {
    "char": "ソ",
    "romaji": "so",
    "script": "katakana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Titik miring pendek di kiri atas",
        "hintTh": "แต้มจุดเฉียงสั้นที่มุมซ้ายบน",
        "start": [
          36,
          30
        ],
        "end": [
          46,
          44
        ],
        "direction": "down_right",
        "d": "M 36,30 L 46,44"
      },
      {
        "order": 2,
        "hint": "Tarik garis diagonal menyapu dari kanan atas ke kiri bawah",
        "hintTh": "ลากเส้นทแยงปัดจากขวาบนลงซ้ายล่าง",
        "start": [
          68,
          26
        ],
        "end": [
          32,
          78
        ],
        "direction": "down_left",
        "d": "M 68,26 Q 54,58 32,78"
      }
    ]
  },
  "タ": {
    "char": "タ",
    "romaji": "ta",
    "script": "katakana",
    "strokeCount": 3,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis diagonal miring pendek di kiri atas",
        "hintTh": "ลากเส้นเฉียงสั้นที่มุมซ้ายบน",
        "start": [
          42,
          20
        ],
        "end": [
          28,
          44
        ],
        "direction": "down_left",
        "d": "M 42,20 L 28,44"
      },
      {
        "order": 2,
        "hint": "Garis horizontal ke kanan lalu tekuk menyapu ke kiri bawah",
        "hintTh": "ลากเส้นแนวนอนไปขวาแล้วหักมุมลงซ้าย",
        "start": [
          28,
          38
        ],
        "end": [
          46,
          80
        ],
        "direction": "hook_left",
        "d": "M 28,38 L 74,32 L 68,44 Q 60,68 46,80"
      },
      {
        "order": 3,
        "hint": "Garis diagonal pendek melintasi bagian dalam ke kanan bawah",
        "hintTh": "ลากเส้นเฉียงสั้นด้านในลงขวาล่าง",
        "start": [
          38,
          52
        ],
        "end": [
          70,
          72
        ],
        "direction": "down_right",
        "d": "M 38,52 L 70,72"
      }
    ]
  },
  "ツ": {
    "char": "ツ",
    "romaji": "tsu",
    "script": "katakana",
    "strokeCount": 3,
    "strokes": [
      {
        "order": 1,
        "hint": "Titik miring pertama di kiri atas",
        "hintTh": "แต้มจุดเฉียงจุดแรกซ้ายบน",
        "start": [
          32,
          28
        ],
        "end": [
          40,
          40
        ],
        "direction": "down_right",
        "d": "M 32,28 L 40,40"
      },
      {
        "order": 2,
        "hint": "Titik miring kedua di kanannya",
        "hintTh": "แต้มจุดเฉียงจุดที่สองถัดไปทางขวา",
        "start": [
          48,
          32
        ],
        "end": [
          56,
          44
        ],
        "direction": "down_right",
        "d": "M 48,32 L 56,44"
      },
      {
        "order": 3,
        "hint": "Tarik garis diagonal menyapu dari kanan atas meluncur ke kiri bawah",
        "hintTh": "ลากเส้นทแยงปัดจากขวาบนลงซ้ายล่าง",
        "start": [
          74,
          24
        ],
        "end": [
          32,
          80
        ],
        "direction": "down_left",
        "d": "M 74,24 Q 56,58 32,80"
      }
    ]
  },
  "ン": {
    "char": "ン",
    "romaji": "n",
    "script": "katakana",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Titik miring pendek di kiri",
        "hintTh": "แต้มจุดเฉียงสั้นๆ ทางซ้าย",
        "start": [
          34,
          38
        ],
        "end": [
          44,
          48
        ],
        "direction": "down_right",
        "d": "M 34,38 L 44,48"
      },
      {
        "order": 2,
        "hint": "Tarik garis menyapu dari kiri bawah melesat ke kanan atas",
        "hintTh": "ลากเส้นปัดจากล่างซ้ายพุ่งขึ้นขวาบน",
        "start": [
          28,
          76
        ],
        "end": [
          74,
          36
        ],
        "direction": "up_right",
        "d": "M 28,76 Q 44,64 74,36"
      }
    ]
  },
  "一": {
    "char": "一",
    "romaji": "ichi",
    "script": "kanji",
    "strokeCount": 1,
    "strokes": [
      {
        "order": 1,
        "hint": "Tarik satu garis horizontal mantap dari kiri ke kanan",
        "hintTh": "ลากเส้นแนวนอนตรงจากซ้ายไปขวา",
        "start": [
          20,
          50
        ],
        "end": [
          80,
          50
        ],
        "direction": "right",
        "d": "M 20,50 L 80,50"
      }
    ]
  },
  "二": {
    "char": "二",
    "romaji": "ni",
    "script": "kanji",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis horizontal atas lebih pendek",
        "hintTh": "ลากเส้นแนวนอนเส้นบนสั้นกว่า",
        "start": [
          32,
          36
        ],
        "end": [
          68,
          36
        ],
        "direction": "right",
        "d": "M 32,36 L 68,36"
      },
      {
        "order": 2,
        "hint": "Garis horizontal bawah lebih panjang",
        "hintTh": "ลากเส้นแนวนอนเส้นล่างยาวกว่า",
        "start": [
          20,
          68
        ],
        "end": [
          80,
          68
        ],
        "direction": "right",
        "d": "M 20,68 L 80,68"
      }
    ]
  },
  "三": {
    "char": "三",
    "romaji": "san",
    "script": "kanji",
    "strokeCount": 3,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis horizontal atas berukuran sedang",
        "hintTh": "ลากเส้นแนวนอนเส้นบนขนาดปานกลาง",
        "start": [
          28,
          30
        ],
        "end": [
          72,
          30
        ],
        "direction": "right",
        "d": "M 28,30 L 72,30"
      },
      {
        "order": 2,
        "hint": "Garis horizontal tengah paling pendek",
        "hintTh": "ลากเส้นแนวนอนเส้นกลางสั้นที่สุด",
        "start": [
          34,
          50
        ],
        "end": [
          66,
          50
        ],
        "direction": "right",
        "d": "M 34,50 L 66,50"
      },
      {
        "order": 3,
        "hint": "Garis horizontal bawah paling panjang dan mantap",
        "hintTh": "ลากเส้นแนวนอนเส้นล่างยาวที่สุด",
        "start": [
          18,
          72
        ],
        "end": [
          82,
          72
        ],
        "direction": "right",
        "d": "M 18,72 L 82,72"
      }
    ]
  },
  "人": {
    "char": "人",
    "romaji": "hito",
    "script": "kanji",
    "strokeCount": 2,
    "strokes": [
      {
        "order": 1,
        "hint": "Tarik garis diagonal melengkung dari atas menyapu ke kiri bawah",
        "hintTh": "ลากเส้นโค้งทแยงจากบนลงซ้ายล่าง",
        "start": [
          50,
          18
        ],
        "end": [
          22,
          82
        ],
        "direction": "down_left",
        "d": "M 50,18 Q 44,52 22,82"
      },
      {
        "order": 2,
        "hint": "Mulai dari tengah garis pertama, tarik garis diagonal menyangga ke kanan bawah",
        "hintTh": "เริ่มจากกึ่งกลางเส้นแรก ลากเส้นทแยงค้ำลงขวาล่าง",
        "start": [
          44,
          46
        ],
        "end": [
          78,
          82
        ],
        "direction": "down_right",
        "d": "M 44,46 L 78,82"
      }
    ]
  },
  "日": {
    "char": "日",
    "romaji": "hi / nichi",
    "script": "kanji",
    "strokeCount": 4,
    "strokes": [
      {
        "order": 1,
        "hint": "Garis vertikal kiri turun",
        "hintTh": "ลากเส้นแนวตั้งทางซ้ายลงมา",
        "start": [
          30,
          24
        ],
        "end": [
          30,
          78
        ],
        "direction": "down",
        "d": "M 30,24 L 30,78"
      },
      {
        "order": 2,
        "hint": "Garis atas ke kanan lalu tekuk turun vertikal di sisi kanan",
        "hintTh": "ลากเส้นแนวนอนไปขวาแล้วหักมุมลงมา",
        "start": [
          30,
          24
        ],
        "end": [
          70,
          78
        ],
        "direction": "hook_down",
        "d": "M 30,24 L 70,24 L 70,78"
      },
      {
        "order": 3,
        "hint": "Garis horizontal tengah menutup bagian dalam",
        "hintTh": "ลากเส้นแนวนอนตรงกลาง",
        "start": [
          30,
          50
        ],
        "end": [
          70,
          50
        ],
        "direction": "right",
        "d": "M 30,50 L 70,50"
      },
      {
        "order": 4,
        "hint": "Garis horizontal bawah mengunci kotak",
        "hintTh": "ลากเส้นแนวนอนด้านล่างปิดกรอบ",
        "start": [
          30,
          78
        ],
        "end": [
          70,
          78
        ],
        "direction": "right",
        "d": "M 30,78 L 70,78"
      }
    ]
  }
};

  var FiezelKakijunData = {
    get: function(char) {
      return STROKES[char] || null;
    },
    has: function(char) {
      return Boolean(STROKES[char]);
    },
    listAll: function() {
      return Object.keys(STROKES);
    },
    filterByScript: function(script) {
      return Object.values(STROKES).filter(function(item) {
        return item.script === script;
      });
    },
    data: STROKES
  };

  root.FiezelKakijunData = FiezelKakijunData;
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = FiezelKakijunData;
  }
})(typeof self !== 'undefined' ? self : globalThis);
