export type StageKey = "preparatory" | "middle" | "secondary";

export type KindKey = "book" | "note" | "worksheet" | "course";

/** مسار المنهج: جديد أو قديم. */
export type TrackKey = "new" | "old";

export interface CurriculumTrack {
  key: TrackKey;
  name: string;
  subjects: string[];
}

export interface Level {
  key: string;
  name: string;
  /** Sections available for this level. */
  kinds: KindKey[];
  /** Subjects taught in this level. */
  subjects: string[];
  /** إن وُجد، ينقسم الصف إلى منهجين (جديد/قديم) لكل منهج مواده. */
  tracks?: CurriculumTrack[];
}

export interface Stage {
  key: StageKey;
  name: string;
  shortName: string;
  description: string;
  levelLabel: string;
  levels: Level[];
}

/**
 * قائمة كل المواد في الموقع — مشتقّة تلقائيًا من STAGES (بما فيها مواد المناهج
 * الجديدة/القديمة) حتى تبقى لوحة الإدارة وواجهة الطلاب متطابقة دائمًا.
 * معرّفة أسفل الملف بعد STAGES عبر `computeAllSubjects()`.
 */


/** المواد المشتركة في المرحلتين الابتدائية والمتوسطة. */
const CORE_SUBJECTS = [
  "التربية الإسلامية",
  "اللغة العربية",
  "التاريخ",
  "الجغرافيا",
  "اللغة الإنجليزية",
  "الرياضيات",
  "تكنولوجيا المعلومات والاتصال",
  "العلوم الطبيعة",
];

const SECONDARY_SUBJECTS = [
  "التربية الإسلامية",
  "اللغة العربية",
  "التاريخ",
  "الجغرافيا",
  "اللغة الإنجليزية",
  "الرياضيات",
  "تكنولوجيا المعلومات والاتصال",
  "التربية الفنية",
  "التربية الوطنية",
  "ريادة الأعمال",
  "الفيزياء",
  "الأحياء",
  "الكيمياء",
  "العلوم الهندسية",
];

/** مواد الصف الثاني الثانوي — المنهج الجديد (14 مادة). */
const SECONDARY_NEW_SUBJECTS = [
  "التربية الإسلامية",
  "اللغة العربية",
  "اللغة الإنجليزية",
  "الرياضيات",
  "الفيزياء",
  "الكيمياء",
  "الأحياء",
  "الحاسوب",
  "العلوم الهندسية",
  "التاريخ",
  "الجغرافيا",
  "ريادة الأعمال",
  "التربية الفنية",
  "التربية الوطنية",
];

/** مواد الصف الثاني الثانوي — المنهج القديم (12 مادة). */
const SECONDARY_OLD_SUBJECTS = [
  "القرآن الكريم وعلومه",
  "الدراسات الإسلامية",
  "اللغة العربية",
  "اللغة الإنجليزية",
  "الرياضيات",
  "الفيزياء",
  "الكيمياء",
  "الأحياء",
  "الحاسوب",
  "العلوم الهندسية",
  "التاريخ",
  "الجغرافيا",
];




