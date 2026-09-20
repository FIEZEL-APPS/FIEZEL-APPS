"""Peta butir statis offline -> kompetensi server (F9 fase 2). DIBANGKITKAN OTOMATIS
oleh tools/build-offline-map.mjs — jangan sunting tangan (nanti tertimpa).

Aturan: prompt EKSak (normalisasi spasi). 31/214 butir terpetakan;
sisanya direkam sebagai aktivitas TANPA kompetensi. Memaksa parafasa ke kompetensi
sama dengan mengarang bukti.
"""
STATIC_COMPETENCY = {
    "cur_d7_ind_01": "KOMP-IND-7-MBC-011",
    "cur_d7_ind_03": "KOMP-IND-7-MBC-011",
    "cur_d7_ind_07": "KOMP-IND-7-MBC-012",
    "cur_d7_ipa_01": "KOMP-IPA-7-KET-011",
    "cur_d7_ipa_02": "KOMP-IPA-7-KET-011",
    "cur_d7_ipa_03": "KOMP-IPA-7-KET-011",
    "cur_d7_ipa_04": "KOMP-IPA-7-KET-011",
    "cur_d7_ipa_05": "KOMP-IPA-7-PEM-011",
    "cur_d7_ipa_06": "KOMP-IPA-7-PEM-011",
    "cur_d7_ipa_07": "KOMP-IPA-7-PEM-011",
    "cur_d7_ips_01": "KOMP-IPS-7-KET-011",
    "cur_d7_ips_02": "KOMP-IPS-7-KET-011",
    "cur_d7_ips_03": "KOMP-IPS-7-KET-011",
    "cur_d7_ips_04": "KOMP-IPS-7-KET-011",
    "cur_d7_ips_05": "KOMP-IPS-7-PEM-011",
    "cur_d7_ips_06": "KOMP-IPS-7-PEM-011",
    "cur_d7_ips_07": "KOMP-IPS-7-PEM-011",
    "cur_d7_ips_08": "KOMP-IPS-7-PEM-011",
    "cur_d7_mat_01": "KOMP-MAT-7-BIL-011",
    "cur_d7_mat_02": "KOMP-MAT-7-BIL-011",
    "cur_d7_mat_05": "KOMP-MAT-7-BIL-012",
    "cur_d7_mat_06": "KOMP-MAT-7-BIL-012",
    "cur_d7_mat_07": "KOMP-MAT-7-BIL-012",
    "cur_d7_mat_08": "KOMP-MAT-7-BIL-012",
    "cur_d7_ppkn_01": "KOMP-PPKN-7-PAN-011",
    "cur_d7_ppkn_02": "KOMP-PPKN-7-PAN-011",
    "cur_d7_ppkn_04": "KOMP-PPKN-7-PAN-011",
    "cur_d7_ppkn_05": "KOMP-PPKN-7-UUD-011",
    "cur_d7_ppkn_06": "KOMP-PPKN-7-UUD-011",
    "cur_d7_ppkn_07": "KOMP-PPKN-7-UUD-011",
    "cur_d7_ppkn_08": "KOMP-PPKN-7-UUD-011",
}
META = {"mapped": 31, "total_static": 214, "rule": "exact-prompt"}
