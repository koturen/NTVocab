/**
 * achievements.js
 * ---------------------------------------------------------------------------
 * Định nghĩa danh sách huy hiệu và logic kiểm tra điều kiện mở khoá.
 * `check(stats)` được gọi sau các sự kiện quan trọng (học xong 1 từ, nộp
 * quiz, v.v.) và trả về danh sách huy hiệu VỪA được mở khoá trong lần gọi
 * này, để app.js có thể hiển thị animation + toast chúc mừng.
 * ---------------------------------------------------------------------------
 */
const Achievements = (() => {
  const LIST = [
    {
      id: "first_lesson",
      icon: "🏆",
      title: "First Lesson",
      desc: "Hoàn thành bài học đầu tiên.",
      test: (s) => s.completedLessons >= 1,
    },
    {
      id: "vocab_beginner",
      icon: "📚",
      title: "Vocabulary Beginner",
      desc: "Học 50 từ.",
      test: (s) => s.totalWordsKnown >= 50,
    },
    {
      id: "streak_3",
      icon: "🔥",
      title: "3 Day Streak",
      desc: "Học liên tục 3 ngày.",
      test: (s) => s.streak >= 3,
    },
    {
      id: "perfect_score",
      icon: "⭐",
      title: "Perfect Score",
      desc: "Đạt 100% Quiz.",
      test: (s) => s.bestQuizScore >= 100,
    },
    {
      id: "vocab_master",
      icon: "🧠",
      title: "Vocabulary Master",
      desc: "Nhớ 100 từ.",
      test: (s) => s.totalWordsKnown >= 100,
    },
  ];

  function all() {
    return LIST;
  }

  /** @param {ReturnType<typeof Progress.getGlobalStats>} stats */
  function check(stats) {
    const unlockedNow = [];
    LIST.forEach(a => {
      if (Progress.getUnlockedAchievements().includes(a.id)) return;
      if (a.test(stats)) {
        const didUnlock = Progress.unlockAchievement(a.id);
        if (didUnlock) unlockedNow.push(a);
      }
    });
    return unlockedNow;
  }

  return { all, check };
})();