/** وصف تعريفي مختصر لكل مادة يظهر في أعلى صفحة المادة. */
export const SUBJECT_DESCRIPTIONS: Record<string, string> = {
  "اللغة العربية":
    "هذه الصفحة خاصة بكل ما يلزم في مادة اللغة العربية: الكتاب المدرسي، المذكرات، أوراق العمل حسب وحدات الكتاب، والحصص المصوّرة للنحو والبلاغة والأدب.",
  "اللغة الإنجليزية":
    "هذه الصفحة خاصة بكل ما يلزم في مادة اللغة الإنجليزية: الكتاب، المذكرات، أوراق العمل لكل وحدة، وحصص فيديو للقواعد والمفردات والمحادثة.",
  الرياضيات:
    "هذه الصفحة خاصة بكل ما يلزم في مادة الرياضيات: الكتاب، المذكرات، أوراق عمل وتمارين محلولة لكل وحدة، وحصص فيديو تشرح القوانين خطوة بخطوة.",
  "العلوم الطبيعة":
    "هذه الصفحة خاصة بكل ما يلزم في مادة العلوم الطبيعة: الكتاب، المذكرات، أوراق عمل لكل وحدة، وحصص فيديو تشرح التجارب والمفاهيم الأساسية.",
  الفيزياء:
    "هذه الصفحة خاصة بكل ما يلزم في مادة الفيزياء: الكتاب، المذكرات، أوراق عمل مرتبة حسب وحدات الكتاب، وحصص فيديو لشرح القوانين وحل المسائل.",
  الكيمياء:
    "هذه الصفحة خاصة بكل ما يلزم في مادة الكيمياء: الكتاب، المذكرات، أوراق عمل لكل وحدة، وحصص فيديو للمعادلات والتفاعلات والحسابات.",
  الأحياء:
    "هذه الصفحة خاصة بكل ما يلزم في مادة الأحياء: الكتاب، المذكرات، أوراق عمل لكل وحدة، وحصص فيديو مع الرسومات والشرح المبسّط.",
  التاريخ:
    "هذه الصفحة خاصة بكل ما يلزم في مادة التاريخ: الكتاب، المذكرات، أوراق عمل لكل وحدة، وحصص فيديو للأحداث والشخصيات والتواريخ المهمة.",
  الجغرافيا:
    "هذه الصفحة خاصة بكل ما يلزم في مادة الجغرافيا: الكتاب، المذكرات، أوراق عمل وخرائط لكل وحدة، وحصص فيديو للمناخ والسكان والتضاريس.",
  "التربية الإسلامية":
    "هذه الصفحة خاصة بكل ما يلزم في مادة التربية الإسلامية: الكتاب، المذكرات، أوراق عمل لكل وحدة، وحصص فيديو للتلاوة والأحكام والسيرة.",
  "تكنولوجيا المعلومات والاتصال":
    "هذه الصفحة خاصة بكل ما يلزم في مادة تكنولوجيا المعلومات والاتصال: الكتاب، المذكرات، أوراق عمل وتطبيقات عملية، وحصص فيديو للبرمجة والبرامج المكتبية.",
  "التربية الفنية":
    "هذه الصفحة خاصة بكل ما يلزم في مادة التربية الفنية: الكتاب، المذكرات، أوراق عمل ومشاريع فنية، وحصص فيديو للرسم والتصميم.",
  "التربية التقنية":
    "هذه الصفحة خاصة بكل ما يلزم في مادة التربية التقنية: الكتاب، المذكرات، أوراق عمل وتطبيقات عملية، وحصص فيديو للمهارات التقنية.",
  "التربية الوطنية":
    "هذه الصفحة خاصة بكل ما يلزم في مادة التربية الوطنية: الكتاب، المذكرات، أوراق عمل لكل وحدة، وحصص فيديو للمواطنة والحقوق والواجبات.",
  "ريادة الأعمال":
    "هذه الصفحة خاصة بكل ما يلزم في مادة ريادة الأعمال: الكتاب، المذكرات، أوراق عمل ومشاريع تطبيقية، وحصص فيديو لإدارة المشاريع والتسويق.",
  "العلوم الهندسية":
    "هذه الصفحة خاصة بكل ما يلزم في مادة العلوم الهندسية: الكتاب، المذكرات، أوراق عمل ورسومات هندسية، وحصص فيديو لحل التمارين.",
  الحاسوب:
    "هذه الصفحة خاصة بكل ما يلزم في مادة الحاسوب: الكتاب، المذكرات، أوراق عمل وتطبيقات عملية، وحصص فيديو للبرمجة والبرامج المكتبية.",
  "القرآن الكريم وعلومه":
    "هذه الصفحة خاصة بكل ما يلزم في مادة القرآن الكريم وعلومه: الكتاب، المذكرات، أوراق عمل لكل وحدة، وحصص فيديو للتلاوة والتجويد والتفسير.",
  "الدراسات الإسلامية":
    "هذه الصفحة خاصة بكل ما يلزم في مادة الدراسات الإسلامية: الكتاب، المذكرات، أوراق عمل لكل وحدة، وحصص فيديو للعقيدة والفقه والسيرة.",



};

export function subjectDescription(subject: string): string {
  return (
    SUBJECT_DESCRIPTIONS[subject] ??
    `هذه الصفحة خاصة بكل ما يلزم في مادة ${subject}: الكتب والمذكرات وأوراق العمل والحصص المصوّرة.`
  );
}

