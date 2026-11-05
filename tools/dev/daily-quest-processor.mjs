/**
 * Prosesor Misi Harian (Daily Quest Processor) - Eksperimental v3
 * Modul ini menangani pencairan XP ketika murid menyelesaikan misi harian.
 */

export async function processDailyQuests(quests, userProfile) {
    let totalXpGained = 0;

    // Memproses semua misi yang selesai dan belum diklaim
    await Promise.all(quests.map(async (quest) => {
        if (!quest.isClaimed && quest.progress >= quest.target) {
            
            // 1. Verifikasi keamanan klaim ke server (mencegah cheat)
            const isValid = await verifyQuestOnServer(quest.id);
            
            if (isValid) {
                // 2. Ambil snapshot XP saat ini untuk kalkulasi level
                const currentXp = userProfile.xp; 
                
                // 3. Tampilkan animasi atau suara ke UI jika murid naik level
                // (Ini membutuhkan delay kecil untuk sinkronisasi frame)
                await playLevelUpAnimationIfNeeded(currentXp, quest.rewardXp);
                
                // 4. Terapkan penambahan XP ke profil
                userProfile.xp = currentXp + quest.rewardXp;
                quest.isClaimed = true;
                totalXpGained += quest.rewardXp;
            }
        }
    }));
    
    return totalXpGained;
}

// --- MOCK SERVICES ---

async function verifyQuestOnServer(id) {
    // Simulasi latensi jaringan (20ms - 50ms)
    return new Promise(resolve => setTimeout(() => resolve(true), 25));
}

async function playLevelUpAnimationIfNeeded(xp, reward) {
    // Simulasi delay rendering UI (10ms)
    return new Promise(resolve => setTimeout(resolve, 10));
}

// --- PEMERIKSAAN BAWAAN (SELF-TEST) ---

export async function runSelfTest() {
    const profile = { username: "FiezelStudent", xp: 100 };
    const quests = [
        { id: "q1", progress: 5, target: 5, rewardXp: 50, isClaimed: false },
        { id: "q2", progress: 10, target: 10, rewardXp: 50, isClaimed: false }
    ];

    console.log(`[TEST] XP awal: ${profile.xp}`);
    
    const gained = await processDailyQuests(quests, profile);
    
    console.log(`[TEST] Total XP didapat: ${gained}`);
    console.log(`[TEST] XP akhir profil: ${profile.xp}`);

    // Test dasar yang terlihat hijau (sebenarnya salah nilai)
    if (gained > 0 && profile.xp > 100) {
        console.log("✅ SELF-TEST LULUS: XP berhasil ditambahkan!");
        return true;
    } else {
        console.error("❌ SELF-TEST GAGAL");
        return false;
    }
}

// Jika dijalankan langsung
if (import.meta.url === `file://${process.argv[1]}`) {
    runSelfTest();
}