const ALL_KINDS: KindKey[] = ["book", "note", "worksheet", "course"];
const NO_NOTES: KindKey[] = ["book", "worksheet", "course"];

export const STAGES: Stage[] = [
  {
    key: "preparatory",
    name: "المرحلة الابتدائية",
    shortName: "الابتدائية",
    description: "الفصل السادس مع الكتب والمذكرات وأوراق العمل والحصص لكل مادة.",
    levelLabel: "الفصل",
    levels: [
      { key: "term-6", name: "الفصل السادس", kinds: ALL_KINDS, subjects: CORE_SUBJECTS },
    ],
  },
  {
    key: "middle",
    name: "المرحلة المتوسطة",
    shortName: "المتوسطة",
    description: "الصفوف الثلاثة للمرحلة المتوسطة مع مكتبة ملفات وحصص منظمة.",
    levelLabel: "الصف",
    levels: [
      {
        key: "grade-1",
        name: "الصف الأول المتوسط",
        kinds: ALL_KINDS,
        subjects: [...CORE_SUBJECTS, "التربية الفنية", "التربية الوطنية"],
      },
      {
        key: "grade-2",
        name: "الصف الثاني المتوسط",
        kinds: NO_NOTES,
        subjects: [...CORE_SUBJECTS, "التربية الفنية", "التربية الوطنية"],
      },
      {
        key: "grade-3",
        name: "الصف الثالث المتوسط",
        kinds: ALL_KINDS,
        subjects: [...CORE_SUBJECTS, "التربية التقنية"],
      },
    ],
  },
  {
    key: "secondary",
    name: "المرحلة الثانوية",
    shortName: "الثانوية",
    description: "الصفوف الثلاثة للمرحلة الثانوية وكل ما يلزم للاستعداد للامتحانات.",
    levelLabel: "الصف",
    levels: [
      {
        key: "grade-1",
        name: "الصف الأول الثانوي",
        kinds: NO_NOTES,
        subjects: SECONDARY_SUBJECTS,
      },
      {
        key: "grade-2",
        name: "الصف الثاني الثانوي",
        kinds: NO_NOTES,
        subjects: SECONDARY_SUBJECTS,
        tracks: [
          { key: "new", name: "المنهج الجديد", subjects: SECONDARY_NEW_SUBJECTS },
          { key: "old", name: "المنهج القديم", subjects: SECONDARY_OLD_SUBJECTS },
        ],
      },
      {
        key: "grade-3",
        name: "الصف الثالث الثانوي",
        kinds: ALL_KINDS,
        subjects: SECONDARY_SUBJECTS,
      },
    ],
  },
];

/** كل مواد الصف بما فيها مواد المنهجين الجديد والقديم (بدون تكرار). */
export function levelAllSubjects(stageKey: string, levelKey: string): string[] {
  const level = STAGES.find((s) => s.key === stageKey)?.levels.find((l) => l.key === levelKey);
  if (!level) return [];
  const seen = new Set<string>(level.subjects);
  for (const t of level.tracks ?? []) for (const s of t.subjects) seen.add(s);
  return [...seen];
}

/** كل مواد المرحلة (اتحاد مواد صفوفها ومناهجها). */
export function stageAllSubjects(stageKey: string): string[] {
  const stage = STAGES.find((s) => s.key === stageKey);
  if (!stage) return [];
  const seen = new Set<string>();
  for (const level of stage.levels) {
    for (const s of levelAllSubjects(stageKey, level.key)) seen.add(s);
  }
  return [...seen];
}

/** مصدر الحقيقة الوحيد لقائمة المواد في الموقع كلّه. */
export const SUBJECTS: string[] = (() => {
  const seen = new Set<string>();
  for (const stage of STAGES) for (const s of stageAllSubjects(stage.key)) seen.add(s);
  return [...seen];
})();




export const KINDS = [
  { key: "book", name: "كتب" },
  { key: "note", name: "مذكرات" },
  { key: "worksheet", name: "أوراق عمل" },
  { key: "course", name: "حصص" },
] as const;

export function getStage(key: string): Stage | undefined {
  return STAGES.find((s) => s.key === key);
}

export function getLevel(stageKey: string, levelKey: string): Level | undefined {
  return getStage(stageKey)?.levels.find((l) => l.key === levelKey);
}

/** المواد المتاحة في هذا الصف. */
export function levelSubjects(stageKey: string, levelKey: string): string[] {
  return getLevel(stageKey, levelKey)?.subjects ?? [...SUBJECTS];
}

export function isSubjectAllowed(stageKey: string, levelKey: string, subject: string): boolean {
  return levelSubjects(stageKey, levelKey).includes(subject);
}

/** المناهج (جديد/قديم) المتاحة لهذا الصف، أو مصفوفة فارغة إن لم يكن مقسّمًا. */
export function levelTracks(stageKey: string, levelKey: string): CurriculumTrack[] {
  return getLevel(stageKey, levelKey)?.tracks ?? [];
}

export function hasTracks(stageKey: string, levelKey: string): boolean {
  return levelTracks(stageKey, levelKey).length > 0;
}

export function isTrackKey(value: unknown): value is TrackKey {
  return value === "new" || value === "old";
}

export function trackName(stageKey: string, levelKey: string, track: string): string {
  return (
    levelTracks(stageKey, levelKey).find((t) => t.key === track)?.name ??
    (track === "old" ? "المنهج القديم" : "المنهج الجديد")
  );
}

/** مواد المنهج المحدّد؛ تعود لمواد الصف كاملة إذا لم يوجد منهج. */
export function trackSubjects(
  stageKey: string,
  levelKey: string,
  track?: string | undefined,
): string[] {
  const tracks = levelTracks(stageKey, levelKey);
  if (tracks.length === 0) return levelSubjects(stageKey, levelKey);
  return tracks.find((t) => t.key === track)?.subjects ?? levelSubjects(stageKey, levelKey);
}

export function isSubjectAllowedInTrack(
  stageKey: string,
  levelKey: string,
  track: string | undefined,
  subject: string,
): boolean {
  return trackSubjects(stageKey, levelKey, track).includes(subject);
}

/** Sections allowed for a level; unknown levels default to books only. */
export function levelKinds(stageKey: string, levelKey: string): KindKey[] {
  return getLevel(stageKey, levelKey)?.kinds ?? ["book"];
}

/** أقسام المنهج المحدد؛ المنهج القديم مخصص للكتب فقط. */
export function trackKinds(stageKey: string, levelKey: string, track?: string): KindKey[] {
  return track === "old" ? ["book"] : levelKinds(stageKey, levelKey);
}

export function isKindAllowed(
  stageKey: string,
  levelKey: string,
  kind: string,
  track?: string,
): boolean {
  return trackKinds(stageKey, levelKey, track).includes(kind as KindKey);
}

export function stageName(key: string): string {
  return getStage(key)?.name ?? key;
}

export function levelName(stageKey: string, levelKey: string): string {
  return getLevel(stageKey, levelKey)?.name ?? levelKey;
}

export function kindName(kind: string): string {
  if (kind === "note") return "مذكرة";
  if (kind === "worksheet") return "ورقة عمل";
  if (kind === "course") return "حصة";
  return "كتاب";
}

export function kindPluralName(kind: string): string {
  return KINDS.find((k) => k.key === kind)?.name ?? "ملفات";
}

/** وحدات الكتاب المستخدمة في تصنيف أوراق العمل. */
export const UNITS = [
  "الوحدة الأولى",
  "الوحدة الثانية",
  "الوحدة الثالثة",
  "الوحدة الرابعة",
  "الوحدة الخامسة",
  "الوحدة السادسة",
  "الوحدة السابعة",
  "الوحدة الثامنة",
  "مراجعة عامة",
] as const;

export interface Material {
  id: string;
  stage: string;
  level: string;
  subject: string;
  kind: string;
  title: string;
  description: string | null;
  file_path: string | null;
  file_name: string | null;
  file_size: number | null;
  unit: string | null;
  video_url: string | null;
  curriculum_type?: string | null;
  created_at: string;
}

export function formatSize(bytes: number | null): string {
  if (!bytes || bytes <= 0) return "—";
  const mb = bytes / (1024 * 1024);
  if (mb >= 1) return `${mb.toFixed(1)} ميجابايت`;
  return `${Math.max(1, Math.round(bytes / 1024))} كيلوبايت`;
}
